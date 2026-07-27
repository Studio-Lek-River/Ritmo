// Gedeelde helpers voor de vier Outlook-endpoints (S07, write.js sinds S12).
// Onderstreepte bestandsnaam: Vercel routeert geen bestanden/mappen die met
// `_` beginnen naar een eigen endpoint (zie ook Prerequisites-hosting-check
// in de slice-spec) — dit bestand is dus alleen importeerbaar, geen eigen
// route. Bevat de Outlook-specifieke config (env-lijst, Microsoft-URL's,
// scope) plus, sinds S12, de write-keten die events.js en write.js delen
// (`requireOutlookConnection`, `graphBatch`) en de tag-/agenda-constanten
// voor het destructieve schrijfpad.
//
// `getBearerToken`/`getServiceClient` leven sinds S08 in het provider-
// overkoepelende `api/connections/_shared.js`; `signOAuthState`/
// `verifyOAuthState`/`ensureConnectionRow` sinds S09 (ze gebruiken alleen
// `OAUTH_STATE_SECRET` resp. niets Outlook-specifieks en zijn dus al
// provider-agnostisch — zie de refactor-commit in docs/slices/
// S09-github-lezen.md). Hier alleen doorgeexporteerd zodat
// start.js/events.js/callback.js/write.js ongewijzigd kunnen blijven
// importeren uit dit bestand.
export {
  getBearerToken,
  getServiceClient,
  signOAuthState,
  verifyOAuthState,
  ensureConnectionRow,
} from '../_shared.js';

// `node:crypto` — geen extra dependency — voor de v2-tagwaarde-hash
// (`blockKeyHash` hieronder, S12/#154).
import { createHash } from 'node:crypto';

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
export const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';
export const GRAPH_CALENDARVIEW_URL = `${GRAPH_BASE_URL}/me/calendarView`;
export const GRAPH_CALENDARS_URL = `${GRAPH_BASE_URL}/me/calendars`;
export const GRAPH_PRIMARY_CALENDAR_URL = `${GRAPH_BASE_URL}/me/calendar`;
export const GRAPH_BATCH_URL = `${GRAPH_BASE_URL}/$batch`;

// S12: verbinden vraagt voortaan altijd schrijfrechten (er is geen
// `mode`-parameter, zie de slice-spec) — de app-registratie heeft die
// rechten inmiddels. `LEGACY_OUTLOOK_READ_SCOPES` is de veilige fallback voor
// secrets van vóór deze slice die geen `scope` hebben opgeslagen: die vallen
// terug op leesrechten in plaats van stilzwijgend als "kan schrijven" te
// gelden.
export const OUTLOOK_SCOPES = 'Calendars.ReadWrite offline_access openid';
export const LEGACY_OUTLOOK_READ_SCOPES = 'Calendars.Read offline_access openid';

// Marge (seconden) waarbinnen een access-token al als "verlopen" telt, zodat
// events.js/write.js nooit met een net-verlopen token naar Graph bellen.
export const TOKEN_REFRESH_MARGIN_SECONDS = 120;

// Herkent zowel de korte vorm (`Calendars.ReadWrite`) als de volledig
// gekwalificeerde Graph-scope-URI, case-insensitief — Microsoft geeft het
// toegekende `scope` in de tokenresponse soms in de ene, soms in de andere
// vorm terug.
export function hasWriteScope(scope) {
  if (typeof scope !== 'string') return false;
  return /(^|[\s/])calendars\.readwrite($|\s)/i.test(scope.trim());
}

// Naam van de eigen Ritmo-agenda (S12, "aparte 'Ritmo'-agenda" uit de
// slice-spec) en de extended-property-namespace waarmee een geschreven blok
// wordt getagd. `RITMO_TAG_ID` is het enige criterium waarop write.js ooit
// een event aanraakt — delete óf patch (nooit `categories` of de titel, zie
// de slice-spec) — een gebruiker kan deze waarde niet via de Outlook-UI
// zetten. De tagwáárde zelf kreeg in S12/#154 een tweede versie (v2, met
// block-hash) zodat een diff een bestaand event kan terugvinden bij zijn
// Ritmo-blok; zie hieronder.
export const RITMO_CALENDAR_NAME = 'Ritmo';
export const RITMO_TAG_GUID = '4280f699-c69a-4ad3-97c1-8520b2f6b18b';
export const RITMO_TAG_ID = `String {${RITMO_TAG_GUID}} Name RitmoPlan`;
export const RITMO_CATEGORY = 'Ritmo';

