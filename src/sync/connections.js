// Frontend-glue voor Koppelingen (S02). Connection-metadata komt via een
// directe supabase-select onder RLS — NIET via user_data/isUserSyncKey, want
// tokens mogen nooit door de browser-sync-tak (zie
// docs/slices/S02-connections-items-model.md). Verbinden/verbreken loopt via de
// api/connections/*-endpoints, die met de service-role-key en de Vault werken.
import { supabase, isSyncEnabled } from './supabase';

export const CONNECTION_PROVIDERS = ['outlook', 'trello', 'github'];

// De ene plek waar staat welke provider meerdere accounts naast elkaar mag
// hebben (#120, "generiek fundament" — Outlook en GitHub blijven één account
// per provider, zie de slice-spec). `ConnectionsSection.jsx` leest dit om per
// provider te kiezen tussen de bestaande enkelvoudige rij en een rij per
// verbonden account plus een "Account toevoegen"-knop.
export const MULTI_ACCOUNT_PROVIDERS = ['trello'];

export async function listConnections(accountId) {
  if (!isSyncEnabled() || !accountId) return [];

  const { data, error } = await supabase
    .from('connections')
    .select('id, provider, label, status, external_account, created_at, updated_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: true });

  if (error) {
    console.warn('Ritmo connections list failed', error);
    return [];
  }

  return data || [];
}

// Gedeelde JWT-plus-fetch-kern voor élk `api/`-endpoint dat een ingelogde
// gebruiker nodig heeft, niet alleen `api/connections/**` — S11 trekt hem
// hierheen zodat `fetchServerPlan` (die naar `api/plan.js` post) geen tweede
// kopie van deze logica hoeft te onderhouden. `path` is het volledige
// `/api/...`-pad.
async function callApi(path, body) {
  if (!isSyncEnabled()) {
    const err = new Error('sync_not_configured');
    err.code = 'server_config';
    throw err;
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) {
    const err = new Error('unauthenticated');
    err.code = 'unauthenticated';
    throw err;
  }

  const response = await fetch(path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || 'api_request_failed');
    err.code = data.code || 'unexpected';
    throw err;
  }

  return data;
}

async function callConnectionsApi(path, body) {
  return callApi(`/api/connections/${path}`, body);
}

export async function disconnectConnection(connectionId) {
  return callConnectionsApi('disconnect', { connectionId });
}

// Start de echte Outlook-OAuth-redirect (S07): haalt de authorize-URL op
// (server-side state, zie api/connections/outlook/start.js) en navigeert de
// hele pagina naar Microsoft (Poort-0-keuze: volledige redirect, geen popup).
export async function startOutlookConnect() {
  const data = await callConnectionsApi('outlook/start', {});
  if (data?.authorizeUrl) {
    window.location.assign(data.authorizeUrl);
  }
  return data;
}

// Haalt de Outlook-agenda op voor een datum-range (S07, ephemeer — zie
// api/connections/outlook/events.js). `range` = { start, end, timeZone }
// (ISO-strings + optionele IANA-tijdzone voor de Prefer-header server-side).
export async function fetchOutlookEvents(range) {
  return callConnectionsApi('outlook/events', range || {});
}

// Trello (S08, key+token-flow, geen OAuth — zie api/connections/trello/*.js).
// Haalt de server-gebouwde authorize-URL op (TRELLO_API_KEY is server-only,
// de frontend kan de link dus niet zelf samenstellen).
export async function fetchTrelloAuthorizeUrl() {
  return callConnectionsApi('trello/start', {});
}

// Slaat een geplakt Trello-token op; de server valideert het eerst tegen
// Trello (api/connections/trello/token.js) voordat hij het in de Vault zet.
export async function saveTrelloToken(token) {
  return callConnectionsApi('trello/token', { token });
}

// Haalt de open Trello-borden op (voor de bord-kiezer, pas bij uitklappen).
export async function fetchTrelloBoards() {
  return callConnectionsApi('trello/boards', {});
}

// Haalt lijsten + kaarten op voor de aangevinkte Trello-borden. `boardPairs`
// is een array van `{ connectionId, boardId }` (#120, meerdere Trello-
// accounts: het board-id alleen is niet meer genoeg om te weten met welk
// account het opgehaald moet worden, zie utils/trelloBoardPrefs.js).
export async function fetchTrelloCards(boardPairs) {
  return callConnectionsApi('trello/cards', { boards: boardPairs || [] });
}

// GitHub (S09, OAuth App — zie api/connections/github/*.js). Start de echte
// GitHub-OAuth-redirect, zelfde vorm als startOutlookConnect: haalt de
// authorize-URL op (server-side state) en navigeert de hele pagina naar
// GitHub (Poort-0-keuze: volledige redirect, geen popup, geen nieuw
// tabblad zoals bij Trello).
export async function startGithubConnect() {
  const data = await callConnectionsApi('github/start', {});
  if (data?.authorizeUrl) {
    window.location.assign(data.authorizeUrl);
  }
  return data;
}

// Haalt de repo's op waar de gebruiker toegang toe heeft (voor de
// repo-kiezer, pas bij uitklappen).
export async function fetchGithubRepos() {
  return callConnectionsApi('github/repos', {});
}

// Haalt de aan de gebruiker toegewezen issues op voor de aangevinkte repo's.
// `repoIds` is een array van `{ id, fullName }` (zie utils/githubRepoPrefs.js).
export async function fetchGithubIssues(repoIds) {
  return callConnectionsApi('github/issues', { repoIds: repoIds || [] });
}

// Server-provider-seam voor de planner-AI (S11, `api/plan.js`). Geen
// `/api/connections`-pad — dit endpoint hoort niet bij de koppelingen-laag —
// dus rechtstreeks via `callApi`. Zolang de AI-env op de server ontbreekt
// geeft dat endpoint `501 { code: 'not_configured' }` terug; de aanroeper
// (`src/utils/planProviders/server.js`) vertaalt dat naar de fallback op de
// heuristiek.
export async function fetchServerPlan(payload) {
  return callApi('/api/plan', payload || {});
}
