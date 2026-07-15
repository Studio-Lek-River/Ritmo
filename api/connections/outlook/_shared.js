// Gedeelde helpers voor de drie Outlook-endpoints (S07). Onderstreepte
// bestandsnaam: Vercel routeert geen bestanden/mappen die met `_` beginnen
// naar een eigen endpoint (zie ook Prerequisites-hosting-check in de
// slice-spec) — dit bestand is dus alleen importeerbaar, geen eigen route.
// Bevat: service-role-client, env-presence-check, en de HMAC-ondertekende
// OAuth-`state` (CSRF-bescherming voor de authorization-code-flow).
import { createClient } from '@supabase/supabase-js';
import { randomBytes, createHmac, timingSafeEqual } from 'node:crypto';

export { getBearerToken } from '../disconnect.js';

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

export function getServiceClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const MS_AUTHORIZE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
export const MS_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
export const GRAPH_CALENDARVIEW_URL = 'https://graph.microsoft.com/v1.0/me/calendarView';
export const OUTLOOK_SCOPES = 'Calendars.Read offline_access openid';

// Marge (seconden) waarbinnen een access-token al als "verlopen" telt, zodat
// events.js nooit met een net-verlopen token naar Graph belt.
export const TOKEN_REFRESH_MARGIN_SECONDS = 120;

// Levensduur (seconden) van de state-payload: kort, want de gebruiker doorloopt
// de Microsoft-consent meteen na het aanroepen van start.js.
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
// tussen start.js en callback.js (er is geen server-side sessie tussen de
// twee calls, de state zelf draagt de handtekening).
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