// Hash van een block-key voor in de v2-tagwaarde: sha256, eerste 12
// hex-tekens (`node:crypto`, geen dependency). Zo belanden Ritmo's interne
// item-ids (taak-, module-, subdoel-ids) nooit in de agenda-data bij
// Microsoft, en blijft de tagwaarde altijd even kort — ook bij een
// subdoel-key die drie ids draagt.
export function blockKeyHash(blockKey) {
  return createHash('sha256').update(blockKey).digest('hex').slice(0, 12);
}

// Bouwt de v2-tagwaarde voor één blok op één dag: `v2|<dateKey>|<hash>`. Zo
// verwijdert/patcht een write voor dag X nooit een blok van een andere dag,
// en kan write.js een bestaand Outlook-event bij zijn Ritmo-blok terugvinden
// zonder dat de block-key zelf (en dus een intern id) in Outlook belandt.
export function ritmoTagValue(dateKey, blockKey) {
  return `v2|${dateKey}|${blockKeyHash(blockKey)}`;
}

// Prefix-filter voor het leespad: alles wat met `v2|<dateKey>|` begint hoort
// bij dag X, ongeacht welk blok. Samen met `legacyRitmoTagValue` hieronder is
// dit het enige criterium waarop write.js ooit een event selecteert om aan te
// raken.
export function ritmoTagPrefix(dateKey) {
  return `v2|${dateKey}|`;
}

// Herkent een blok dat nog het oude (S12) tagformaat draagt: `v1|<dateKey>`,
// zonder block-key. Wordt sinds S12/#154 nooit meer geschreven — uitsluitend
// gebruikt om zulke blokken bij de eerste write te herkennen zodat ze
// opgeruimd (verwijderd en met het v2-formaat opnieuw aangemaakt) kunnen
// worden.
export function legacyRitmoTagValue(dateKey) {
  return `v1|${dateKey}`;
}

// Harde bovengrens op het aantal blokken per write-aanvraag (validatie in
// write.js, vóór elke Graph-call) — voorkomt dat één klik honderden events
// aanmaakt.
export const MAX_WRITE_BLOCKS = 40;

// Hoeveel Graph-requests per `$batch`-aanroep gaan (Graph's eigen limiet is
// 20). Sequentieel per chunk, niet parallel, zodat een 429 op chunk N de
// retry-backoff van chunk N+1 niet extra opjaagt.
export const GRAPH_BATCH_CHUNK_SIZE = 20;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function sendBatchChunk(accessToken, chunk, attempt) {
  const response = await fetch(GRAPH_BATCH_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests: chunk }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error('graph_batch_failed');
    err.status = response.status;
    throw err;
  }

  const responses = data.responses || [];
  const retryable = responses.filter((r) => r.status === 429);
  if (retryable.length > 0 && attempt < 1) {
    const retryAfterSeconds = retryable.reduce((max, r) => {
      const header = r.headers && r.headers['Retry-After'];
      const seconds = Number(header);
      return Number.isFinite(seconds) && seconds > max ? seconds : max;
    }, 1);
    await sleep(Math.min(retryAfterSeconds, 5) * 1000);
    const retryIds = new Set(retryable.map((r) => r.id));
    const retryChunk = chunk.filter((req) => retryIds.has(req.id));
    const retried = await sendBatchChunk(accessToken, retryChunk, attempt + 1);
    return responses.filter((r) => !retryIds.has(r.id)).concat(retried);
  }
  return responses;
}

// Voert een lijst Graph-`$batch`-requests (`{ id, method, url, headers?,
// body? }`) uit in chunks van `GRAPH_BATCH_CHUNK_SIZE`, sequentieel — een dag
// met 10 blokken (10 deletes + 10 creates) kost zo ~2 rondes in plaats van
// 20+ losse calls. Retourneert de responses in dezelfde volgorde als de
// meegegeven requests. Eén retry per item op een `429` binnen een chunk,
// gecapt op 5 seconden wachttijd.
export async function graphBatch(accessToken, requests) {
  const responsesById = new Map();
  for (let i = 0; i < requests.length; i += GRAPH_BATCH_CHUNK_SIZE) {
    const chunk = requests.slice(i, i + GRAPH_BATCH_CHUNK_SIZE);
    const responses = await sendBatchChunk(accessToken, chunk, 0);
    responses.forEach((r) => responsesById.set(r.id, r));
  }
  return requests.map((req) => responsesById.get(req.id) || { id: req.id, status: 0, body: null });
}

