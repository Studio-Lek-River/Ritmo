# S02 — Connections-infra plus genormaliseerd items-model

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/35
**Fase:** 2 — Hygiëne plus Koppelingen
**Status:** concept

## Doel

De fundering leggen waar alle externe bronnen op landen (S03 Outlook, S04 Trello, S05 GitHub,
S09 MCP-server): een per-account `connections`-tabel met server-side versleutelde tokens (Supabase
Vault) en RLS, een genormaliseerd items-model plus een normalisatie-laag over de bestaande modules, en
een verbind- en verbreek-UI-shell met status. Zie `docs/ROADMAP.md` §S02.

Deze slice levert de **plumbing**, geen werkende provider-koppeling: er is nog geen provider om tegen te
authenticeren tot S03 (Azure/Outlook). De echte OAuth-handshake per provider landt in S03–S05. In S02
staat de UI-shell klaar met de verbind-actie als stub.

Afhankelijk van: S01b (veilige RLS-basis en de migration-gedreven workflow).

## Scope

**Wel in scope:**

- **Migration** (`supabase/migrations/<ts>_connections.sql`, via de S01b-workflow): tabel
  `connections` met kolommen `id`, `account_id` (FK `auth.users(id)` ON DELETE CASCADE), `provider`
  (`outlook` | `trello` | `github`), `label`, `status` (`connected` | `disconnected` | `error`),
  `external_account` (optioneel — laat meerdere accounts/borden per provider toe, ROADMAP S04),
  `token_secret_id` (verwijzing naar het Vault-secret, **geen** plaintext-token), `created_at`,
  `updated_at`. RLS `auth.uid() = account_id` (mirror `user_data`), met expliciete policies (de
  `rls_auto_enable`-trigger forceert RLS al op elke nieuwe tabel). Uniek op
  `(account_id, provider, external_account)`.
- **Server-side token-toegang:** de tokens worden versleuteld bewaard in Supabase Vault. Schrijven en
  lezen van Vault-secrets loopt uitsluitend server-side — via een `SECURITY DEFINER` RPC of de
  service-role in de `api/`-laag; **nooit** een anon/authenticated SELECT-recht op de secrets (mirror
  het `redeem_invite` REVOKE/GRANT-patroon). `api/`-scaffolding: een geauthenticeerde-endpoint-helper
  die de Supabase-JWT verifieert (`supabase.auth.getUser(jwt)`) met een service-role client via
  `process.env.SUPABASE_SERVICE_ROLE_KEY` (secret-patroon gelijk aan `api/feedback.js`). Endpoints:
  - `api/connections/disconnect` — werkt: verifieert de JWT, verwijdert het Vault-secret en zet
    `status = 'disconnected'` op de connection-rij van de aanroepende gebruiker.
  - `api/connections/connect` — stub: geeft een nette "provider nog niet beschikbaar" terug tot S03.
- **Genormaliseerd items-model plus normalisatie-laag:** een pure util `src/utils/normalizedItems.js`
  (stijl `taskBoard.js` / `dayTimeline.js`) die bestaande `tasks`- en `projects`-module-data plus een
  optionele `source`-binding mapt naar het ROADMAP-item-shape:
  `{ source, account, project, title, status, due, priority, progress, url }`. `deriveTaskStatus`
  hergebruiken; voortgang per project is een aggregatie over `(source, project)`. Een optioneel veld
  `source: { provider, connectionId }` op bestaande `tasks`/`projects`-modules — optioneel veld, geen
  nieuw module-type, geen migratie (principe 1).
- **Verbind/verbreek-UI-shell plus status:** een "Koppelingen"-sectie in het Account/Instellingen-scherm
  (`src/App.jsx`) die Outlook, Trello en GitHub toont met een status-chip (stijl `SyncStatusRow.jsx`) en
  verbind/verbreek-knoppen. Verbreek werkt end-to-end; verbind toont "binnenkort" of start de stub tot
  S03. Alleen zichtbaar met account plus sync aan (opt-in, principe 2). Frontend-glue:
  `src/sync/connections.js` (list/connect/disconnect) plus `src/hooks/useConnections.js`. Connection-
  **metadata** komt via een directe supabase-select onder RLS — **niet** via `user_data` /
  `isUserSyncKey`, want tokens mogen nooit door de browser-sync-tak.
- i18n: een nieuwe `connections.*`-groep in `src/i18n/nl.js` én `src/i18n/en.js`.
- `docs/ROADMAP.md`: de statusregel bij S02 bijwerken.

**Niet in scope (bewust):**

- De echte OAuth-handshake / token-acquisitie per provider (S03 Azure/Outlook, S04 Trello, S05 GitHub).
- Externe items daadwerkelijk ophalen en tonen (S03+). De normalisatie-laag werkt nu alleen over
  bestaande lokale modules; de externe-bron-tak wordt door de leesbronnen later gevuld.
