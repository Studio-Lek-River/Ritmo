# S09 — GitHub lezen

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/38
**Status:** concept

## Doel

GitHub-issues die aan de gebruiker zijn toegewezen verschijnen als planbare items in Ritmo, met voortgang per repo. Derde leesbron van "Ritmo Verbonden" (#33) na Outlook (S07) en Trello (S08); S10 (Vandaag-feed) en S14 (uitvoer-context per bron) bouwen erop door. Zie `docs/ROADMAP.md` §S09.

**Het model: een repo ís een project.** Repo → `projects`-module, issues die aan de gebruiker zijn toegewezen → de taken in dat project. Dat volgt de architectuurnotitie in `docs/ROADMAP.md` letterlijk ("externe bron is geen nieuw module-type: een bestaande `tasks`- of `projects`-module plus een `source`-binding").

**Afhankelijk van:** S02 (connections-infra). Het substraat staat er al en is hier expliciet op voorbereid:
- `supabase/migrations/20260713120000_connections.sql`: `github` staat al in de provider-CHECK; de Vault-RPC's `connections_set_secret` / `connections_get_secret` / `connections_clear_secret` zijn provider-agnostisch. **Geen migratie in deze slice.**
- `src/sync/connections.js`: `github` staat al in `CONNECTION_PROVIDERS`; `callConnectionsApi` is generiek.
- `src/utils/sourcePrefs.js`: `SOURCE_ICONS.github` en `DEFAULT_SOURCE_PREFS.github` bestaan al.
- `api/connections/_shared.js` (`getBearerToken` + `getServiceClient`) is in S08 uitgetrokken met als motivatie: "Alternatief is duplicatie die S09 nog eens verergert."
- `src/components/SourcesPanel.jsx`: de twaalf `planner.sources.*`-keys zijn provider-agnostisch en `sourceActions[provider].panel` is de haak voor een repo-kiezer. **SourcesPanel blijft ongewijzigd.**

## Poort-0-beslissingen (Bas)

1. **Auth: GitHub OAuth App**, geen PAT-plakdialoog. Het token is bij verbreken server-side in te trekken; dat weegt op tegen de eenmalige app-registratie.
2. **Model:** repo = project = module; aan de gebruiker toegewezen issues = de taken.
3. **Planbaarheid:** ophalen met `assignee=<login>`; elk open issue is planbaar.
4. **Opruiming meegenomen:** de dode 501-stub én de hernoeming van `outlookConnectionState`, als aparte `refactor:`-commits.
5. **OAuth-scope:** `repo read:user` (goedgekeurd bij Poort 1). Zie "De scope-afweging" hieronder.

## Eén correctie op de issue-tekst

Het issue en de ROADMAP zeggen: *"de `api/`-laag heeft al een `GITHUB_TOKEN`-patroon voor feedback; hergebruik dat."* **Dat is misleidend en mag niet letterlijk worden opgevolgd.**

`api/feedback.js` gebruikt één gedeelde PAT van de ontwikkelaar (`process.env.GITHUB_TOKEN`) om issues aan te maken in de hardcoded repo `Studio-Lek-River/Ritmo`. Er is geen auth van de aanroeper (alleen een IP-rate-limit plus honeypot), geen `accountId`, geen Vault. Hergebruiken voor lezen zou betekenen dat elke Ritmo-gebruiker de issues van de ontwikkelaar te zien krijgt: een datalek, in strijd met uitgangspunt 1.

Bruikbaar uit `feedback.js` is precies twee dingen, en de auth is er géén van:
1. **De headers-set** — `Accept: application/vnd.github+json`, `X-GitHub-Api-Version: 2022-11-28`, `User-Agent`. Giet die in `githubHeaders(token)`.
2. **De status-classificatie** (`feedback.js:93-109`) — rijker dan `classifyTrelloStatus` dankzij de 403-vs-rate-limit-splitsing via `x-ratelimit-remaining` / `retry-after`. Dat is een echte GitHub-eigenaardigheid en verdient hergebruik in `classifyGithubStatus`.

De auth gaat per gebruiker via de Vault, exact zoals Outlook en Trello.

## De scope-afweging

GitHub OAuth Apps kennen geen read-only issues-scope. Voor issues uit privérepo's is `repo` nodig, en die scope geeft ook schrijftoegang tot code. `public_repo` is veel minder invasief maar laat privérepo's buiten beeld, wat de koppeling voor een persoonlijke planner grotendeels nutteloos maakt. Gekozen: `repo read:user`.

De scope staat als één constante (`GITHUB_SCOPES`) in `api/connections/github/_shared.js`, met de afweging in een comment erboven, zodat versmallen later een eenregelige wijziging is.

## Twee ontwerppunten die niet uit het S08-patroon volgen

**1. Alleen open issues zou voortgang eeuwig op 0% zetten.** `applyProgress` (`src/utils/normalizedItems.js:36-54`) rekent done/total; met `state=open` is done per definitie 0 en is "voortgang per repo" een lege huls. Daarom halen we op met:

```
GET /repos/{owner}/{repo}/issues?assignee=<login>&state=all&sort=updated&direction=desc&per_page=100
```

De gesloten issues leveren de teller, de open issues het werk. Voortgang is dus die van het **gevolgde venster**: de 100 recentst bijgewerkte toegewezen issues per repo. Leg dat vast in een comment in `githubModules.js`; het is een bewuste grens, geen omissie.

**2. `freeBlock` alleen op open issues.** De planner-gate (`App.jsx:1571-1573`) laat door wat `freeBlock` is óf vandaag verloopt, en kijkt **niet** naar `completed`. `freeBlock: true` op alles zou gesloten issues laten inplannen. Dus: `freeBlock: true` op open issues, `completed: true` op gesloten.

Zonder een freeBlock-route komt geen enkel issue de planner in (issues hebben zelden een due-datum) en is de koppeling stil nutteloos. Dit is de reden dat de opt-in per repo de enige knop is die telt.

## De progress-sleutel

`sourceProjectKey` (`normalizedItems.js:31-34`) is `provider:connectionId::projectnaam`, waarbij `projectnaam` de **subject**-naam is, niet de module-naam. Daarom krijgt elke repo-module precies één subject dat `owner/repo` heet:

- Voortgang per repo valt gratis uit de bestaande aggregatie.
- `owner/repo` (niet `repo`) voorkomt dat `a/api` en `b/api` op één hoop belanden.

Dat modulenaam en subjectnaam gelijk zijn is licht redundant maar bewust: het houdt de sleutel correct zonder `normalizedItems.js` aan te raken (dat activeren is de S10-vraag).

## Scope

**Wel in scope:**
- Drie `refactor:`-commits vooraf (zie Aanpak).
- Vijf endpoints onder `api/connections/github/`.
- Cache, repo-prefs, module-bouwer, fetch-hook en repo-kiezer aan de frontend.
- Afgeleide GitHub-modules in `App.jsx` via `allModules`.
- Token intrekken bij verbreken.
- i18n voor alle nieuwe strings, in `nl.js` én `en.js`.

**Niet in scope (bewust):**
- De migratie (`github` staat al in de provider-CHECK).
- `api/feedback.js` aanpassen of de `GITHUB_TOKEN`-PAT aanraken.
- `normalizedItems.js` activeren; dat is de S10-vraag (Vandaag-feed).
- Issues schrijven, sluiten of becommentariëren. S09 is een leesbron.
- GitHub Projects (v2); dat is een aparte GraphQL-API.
- Milestones als subjects. Eén subject per repo, zie "De progress-sleutel".
- De Vandaag-feed (#39) en de uitvoer-context per bron (#40).

## Aanpak

### Eerst drie refactor-commits (los reviewbaar, geen gedragsverandering)

1. **`api/connections/_shared.js` generiek maken.** `signOAuthState` / `verifyOAuthState` verhuizen uit `outlook/_shared.js` (ze gebruiken alleen `OAUTH_STATE_SECRET` en zijn dus al provider-agnostisch); `outlook/_shared.js` re-exporteert ze, zodat `start.js` / `callback.js` ongewijzigd blijven importeren — precies zoals S08 het met `getBearerToken` deed. Idem een generieke `ensureConnectionRow(supabase, accountId, provider)`, uit de find-or-create die nu dubbel staat in `outlook/start.js:47-68` en `trello/_shared.js:70` (`ensureTrelloConnectionRow`). Dit is voor OAuth nodig, geen keuze.
2. **Dode stub weg.** `api/connections/connect.js`, `connectProvider` in `src/sync/connections.js:66`, `connect` + `busyId` in `src/hooks/useConnections.js`, en `ERROR_KEYS.not_implemented` in `ConnectionsSection.jsx`. Zodra GitHub een eigen tak heeft, heeft de stub geen enkele aanroeper meer (Outlook, Trello en GitHub hebben dan alle drie hun eigen flow).
3. **`outlookConnectionState` → `connectionState`** in `App.jsx`. De Trello-tak leest hem nu al (`App.jsx:1467`, `1486`); bij een derde provider is de naam ronduit misleidend.

### Nieuw: `api/connections/github/`

Elk endpoint volgt het vaste skelet uit S08, in deze volgorde: POST-only → `missingGithubEnv()` (500 `server_config`, lijst alleen server-side gelogd) → `getBearerToken` (401) → `supabase.auth.getUser(jwt)` (401) → rate-limit-bucket (429) → `requireGithubConnection` (409 `not_connected`) → upstream (502 + `classifyGithubStatus`) → **altijd expliciet mappen** → `catch` (500 `unexpected`).

- `_shared.js` — `REQUIRED_GITHUB_ENV` (`VITE_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, `GITHUB_OAUTH_REDIRECT_URI`, `OAUTH_STATE_SECRET`), `missingGithubEnv()`, `GITHUB_AUTHORIZE_URL`, `GITHUB_TOKEN_URL`, `GITHUB_API_BASE`, `GITHUB_SCOPES`, `githubHeaders(token)`, `classifyGithubStatus(status, headers)` → `github_auth` / `github_rate_limit` / `github_not_found` / `github_error`, `isGithubRateLimited(bucket, key, opts)`, `requireGithubConnection(supabase, accountId)` → `{ connection, token, login }`, en `REPO_FULL_NAME_REGEX` als path-injectie-hek (`/^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/`).
- `start.js` — `{}` → `{ authorizeUrl }`. Spiegelt `outlook/start.js`: rij verzekeren via `ensureConnectionRow`, `signOAuthState({ accountId })`, URL bouwen.
- `callback.js` — GET (browser komt terug van de consent, geen Bearer). State verifiëren → `code` inwisselen bij `GITHUB_TOKEN_URL` (met `Accept: application/json`, anders krijg je form-encoded terug) → `GET /user` voor de `login` → secret `{ access_token, scope, login }` naar de Vault via `connections_set_secret` → `label` op de connections-rij zetten op de `login` → 302 naar `/?tab=account&github=connected`. **Nooit een token in de redirect-URL.** Anders dan Outlook: OAuth-App-tokens verlopen niet, dus geen `refresh_token`, geen `expires_at`, geen refresh-logica.
- `repos.js` — `{}` → `{ repos: [{ id, fullName, url }] }` via `GET /user/repos?affiliation=owner,collaborator,organization_member&per_page=100&sort=updated`. Rate-limit `60s / 20`.
- `issues.js` — `{ repoIds }` → `{ repos: [{ id, fullName, url, issues: [...] }], failedRepoIds }`. Sequentieel zoals `trello/cards.js:92-126` (niet `Promise.all`, dat houdt de upstream-belasting voorspelbaar), mislukte repo's naar `failedRepoIds`, alleen 502 als álles faalt. Rate-limit `60s / 20`.

**Payload-minimalisatie in `issues.js`** — per issue uitsluitend:
```js
{ id, number, title, url: issue.html_url, state, dueOn: issue.milestone?.due_on ?? null }
```
Géén `body`, géén `user`, géén `labels`, géén rauwe passthrough.

### Nieuw: frontend

- `src/utils/githubCache.js` — key `github:issues`, `CACHE_VERSION = 1`, payload `{ version, connectionId, fetchedAt, repos: [...] }`. **Bewust géén `settings`/`day:`/`household:`-prefix**: `isUserSyncKey` (`src/sync/userDataStorage.js`) laat alleen die drie naar het account syncen en `src/utils/backup.js` exporteert alleen die drie, dus repo-namen en issue-titels blijven op het apparaat. Neem die redenering als comment over uit `trelloCache.js:1-9`. Plus `mergeGithubRepos(previous, repoIds, fresh, failedRepoIds)` (puur): een repo die dít keer faalde houdt zijn vorige cache-versie in plaats van stil te verdwijnen.
- `src/utils/githubRepoPrefs.js` — key `github:repoPrefs`, `PREFS_VERSION = 1`, payload `{ version, connectionId, repos: { [repoId]: { include, fullName } } }`. Sla zowel de numerieke `id` (stabiel bij hernoemen; de prefs-sleutel) als `fullName` (de subjectnaam) op. `connectionId`-mismatch wist de prefs, een *ontbrekende* `connectionId` telt bewust níet als mismatch. Exporteert `readGithubRepoPrefs`, `writeGithubRepoPrefs`, `clearGithubRepoPrefs`, `getRepoPref` (merget met de default, zoals `getSourcePref`), `includedRepoIds`.
- `src/utils/githubModules.js` — `buildGithubModules(cache, prefs, { connectionId, color })`, puur, deterministisch, **schrijft nooit naar opslag**.
  ```js
  // module per aangevinkte repo
  { id: `github:repo:${repo.id}`, type: 'projects', name: repo.fullName, icon: 'Github', color,
    enabled: true, source: { provider: 'github', connectionId, url: repo.url },
    subjects: [{ id: `github:repo:${repo.id}:issues`, name: repo.fullName, subgoals: [...] }] }
  // subgoal per issue
  { id: `github:issue:${issue.id}`, label: `#${issue.number} ${issue.title}`,
    completed: issue.state === 'closed', ...(issue.state === 'open' ? { freeBlock: true } : {}),
    deadline: dueToDeadline(issue.dueOn), autoPlan: true, grade: null, url: issue.url }
  ```
  Deterministische ids omzeilen dat `ProjectsView` subgoals `goal_${Date.now()}` geeft zonder random-suffix (zie `trelloModules.js:6-8`).
- `src/hooks/useGithubIssues.js` — `({ active, enabled, repoIds, connectionId })` → `{ repos, loading, error, lastSyncedAt, refetch }`. Kopieert `useTrelloCards.js`: `enabled` pas bij minstens één aangevinkte repo (geen fetch vóór opt-in), cache-seed bij mount, `requestToken`-ref tegen races, `repoIdsKey` als stabiele dep, en **een mislukte fetch zet alleen `error` en laat de state ongemoeid**.
- `src/components/GithubRepoPicker.jsx` — checkbox (`include`) per repo; repo's ophalen pas bij uitklappen. Geen altijd-lijst-select: bij GitHub is aanvinken de enige opt-in.

### Gewijzigd

- `src/sync/connections.js` — drie wrappers via het bestaande `callConnectionsApi`: `startGithubConnect()`, `fetchGithubRepos()`, `fetchGithubIssues(repoIds)`.
- `src/components/ConnectionsSection.jsx` — `case 'github': startGithubConnect()` → `window.location.assign` (zoals Outlook), plus `github_auth` / `github_rate_limit` / `github_not_found` / `github_error` in de `ERROR_KEYS`-allow-list (bewust geen blinde `t('connections.errors.' + code)`).
- `src/components/OutlookOAuthReturn.jsx` → `src/components/OAuthReturn.jsx` — loopt over `CONNECTION_PROVIDERS` en leest `params.get(provider)` in plaats van alleen `?outlook=`. Redirect-contract per provider blijft `?tab=account&<provider>=connected|error[&reason=...]`, dus de Outlook-tak verandert niet van gedrag.
- `App.jsx` — `githubModules`-memo (gated op `githubVisible` via `getSourcePref(sourcePrefs, 'github').visible`), `allModules = [...modules, ...trelloModules, ...githubModules]`, prefs-laden + setter (spiegelt `App.jsx:1440-1461`), en de wees-opruiming bij verbreken via een `wasGithubConnectedRef` (spiegelt `App.jsx:1484-1493`).
- `src/views/ProductivitySuiteView.jsx` — een `github`-entry in `sourceActions` (`onRefresh`, `loading`, `shown` = minstens één repo aangevinkt, `lastSyncedAt`, `panel: <GithubRepoPicker/>`).
- `src/utils/icons.js` — `Github` toevoegen aan `ICON_OPTIONS`; anders valt `icon: 'Github'` stil terug op `Sparkles` (S08 deed dit voor `Trello`).
- `api/connections/disconnect.js` — provider-switch naast de bestaande Trello-tak (`disconnect.js:96`): best-effort `DELETE /applications/{client_id}/grant` met Basic-auth (`client_id:client_secret`), **vóór** `connections_clear_secret`, want daarna is het token onleesbaar.
- `src/i18n/nl.js` + `en.js` — `connections.github.*`, `connections.toast.githubConnected` (met `{login}`), `connections.errors.github{Auth,RateLimit,NotFound,Error}`, `planner.github.*` (repo-kiezer).

**Expliciet niet geraakt:** `SourcesPanel.jsx`, `normalizedItems.js`, de migratie, `api/feedback.js`.

**Hergebruik (niet opnieuw bouwen):** `api/connections/_shared.js`, `callConnectionsApi`, de drie Vault-RPC's, `useConnections`, `SourcesPanel` + `sourceActions`, de twaalf `planner.sources.*`-keys, `getSourcePref`, `dueToDeadline`-patroon uit `trelloModules.js`, `connections.status.*` en de generieke `connections.errors.*`.

## Valkuilen (lees dit vóór je begint)

1. **`GET /repos/{o}/{r}/issues` geeft ook pull requests terug.** Dat is geen bug maar GitHub's datamodel: elke PR ís een issue. Filter alles met een `pull_request`-veld eruit in `issues.js`, anders staan je eigen PR's als taken in de planner.
2. **Geen `body` in de payload.** Issue-bodies zijn groot en privé en horen niet in een device-cache die de planner voedt. Alleen de zes velden hierboven.
3. **`milestone.due_on` is een volledige UTC-timestamp**, net als Trello's `due` en anders dan Microsoft Graph (dat via de `Prefer`-header al wall-clock levert). De **Trello**-regel geldt dus: `dueToDeadline` via de lokale tijdzone. Zet er een comment bij, anders "fixt" een latere reviewer het naar UTC-only en wordt de dag hier juist verkeerd.
4. **Elk mutatiepad houdt `modules`, elk leespad krijgt `allModules`.** Zie de prop-routing hieronder. Dat is wat read-only afdwingbaar maakt en de regel die het makkelijkst per ongeluk sneuvelt.
5. **De zeven `feedback.errors.github*`-keys zijn niet herbruikbaar.** Ze zitten in de verkeerde namespace en hun teksten gaan over *de ontwikkelaar* die iets moet vernieuwen — logisch bij een gedeelde app-PAT, onzin bij een per-user koppeling. Dat de foutcodes toevallig overlappen is de val. Schrijf eigen `connections.errors.github*`-keys die de gebruiker aanspreken, zoals de Trello-set.
6. **De token-exchange bij GitHub geeft standaard form-encoded terug.** Stuur `Accept: application/json` mee, anders is `tokenData.access_token` `undefined` en sla je stilzwijgend een kapot secret op.
7. **`state` uit de OAuth-flow is de enige CSRF-bescherming** tussen `start.js` en `callback.js`; er is geen server-side sessie. Gebruik `verifyOAuthState`, verzin niets eigens.

### Prop-routing (actuele regelnummers)

| Krijgt `allModules` | regel | Krijgt `modules` (settings-only) | regel |
|---|---|---|---|
| `baseEnabledModules` (Vandaag-feed) | `App.jsx:1871` | `CollectionsView` | `App.jsx:2174` |
| `buildPlanInputs` (auto-planner) | `App.jsx:1567` | `InsightView` | `App.jsx:2207` |
| `ProjectsView` | `App.jsx:2155` | `SettingsModal` | `App.jsx:2322` |
| `ProductivitySuiteView` | `App.jsx:2217` | `ModuleEditor` | `App.jsx:2353` |

## Prerequisites (Bas, eenmalig — buiten de code)

1. Een **GitHub OAuth App** registreren (Settings → Developer settings → OAuth Apps), met de callback-URL van de deploy op `/api/connections/github/callback`.
2. `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` en `GITHUB_OAUTH_REDIRECT_URI` als env-vars in **Vercel** zetten. `OAUTH_STATE_SECRET` staat er al voor Outlook.
3. Secrets blijven in Vercel; de `api/`-tak wordt getest via een `npx vercel` preview-deploy, niet lokaal.

## Acceptatiecriteria

- [ ] **AC1** Verbinden loopt via een echte GitHub-consent; na terugkeer staat GitHub op "verbonden" met de `login` als label.
- [ ] **AC2** `GITHUB_CLIENT_SECRET` staat nergens in de client-bundel (`npm run build`, dan zoeken in `dist/`), en er komt nooit een token in een redirect-URL of in de browserhistorie.
- [ ] **AC3** Zolang geen enkele repo is aangevinkt, wordt er geen enkele issues-call gedaan.
- [ ] **AC4** Elke aangevinkte repo levert precies één `projects`-module met één subject dat `owner/repo` heet, en de aan de gebruiker toegewezen issues als subgoals.
- [ ] **AC5** Open issues zijn planbaar via "deel mijn dag in"; gesloten issues staan als afgerond en worden nooit ingepland.
- [ ] **AC6** Voortgang per repo klopt: gesloten gedeeld door totaal binnen het gevolgde venster.
- [ ] **AC7** Pull requests verschijnen nergens als taak.
- [ ] **AC8** De oog-toggle op de GitHub-rij uit zetten laat geen enkel GitHub-project achter, nergens.
- [ ] **AC9** `window.storage.get('settings')` bevat na koppelen en aanvinken geen repo-namen, issue-titels, issue-ids of token; een backup-export (`src/utils/backup.js`) evenmin.
- [ ] **AC10** Een mislukte fetch van één repo laat de overige repo's en de vorige cache staan (`failedRepoIds` + `mergeGithubRepos`); het rooster wordt nooit leeggeveegd door een netwerkfout.
- [ ] **AC11** Verbreken wist de cache en de repo-keuze, en trekt het token bij GitHub in.
- [ ] **AC12** GitHub-modules zijn read-only: ze staan nooit in `modules`/settings en `setModules` raakt ze nooit.
- [ ] **AC13** `api/connections/connect.js` bestaat niet meer en heeft geen enkele aanroeper; `ERROR_KEYS.not_implemented` is weg.
- [ ] **AC14** `outlookConnectionState` bestaat niet meer; de gedeelde state heet `connectionState`.
- [ ] **AC15** `buildGithubModules` is puur: het schrijft nooit naar opslag en geeft bij gelijke input gelijke output.
- [ ] **AC16** De cache-seed werkt zonder netwerk: na een herstart staan de issues er vóór en zonder fetch.
- [ ] **AC17** Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js` (`npm run check:i18n` slaagt).
- [ ] **AC18** Geen wijzigingen buiten de scope van deze slice.
- [ ] **AC19** Nieuw gedrag is uitschakelbaar (de oog-toggle en de opt-in per repo); bestaande gebruikersdata blijft veilig.

## Testchecklist

1. Preview-deploy via `npx vercel`, koppelen, consent doorlopen, terugkomen op het Account-scherm met een toast.
2. Repo-kiezer uitklappen: repo's verschijnen pas dan (geen fetch bij het laden van de pagina).
3. Eén repo aanvinken: er verschijnt één project met de toegewezen issues; een PR van jezelf staat er níet bij.
4. "Deel mijn dag in": open issues verschijnen als voorstel, gesloten niet.
5. Een niet-bestaande repo-id in de prefs zetten: de overige repo's blijven staan, het rooster blijft heel.
6. De oog-toggle uit: alle GitHub-projecten weg, overal.
7. Verbreken: cache en repo-keuze weg, en Ritmo staat niet meer in je GitHub-autorisaties.
8. `npm run check:i18n` en `npm run build` slagen.
