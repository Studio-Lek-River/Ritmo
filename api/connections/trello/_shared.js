// Gedeelde helpers voor de vier Trello-endpoints (S08). Onderstreepte
// bestandsnaam: geen eigen Vercel-route, alleen importeerbaar (zelfde afspraak
// als api/connections/outlook/_shared.js). Trello heeft geen OAuth: de
// gebruiker plakt een key+token-paar (Poort-0-keuze, zie de slice-spec), dus
// dit bestand bevat geen state-signing zoals de Outlook-variant, wel dezelfde
// env-presence-check en een find-or-create voor de connections-rij.
export { getBearerToken, getServiceClient } from '../_shared.js';

// TRELLO_API_KEY is server-only (nooit een VITE_-prefix, zie CLAUDE.md): de
// key mag nooit in de client-bundel terechtkomen, dus start.js bouwt de
// authorize-URL server-side.
export const REQUIRED_TRELLO_ENV = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TRELLO_API_KEY',
];

// Retourneert de namen van de ontbrekende REQUIRED_TRELLO_ENV-vars ([] = alles
// aanwezig). Callers loggen de lijst server-side en geven de client alleen de
// generieke code `server_config` — geen interne details lekken.
export function missingTrelloEnv() {
  return REQUIRED_TRELLO_ENV.filter((name) => !process.env[name]);
}

export const TRELLO_API_BASE = 'https://api.trello.com/1';
export const TRELLO_AUTHORIZE_URL = 'https://trello.com/1/authorize';

// Trello-tokens zijn 32-128 alfanumerieke tekens (zie Trello's eigen
// documentatie); dit is een formaat-check vóór de eerste netwerkcall naar
// Trello, niet een garantie dat het token geldig is (dat bewijst pas de
// members/me-call in token.js).
export const TOKEN_FORMAT_REGEX = /^[A-Za-z0-9]{32,128}$/;

// Ook het path-injectie-hek voor cards.js: een boardId die hier niet aan
// voldoet gaat nooit in een Trello-URL terecht.
export const BOARD_ID_REGEX = /^[a-f0-9]{24}$/;

// Upstream-status -> Ritmo-foutcode (i18n-key `connections.errors.trello*`).
// 401/403 betekent een ingetrokken of ongeldig token/key, 429 is Trello's
// eigen rate limit, de rest is een onverwachte Trello-fout.
export function classifyTrelloStatus(status) {
  if (status === 401 || status === 403) return 'trello_auth';
  if (status === 429) return 'trello_rate_limit';
  return 'trello_error';
}

// In-memory rate limit, per bucket (endpoint) en sleutel (account-id). Best-
// effort: leeft alleen binnen één serverless-instantie en reset bij een koude
// start. Voor token.js (dat een geheim accepteert) is dat zwakker dan je zou
// willen, maar aanvaardbaar omdat een aanvaller sowieso een geldige
// Ritmo-JWT nodig heeft om deze endpoints te bereiken.
const rateLimitBuckets = new Map();

export function isTrelloRateLimited(bucket, key, { windowMs, max }) {
  const store = rateLimitBuckets.get(bucket) || new Map();
  rateLimitBuckets.set(bucket, store);
  const now = Date.now();
  const attempts = (store.get(key) || []).filter((t) => now - t < windowMs);
  if (attempts.length >= max) return true;
  attempts.push(now);
  store.set(key, attempts);
  return false;
}

// Vindt de ene Trello-connectie van dit account (external_account = NULL,
// Poort-0: één Trello-account per gebruiker) of maakt de rij aan als hij nog
// niet bestaat. Gebruikt door zowel start.js als token.js: token.js kan in
// theorie los van start.js aangeroepen worden, dus moet zelf ook robuust
// zijn tegen een ontbrekende rij.
export async function ensureTrelloConnectionRow(supabase, accountId) {
  const { data: existing, error: fetchError } = await supabase
    .from('connections')
    .select('id, status')
    .eq('account_id', accountId)
    .eq('provider', 'trello')
    .is('external_account', null)
    .maybeSingle();

  if (fetchError) return { error: fetchError };
  if (existing) return { connection: existing };

  const { data: inserted, error: insertError } = await supabase
    .from('connections')
    .insert({ account_id: accountId, provider: 'trello', external_account: null })
    .select('id, status')
    .single();

  if (insertError) return { error: insertError };
  return { connection: inserted };
}

// Haalt de verbonden Trello-connectie plus het token uit de Vault op.
// Retourneert `{ connection, token }` bij succes, anders `{ error: <code> }`
// met code 'not_connected' (geen rij, niet verbonden, of geen leesbaar
// secret) of 'unexpected' (Supabase-fout). Callers mappen dat zelf naar een
// HTTP-status (boards.js/cards.js: 409 resp. 500).
export async function requireTrelloConnection(supabase, accountId) {
  const { data: connection, error: fetchError } = await supabase
    .from('connections')
    .select('id, status')
    .eq('account_id', accountId)
    .eq('provider', 'trello')
    .is('external_account', null)
    .maybeSingle();

  if (fetchError) return { error: 'unexpected' };
  if (!connection || connection.status !== 'connected') return { error: 'not_connected' };

  const { data: secretRaw, error: secretError } = await supabase.rpc('connections_get_secret', {
    p_connection_id: connection.id,
  });
  if (secretError || !secretRaw) return { error: 'not_connected' };

  let secret;
  try {
    secret = JSON.parse(secretRaw);
  } catch {
    return { error: 'unexpected' };
  }
  if (!secret || typeof secret.token !== 'string' || !secret.token) return { error: 'not_connected' };

  return { connection, token: secret.token };
}
