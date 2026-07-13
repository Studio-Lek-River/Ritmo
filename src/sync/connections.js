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
