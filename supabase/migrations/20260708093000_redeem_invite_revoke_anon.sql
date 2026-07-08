-- S01b hardening: beperk EXECUTE op redeem_invite tot authenticated (en service_role).
--
-- Supabase zet in het public-schema `ALTER DEFAULT PRIVILEGES ... GRANT ALL ON
-- FUNCTIONS TO anon, authenticated, service_role`. Daardoor kreeg de nieuwe RPC bij
-- aanmaak ongewild EXECUTE voor de anon-rol (een REVOKE FROM PUBLIC dekt de named
-- rol `anon` niet). Een anonieme caller kan niet joinen (auth.uid() is NULL ->
-- NOT NULL-violatie op household_members.user_id -> de atomaire functie rolt terug),
-- maar we sluiten het resterende token-state-oracle en houden ons aan de spec:
-- inwisselen is alleen voor ingelogde gebruikers.

REVOKE ALL ON FUNCTION "public"."redeem_invite"("p_token" "text", "p_display_name" "text") FROM PUBLIC;
REVOKE ALL ON FUNCTION "public"."redeem_invite"("p_token" "text", "p_display_name" "text") FROM "anon";
GRANT EXECUTE ON FUNCTION "public"."redeem_invite"("p_token" "text", "p_display_name" "text") TO "authenticated";
