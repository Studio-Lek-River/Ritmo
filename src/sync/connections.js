// Frontend-glue voor Koppelingen (S02). Connection-metadata komt via een
// directe supabase-select onder RLS — NIET via user_data/isUserSyncKey, want
// tokens mogen nooit door de browser-sync-tak (zie
// docs/slices/S02-connections-items-model.md). Verbinden/verbreken loopt via de
// api/connections/*-endpoints, die met de service-role-key en de Vault werken.
import { supabase, isSyncEnabled } from './supabase';

export const CONNECTION_PROVIDERS = ['outlook', 'trello', 'github'];

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

async function callConnectionsApi(path, body) {
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

  const response = await fetch(`/api/connections/${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body || {}),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const err = new Error(data.error || 'connections_api_failed');
    err.code = data.code || 'unexpected';
    throw err;
  }

  return data;
}

export async function disconnectConnection(connectionId) {
  return callConnectionsApi('disconnect', { connectionId });
}

export async function connectProvider(provider) {
  return callConnectionsApi('connect', { provider });
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

// Haalt lijsten + kaarten op voor de aangevinkte Trello-borden.
export async function fetchTrelloCards(boardIds) {
  return callConnectionsApi('trello/cards', { boardIds: boardIds || [] });
}
