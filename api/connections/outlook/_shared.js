// Gedeelde helpers voor de drie Outlook-endpoints (S07). Onderstreepte
// bestandsnaam: Vercel routeert geen bestanden/mappen die met `_` beginnen
// naar een eigen endpoint (zie ook Prerequisites-hosting-check in de
// slice-spec) — dit bestand is dus alleen importeerbaar, geen eigen route.
// Bevat de Outlook-specifieke config (env-lijst, Microsoft-URL's, scope).
//
// `getBearerToken`/`getServiceClient` leven sinds S08 in het provider-
// overkoepelende `api/connections/_shared.js`; `signOAuthState`/
// `verifyOAuthState`/`ensureConnectionRow` sinds S09 (ze gebruiken alleen
// `OAUTH_STATE_SECRET` resp. niets Outlook-specifieks en zijn dus al
// provider-agnostisch — zie de refactor-commit in docs/slices/
// S09-github-lezen.md). Hier alleen doorgeexporteerd zodat
// start.js/events.js/callback.js ongewijzigd kunnen blijven importeren uit
// dit bestand.
export {
  getBearerToken,
  getServiceClient,
  signOAuthState,
  verifyOAuthState,
  ensureConnectionRow,
} from '../_shared.js';

// Alle drie de endpoints hebben dezelfde server-config nodig (zie
// Prerequisites in de slice-spec); één centrale lijst zodat de drie
// handlers niet los van elkaar kunnen verschillen.
export const REQUIRED_OUTLOOK_ENV = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'MS_CLIENT_ID',
  'MS_CLIENT_SECRET',
  'MS_OAUTH_REDIRECT_URI',
  'OAUTH_STATE_SECRET',
];

// Retourneert de namen van de ontbrekende REQUIRED_OUTLOOK_ENV-vars ([] = alles
// aanwezig). Callers loggen de lijst server-side (Vercel Runtime Logs) en geven de
// client alleen de generieke code `server_config` — geen interne details lekken.
export function missingOutlookEnv() {
  return REQUIRED_OUTLOOK_ENV.filter((name) => !process.env[name]);
}

export const MS_AUTHORIZE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
export const MS_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
export const GRAPH_CALENDARVIEW_URL = 'https://graph.microsoft.com/v1.0/me/calendarView';
export const OUTLOOK_SCOPES = 'Calendars.Read offline_access openid';

// Marge (seconden) waarbinnen een access-token al als "verlopen" telt, zodat
// events.js nooit met een net-verlopen token naar Graph belt.
export const TOKEN_REFRESH_MARGIN_SECONDS = 120;
