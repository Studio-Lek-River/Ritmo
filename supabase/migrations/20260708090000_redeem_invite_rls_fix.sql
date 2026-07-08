-- S01b: RLS-fix voor household_invites (bevinding B1, zie docs/rls-verificatie.md).
-- Sluit het gat waarbij elke ingelogde gebruiker de volledige invites-tabel kon lezen
-- en zo een willekeurig huishouden kon joinen. Inwisselen loopt voortaan uitsluitend
-- via de SECURITY DEFINER RPC public.redeem_invite, die exact op token matcht.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


-- 1. RPC: atomair invite opzoeken, valideren, markeren als gebruikt en lid toevoegen.
-- Zie docs/slices/S01b-invite-rls-fix.md, bevinding B1.
CREATE OR REPLACE FUNCTION "public"."redeem_invite"("p_token" "text", "p_display_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'pg_temp'
    AS $$
DECLARE
  v_invite public.household_invites%ROWTYPE;
BEGIN
  SELECT * INTO v_invite FROM public.household_invites WHERE token = p_token;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invite_not_found';
  END IF;

  IF v_invite.used_by IS NOT NULL THEN
    RAISE EXCEPTION 'invite_used';
  END IF;

  IF v_invite.expires_at <= now() THEN
    RAISE EXCEPTION 'invite_expired';
  END IF;

  UPDATE public.household_invites
  SET used_by = auth.uid(), used_at = now()
  WHERE token = p_token;

  INSERT INTO public.household_members (household_id, user_id, role, display_name)
  VALUES (v_invite.household_id, auth.uid(), 'member', p_display_name);

  RETURN v_invite.household_id;
END;
$$;


ALTER FUNCTION "public"."redeem_invite"("p_token" "text", "p_display_name" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."redeem_invite"("p_token" "text", "p_display_name" "text") IS
  'S01b / bevinding B1: atomair invite inwisselen (SECURITY DEFINER), vervangt directe tabel-toegang.';

REVOKE ALL ON FUNCTION "public"."redeem_invite"("p_token" "text", "p_display_name" "text") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."redeem_invite"("p_token" "text", "p_display_name" "text") TO "authenticated";


-- 2. household_invites SELECT: admin-only, de open "OR auth.uid() IS NOT NULL"-tak verdwijnt.
DROP POLICY IF EXISTS "Invites: admins can read theirs, anyone can read by token" ON "public"."household_invites";

CREATE POLICY "Invites: admins can read theirs" ON "public"."household_invites" FOR SELECT USING ("public"."is_household_admin"("household_id"));


-- 3. household_invites UPDATE: de open inwissel-policy verdwijnt. Inwisselen loopt
-- voortaan uitsluitend via de redeem_invite RPC (SECURITY DEFINER, dus buiten RLS om).
DROP POLICY IF EXISTS "Invites: redeem (mark as used)" ON "public"."household_invites";


-- 4. household_members INSERT: de self-join-tak (leunend op een ingewisselde invite)
-- verdwijnt. De member-insert bij het joinen gebeurt nu binnen de RPC (als definer).
DROP POLICY IF EXISTS "Members: admin can add" ON "public"."household_members";

CREATE POLICY "Members: admin can add" ON "public"."household_members" FOR INSERT WITH CHECK ("public"."is_household_admin"("household_id"));
