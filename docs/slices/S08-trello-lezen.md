# S08 — Trello lezen

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/37
**Status:** concept

## Doel

De tweede leesbron van de integrale planner (#33, `docs/ROADMAP.md` §"Fase B, Koppelingen (lezen)"):
kaarten uit meerdere Trello-borden als items, met voortgang per bord en per lijst.

**Het model: een Trello-bord ís een project.** Bord → `projects`-module, lijst → subject, kaart →
subgoal, met een `source`-binding op de module en een duidelijk Trello-kenmerk. Dat volgt de
architectuurnotitie in `docs/ROADMAP.md` letterlijk ("externe bron is geen nieuw module-type: een
bestaande `tasks`- of `projects`-module plus een `source`-binding") en het is waar
`src/utils/normalizedItems.js` al op is ontworpen: het leest `mod.source` en aggregeert voortgang per
project.

Daardoor is er **geen nieuw weergave-pad nodig**: `src/utils/dayTimeline.js` rendert projectsubgoals al
in de takenpool, `TaskPoolPanel` groepeert ze al, de auto-planner in `App.jsx` plant ze al in, en
`ProjectsView` toont ze al met voortgang.

**Afhankelijk van:** S02 (connections-infra). Het substraat staat er al en is hier expliciet op
voorbereid:
- `supabase/migrations/20260713120000_connections.sql`: `trello` staat al in de provider-CHECK; de
  Vault-RPC's `connections_set_secret` / `connections_get_secret` / `connections_clear_secret` zijn
  provider-agnostisch. **Geen migratie in deze slice.**
- `api/connections/disconnect.js` werkt al voor Trello; `api/connections/connect.js` is de 501-stub die
  Trello nu aanroept.
- `src/sync/connections.js` (`CONNECTION_PROVIDERS` bevat `trello`, generieke `callConnectionsApi`),
  `src/hooks/useConnections.js`, `src/utils/sourcePrefs.js` (`SOURCE_ICONS.trello` + default `teal`) en
  `src/components/SourcesPanel.jsx` (rendert de Trello-rij al).

## Poort-0-beslissingen (Bas)

1. **Auth: geen OAuth.** Trello ondersteunt geen OAuth 2.0, en we gebruiken ook geen OAuth 1.0a
   (HMAC-SHA1-signing + request-token-dans). In plaats daarvan de key+token-flow: Ritmo heeft één
   Trello Power-Up, de key staat als server-env `TRELLO_API_KEY`. De gebruiker opent Trello's
   toestemmingspagina **zonder `return_url`** — Trello toont het token dan op een pagina — kopieert het
   en plakt het in Ritmo. De frontend POST het naar de server, die het in de Vault zet. **Het token komt
   nooit in een URL, fragment of browsergeschiedenis.** Geen callback-endpoint, geen HMAC-state.
2. **Eén Trello-account per gebruiker** (`external_account = NULL`, exact het Outlook-patroon met
   `.maybeSingle()`), wél meerdere borden. Meerdere Trello-accounts is een vervolgslice; de frontend
   gaat nu overal uit van één connectie per provider en die aanname blijft staan.
3. **Bord → module, lijst → subject, kaart → subgoal.** De drie Trello-niveaus mappen 1-op-1.
4. **Trello-modules leven device-lokaal** en worden bij het renderen samengevoegd met de echte modules
   (zie "De kernbeslissing" hieronder).
5. **Pool-filter:** `due` → `deadline`, plus per bord één lijst naar keuze die elke dag meedoet
   (`freeBlock`).

## De kernbeslissing: afgeleide modules

Gewone modules leven in `settings`, en `settings` is **één sync-record**
(`src/sync/userDataStorage.js` → `isUserSyncKey`). Trello-kaarten daarin zetten zou betekenen:
- elke settings-schrijfactie (ook een darkMode-toggle) duwt álle kaarten opnieuw naar Supabase;
- een sync-conflict wordt profielbreed in plaats van Trello-breed (`pullUserData` lost per key op);
- kaarttitels belanden in de cloud én in elk backup-bestand (`src/utils/backup.js`).

Dat botst met de regel waarvoor `src/utils/agendaCache.js` en `src/utils/agendaSelection.js` speciaal
buiten `settings` zijn gehouden. Daarom worden Trello-modules **afgeleid** uit een device-lokale cache
en bestaan ze alleen in het geheugen:

```
settings.modules  = [Ochtend, Fysio, Werk]          -> cloud + backup
trello:cards      = { boards, lists, cards }        -> alleen dit apparaat
trello:boardPrefs = { [boardId]: { include, alwaysListId } }

allModules = [...modules, ...buildTrelloModules(cache, prefs)]
```

Vier eigenschappen die dat gratis oplevert:
- Kaarttitels blijven op het apparaat, consistent met de Outlook-agenda.
- Read-only is afdwingbaar: ze staan niet in de `modules`-state, dus `setModules` raakt ze nooit.
- Opnieuw synchroniseren = de cache vervangen; geen merge, geen wees-data.
- **Id-botsingen verdwijnen.** Ids worden een pure functie van de Trello-ids. Dat omzeilt meteen een
  bestaand probleem: subgoals krijgen in `ProjectsView` een id `goal_${Date.now()}` zónder
  random-suffix, wat bij een bulk-import in één tick dubbele ids zou geven.

**Prop-routing — hier gaat het mis als het slordig gebeurt.** Elk mutatiepad houdt de settings-only
lijst, zodat een Trello-module nooit in `settings` belandt:

| Krijgt `allModules` | Krijgt `modules` (settings-only) |
|---|---|
| `baseEnabledModules` (Vandaag-feed, `App.jsx` r.1772) | `SettingsModal` (r.2211) |
| de auto-planner (r.1469) | `ModuleEditor` (r.2242) |
| `ProjectsView` (r.2052) | `CollectionsView` (r.2071) |
| `ProductivitySuiteView` (r.2114) | `InsightView` (r.2104) |

De hele set is gated op `getSourcePref(sourcePrefs, 'trello').visible` — de bestaande oog-toggle in
`SourcesPanel` is daarmee de aan/uit-schakelaar voor heel Trello.

## Scope

**Wel in scope:**

- **Vier endpoints onder `api/connections/trello/`** (alle POST, Bearer-JWT, service-role) plus een
  `_shared.js`. Geen callback. **Trello-tokens met `expiration=never` verlopen niet**, dus geen
  refresh-tak en geen rotatie — wezenlijk simpeler dan Outlook.
  - `start.js` — `{}` → `{ authorizeUrl }`. Nodig omdat `TRELLO_API_KEY` server-only is en de frontend
    de link dus niet zelf kan bouwen. Verzekert de `connections`-rij (`provider='trello'`,
    `external_account=NULL`); status blijft `disconnected` tot het token er is.
  - `token.js` — `{ token }` → `{ ok, account: { username, fullName } }`. Zie tokenvalidatie hieronder.
  - `boards.js` — `{}` → `{ boards: [{ id, name, url }] }` via
    `GET /1/members/me/boards?filter=open&fields=id,name,shortUrl&lists=none`.
  - `cards.js` — `{ boardIds }` → `{ boards: [{ id, name, url, lists, cards }], failedBoardIds }`.
  - `_shared.js` — `REQUIRED_TRELLO_ENV` + `missingTrelloEnv()`, `classifyTrelloStatus` (401/403 →
    `trello_auth`, 429 → `trello_rate_limit`, rest → `trello_error`), `requireTrelloConnection`
    (rij + Vault-secret; `status !== 'connected'` → 409 `not_connected`), in-memory rate limit.
- **Tokenvalidatie vóór opslaan** in `token.js`: formaat (32–128 alfanumeriek) → dan
  `GET /1/members/me?fields=id,username,fullName`. Die call bewijst precies wat nodig is (dit token
  hoort bij deze key en is geldig) en levert de `username` voor het `label` op de rij en voor de toast.
  **Faalt de validatie → niets aan de rij aanraken**, zodat een verkeerde plak-poging een werkende
  koppeling niet sloopt. `connections_set_secret` zet zelf al `status='connected'`.
- **Device-lokale opslag**, beide **zonder** `settings`/`day:`/`household:`-prefix:
  - `src/utils/trelloCache.js` — key `trello:cards`, `{ version, connectionId, fetchedAt, boards }`. Een
    geslaagde fetch **vervángt** de cache (geen `mergeEventsByDate`-equivalent nodig: `cards.js` levert
    per fetch het volledige beeld). `connectionId`-mismatch wist de cache.
  - `src/utils/trelloBoardPrefs.js` — key `trello:boardPrefs`,
    `{ version, connectionId, boards: { [id]: { include, alwaysListId } } }`. Apart van de cache zodat
    de bordkeuze een cache-wipe overleeft.
- **`src/utils/trelloModules.js`** (nieuw, puur, schrijft nooit naar opslag) —
  `buildTrelloModules(cache, prefs, { connectionId, color })` bouwt per aangevinkt bord een
  `projects`-module met deterministische ids (`trello:board:<id>`, `trello:list:<id>`,
  `trello:card:<id>`), `source: { provider: 'trello', connectionId, url }`, `icon: 'Trello'`,
  `completed: card.dueComplete`, `deadline` uit `due`, en `freeBlock` voor de gekozen altijd-lijst.
- **Frontend:**
  - `src/sync/connections.js`: `fetchTrelloAuthorizeUrl`, `saveTrelloToken`, `fetchTrelloBoards`,
    `fetchTrelloCards` via het bestaande generieke `callConnectionsApi`. **Géén**
    `window.location.assign` zoals `startOutlookConnect`: de authorize-URL opent in een nieuw tabblad
    zodat Ritmo open blijft terwijl de gebruiker het token kopieert.
  - `src/components/TrelloConnectDialog.jsx` (nieuw): twee stappen — link naar de toestemmingspagina,
    dan een invoerveld voor het token.
  - `src/components/ConnectionsSection.jsx`: `handleConnect` wordt een `switch (provider)` in plaats van
    de huidige `if (provider !== 'outlook')`; `outlookBusy`/`outlookError` → provider-agnostisch
    `connectBusy`/`connectError`; nieuwe codes in de `ERROR_KEYS`-allow-list.
  - `src/components/TrelloBoardPicker.jsx` (nieuw): in de Trello-rij van `SourcesPanel`, want dat panel
    gaat al over "kies per bron of hij meetelt in de planner". Per bord een checkbox (`include`) en een
    `<select>` voor de altijd-lijst, plus de kaarten-per-lijst-telling. Fetcht de borden **pas bij
    uitklappen**, niet bij Planner-open. `SourcesPanel` krijgt daarvoor één optioneel veld op de
    bestaande `sourceActions`-haak: `sourceActions[provider].panel` (ReactNode).
  - `src/hooks/useTrelloCards.js` (nieuw): structureel `useOutlookEvents.js` — cache-first,
    `requestToken`-ref tegen races, `active=false` → state leeg, en **een mislukte fetch zet alleen
    `error` en laat de state ongemoeid**.
  - `src/App.jsx`: `allModules`-useMemo, `trelloBoardPrefs`-state, `useTrelloCards`, en een
    `wasTrelloConnectedRef`-effect naast het bestaande `wasOutlookConnectedRef` dat bij verbreken
    `clearTrelloCache()` + `clearTrelloBoardPrefs()` doet. Hergebruikt de **bestaande**
    `useConnections`-instantie (r.1372), geen tweede.
  - `src/utils/icons.js`: `Trello` toevoegen aan `ICON_OPTIONS` (lucide levert hem al en
    `sourcePrefs.js` importeert hem al). Zonder dat valt `ProjectsModule` terug op `Sparkles`.
- **Read-only-handhaving + het Trello-kenmerk in `src/views/ProjectsView.jsx`.** Dit moet gebouwd
  worden: ProjectsView heeft nu **geen enkel** read-only-pad en al zijn mutaties lopen ongeguard via
  `updateProject` → `setModules`. Voor een module met `source`:
  - geen subject toevoegen/verwijderen, geen subgoal toevoegen/verwijderen;
  - geen afvinken, geen cijfer, geen freeBlock-checkbox (die keuze loopt via de bord-kiezer);
  - geen "project verwijderen" in het `...`-menu (ontkoppelen doe je bij de bron);
  - een **Trello-badge** op de projectkaart plus een link naar het bord op trello.com, en per kaart een
    link naar de kaart. `subgoal.url` bestaat al in het datamodel maar wordt nergens gezet of getoond —
    dit is de eerste plek die dat doet.
- **`src/utils/dayTimeline.js`: twee regels.** `source` doorgeven op het pool-item (zodat
  `TaskPoolPanel` het Trello-icoon als kenmerk kan tonen) en `toggle: undefined` als de module een
  `source` heeft. `TaskPoolPanel` honoreert `!item.toggle` al — dat patroon bestaat al voor virtuele
  recurring-taken. Geen `externalTasks`-parameter, geen nieuw pool-kind.
- **Twee opruimingen die deze slice zelf afdwingt:**
  1. `api/connections/_shared.js` (nieuw, aparte `refactor:`-commit vooraf): `getBearerToken` +
     `getServiceClient` eruit trekken; `outlook/_shared.js` re-exporteert ze (nul gedragswijziging,
     bestaande imports blijven werken). Alternatief is duplicatie die S09 nog eens verergert.
  2. De hardcoded Outlook-labels in `SourcesPanel` (`planner.outlook.refresh`/`import`) worden
     gerenderd voor élke provider met een `sourceActions`-entry. Zodra Trello er een krijgt, staat er
     letterlijk "Outlook-agenda vernieuwen" op de Trello-rij. Dat is geen scope-creep maar een bug die
     S08 zelf veroorzaakt. Fix: generieke keys met de bestaande `{provider}`-interpolatie
     (`planner.sources.refresh` = `'{provider} vernieuwen'`), waarna het `planner.outlook`-blok
     vervalt. **Zichtbaar neveneffect, bewust geaccepteerd:** "Outlook-agenda importeren" wordt
     "Outlook importeren". `connections.errors.notConnected` zegt nu "Outlook is niet (meer) gekoppeld"
     en wordt door `trello/cards.js` hergebruikt → generiek maken.
- **i18n** (nl + en, key-pariteit): `connections.trello.*` (dialoog), `connections.toast.trelloConnected`,
  `connections.errors.trello*` + `invalidTokenFormat` + `rateLimited`, `planner.sources.*` (generiek),
  `planner.trello.*` (bord-kiezer), en een Trello-badge-label.
- **Env:** één nieuwe var `TRELLO_API_KEY` (server-only, **geen** `VITE_`-prefix). Documenteren in
  `.env.local.example` en de env-tabel in `docs/DEPLOY.md`.
- `docs/ROADMAP.md`: de statusregel bij S08 bijwerken.

**Niet in scope (bewust):**

- Schrijven naar Trello (kaarten afvinken, verplaatsen, aanmaken). S08 is expliciet **lezen**, eenrichting.
- Meerdere Trello-accounts (`external_account` vullen, meerdere rijen per provider). De frontend gaat
  overal uit van één connectie per provider; dat omzetten is een eigen slice.
- `normalizedItems.js` activeren — dat is de S10-vraag (de Vandaag-feed die alle bronnen samenbrengt),
  met GitHub erbij op tafel. Het shape van `trelloModules.js` sluit er wel bewust op aan.
- De Kanban-view (`KANBAN_COLUMNS` is hardcoded op drie statussen; Trello-lijsten mappen daar niet op
  zonder informatieverlies of een dynamische-kolommen-refactor) en het weekrooster (`WeekView`).
  Trello-kaarten zijn taken, geen afspraken: ze blokkeren geen tijd, dus `planDay.external` blijft leeg.
- GitHub lezen (#38) en de Vandaag-feed (#39).
- Een nieuwe migratie of schemawijziging — S08 gebruikt de bestaande S02-Vault-RPC's ongewijzigd.
- Webhooks / achtergrond-sync. Vernieuwen is een expliciete actie in de Koppelingen-rij.

## Aanpak

**Nieuw:** `api/connections/trello/{_shared,start,token,boards,cards}.js`, `api/connections/_shared.js`,
`src/utils/{trelloModules,trelloCache,trelloBoardPrefs}.js`, `src/hooks/useTrelloCards.js`,
`src/components/{TrelloConnectDialog,TrelloBoardPicker}.jsx`.

**Gewijzigd:** `api/connections/outlook/_shared.js`, `src/sync/connections.js`,
`src/components/{ConnectionsSection,SourcesPanel,TaskPoolPanel}.jsx`, `src/views/ProjectsView.jsx`,
`src/utils/{dayTimeline,icons}.js`, `src/App.jsx`, `src/i18n/{nl,en}.js`, `.env.local.example`,
`docs/DEPLOY.md`, `docs/ROADMAP.md`.

**Expliciet niet geraakt:** `supabase/migrations/**`, `src/hooks/useConnections.js`,
`src/utils/normalizedItems.js`, `src/views/KanbanView.jsx`, `src/views/WeekView.jsx`,
`src/utils/planDay.js`, `src/utils/defaultModules.js`.

**Hergebruik (niet opnieuw bouwen):**
- Auth-endpoint-patroon (JWT-verify + service-role + getypeerde codes) uit `api/connections/disconnect.js`.
- Upstream-`fetch` + status→code-mapping en de in-memory rate limit uit `api/feedback.js`.
- Vault-toegang via de S02-RPC's; `connections_set_secret` zet zelf `status='connected'`.
- `callConnectionsApi`, `listConnections`, `useConnections`, `useToast`.
- `src/utils/agendaSelection.js` + `agendaCache.js` als blauwdruk voor de device-lokale opslag.
- `src/hooks/useOutlookEvents.js` als sjabloon voor `useTrelloCards`.
- `sourcePrefs` (`SOURCE_ICONS.trello`, default `teal`), `SourcesPanel`, `ProgressBar`, `projects.js`
  (`projectProgress` / `subjectProgress`), `dayTimeline`, `TaskPoolPanel`, `ProjectsView`.

**Payload-minimalisatie in `cards.js`** — één call per bord met nested resources, want de lijsten zijn
nodig als subjects:
```
GET /1/boards/{id}?fields=id,name,shortUrl&lists=open&list_fields=id,name
    &cards=open&card_fields=id,name,due,dueComplete,idList,shortUrl&card_limit=1000
```
Sequentieel over max 10 borden (ruim binnen Trello's 100 req/10s). `boardIds` valideren op
`/^[a-f0-9]{24}$/` — dat is tevens de path-injectie-hek. Een bord dat faalt gaat naar `failedBoardIds`;
alleen als álle borden falen → 502. Responses altijd expliciet mappen, nooit de rauwe Trello-payload
doorgeven (zelfde regel als `api/connections/outlook/events.js`).

## Valkuilen (lees dit vóór je begint)

1. **De comment in `src/utils/sourcePrefs.js` is feitelijk onjuist.** Hij zegt "nooit gesynchroniseerd
   naar het account", maar `sourcePrefs` leeft in `settings` en synct dus wél. Laat je daardoor niet
   verleiden de bordkeuze óók in `settings` te zetten — dat zou Trello-inhoud naar de cloud en in elk
   backup-bestand lekken. **`agendaSelection.js` is de blauwdruk, niet `sourcePrefs.js`.**

   **Uitzondering (later toegevoegd): `src/utils/sourceItemPrefs.js` leeft wél in `settings`.** Die map
   bewaart de dag, tijd en duur die de gebruiker zelf op een Trello-kaart of GitHub-issue zet, en die
   moeten over apparaten gelijk zijn — een duur die alleen op de laptop staat is geen duur. Dat mag hier
   omdat de inhoud ondoorzichtig is: de sleutels zijn opake ids (een Trello-ObjectId, een
   GitHub-database-id) en de waarden zijn een aantal minuten, een dagsleutel of een klokwaarde. Er staat
   geen bordnaam, kaarttitel of url in, en `withItemOverride` dwingt dat af door nooit de input van de
   aanroeper te spreaden maar expliciet de drie toegestane velden te plukken. De regel hierboven blijft
   dus staan voor bron-*inhoud*; hij gaat niet over opake verwijzingen. Zet hier nooit een label bij
   "voor de debugbaarheid".
2. **Tijdzone bij `due` → `deadline`.** Trello levert `due` als volledige UTC-ISO-timestamp (anders dan
   Graph, dat met de `Prefer`-header wall-clock levert). De `deadline` moet daarom via de **lokale**
   tijdzone: een kaart die om 23:00 UTC vervalt hoort in Amsterdam op de volgende dag. Dat wijkt bewust
   af van de tz-onafhankelijke regel in `outlookEvents.js` — documenteer het in een comment, anders
   "fixt" een latere reviewer het kapot.
3. **Trello kent geen done-vlag op een kaart.** `dueComplete` is het enige signaal en is alleen
   betekenisvol bij een kaart mét due-datum (zonder due staat hij altijd `false`). Kaarten uit de
   altijd-lijst krijgen dus `completed: false`. De bordvoortgang telt kaarten zonder datum mee als
   "niet klaar"; dat kan verrassen als je "8 van de 20 in Done" verwacht. Een "welke lijst betekent
   klaar"-keuze zou dat oplossen — bewust buiten scope.
4. **De in-memory rate limit is per serverless-instantie** en dus best-effort. Voor `token.js` (dat een
   geheim accepteert) is dat zwakker dan je zou willen; noem het in een comment. Aanvaardbaar omdat een
   aanvaller sowieso een geldige Ritmo-JWT nodig heeft.
5. **`card_limit=1000`** is Trello's plafond op nested cards; een groter bord wordt stil afgekapt.
   Vermeld dat in een comment.
6. **Landmijn voor S10, niet voor S08:** de progress-sleutel in `normalizedItems.js` is
   `(provider:connectionId)::subjectNaam`. Met lijsten als subjects krijgen twee borden met allebei een
   lijst "Doing" **dezelfde sleutel** en smelten hun voortgang samen. Geen probleem in S08 (de
   voortgang in ProjectsView loopt via `projects.js`, dat per module telt), maar S10 moet dit oplossen
   door de module-id in de sleutel op te nemen. Niet hier fixen — `normalizedItems.js` blijft ongemoeid.

## Prerequisites (Bas, eenmalig — buiten de code)

- Eén Trello Power-Up aanmaken en de API key kopiëren (https://trello.com/power-ups/admin).
- Server-env-var in het Vercel-dashboard (zelfde plek als `GITHUB_TOKEN` / `MS_CLIENT_ID`):
  `TRELLO_API_KEY`. Geen client secret nodig — de key+token-flow gebruikt hem niet.
- Lokaal testen vraagt `vercel dev`; kale Vite op 5173 serveert `api/` niet (zie `docs/DEPLOY.md`).

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] **AC1** — Zonder `TRELLO_API_KEY` geven de Trello-endpoints 500 `server_config` en logt de server
  de ontbrekende var-namen (nooit naar de client); de rest van Ritmo werkt ongewijzigd.
- [ ] **AC2** — "Verbinden" bij Trello opent een dialoog met een link naar `trello.com/1/authorize` met
  `scope=read`, `expiration=never`, `response_type=token` en **zonder `return_url`**, geopend in een
  nieuw tabblad. De API-key staat nergens in de client-bundel (`npm run build`, dan zoeken in `dist/`).
- [ ] **AC3** — Een geldig token zet de status op `connected` en toont een toast met de
  Trello-gebruikersnaam. Het token staat niet in `window.location`, niet in `history`, niet in
  IndexedDB en niet in `user_data` — uitsluitend in de Vault via `connections_set_secret`.
- [ ] **AC4** — Een onzin-token laat de status op `disconnected` en toont een formaat-fout; een geldig
  gevormd maar ingetrokken token toont een auth-fout en laat een bestaande koppeling ongemoeid.
- [ ] **AC5** — Direct na koppelen verschijnen er **geen** borden en gaat er geen `cards`-request uit;
  pas na het aanvinken van minstens één bord in de bord-kiezer wel (opt-in).
- [ ] **AC6** — Een aangevinkt bord verschijnt in de Projecten-tab als project met de Trello-badge, zijn
  lijsten als bakken en zijn kaarten als subdoelen, met kloppende voortgang per lijst en per bord.
- [ ] **AC7** — Vanaf dat project open je het bord op trello.com, en vanaf een kaart de kaart zelf, in
  een nieuw tabblad (`rel="noopener noreferrer"`).
- [ ] **AC8** — Een Trello-project is read-only: geen bak of subdoel toevoegen of verwijderen, niet
  afvinken, geen cijfer, geen freeBlock-checkbox, en geen "project verwijderen" in het `...`-menu.
- [ ] **AC9** — Een kaart met een due-datum vandaag staat in de takenpool en wordt door "deel mijn dag
  in" ingepland; het bolletje is `disabled` en de rij toont het Trello-icoon als kenmerk.
- [ ] **AC10** — Kaarten uit de per bord gekozen altijd-lijst staan elke dag in de pool; kaarten zonder
  due-datum uit andere lijsten niet.
- [ ] **AC11** — De oog-toggle op de Trello-rij verbergt de borden uit Projecten, Vandaag én de pool; de
  kleurkeuze slaat door op de projectkaarten.
- [ ] **AC12** — `window.storage.get('settings')` bevat na koppelen en het kiezen van borden **geen**
  bordnamen, lijstnamen, kaarttitels of bord-ids; een backup-export (`src/utils/backup.js`) bevat ze
  evenmin, en ook geen token.
- [ ] **AC13** — Een Trello-module belandt nooit in `settings.modules`: ook niet na een
  module-bewerking in Instellingen, een reorder, of "Reset modules".
- [ ] **AC14** — Borden staan er direct bij het openen van de app (uit de cache), vóór en zonder
  netwerk. Netwerk uit + "vernieuwen": de bestaande borden blijven staan en er verschijnt één
  foutmelding — de state wordt nooit leeggeveegd.
- [ ] **AC15** — Verbreken wist de borden uit de UI, de `trello:cards`-cache en `trello:boardPrefs`;
  opnieuw koppelen begint met een lege bordselectie.
- [ ] **AC16** — `src/utils/trelloModules.js` is puur en deterministisch en schrijft nooit naar opslag.
- [ ] **AC17** — De Trello-rij in `SourcesPanel` toont nergens het woord "Outlook"; `planner.outlook`
  komt niet meer voor in `src/`.
- [ ] **AC18** — Elke nieuwe UI-string staat in `src/i18n/nl.js` én `src/i18n/en.js`
  (`npm run check:i18n` slaagt); `npm run build` slaagt.
- [ ] **AC19** — Geen wijzigingen buiten de scope van deze slice; in het bijzonder geen wijzigingen in
  `supabase/migrations/`, `src/hooks/useConnections.js` of `src/utils/normalizedItems.js`.
- [ ] **AC20** — Nieuw gedrag is opt-in en uitschakelbaar; zonder `TRELLO_API_KEY` en zonder koppeling
  werkt de app volledig ongewijzigd en blijft bestaande gebruikersdata veilig.

## Testchecklist

- `npm run build` + `npm run check:i18n` groen.
- Met `TRELLO_API_KEY` gezet en `vercel dev` actief: Account → Koppelingen → Trello "Verbinden" →
  toestemmingspagina in een nieuw tabblad → token plakken → status `Verbonden` + toast met je
  Trello-gebruikersnaam.
- Planner → Koppelingen → Trello uitklappen → borden verschijnen → één bord aanvinken.
- Projecten-tab: het bord staat er met Trello-badge, lijsten als bakken, kaarten als subdoelen, link
  naar het bord. Bewerken kan niet.
- Planner: kaarten met een due-datum vandaag staan in de pool; "deel mijn dag in" plant ze in.
- Een altijd-lijst kiezen → die kaarten staan er ook zonder datum.
- Verbreken → borden en cache weg, secret weg (bestaande disconnect-flow).
- Een directe `select` als `authenticated` levert nooit een token (alleen metadata onder RLS).
- Zonder env / zonder koppeling: geen regressie, app volledig lokaal.
- `git status`: alleen de bedoelde bestanden, geen secrets, geen scope-lek.