async function refreshAccessToken(refreshToken, scope) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.MS_CLIENT_ID,
    client_secret: process.env.MS_CLIENT_SECRET,
    refresh_token: refreshToken,
    // De kritieke S12-regel: de opgeslagen scope, nooit de constante
    // `OUTLOOK_SCOPES`. Een refresh die om meer vraagt dan waarvoor ooit
    // consent is gegeven faalt op een persoonlijk Microsoft-account met
    // `invalid_grant` en breekt daarmee het lezen van een oude koppeling.
    scope: scope || LEGACY_OUTLOOK_READ_SCOPES,
  });

  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error('token_refresh_failed');
    err.status = response.status;
    throw err;
  }
  return data;
}

// Gedeelde keten *connection-lookup → secret → expiry → refresh → rotatie*
// (voorheen gekopieerd in events.js, S12 trekt hem hierheen zodat events.js
// en write.js niet uit elkaar kunnen lopen — zelfde patroon als
// `requireConnection` in `api/connections/_shared.js`, S09). Retourneert bij
// succes `{ connection, accessToken, scope }` — `scope` is de op dit moment
// geldende scope (na een eventuele refresh), zodat een caller vóór een
// schrijfactie `hasWriteScope(scope)` kan checken zonder zelf het secret te
// hoeven parsen. Bij een probleem `{ error }` met een van 'not_connected',
// 'token_refresh_failed' of 'unexpected' — de aanroeper kent zijn eigen
// HTTP-status per code.
export async function requireOutlookConnection(supabase, accountId, { logLabel = 'connections/outlook' } = {}) {
  const { data: connection, error: fetchError } = await supabase
    .from('connections')
    .select('id, status')
    .eq('account_id', accountId)
    .eq('provider', 'outlook')
    .is('external_account', null)
    .maybeSingle();

  if (fetchError) {
    console.error(`${logLabel} connection lookup failed`, fetchError);
    return { error: 'unexpected' };
  }
  if (!connection || connection.status !== 'connected') {
    return { error: 'not_connected' };
  }

  const { data: secretRaw, error: secretError } = await supabase.rpc('connections_get_secret', {
    p_connection_id: connection.id,
  });
  if (secretError || !secretRaw) {
    return { error: 'not_connected' };
  }

  let secret;
  try {
    secret = JSON.parse(secretRaw);
  } catch {
    console.error(`${logLabel} secret parse failed`);
    return { error: 'unexpected' };
  }

  let accessToken = secret.access_token;
  let refreshToken = secret.refresh_token;
  let expiresAt = secret.expires_at;
  let scope = secret.scope || LEGACY_OUTLOOK_READ_SCOPES;
  const nowSeconds = Math.floor(Date.now() / 1000);
  const isExpired = !accessToken || typeof expiresAt !== 'number'
    || expiresAt - TOKEN_REFRESH_MARGIN_SECONDS <= nowSeconds;

  if (isExpired) {
    if (!refreshToken) {
      return { error: 'not_connected' };
    }

    let refreshed;
    try {
      refreshed = await refreshAccessToken(refreshToken, scope);
    } catch (err) {
      console.error(`${logLabel} refresh failed`, err);
      return { error: 'token_refresh_failed' };
    }

    accessToken = refreshed.access_token;
    refreshToken = refreshed.refresh_token || refreshToken;
    expiresAt = nowSeconds + (Number(refreshed.expires_in) || 0);
    scope = refreshed.scope || scope;

    const { error: rotateError } = await supabase.rpc('connections_set_secret', {
      p_connection_id: connection.id,
      p_secret: JSON.stringify({
        access_token: accessToken,
        refresh_token: refreshToken,
        expires_at: expiresAt,
        scope,
      }),
    });
    if (rotateError) {
      // Niet blokkerend: het zojuist vernieuwde token werkt nu nog steeds
      // voor deze aanroep; een volgende call refresht opnieuw als het
      // wegschrijven weer faalt.
      console.error(`${logLabel} rotate failed`, rotateError);
    }
  }

  return { connection, accessToken, scope };
}
