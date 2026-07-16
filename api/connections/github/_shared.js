// Gedeelde helpers voor de vijf GitHub-endpoints (S09). Onderstreepte
// bestandsnaam: geen eigen Vercel-route, alleen importeerbaar (zelfde
// afspraak als outlook/_shared.js en trello/_shared.js). GitHub gebruikt een
// OAuth App (Poort-0-beslissing 1), dus dit bestand re-exporteert de
// provider-agnostische state-signing/find-or-create-helpers uit
// api/connections/_shared.js (zie de refactor-commits vooraf) in plaats van
// ze een derde keer te implementeren.
export {
  getBearerToken,
  getServiceClient,
  signOAuthState,
  verifyOAuthState,
  ensureConnectionRow,
} from '../_shared.js';

export const REQUIRED_GITHUB_ENV = [
  'VITE_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_OAUTH_REDIRECT_URI',
  'OAUTH_STATE_SECRET',
];

// Retourneert de namen van de ontbrekende REQUIRED_GITHUB_ENV-vars ([] = alles
// aanwezig). Callers loggen de lijst server-side en geven de client alleen de
// generieke code `server_config` — geen interne details lekken.
export function missingGithubEnv() {
  return REQUIRED_GITHUB_ENV.filter((name) => !process.env[name]);
}

export const GITHUB_AUTHORIZE_URL = 'https://github.com/login/oauth/authorize';
export const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';
export const GITHUB_API_BASE = 'https://api.github.com';

// De scope-afweging (Poort-0-beslissing 5, zie docs/slices/S09-github-lezen.md
// "De scope-afweging"): GitHub OAuth Apps kennen geen read-only issues-scope.
// `public_repo` zou privérepo's buiten beeld laten, wat de koppeling voor een
// persoonlijke planner grotendeels nutteloos maakt; `repo` is nodig voor
// issues uit privérepo's, maar geeft ook schrijftoegang tot code. Gekozen:
// `repo read:user`. Eén constante, zodat versmallen later een eenregelige
// wijziging is.
export const GITHUB_SCOPES = 'repo read:user';

// De drie statische headers die élke GitHub-call meestuurt, ongeacht het
// auth-schema (Bearer voor de gewone endpoints, Basic voor de grant-revoke in
// disconnect.js) — één plek zodat ze niet per aanroeper opnieuw worden
// getypt (hergebruikt uit api/feedback.js, zie "Eén correctie op de
// issue-tekst" in de slice-spec — de auth zelf is NIET hergebruikt, die gaat
// hier per gebruiker via de Vault).
export const GITHUB_STATIC_HEADERS = {
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'Ritmo-connections',
};

export function githubHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    ...GITHUB_STATIC_HEADERS,
  };
}

// Upstream-status -> Ritmo-foutcode (i18n-key `connections.errors.github*`).
// Rijker dan Trello's classificatie dankzij de 403-vs-rate-limit-splitsing
// via x-ratelimit-remaining/retry-after — een echte GitHub-eigenaardigheid,
// hergebruikt uit api/feedback.js:93-109 (zie "Eén correctie op de
// issue-tekst" in de slice-spec: alléén deze classificatie is hergebruikt,
// niet de gedeelde-PAT-auth eromheen).
export function classifyGithubStatus(status, headers) {
  if (status === 401) return 'github_auth';
  if (status === 403) {
    const remaining = headers?.get ? headers.get('x-ratelimit-remaining') : null;
    const retryAfter = headers?.get ? headers.get('retry-after') : null;
    const rateLimited = remaining === '0' || retryAfter !== null;
    return rateLimited ? 'github_rate_limit' : 'github_auth';
  }
  if (status === 429) return 'github_rate_limit';
  if (status === 404) return 'github_not_found';
  return 'github_error';
}

// In-memory rate limit, per bucket (endpoint) en sleutel (account-id).
// Best-effort, zelfde opzet en dezelfde beperking als isTrelloRateLimited
// (leeft alleen binnen één serverless-instantie, reset bij een koude start).
const rateLimitBuckets = new Map();

export function isGithubRateLimited(bucket, key, { windowMs, max }) {
  const store = rateLimitBuckets.get(bucket) || new Map();
  rateLimitBuckets.set(bucket, store);
  const now = Date.now();
  const attempts = (store.get(key) || []).filter((t) => now - t < windowMs);
  if (attempts.length >= max) return true;
  attempts.push(now);
  store.set(key, attempts);
  return false;
}

// Path-injectie-hek voor repo-`fullName`s ("owner/repo") vóór ze in een
// GitHub-URL terechtkomen (issues.js). De client stuurt deze waarde mee
// (samen met de stabiele, hernoem-bestendige numerieke id, zie
// src/utils/githubRepoPrefs.js) — dit is dus scherper dan een impliciet
// vertrouwde upstream-waarde, exact zoals Trello's BOARD_ID_REGEX voor
// cliëntinvoer.
export const REPO_FULL_NAME_REGEX = /^[A-Za-z0-9_.-]{1,100}\/[A-Za-z0-9_.-]{1,100}$/;

// Haalt de verbonden GitHub-connectie plus het token en de login uit de Vault
// op. Retourneert `{ connection, token, login }` bij succes, anders
// `{ error }` met code 'not_connected' (geen rij, niet verbonden, of geen
// leesbaar secret) of 'unexpected' (Supabase-fout) — zelfde contract als
// requireTrelloConnection.
export async function requireGithubConnection(supabase, accountId) {
  const { data: connection, error: fetchError } = await supabase
    .from('connections')
    .select('id, status')
    .eq('account_id', accountId)
    .eq('provider', 'github')
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
  if (!secret || typeof secret.access_token !== 'string' || !secret.access_token) {
    return { error: 'not_connected' };
  }

  return { connection, token: secret.access_token, login: secret.login || null };
}
