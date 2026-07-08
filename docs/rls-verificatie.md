# RLS-verificatie (S01, bijgewerkt in S01b)

Verificatie van de Row Level Security op het `public`-schema van de live Supabase-database,
zoals vastgelegd in de baseline-migration `supabase/migrations/20260708084246_baseline_schema.sql`.

**Methode.** Het schema is read-only opgehaald met `supabase db dump --linked --schema public`
(pg_dump via de CLI, geen wijziging aan de live database). De policies hieronder zijn letterlijk
uit die dump gelezen. Er is geen `db push` of `migration repair` uitgevoerd.

## Samenvatting

- **7 tabellen** in `public`, alle met RLS ingeschakeld: `user_data`, `profiles`, `households`,
  `household_members`, `household_invites`, `household_modules`, `household_module_data`.
  (De slice noemde er vijf; `profiles` en `household_modules` zijn extra en horen bij de deel-infra.)
- **23 policies**, plus een event trigger `rls_auto_enable` die RLS automatisch aanzet op elke
  nieuwe `public`-tabel. Geen enkele tabel staat op RLS-uit.
- Geen enkele policy gebruikt `using (true)` of `with check (true)`.
- Toegang is overal gebonden aan `auth.uid()` en, voor de gedeelde tabellen, aan
  huishoud-lidmaatschap via de helper-functies hieronder.
- **Eén reeel risico gevonden:** de SELECT-policy op `household_invites` stelt de hele
  invites-tabel open voor elke ingelogde gebruiker (zie Bevindingen). De rest is correct afgedicht.
  **Opgelost in S01b** (migration `20260708090000_redeem_invite_rls_fix.sql`), zie B1 hieronder.

## Helper-functies (fundament van de membership-checks)

De gedeelde tabellen leunen op twee `SECURITY DEFINER STABLE` functies:

- `is_household_member(hid)` - `EXISTS (SELECT 1 FROM household_members WHERE household_id = hid AND user_id = auth.uid())`.
- `is_household_admin(hid)` - idem, plus `AND role = 'admin'`.

Doordat ze `SECURITY DEFINER` zijn, draaien ze buiten RLS en voorkomen ze oneindige recursie
wanneer een policy op `household_members` zelf `household_members` moet raadplegen. Dit is de
correcte manier om membership-gebaseerde RLS te bouwen.

Daarnaast:

- `handle_new_user()` (`SECURITY DEFINER`, trigger op `auth.users`) maakt automatisch een
  `profiles`-rij aan bij registratie. Hierdoor is er geen open INSERT-policy op `profiles` nodig.
- `rls_auto_enable()` (event trigger) zet RLS aan op elke nieuw aangemaakte `public`-tabel.
  Defensief: een vergeten `ENABLE ROW LEVEL SECURITY` op een toekomstige tabel kan niet stil
  tot een lek leiden.

## Per tabel

### `user_data` (persoonlijke sync: `settings`, `day:*`)
- **Policies:** 1 (`ALL`): `using (auth.uid() = user_id) with check (auth.uid() = user_id)`.
- **Binding:** strikt per gebruiker. Een gebruiker ziet en schrijft alleen zijn eigen rijen.
- **Verdict:** correct. Volledige multi-account isolatie. Geen gaten.

### `profiles`
- **Policies:** SELECT (eigen rij OR mede-huisgenoten), UPDATE (alleen eigen rij).
- **INSERT/DELETE:** geen policy. INSERT loopt via de `handle_new_user()`-trigger; DELETE cascadeert
  vanuit `auth.users`. Zonder policy weigert RLS directe insert/delete door gebruikers - bedoeld gedrag.
- **Binding:** `auth.uid()`; de leesuitbreiding is gebonden aan gedeeld lidmaatschap.
- **Verdict:** correct. Lage-risico-observatie: display-namen van huisgenoten zijn leesbaar, wat
  functioneel gewenst is voor de deel-UI.

### `households`
- **Policies:** SELECT `is_household_member(id)`, INSERT (`auth.uid() IS NOT NULL AND created_by = auth.uid()`),
  UPDATE `is_household_admin(id)`, DELETE `is_household_admin(id)`.
- **Binding:** lezen alleen als lid, muteren alleen als admin, aanmaken alleen op eigen naam.
- **Verdict:** correct.

### `household_members` (INSERT bijgewerkt in S01b)
- **Policies:** SELECT `is_household_member`, INSERT `is_household_admin(household_id)` (de
  self-join-tak op een ingewisselde invite is in S01b verwijderd; het lid toevoegen via een invite
  gebeurt nu binnen de `redeem_invite`-RPC als definer, buiten RLS om), UPDATE (eigen rij OR admin),
  DELETE (admin OR eigen rij = zelf vertrekken).
- **Binding:** membership/admin plus `auth.uid()`.
- **Verdict:** correct. De join-via-invite loopt niet meer via een RLS-tak die op tabel-inhoud leunde,
  maar via de RPC; zie de bevinding bij `household_invites`.

