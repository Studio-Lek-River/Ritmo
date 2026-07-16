# Deploy — host, routing en de Outlook-OAuth-callback

Dit runbook beschrijft hoe Ritmo gehost wordt, welke env-vars waar moeten staan, en hoe je de
Outlook-koppeling (S07, `docs/slices/S07-outlook-lezen.md`) end-to-end test. Twee paden: Pad A
(productie-deploy, de voorkeur) en Pad B (lokaal met `vercel dev`, fallback).

## 1. Host & routing

- **Host: Vercel.** De `api/`-handlers zijn geschreven in Vercel-stijl
  (`export default function handler(req, res) { ... }`), `@vercel/analytics` wordt al
  geïmporteerd in `src/main.jsx`.
- **Preset: Vite.** Vercel detecteert het Vite-project automatisch (build command `npm run
  build`, output-map `dist`). Geen handmatige buildconfig nodig.
- **API-routing: zero-config.** Elk bestand onder `api/**.js` wordt automatisch gerouteerd naar
  `/api/...` (bv. `api/connections/disconnect.js` → `POST /api/connections/disconnect`). Er is
  geen `vercel.json` nodig en er hoeft er ook geen toegevoegd te worden, tenzij een deploy
  onverhoopt faalt.
- **Onderstreepte bestanden worden niet gerouteerd.** `api/connections/outlook/_shared.js` begint
  met een `_` en is daarom alleen importeerbaar door de andere handlers in die map, geen eigen
  publieke route. Dit is bewust zo genoemd (zie het bestand zelf).
- **Callback-route:** `GET /api/connections/outlook/callback` — dit is de URL die je in Azure als
  redirect-URI registreert (zie §5).

## 2. Env-var-tabel

Alle server-only vars worden uitsluitend in het Vercel-dashboard gezet (Project → Settings →
Environment Variables), nooit in een `VITE_`-var en nooit in de client-bundel. De canonieke lijst
voor de Outlook-koppeling staat in `api/connections/outlook/_shared.js`
(`REQUIRED_OUTLOOK_ENV`) — als je daar een var aan toevoegt, werk deze tabel bij.

