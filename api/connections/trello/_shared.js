// Gedeelde helpers voor de vier Trello-endpoints (S08, meervoudig sinds
// #120). Onderstreepte bestandsnaam: geen eigen Vercel-route, alleen
// importeerbaar (zelfde afspraak als api/connections/outlook/_shared.js).
// Trello heeft geen OAuth: de gebruiker plakt een key+token-paar
// (Poort-0-keuze, zie de slice-spec), dus dit bestand bevat geen
// state-signing zoals de Outlook-variant, wel dezelfde env-presence-check.
//
// #120: Trello staat niet langer maar één rij per gebruiker toe
// (`external_account IS NULL`) — elk Trello-account krijgt zijn eigen rij,
// onderscheiden door `external_account` = de Trello-member-id.
// `requireTrelloConnection` en `resolveTrelloConnectionRow` hieronder zijn nu
// per-connectie (nemen een `connectionId` resp. leveren er één op) in plaats
// van de ene impliciete rij van vóór deze slice; `boards.js`/`cards.js` fannen
// zelf uit over `listConnectedRows`.
import { getBearerToken, getServiceClient, ensureConnectionRow, listConnectedRows, requireConnection, CONNECTION_ID_REGEX } from '../_shared.js';

export { getBearerToken, getServiceClient, listConnectedRows, CONNECTION_ID_REGEX };

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

// Bepaalt (#120) welke connections-rij bij dit Trello-account (member-id)
// hoort, ná een geslaagde `members/me`-validatie in token.js:
// 1. een rij met `external_account = memberId` bestaat al (opnieuw plakken
//    voor een account dat al gekoppeld is) → die rij, ongewijzigd;
// 2. anders een legacy-rij (`external_account IS NULL`, van vóór #120) die
//    nog geen secret draagt, of waarvan het bestaande secret dezelfde
//    `username` draagt → die rij claimen (external_account wordt de
//    member-id, connection-id blijft gelijk, dus de bestaande bordselectie
//    en cache blijven geldig). De username-check is essentieel: zonder die
//    check zou het koppelen van een tweede account de eerste overschrijven;
// 3. anders een nieuwe rij.
// Stap 1 staat bewust vóór stap 2: zonder die volgorde zou een tweede keer
// plakken voor een account dat al een eigen rij heeft, per ongeluk de
// legacy-rij proberen te claimen — wat de UNIQUE-constraint op
// (account_id, provider, external_account) zou schenden als beide rijen
// toevallig naast elkaar bestaan.
export async function resolveTrelloConnectionRow(supabase, accountId, { memberId, username }) {
  const { data: byMember, error: byMemberError } = await supabase
    .from('connections')
    .select('id, status')
    .eq('account_id', accountId)
    .eq('provider', 'trello')
    .eq('external_account', memberId)
    .maybeSingle();
  if (byMemberError) return { error: byMemberError };
  if (byMember) return { connection: byMember };

  const { data: legacy, error: legacyError } = await supabase
    .from('connections')
    .select('id, status')
    .eq('account_id', accountId)
    .eq('provider', 'trello')
    .is('external_account', null)
    .maybeSingle();
  if (legacyError) return { error: legacyError };

  if (legacy) {
    const { data: secretRaw, error: secretError } = await supabase.rpc('connections_get_secret', {
      p_connection_id: legacy.id,
    });
    if (secretError) return { error: secretError };

    let legacyUsername = null;
    let secretReadable = true;
    if (secretRaw) {
      try {
        legacyUsername = JSON.parse(secretRaw)?.username ?? null;
      } catch {
        secretReadable = false;
      }
    }

    if (!secretRaw || (secretReadable && legacyUsername === username)) {
      const { data: claimed, error: claimError } = await supabase
        .from('connections')
        .update({ external_account: memberId })
        .eq('id', legacy.id)
        .select('id, status')
        .single();
      if (claimError) return { error: claimError };
      return { connection: claimed };
    }
  }

  // Stap 3: geen bestaande rij voor dit account en geen claimbare legacy-rij
  // — een nieuwe. `ensureConnectionRow` doet zelf ook nog een keer de
  // find-by-external-account-check (goedkoop, en race-veilig als twee
  // gelijktijdige aanvragen hier langskomen), en anders de insert.
  return ensureConnectionRow(supabase, accountId, 'trello', { externalAccount: memberId });
}

// Haalt één specifieke, verbonden Trello-connectie plus het token uit de
// Vault op. Dunne wrapper om de provider-agnostische `requireConnection`
// (zelfde patroon als de vroegere `ensureTrelloConnectionRow`-wrapper om
// `ensureConnectionRow`) — vult alleen `provider='trello'` in en pakt
// `token` uit het Trello-eigen secret-formaat (`{ token, username,
// fullName }`, zie token.js). Retourneert `{ connection, token }` bij
// succes, anders `{ error: <code> }` met code 'not_connected' (geen rij,
// niet eigen, niet verbonden, of geen leesbaar secret) of 'unexpected'
// (Supabase-fout). Callers mappen dat zelf naar een HTTP-status
// (boards.js/cards.js: 409 resp. 500). Sinds #120 per-connectie: de fan-out
// in boards.js/cards.js roept dit één keer per verbonden Trello-rij aan.
export async function requireTrelloConnection(supabase, accountId, connectionId) {
  const { connection, secret, error } = await requireConnection(supabase, accountId, 'trello', connectionId);
  if (error) return { error };
  if (!secret || typeof secret.token !== 'string' || !secret.token) return { error: 'not_connected' };

  return { connection, token: secret.token };
}
