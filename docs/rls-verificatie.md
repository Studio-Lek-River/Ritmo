# RLS-verificatie (S01)

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

### `household_members`
- **Policies:** SELECT `is_household_member`, INSERT (`is_household_admin` OR self-join met een geldig
  ingewisselde invite), UPDATE (eigen rij OR admin), DELETE (admin OR eigen rij = zelf vertrekken).
- **Binding:** membership/admin plus `auth.uid()`. De self-join-tak vereist een `household_invites`-rij
  die door `auth.uid()` is ingewisseld (`used_by = auth.uid() AND used_at IS NOT NULL`).
- **Verdict:** correct van opzet. De veiligheid van de self-join hangt af van de geheimhouding van het
  invite-token; zie de bevinding bij `household_invites`.

### `household_invites`
- **Policies:**
  - SELECT: `is_household_admin(household_id) OR (auth.uid() IS NOT NULL)`.
  - INSERT: `is_household_admin(household_id) AND created_by = auth.uid()`.
  - UPDATE (inwisselen): `auth.uid() IS NOT NULL AND used_by IS NULL AND expires_at > now()`
    `with check (used_by = auth.uid())`.
  - DELETE: `is_household_admin(household_id)`.
- **Binding:** aanmaken/verwijderen correct admin-gebonden. Maar de **SELECT** is door de tak
  `OR (auth.uid() IS NOT NULL)` open voor elke ingelogde gebruiker.
- **Verdict:** **risico, zie Bevindingen.**

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

### B1 - `household_invites` SELECT is te ruim (middel/hoog)
De SELECT-policy `is_household_admin(household_id) OR (auth.uid() IS NOT NULL)` laat **elke
ingelogde gebruiker de volledige invites-tabel lezen**, inclusief alle tokens van alle huishoudens.
In combinatie met de inwissel-policy (elke ingelogde gebruiker mag een niet-verlopen, ongebruikte
invite op zijn naam zetten) en de self-join-tak op `household_members`, betekent dit dat een ingelogde
gebruiker in principe elk openstaand invite-token kan uitlezen en inwisselen, en zo kan toetreden tot
een willekeurig huishouden. De beveiliging leunt volledig op de geheimhouding van het token, terwijl
de policy die geheimhouding juist opheft.

**Aanbeveling (buiten scope van S01, voorstel voor vervolgslice):** het opzoeken/inwisselen van een
invite via een `SECURITY DEFINER` RPC laten lopen die op exact token matcht, en de directe SELECT
beperken tot `is_household_admin(household_id)`. Zo blijft het token nodig om te joinen, zonder dat de
hele tabel leesbaar is.

### B2 - `profiles` zonder INSERT/DELETE-policy (informatief, geen gat)
Bewust: inserts via trigger, deletes via cascade. RLS weigert directe mutatie. Geen actie nodig.

## Wat NIET is gedaan (scope-grens)

- Geen `supabase db push` of `supabase migration repair`. De live database is niet gewijzigd, ook
  niet de `supabase_migrations.schema_migrations`-boekhouding.
- B1 is gerapporteerd, niet gedicht. Corrigeren vereist een policy-wijziging op de live database en
  hoort in een aparte slice met eigen review.

## Noot over `supabase db pull` en AC3

Een schone `supabase db pull` meldt op het schemaniveau "No schema changes found": het schema in de
repo komt overeen met de live database. Een `db pull` mét de baseline-migration aanwezig stopt echter
op een mismatch in de migration-history-boekhouding (`supabase_migrations.schema_migrations` bevat de
baseline-timestamp niet), omdat het project historisch niet migration-gedreven is opgezet. Het gelijk-zijn
van repo en live is daarom geverifieerd door een verse `db dump` byte-voor-byte te vergelijken met de
gecommitte baseline: **geen verschil**. De migration-history synchroniseren (via `migration repair`)
schrijft naar de live database en is bewust buiten deze slice gehouden; het is een keuze voor een
vervolgslice zodra het team migration-gedreven wil gaan werken.
