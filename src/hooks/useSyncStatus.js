import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '../sync/syncStatus';
import { isSyncEnabled } from '../sync/supabase';

// Bepaalt de zichtbare status uit phase + online + pending + ingelogd.
export function deriveStatus({ phase, online, pending }, { signedIn }) {
  if (!isSyncEnabled() || !signedIn) return 'localOnly';
  if (phase === 'error') return 'error';
  if (!online) return 'offline';
  if (phase === 'syncing') return 'syncing';
  if (pending > 0) return 'pending';
  return 'synced';
}

export function useSyncStatus({ signedIn } = {}) {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    status: deriveStatus(snap, { signedIn }),
    pending: snap.pending,
    lastSyncedAt: snap.lastSyncedAt,
  };
}