| Naam | Waar | Voorbeeld | Gebruikt door |
|---|---|---|---|
| `MS_CLIENT_ID` | Vercel-dashboard, server-only | `11111111-2222-3333-4444-555555555555` | `api/connections/outlook/start.js`, `callback.js`, `events.js` (OAuth-client-id) |
| `MS_CLIENT_SECRET` | Vercel-dashboard, server-only | `abc~DEFghi.jklMNO_pqrSTU` | `api/connections/outlook/callback.js`, `events.js` (token-exchange/refresh) |
| `MS_OAUTH_REDIRECT_URI` | Vercel-dashboard, server-only | `https://ritmo.vercel.app/api/connections/outlook/callback` | `api/connections/outlook/start.js`, `callback.js` (moet byte-identiek zijn aan de Azure redirect-URI) |
| `OAUTH_STATE_SECRET` | Vercel-dashboard, server-only | een lange willekeurige string (bv. `openssl rand -hex 32`) | `api/connections/outlook/_shared.js` (HMAC-ondertekening van de OAuth-`state`) |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel-dashboard, server-only | `eyJhbGciOi...` (service-role JWT uit Supabase) | `api/connections/disconnect.js`, `api/connections/outlook/*.js` (service-role-toegang tot Vault-RPC's) |
| `GITHUB_TOKEN` | Vercel-dashboard, server-only | `ghp_xxx...` (fine-grained PAT met Issues: write) | `api/feedback.js` (feedback → GitHub-issue) |
| `VITE_SUPABASE_URL` | Vercel-dashboard, Production + Preview (client, mag zichtbaar zijn) | `https://xxxx.supabase.co` | client (`src/`) én server (`api/connections/outlook/_shared.js` gebruikt hem ook voor de service-role-client) |
| `VITE_SUPABASE_ANON_KEY` | Vercel-dashboard, Production + Preview (client, mag zichtbaar zijn) | `eyJhbGciOi...` (anon-key uit Supabase) | client (`src/`) |

## 3. Pad A — Productie-deploy + test (primair)

1. Importeer de repo in Vercel (New Project → Import Git Repository). De Vite-preset wordt
   automatisch gedetecteerd; laat build command en output-map op de defaults staan.
2. Zet alle server-vars uit de tabel hierboven in Vercel (Settings → Environment Variables), voor
   zowel **Production** als **Preview**. `MS_OAUTH_REDIRECT_URI` zet je pas definitief in stap 4,
   nadat je de host-URL kent.
3. Deploy een eerste keer en noteer de toegewezen host-URL (bv. `ritmo.vercel.app` of een custom
   domain).
4. Ga naar de Azure-app-registratie en voeg de productie-redirect-URI toe:
   `https://<host>/api/connections/outlook/callback`. Zet `MS_OAUTH_REDIRECT_URI` in Vercel
   **byte-identiek** aan die URL (zelfde schema, host, pad, geen trailing slash-verschil).
5. Trigger een nieuwe deploy zodat de env-vars actief zijn.
6. Open de live site en doorloop de testchecklist in §4.

## 4. Pad B — Lokaal met `vercel dev` (fallback)

Gebruik dit pad als er nog geen productie-deploy is, of om lokaal te debuggen.

1. `npx vercel link` — koppelt de lokale map aan het Vercel-project.
2. `npx vercel env pull` — haalt de env-vars uit het Vercel-dashboard naar een lokaal
   `.env.local`-bestand (of zet ze handmatig lokaal, zie `.env.local.example`).
3. `npx vercel dev` — serveert zowel de frontend als `api/**.js` op `http://localhost:3000`
   (in tegenstelling tot kale Vite).
4. Voeg in Azure een extra redirect-URI toe: `http://localhost:3000/api/connections/outlook/callback`.
   Zet `MS_OAUTH_REDIRECT_URI` lokaal op exact die URL.
5. Doorloop dezelfde testchecklist (§4 hieronder wordt hier bedoeld als "Testchecklist", zie
   sectie eronder) op `http://localhost:3000`.

**Waarschuwing:** een kale `npm run dev` (Vite-dev-server op poort 5173) serveert `api/` niet.
Outlook "Verbinden" geeft dan een 404 op `/api/connections/outlook/start`. Voor de volledige
OAuth-flow is `vercel dev` (of een echte productie-deploy) verplicht.

## Testchecklist (end-to-end)

Baseer je op het Prerequisites/Testchecklist-blok in `docs/slices/S07-outlook-lezen.md`.

1. Account-scherm openen → tabblad Koppelingen.
2. Bij Outlook op "Verbinden" klikken → volledige redirect naar de Microsoft-consent-pagina.
3. Consent geven → terug in Ritmo (Account-scherm), status toont "Verbonden" + een toast.
4. Planner openen → de afspraken uit Outlook verschijnen als read-only agenda-blokken.
5. "Deel mijn dag in" gebruiken → geplande taken komen in de gaten tussen de agenda-blokken,
   nooit erover­heen.
6. Verbreken → status wordt "Niet verbonden", het secret in Vault is gewist, de agenda-blokken
   verdwijnen uit de Planner.

## 5. Azure app-registratie-checklist

- **Authority: `consumers`.** Verplicht voor persoonlijke Microsoft-accounts; met de verkeerde
  authority (bv. `common` of `organizations`) sneuvelt de refresh-token na ongeveer een uur.
- **Scope:** `Calendars.Read offline_access openid` (exact zoals in `_shared.js`
  `OUTLOOK_SCOPES`).
- **Client secret:** aangemaakt en de waarde (niet de secret-ID) opgeslagen als
  `MS_CLIENT_SECRET`.
- **Redirect-URI's:** beide toegevoegd zodra ze bekend zijn:
  - Productie: `https://<host>/api/connections/outlook/callback`
  - Lokaal (Pad B): `http://localhost:3000/api/connections/outlook/callback`

## 6. Troubleshooting

| Symptoom | Oorzaak | Oplossing |
|---|---|---|
| Redirect naar `?outlook=error&reason=server_config` | Eén of meer vars uit `REQUIRED_OUTLOOK_ENV` ontbreken op de host | Controleer de env-var-tabel in §2, zet de ontbrekende var(s) in Vercel en her-deploy |
| Redirect naar `?outlook=error&reason=invalid_state` | De HMAC-`state` klopt niet meer of is verlopen | Controleer dat `OAUTH_STATE_SECRET` niet net gewijzigd is tussen start en callback, dat de serverklok correct staat, en dat de consent-flow niet te lang heeft geduurd (state-TTL is kort, zie `_shared.js`) |
| Microsoft geeft `redirect_uri_mismatch` | De redirect-URI in Azure en `MS_OAUTH_REDIRECT_URI` verschillen | Zet beide byte-identiek (zelfde schema/host/pad, geen trailing slash-verschil) |
| Je landt op de callback-URL en ziet Ritmo, zonder toast en zonder koppeling | De service worker vangt de navigatie naar `/api/**` af en beantwoordt hem uit de cache met `index.html`, waardoor de callback-function nooit draait | Zorg dat `navigateFallbackDenylist: [/^\/api\//]` in het `workbox`-blok van `vite.config.js` staat. Controleer met `curl -sS -D - https://<host>/api/connections/outlook/callback` (moet 302 geven, niet HTML) — curl omzeilt de service worker, dus een verschil tussen curl en de browser wijst hierop. Ververs daarna in de browser eenmalig de service worker (DevTools → Application → Service Workers → Unregister) |
| Token-refresh werkt de eerste keer, maar sterft na ongeveer een uur | Azure-app-registratie gebruikt de verkeerde authority (bv. `common`/`organizations` in plaats van `consumers`) | Authority in Azure op `consumers` zetten (zie §5); een bestaande koppeling moet dan opnieuw verbonden worden |

## Referenties

- `api/connections/outlook/_shared.js` — `REQUIRED_OUTLOOK_ENV`, MS-URL-constanten, scopes,
  state-signing.
- `docs/slices/S07-outlook-lezen.md` — Prerequisites-blok en Testchecklist (bron voor dit
  runbook).
- `api/feedback.js` — voorbeeld van het bestaande `GITHUB_TOKEN`/`process.env`-patroon.
- `.env.local.example` — lokaal voorbeeldbestand, inclusief het server-only-blok.