- De MCP-server (S09), de Vandaag-feed / aggregatie-cache (S06), de planner (S07/S08).
- De `household`-variant van het genormaliseerde item. Ritmo is personal-only; per-account nu.

## Aanpak

- **Migration:** nieuwe `supabase/migrations/<ts>_connections.sql`. Toepassen via exact de S01b-workflow:
  `supabase migration list` (alleen de nieuwe migration mag pending zijn), read-only backup
  (`supabase db dump --linked`, niet committen, `.gitignore`), bevestigingspauze bij Bas, daarna
  `supabase db push`. Vault: `vault.create_secret` / `vault.update_secret`, decrypt via een
  `SECURITY DEFINER` RPC of service-role. Verifieer na de push dat `authenticated` geen SELECT op de
  secrets heeft.
- **api/:** nieuwe `api/connections/*.js`, Vercel-style handler `(req, res)` (mirror `feedback.js`).
  JWT-verificatie via `@supabase/supabase-js` met de Bearer-token; service-role client via
  `process.env.SUPABASE_SERVICE_ROLE_KEY` voor Vault-toegang. Presence-check op env, typed error-codes
  zoals in `feedback.js`.
- **Frontend:** `src/sync/connections.js` (list/connect/disconnect), `src/hooks/useConnections.js`, en
  een Koppelingen-sectie in `src/App.jsx`. Metadata via directe supabase-select onder RLS. De sectie is
  verborgen zonder account/sync (`isSyncEnabled()` + ingelogd).
- **Normalisatie:** `src/utils/normalizedItems.js` als pure functie; geen testrunner in de repo, dus
  sanity-check handmatig conform de testchecklist.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] **AC1** — Er is een `connections`-migration met RLS `auth.uid() = account_id`, tokens staan
  **niet** in een plaintext-kolom (Vault via `token_secret_id`), en er is een uniek-constraint op
  `(account_id, provider, external_account)`.
- [ ] **AC2** — De Vault-secrets zijn alleen server-side leesbaar: er is geen anon/authenticated
  SELECT-recht op de secrets; decrypt loopt via een `SECURITY DEFINER` RPC of de service-role.
- [ ] **AC3** — `api/connections/disconnect` verifieert de Supabase-JWT, verwijdert het Vault-secret en
  zet `status = 'disconnected'`; `api/connections/connect` geeft een nette "nog niet beschikbaar".
- [ ] **AC4** — `src/utils/normalizedItems.js` mapt bestaande `tasks`/`projects` naar het
  ROADMAP-item-shape inclusief progress-aggregatie per `(source, project)`; er is geen nieuw
  module-type; `source` is een optioneel veld op bestaande modules.
- [ ] **AC5** — De Koppelingen-UI toont de providers met status plus verbind/verbreek; verbreek werkt
  end-to-end (tegen een geseede connection-rij); de sectie is alleen zichtbaar met account plus sync
  (opt-in).
- [ ] **AC6** — Elke nieuwe UI-string staat in `src/i18n/nl.js` én `src/i18n/en.js`
  (`npm run check:i18n` slaagt).
- [ ] **AC7** — Geen wijzigingen buiten de scope van deze slice; bestaande gebruikersdata blijft veilig;
  zonder account/sync werkt de app ongewijzigd lokaal (principe 2).
- [ ] **AC8** — De migration is via `db push` toegepast na een `migration list`-check, een backup en een
  bevestigingspauze (S01b-workflow); de S02-statusregel in `docs/ROADMAP.md` is bijgewerkt.

## Testchecklist

- `supabase migration list` toont alleen de nieuwe connections-migration als pending; er is een backup
  gemaakt vóór de push.
- Een handmatige seed-rij in `connections` (via SQL): de verbreek-knop verwijdert de rij/secret en zet
  de status.
- Een directe `select` op de Vault-secrets als `authenticated` faalt of geeft niets; een metadata-select
  onder RLS lukt alleen voor de eigen `account_id`.
- `normalizedItems` op een profiel met `tasks`- plus `projects`-modules levert het juiste shape en de
  juiste per-project progress.
- Zonder Supabase-env of niet ingelogd: geen Koppelingen-sectie, de app werkt volledig lokaal, geen
  regressie.
- `npm run check:i18n` slaagt.
- `git status`: alleen de bedoelde bestanden, geen secrets, geen scope-lek.

**Let op — deze slice is groot** (DB `db push` naar de live database, `api/`-laag met de service-role,
frontend). De implementer volgt strikt de S01b-migration-workflow: backup plus bevestigingspauze vóór
`db push`, en wijzigt de live database niet zonder expliciet akkoord van Bas.
