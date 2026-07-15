# S07 — Outlook lezen

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/36
**Status:** concept

## Doel

De eerste leesbron van de integrale planner (#33, `docs/ROADMAP.md` §"Fase B, Koppelingen (lezen)"):
je Outlook-afspraken ophalen zodat de planner er **omheen** kan plannen en agenda-items **als bron**
worden getoond. Levering: Microsoft Graph via een eigen Azure-app, OAuth met authority `consumers`
(verplicht voor persoonlijke accounts, anders sneuvelt de refresh-token na ~1u), scope `Calendars.Read`,
server-side token-refresh, afspraken genormaliseerd naar items.

**Afhankelijk van:** S02 (gemerged, 0.52.0). De hele substraat staat er al en is expliciet voor deze
slice voorbereid:
- `connections`-tabel + RLS + Vault-RPC's `connections_set_secret` / `connections_get_secret` /
  `connections_clear_secret` (service-role-only) — gemarkeerd "voor gebruik door S03+/OAuth".
- `api/connections/connect.js` is een 501-stub; `api/connections/disconnect.js` is de skeleton (JWT →
  `supabase.auth.getUser` → service-role → RPC).
- Koppelingen-UI (`src/components/ConnectionsSection.jsx`) met een Outlook-rij + `useConnections`-hook.

**De planner (S03–S06) staat ook op main** (0.52.0), dus de weergave-plek is concreet:
- `src/utils/planDay.js` heeft al de `external`-parameter ("nog lege external-agenda-haak voor S07").
- `src/App.jsx` roept in `handleShareDay` `planDay({ …, external: [] })` aan — precies de haak die S07 vult.
- `src/views/WeekView.jsx` heeft al een legenda-swatch `r-block-agenda`; `src/index.css` heeft de klasse;
  `planner.legend.agenda` bestaat in beide i18n-bestanden. Alleen het **renderen** ontbreekt nog.

**Poort-0-beslissingen (Bas):**
- **Verbind-UX:** volledige redirect (de knop navigeert de hele pagina naar Microsoft; de callback leidt
  terug naar het Account-scherm).
- **Weergave:** agenda-blokken in de (nu gemergde) planner + voeden van `planDay.external`.
- **Agenda-inhoud:** ephemeer ophalen, **niet** persistent opslaan (de feed/cache is S10).
- **Geen migratie:** refresh/access-token worden JSON-geëncodeerd in het bestaande enkele Vault-secret;
  S07 gebruikt de S02-RPC's ongewijzigd.

> **Let op — grote slice** (net als S02): OAuth-handshake, server-side refresh, Graph-fetch, normalisatie
> en planner-integratie. Verificatie end-to-end vereist een eenmalige Azure-app-registratie + env-vars
> (zie Prerequisites). De code kan volledig af zonder die stap; de handshake werkt zodra de env-vars staan.

## Scope

**Wel in scope:**

- **OAuth authorization-code flow (authority `consumers`), volledige redirect** — drie nieuwe endpoints
  onder `api/connections/outlook/`:
  - `POST start` (auth: Bearer) — verifieert de Supabase-JWT, zorgt dat er een `connections`-rij bestaat
    (`provider='outlook'`, `external_account=NULL`; service-role upsert), en geeft `{ authorizeUrl }`
    terug met een **HMAC-ondertekende `state`** (`account_id` + nonce + korte exp, sleutel
    `OAUTH_STATE_SECRET`).
  - `GET callback` (Microsoft-redirect, geen Bearer) — valideert de state-handtekening + exp, wisselt
    `code` in voor tokens op het token-endpoint (met `client_secret`), JSON-encodet
    `{ refresh_token, access_token, expires_at, scope }` en schrijft dat via `connections_set_secret`
    (zet status `connected`); redirect naar `/?tab=account&outlook=connected` (of `…=error`).
  - Scopes: `Calendars.Read offline_access openid` (+ optioneel `User.Read` voor een label).
- **Server-side refresh + Graph-fetch** — `POST events` (auth: Bearer): leest het secret via
  `connections_get_secret`; is het access-token verlopen, refresh via `grant_type=refresh_token` en
  schrijf de geroteerde tokens terug via `connections_set_secret`; roept Graph
  `/me/calendarView?startDateTime&endDateTime` aan voor de gevraagde range en geeft genormaliseerde
  afspraken terug. Getypeerde error-codes in `feedback.js`-stijl (`ms_auth`, `ms_rate_limit`,
  `token_refresh_failed`, `not_connected`, …).
- **Normalisatie** — `src/utils/outlookEvents.js` (pure util) mapt een Graph-event naar (a) een
  weergave-blok `{ dateKey, start, end, title, allDay }` en (b) het `planDay`-`external`-shape
  `{ start, end }`. Vult de `source`-tak van `src/utils/normalizedItems.js`
  (`source: { provider:'outlook', connectionId }`) voor de latere feed (S10), zonder nieuw module-type.
- **Frontend:**
  - `src/sync/connections.js`: `startOutlookConnect()` (POST start → `window.location.assign(authorizeUrl)`)
    en `fetchOutlookEvents(range)` (POST events), via het bestaande `callConnectionsApi`-patroon.
  - `src/components/ConnectionsSection.jsx`: de Outlook-`connect`-knop start de OAuth-redirect i.p.v. de
    stub; nieuwe OAuth-error-codes in de `ERROR_KEYS`-allow-list.
  - `src/App.jsx`: leest bij terugkeer `?outlook=connected|error` → toast (`useToast`) + `refresh()` van
    de connections; agenda-state doorgeven aan de views; `external` vullen in
    `buildPlanInputs`/`handleShareDay` met de afspraken van die dag (nu `external: []`).
  - **Afspraken ophalen** (ephemeer, geen persistentie): fetch de zichtbare week wanneer Outlook
    `connected` is en de Planner open is; houd in React-state gekeyd op `dateKey`.
  - **Renderen** als `r-block-agenda` (read-only, niet-versleepbaar) in `src/views/WeekView.jsx` met de
    bestaande `blockStyle(time, duration)`. De dag-weergave van de agenda loopt via WeekViews interne
    Dag/Week-toggle; de nooit-gemounte `DagView.jsx` is als dode code verwijderd (#107).
- **i18n** (nl + en, key-pariteit): nieuwe `connections.errors.*` (OAuth-codes) + eventuele toast/label
  onder `connections.*` / `planner.*`. `planner.legend.agenda` bestaat al.
- Documenteer de nieuwe server-env-vars naast `GITHUB_TOKEN` / `SUPABASE_SERVICE_ROLE_KEY`.

**Niet in scope (bewust):**

- Wegschrijven naar Outlook (`Calendars.ReadWrite`) — S12 (#41).
- Vandaag-feed / aggregatie-cache en persistente opslag van agenda-inhoud — S10 (#39).
- Trello (#37) en GitHub (#38) leesbronnen.
- Een nieuwe migratie of schemawijziging — S07 gebruikt de bestaande S02-Vault-RPC's ongewijzigd.

## Aanpak

**Geraakte bestanden:**

- `api/connections/outlook/start.js`, `…/callback.js`, `…/events.js` — **nieuw**. Skeleton uit
  `api/connections/disconnect.js` (`getBearerToken`, service-role-client uit `VITE_SUPABASE_URL` +
  `SUPABASE_SERVICE_ROLE_KEY`, `supabase.auth.getUser(jwt)`, getypeerde codes). Upstream-`fetch` +
  status→code-mapping uit `api/feedback.js`. Token-opslag via de bestaande RPC's `connections_set_secret`
  / `connections_get_secret` (`supabase.rpc(...)`).
- `src/utils/outlookEvents.js` — **nieuw**, puur/deterministisch; hergebruikt tijd-helpers uit
  `dayTimeline.js` / `sleep.js` (`parseHHMM`) net als `planDay.js`. Geen storage-toegang.
- `src/sync/connections.js` — `startOutlookConnect` + `fetchOutlookEvents` via `callConnectionsApi`.
- `src/hooks/useConnections.js` of een kleine `useOutlookEvents(dateKeys)` — ephemere fetch-state.
- `src/App.jsx` — `?outlook=…`-afhandeling + toast; agenda-state naar de views; `external` in
  `buildPlanInputs`/`handleShareDay`.
- `src/views/WeekView.jsx` — `r-block-agenda`-blokken renderen (dag-weergave via de interne
  Dag/Week-toggle). De ongebruikte `src/views/DagView.jsx` is verwijderd (#107).
- `src/components/ConnectionsSection.jsx` — Outlook-connect start de redirect; nieuwe error-keys.
- `src/i18n/nl.js` + `src/i18n/en.js` — nieuwe keys met pariteit.

**Hergebruik (niet opnieuw bouwen):**

- Auth-endpoint-patroon (JWT-verify + service-role + getypeerde codes) uit `api/connections/disconnect.js`.
- Upstream-`fetch` + error-code-mapping uit `api/feedback.js`.
- Vault-toegang via de S02-RPC's `connections_set_secret` / `connections_get_secret`.
- `callConnectionsApi` (Bearer + code→Error) uit `src/sync/connections.js`; `useToast` /
  `src/hooks/useToast.jsx`; `blockStyle` + grid-geometrie uit `src/views/WeekView.jsx`; `parseHHMM` /
  `DAGDEEL_THRESHOLDS` / `DEFAULT_BLOCK_MINUTES` uit `src/utils/dayTimeline.js` / `src/utils/sleep.js`.
- De reeds gereserveerde `planDay.external`-haak en de `r-block-agenda`-stijl + `planner.legend.agenda`.

## Prerequisites (Bas, eenmalig — buiten de code)

- Azure-app: authority **`consumers`**, scopes `Calendars.Read` + `offline_access` (+ `openid`/`User.Read`),
  redirect-URI `http://localhost:5173/api/connections/outlook/callback` (dev; vóór productie ook
  `https://<prod-host>/api/connections/outlook/callback` toevoegen).
- Server-env-vars in het host-dashboard (zelfde plek als `GITHUB_TOKEN`): `MS_CLIENT_ID`,
  `MS_CLIENT_SECRET`, `MS_OAUTH_REDIRECT_URI`, `OAUTH_STATE_SECRET`.
- **Hosting-check:** de `api/`-handlers zijn Vercel-stijl terwijl de docs "Netlify-preview" noemen en er
  geen `netlify.toml`/`vercel.json` in de repo staat. Bevestig hoe `api/` op de host wordt
  gebouwd/gerouteerd zodat de callback-URL klopt. Kale `vite` serveert `api/` niet — lokaal end-to-end
  testen vereist de dev-runner van de host. Raakt config, niet de code.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] **AC1** — Outlook-`connect` start een echte `consumers`-OAuth-redirect; de callback wisselt de code
  **server-side** in en bewaart uitsluitend in Vault (nooit een token in de browser of in een
  `connections`-kolom). De `state` is HMAC-ondertekend en op exp gecontroleerd (CSRF).
- [ ] **AC2** — Token-refresh loopt server-side via `grant_type=refresh_token`; geroteerde tokens worden
  teruggeschreven via `connections_set_secret`. Een verlopen access-token blokkeert de fetch niet.
- [ ] **AC3** — `POST /api/connections/outlook/events` geeft genormaliseerde afspraken voor een
  datum-range; agenda-inhoud wordt **niet** persistent opgeslagen (ephemere fetch).
- [ ] **AC4** — Afspraken verschijnen als read-only `r-block-agenda`-blokken in WeekView, zowel in de
  week- als in de dag-modus van WeekViews interne Dag/Week-toggle (light + dark, geen hardcoded
  oppervlakte-kleuren of UI-tekst).
- [ ] **AC5** — "Deel mijn dag in" plant om de afspraken heen (`planDay.external` gevuld) en overschrijft
  ze niet.
- [ ] **AC6** — `src/utils/outlookEvents.js` is puur/deterministisch en schrijft nooit naar opslag.
- [ ] **AC7** — Elke nieuwe UI-string staat in `src/i18n/nl.js` én `src/i18n/en.js`
  (`npm run check:i18n` slaagt).
- [ ] **AC8** — `npm run build` groen; geen wijzigingen buiten de scope; geen nieuwe migratie.
- [ ] **AC9** — Zonder Outlook-koppeling / zonder env werkt de app ongewijzigd (opt-in, principe 2);
  bestaande gebruikersdata blijft veilig.

## Testchecklist

- `npm run build` + `npm run check:i18n` groen.
- Met env-vars gezet en de host-dev-runner actief: Account → Koppelingen → Outlook "Verbinden" →
  Microsoft-consent → terug in Ritmo, status `Verbonden`, toast.
- Planner openen: Outlook-afspraken staan als agenda-blokken; "Deel mijn dag in" plaatst pool-taken in de
  gaten ertussen, nooit eroverheen.
- Verbreken → status `disconnected`, secret weg (bestaande disconnect-flow), agenda-blokken verdwijnen.
- Een directe `select` als `authenticated` levert nooit een token (alleen metadata onder RLS).
- Zonder env / zonder koppeling: geen regressie, app volledig lokaal.
- `git status`: alleen de bedoelde bestanden, geen secrets, geen scope-lek.
