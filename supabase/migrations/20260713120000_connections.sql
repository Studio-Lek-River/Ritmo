-- S02: Connections-infra plus genormaliseerd items-model.
-- Legt de fundering voor externe koppelingen (S03 Outlook, S04 Trello, S05 GitHub):
-- een per-account `connections`-tabel met RLS, en server-side-only toegang tot de
-- versleutelde tokens via Supabase Vault. Geen plaintext-tokens in een kolom; het
-- token zelf leeft in `vault.secrets`, deze tabel bewaart alleen de verwijzing
-- (`token_secret_id`). Lezen/schrijven van het secret loopt uitsluitend via de
-- SECURITY DEFINER-functies hieronder, die alleen aan `service_role` zijn
-- toegekend (nooit aan `anon`/`authenticated`).
-- Zie docs/slices/S02-connections-items-model.md.

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


-- 1. Tabel: per-account koppeling naar een externe provider. `token_secret_id`
-- verwijst naar `vault.secrets`; er staat hier nooit een plaintext-token.
CREATE TABLE IF NOT EXISTS "public"."connections" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "account_id" "uuid" NOT NULL,
    "provider" "text" NOT NULL,
    "label" "text",
    "status" "text" DEFAULT 'disconnected'::"text" NOT NULL,
    "external_account" "text",
    "token_secret_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "connections_provider_check" CHECK (("provider" = ANY (ARRAY['outlook'::"text", 'trello'::"text", 'github'::"text"]))),
    CONSTRAINT "connections_status_check" CHECK (("status" = ANY (ARRAY['connected'::"text", 'disconnected'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."connections" OWNER TO "postgres";


ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_pkey" PRIMARY KEY ("id");


ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;


-- Uniek per account/provider/extern account, zodat meerdere Trello-borden of
-- Outlook-mailboxen naast elkaar kunnen bestaan (ROADMAP S04) zonder duplicaten.
-- `external_account` mag NULL zijn (nog geen sub-account gekozen); Postgres
-- behandelt elke NULL in een unique-constraint als uniek, dus per provider kan
-- er precies één rij zonder external_account bestaan -- gewenst voor S03.
ALTER TABLE ONLY "public"."connections"
    ADD CONSTRAINT "connections_account_provider_external_key" UNIQUE ("account_id", "provider", "external_account");


CREATE INDEX "connections_account_idx" ON "public"."connections" USING "btree" ("account_id");


COMMENT ON TABLE "public"."connections" IS
  'S02: per-account koppelingen naar externe providers. token_secret_id verwijst naar vault.secrets, nooit plaintext.';


-- 2. RLS: mirror het user_data-patroon (auth.uid() = eigenaar), één policy voor
-- alle operaties. De rls_auto_enable-trigger zet RLS al aan op elke nieuwe
-- tabel; hier expliciet voor leesbaarheid en om niet op de trigger te leunen
-- voor correctheid.
ALTER TABLE "public"."connections" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Connections: users manage own" ON "public"."connections" USING (("auth"."uid"() = "account_id")) WITH CHECK (("auth"."uid"() = "account_id"));


-- 3. Vault-toegang: uitsluitend server-side. Deze SECURITY DEFINER-functies zijn
-- de enige weg naar vault.secrets; ze worden NIET aan anon/authenticated
-- toegekend, alleen aan service_role (de api/-laag draait met de service-role-
-- key, zie api/connections/*.js). Zo kan geen enkele browser-sessie een token
-- uitlezen, ook niet indirect via de connections-rij zelf (die bevat alleen de
-- opaque token_secret_id, geen inhoud).

-- Schrijft (create-of-update) het vault-secret voor een connection-rij en zet
-- status = 'connected'. Voor gebruik door S03+ (echte OAuth-handshake); in S02
-- zelf roept nog niemand deze functie aan (api/connections/connect is een stub).
CREATE OR REPLACE FUNCTION "public"."connections_set_secret"("p_connection_id" "uuid", "p_secret" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'pg_temp'
    AS $$
DECLARE
  v_existing uuid;
  v_secret_id uuid;
BEGIN
  SELECT token_secret_id INTO v_existing FROM public.connections WHERE id = p_connection_id;

  IF v_existing IS NOT NULL THEN
    PERFORM vault.update_secret(v_existing, p_secret);
    v_secret_id := v_existing;
  ELSE
    v_secret_id := vault.create_secret(p_secret, 'connections:' || p_connection_id::text);
  END IF;

  UPDATE public.connections
  SET token_secret_id = v_secret_id, status = 'connected', updated_at = now()
  WHERE id = p_connection_id;
END;
$$;


ALTER FUNCTION "public"."connections_set_secret"("p_connection_id" "uuid", "p_secret" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."connections_set_secret"("p_connection_id" "uuid", "p_secret" "text") IS
  'S02: schrijft het vault-secret voor een connection (service-role only). Voorbereid voor S03+.';

REVOKE ALL ON FUNCTION "public"."connections_set_secret"("p_connection_id" "uuid", "p_secret" "text") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."connections_set_secret"("p_connection_id" "uuid", "p_secret" "text") TO "service_role";


-- Leest (decrypt) het vault-secret voor een connection-rij. Alleen service-role
-- kan dit aanroepen; voor gebruik door S03+ als een provider-call het token nodig
-- heeft.
CREATE OR REPLACE FUNCTION "public"."connections_get_secret"("p_connection_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'pg_temp'
    AS $$
DECLARE
  v_secret_id uuid;
  v_secret text;
BEGIN
  SELECT token_secret_id INTO v_secret_id FROM public.connections WHERE id = p_connection_id;

  IF v_secret_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT decrypted_secret INTO v_secret FROM vault.decrypted_secrets WHERE id = v_secret_id;
  RETURN v_secret;
END;
$$;


ALTER FUNCTION "public"."connections_get_secret"("p_connection_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."connections_get_secret"("p_connection_id" "uuid") IS
  'S02: decrypt van het vault-secret voor een connection (service-role only). Enige leesweg naar het token.';

REVOKE ALL ON FUNCTION "public"."connections_get_secret"("p_connection_id" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."connections_get_secret"("p_connection_id" "uuid") TO "service_role";


-- Verwijdert het vault-secret (indien aanwezig) en zet status = 'disconnected'.
-- Gebruikt door api/connections/disconnect.js.
CREATE OR REPLACE FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public', 'vault', 'pg_temp'
    AS $$
DECLARE
  v_secret_id uuid;
BEGIN
  SELECT token_secret_id INTO v_secret_id FROM public.connections WHERE id = p_connection_id;

  IF v_secret_id IS NOT NULL THEN
    PERFORM vault.delete_secret(v_secret_id);
  END IF;

  UPDATE public.connections
  SET token_secret_id = NULL, status = 'disconnected', updated_at = now()
  WHERE id = p_connection_id;
END;
$$;


ALTER FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") IS
  'S02: verwijdert het vault-secret van een connection en zet status disconnected (service-role only).';

REVOKE ALL ON FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") FROM PUBLIC;
GRANT EXECUTE ON FUNCTION "public"."connections_clear_secret"("p_connection_id" "uuid") TO "service_role";


-- 4. Grants op de tabel zelf: `authenticated` mag onder RLS (policy hierboven)
-- uitsluitend zijn eigen rijen zien/beheren. `anon` krijgt bewust niets: anders
-- dan user_data (waar RLS toch alles blokkeert zonder sessie) heeft een
-- niet-ingelogde rol hier geen enkel legitiem gebruik.
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE "public"."connections" TO "authenticated";
GRANT ALL ON TABLE "public"."connections" TO "service_role";