### `household_invites` (bijgewerkt in S01b)
- **Policies (na S01b):**
  - SELECT: `is_household_admin(household_id)` (de tak `OR (auth.uid() IS NOT NULL)` is verwijderd).
  - INSERT: `is_household_admin(household_id) AND created_by = auth.uid()` (ongewijzigd).
  - UPDATE (inwisselen): **verwijderd.** Inwisselen loopt niet meer via een directe UPDATE-policy,
    maar uitsluitend via de `public.redeem_invite(p_token, p_display_name)`-RPC (`SECURITY DEFINER`,
    draait dus buiten RLS om). De RPC zoekt op exact token, geeft drie onderscheidbare foutcodes
    (`invite_not_found`, `invite_used`, `invite_expired`) en markeert de invite plus voegt het lid
    atomair toe.
  - DELETE: `is_household_admin(household_id)` (ongewijzigd).
- **Binding:** aanmaken/verwijderen correct admin-gebonden. De SELECT is nu ook admin-only; een
  niet-admin kan de tabel niet meer direct lezen. Joinen met een geldig token werkt nog steeds, maar
  loopt via de RPC, die het token nodig heeft (geen tabel-scan meer mogelijk).
- **Verdict:** **B1 opgelost in S01b.**

### `household_modules`
- **Policies:** SELECT `is_household_member`, INSERT/UPDATE/DELETE `is_household_admin`.
- **Binding:** lezen als lid, beheren als admin.
- **Verdict:** correct.

### `household_module_data` (gedeelde huishoud-data: `shared:*`)
- **Policies:** SELECT `is_household_member(household_id)` (leest alle rijen in het huishouden),
  INSERT/UPDATE/DELETE `is_household_member(household_id) AND user_id = auth.uid()` (alleen eigen rijen).
- **Binding:** leden lezen elkaars gedeelde data binnen het huishouden, schrijven alleen hun eigen rijen.
  Dit is precies de gewenste multi-account isolatie voor gedeelde huishoudens.
- **Verdict:** correct. Kern van de deel-functionaliteit is juist afgedicht.

## Bevindingen (gaten en risico's)

### B1 - `household_invites` SELECT is te ruim (middel/hoog) — **OPGELOST in S01b**
De SELECT-policy `is_household_admin(household_id) OR (auth.uid() IS NOT NULL)` liet **elke
ingelogde gebruiker de volledige invites-tabel lezen**, inclusief alle tokens van alle huishoudens.
In combinatie met de inwissel-policy (elke ingelogde gebruiker mocht een niet-verlopen, ongebruikte
invite op zijn naam zetten) en de self-join-tak op `household_members`, betekende dit dat een
ingelogde gebruiker in principe elk openstaand invite-token kon uitlezen en inwisselen, en zo kon
toetreden tot een willekeurig huishouden. De beveiliging leunde volledig op de geheimhouding van het
token, terwijl de policy die geheimhouding juist ophief.

**Oplossing (migration `supabase/migrations/20260708090000_redeem_invite_rls_fix.sql`, slice S01b):**
- De `household_invites` SELECT-policy is beperkt tot `is_household_admin(household_id)`; de open
  `OR (auth.uid() IS NOT NULL)`-tak is verwijderd.
- De open UPDATE-inwissel-policy op `household_invites` is verwijderd.
- De self-join-tak op de `household_members` INSERT-policy is verwijderd; alleen de admin-insert-tak
  blijft.
- Inwisselen loopt voortaan uitsluitend via `public.redeem_invite(p_token, p_display_name)`
  (`SECURITY DEFINER`, atomair): exacte token-match, drie onderscheidbare foutcodes
  (`invite_not_found`, `invite_used`, `invite_expired`), markeert de invite als gebruikt en voegt het
  lid toe in dezelfde transactie.

Het token blijft dus nodig om te joinen, zonder dat de hele tabel leesbaar is voor niet-admins.

### B2 - `profiles` zonder INSERT/DELETE-policy (informatief, geen gat)
Bewust: inserts via trigger, deletes via cascade. RLS weigert directe mutatie. Geen actie nodig.

## Wat NIET is gedaan (scope-grens)

- Geen `supabase db push` of `supabase migration repair`. De live database is niet gewijzigd, ook
  niet de `supabase_migrations.schema_migrations`-boekhouding.
- B1 is in S01 gerapporteerd, niet gedicht. Corrigeren vereist een policy-wijziging op de live
  database en hoort in een aparte slice met eigen review. **Dit is gebeurd in S01b**, zie B1 hierboven.

## Noot over `supabase db pull` en AC3

Een schone `supabase db pull` meldt op het schemaniveau "No schema changes found": het schema in de
repo komt overeen met de live database. Een `db pull` mét de baseline-migration aanwezig stopt echter
op een mismatch in de migration-history-boekhouding (`supabase_migrations.schema_migrations` bevat de
baseline-timestamp niet), omdat het project historisch niet migration-gedreven is opgezet. Het gelijk-zijn
van repo en live is daarom geverifieerd door een verse `db dump` byte-voor-byte te vergelijken met de
gecommitte baseline: **geen verschil**. De migration-history synchroniseren (via `migration repair`)
schrijft naar de live database en is bewust buiten deze slice gehouden; het is een keuze voor een
vervolgslice zodra het team migration-gedreven wil gaan werken.
