# B01 — Feedback/issue-maker: diagnostiek + nette foutmelding

Bron: [issue #83 "Issue maker vanuit de app werkt niet"](https://github.com/Studio-Lek-River/Ritmo/issues/83)
**Status:** concept

## Doel

De in-app feedback/issue-maker (Instellingen → Help → "Feedback geven") faalt met de generieke, hardcoded Nederlandse melding **"Kon issue niet aanmaken"**. De code-flow klopt; de fout ontstaat wanneer GitHub zélf de aanmaak weigert (vrijwel zeker een verlopen/ontbrekende/te beperkte Vercel-`GITHUB_TOKEN`, of Issues uitgeschakeld op de repo). Deze slice maakt de fout **diagnostiseerbaar en vertaald**: de backend geeft per GitHub-status een stabiele foutcode terug en de frontend mapt die op een i18n-melding (nl + en). Het herstellen van de token-oorzaak zelf is een aparte operationele actie (Vercel), buiten deze slice.

## Scope

**Wel in scope:**
- `api/feedback.js` — bij een mislukte GitHub-call de HTTP-status mappen naar een stabiele `code` en die meesturen in de JSON-response (naast het bestaande `error`-veld als fallback). Ook de bestaande foutresponses (missing token, rate-limit, onverwachte fout) krijgen een `code`. Server-side `console.error` met de echte GitHub-status/body blijft.
- `src/components/help/FeedbackForm.jsx` — bij `!response.ok` de `data.code` via een expliciete allow-list (`code → i18n-key`) omzetten naar een vertaalde melding; onbekende/afwezige code valt veilig terug op `data.error` en dan `t('feedback.error')`.
- `src/i18n/nl.js` + `src/i18n/en.js` — nieuw sub-blok `feedback.errors` met dezelfde keys in beide talen.

**Niet in scope (bewust):**
- De Vercel `GITHUB_TOKEN` roteren/instellen (operationeel, geen code).
- OPTIONS/CORS-afhandeling, GitHub secondary-rate-limit-retry, token-preflight.
- Succesflow, validatiegrenzen, honeypot en de per-IP rate-limiter blijven ongewijzigd.

## Aanpak

**Backend (`api/feedback.js`).** Vervang het generieke 502-blok door een mapping van `ghResponse.status` naar een `code`, en stuur `{ error, code }` terug. De frontend keyt op `code`, niet op de HTTP-status; de HTTP-statuscodes en bestaande `error`-strings blijven staan als server-fallback.

| GitHub-status | `code` | betekenis |
|---|---|---|
| 401 | `github_auth` | token ongeldig/verlopen |
| 403 (rate-limit headers) | `github_rate_limit` | GitHub secondary/abuse limit |
| 403 (overig) | `github_forbidden` | onvoldoende rechten |
| 404 | `github_not_found` | repo/token-scope |
| 410 | `github_issues_disabled` | Issues uit op repo |
| 422 | `github_validation` | ongeldige issue-payload |
| overig | `github_error` | onbekende GitHub-fout |

Bestaande responses krijgen ook een `code`: missing token → `server_config`, 429 → `rate_limited`, catch-blok → `unexpected`.

**Frontend (`FeedbackForm.jsx`).** Een const-object `code → i18n-key`; bij `!response.ok`:
```js
const key = ERROR_KEYS[data.code];
const msg = key ? t(key) : (data.error || t('feedback.error'));
```
Een expliciete allow-list is nodig omdat `t()` bij een onbekende key de key-string zélf teruggeeft (`src/i18n/useTranslation.js`) — dus geen blinde string-interpolatie. De bestaande `status === 'error'`-render blijft ongewijzigd; alleen de bron van `errorText` verandert.

**i18n (`nl.js` + `en.js`).** Voeg onder het bestaande `feedback`-blok een `errors: { … }` toe met keys `githubAuth`, `githubRateLimit`, `githubForbidden`, `githubNotFound`, `githubIssuesDisabled`, `githubValidation`, `githubError`, `serverConfig`, `rateLimited`, `unexpected` — beknopte, actiegerichte teksten die geen interne details lekken. `feedback.error` blijft als generieke fallback bestaan.

## Acceptatiecriteria

- [ ] Bij een mislukte GitHub-aanmaak toont de app een specifieke, in de actieve taal (nl of en) vertaalde melding — niet langer de hardcoded Nederlandse "Kon issue niet aanmaken".
- [ ] De backend geeft naast `error` een stabiele `code` terug; de frontend mapt die via een expliciete allow-list; een onbekende/afwezige `code` valt veilig terug op `data.error` en dan `t('feedback.error')` (nooit een rauwe i18n-key op het scherm).
- [ ] De server logt de echte GitHub-status + body (`GitHub API error: <status> <body>`), zodat de oorzaak in de Vercel-logs te zien is.
- [ ] i18n key-pariteit: alle nieuwe `feedback.errors.*` keys bestaan in zowel `src/i18n/nl.js` als `src/i18n/en.js` (`npm run check:i18n` slaagt).
- [ ] Geen wijzigingen buiten de scope van deze slice (alleen `api/feedback.js`, `src/components/help/FeedbackForm.jsx`, `src/i18n/nl.js`, `src/i18n/en.js`).
- [ ] Succesflow, validatie, honeypot en rate-limiter ongewijzigd; bestaande gebruikersdata blijft veilig (principe 2: gedrag degradeert netjes).
