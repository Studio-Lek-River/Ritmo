// Gedeelde helpers voor àlle `api/connections/**`-endpoints (S02, uitgetrokken
// in S08 zodat Trello niet dezelfde twee functies opnieuw hoeft te
// definiëren — zie docs/slices/S08-trello-lezen.md, "Twee opruimingen die
// deze slice zelf afdwingt"). Onderstreepte bestandsnaam: Vercel routeert
// geen bestanden die met `_` beginnen naar een eigen endpoint, dit bestand is
// dus alleen importeerbaar, geen eigen route.
//
// S09 (GitHub) trekt hier twee dingen extra bij die tot dan toe alleen bij
// Outlook/Trello los stonden — beide provider-agnostisch en dus hier thuis in
// plaats van nog een keer gekopieerd te worden:
// - `signOAuthState`/`verifyOAuthState` (voorheen alleen in
//   outlook/_shared.js): gebruiken uitsluitend `OAUTH_STATE_SECRET`, geen
//   Outlook-specifieke state. `outlook/_shared.js` re-exporteert ze zodat
//   start.js/callback.js ongewijzigd blijven importeren.
// - `ensureConnectionRow(supabase, accountId, provider)`: de find-or-create
//   voor een connections-rij die tot dan toe dubbel stond in
//   outlook/start.js en trello/_shared.js (`ensureTrelloConnectionRow`,
//   die nu een dunne wrapper is). Nodig voor GitHub's eigen OAuth-start.js.
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

// Haalt de Supabase-JWT uit de Authorization-header ("Bearer <token>") van de
// aanroepende gebruiker. `null` bij een ontbrekende of misvormde header.
export function getBearerToken(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

// Service-role Supabase-client (server-only, nooit in de browser-bundel).
// `null` wanneer de vereiste env-vars ontbreken; callers checken dat zelf
// vooraf via hun eigen missing-env-helper (bv. missingOutlookEnv/
// missingTrelloEnv), zodat ze een gerichte `server_config`-fout kunnen geven.
export function getServiceClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Vindt de ene connectie van dit account voor `provider` (external_account =
// NULL, zelfde één-account-per-provider-aanname als Outlook/Trello) of maakt
// de rij aan als hij nog niet bestaat. Gebruikt door elke OAuth-`start.js`
// (de rij moet bestaan vóórdat de state ondertekend wordt) en door
// Trello's `token.js` (dat los van `start.js` aangeroepen kan worden).
export async function ensureConnectionRow(supabase, accountId, provider) {
  const { data: existing, error: fetchError } = await supabase
    .from('connections')
    .select('id, status')
    .eq('account_id', accountId)
    .eq('provider', provider)
    .is('external_account', null)
    .maybeSingle();

  if (fetchError) return { error: fetchError };
  if (existing) return { connection: existing };

  const { data: inserted, error: insertError } = await supabase
    .from('connections')
    .insert({ account_id: accountId, provider, external_account: null })
    .select('id, status')
    .single();

  if (insertError) return { error: insertError };
  return { connection: inserted };
}

// Levensduur (seconden) van de state-payload: kort, want de gebruiker
// doorloopt de provider-consent meteen na het aanroepen van `start.js`.
const STATE_TTL_SECONDS = 600;

function base64url(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlToBuffer(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = padded.length % 4 === 0 ? 0 : 4 - (padded.length % 4);
  return Buffer.from(padded + '='.repeat(padLength), 'base64');
}

// Bouwt de HMAC-ondertekende `state` (payload { account_id, nonce, exp },
// base64url-gecodeerd als `payload.signature`) — de enige CSRF-bescherming
// tussen `start.js` en `callback.js` van een OAuth-provider (er is geen
// server-side sessie tussen de twee calls, de state zelf draagt de
// handtekening).
export function signOAuthState({ accountId }) {
  const secret = process.env.OAUTH_STATE_SECRET;
  const payload = {
    account_id: accountId,
    nonce: randomBytes(16).toString('hex'),
    exp: Math.floor(Date.now() / 1000) + STATE_TTL_SECONDS,
  };
  const payloadB64 = base64url(Buffer.from(JSON.stringify(payload), 'utf8'));
  const signature = createHmac('sha256', secret).update(payloadB64).digest();
  return `${payloadB64}.${base64url(signature)}`;
}

// Verifieert de handtekening + exp van een `state`-string. Retourneert de
// payload bij succes, anders `null` (ongeldige/verlopen/gemanipuleerde state).
export function verifyOAuthState(state) {
  const secret = process.env.OAUTH_STATE_SECRET;
  if (typeof state !== 'string' || !secret) return null;

  const parts = state.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sigB64] = parts;

  let expectedSig;
  let actualSig;
  try {
    expectedSig = base64url(createHmac('sha256', secret).update(payloadB64).digest());
    actualSig = base64urlToBuffer(sigB64);
  } catch {
    return null;
  }
  const expectedSigBuffer = base64urlToBuffer(expectedSig);
  if (actualSig.length !== expectedSigBuffer.length || !timingSafeEqual(actualSig, expectedSigBuffer)) {
    return null;
  }

  let payload;
  try {
    payload = JSON.parse(base64urlToBuffer(payloadB64).toString('utf8'));
  } catch {
    return null;
  }
  if (!payload || typeof payload.account_id !== 'string') return null;
  if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) return null;
  return payload;
}
