-- S08b: fix voor `connections_clear_secret` — koppeling verbreken werkte niet.
--
-- De S02-migration (20260713120000_connections.sql) riep `vault.delete_secret()`
-- aan, maar die functie bestaat niet: Supabase Vault levert alleen
-- `vault.create_secret()` en `vault.update_secret()`. Verwijderen gaat via een
-- gewone DELETE op `vault.secrets`. Dezelfde asymmetrie was al zichtbaar bij
-- lezen, dat de view `vault.decrypted_secrets` gebruikt in plaats van een functie.
--
-- Gevolg van de bug: de RPC gooide `undefined_function` (42883),
-- api/connections/disconnect.js maakte daar een 500 `disconnect_failed` van, en
-- de rij bleef op `status = 'connected'` staan. Verbreken was daardoor onmogelijk
-- voor élke provider (Trello én Outlook), en omdat de "Verbinden"-knop alleen
-- verschijnt bij `status <> 'connected'` kon je ook niet opnieuw koppelen met een
-- ander account.
--
-- Alleen de verwijderregel verandert; de eigenaarscheck, search_path en de
-- status-update blijven identiek aan het origineel.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


CREATE OR REPLACE FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'pg_temp'
    AS $$
DECLARE
  v_owner uuid;
  v_secret_id uuid;
BEGIN
  SELECT account_id, token_secret_id INTO v_owner, v_secret_id FROM public.connections WHERE id = p_connection_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'connection_not_found';
  END IF;

  -- Defense-in-depth: zie connections_set_secret in de S02-migration.
  IF auth.uid() IS NOT NULL AND v_owner <> auth.uid() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  -- Was `PERFORM vault.delete_secret(v_secret_id)`; die functie bestaat niet.
  IF v_secret_id IS NOT NULL THEN
    DELETE FROM vault.secrets WHERE id = v_secret_id;
  END IF;

  UPDATE public.connections
  SET token_secret_id = NULL, status = 'disconnected', updated_at = now()
  WHERE id = p_connection_id;
END;
$$;


ALTER FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") IS
  'S02/S08b: verwijdert het vault-secret van een connection en zet status disconnected (service-role only).';

-- REVOKE ... FROM PUBLIC dekt named roles NIET: de baseline geeft elke nieuwe
-- functie in dit schema via ALTER DEFAULT PRIVILEGES al standaard EXECUTE aan
-- anon/authenticated/service_role. CREATE OR REPLACE behoudt de bestaande grants,
-- maar we herhalen ze expliciet zodat deze migration ook op een verse database
-- hetzelfde resultaat geeft (zelfde patroon als de S02-migration).
REVOKE ALL ON FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") FROM "anon";
REVOKE ALL ON FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") FROM "authenticated";
GRANT EXECUTE ON FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") TO "service_role";
