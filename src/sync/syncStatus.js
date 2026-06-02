import { getQueue } from './syncQueue';

let state = {
  phase: 'idle',          // 'idle' | 'syncing' | 'error'
  pending: 0,             // aantal items in de wachtrij
  lastSyncedAt: null,     // timestamp (ms) van laatste succesvolle sync
  online: typeof navigator !== 'undefined' ? navigator.onLine : true,
};

const listeners = new Set();

function emit() {
  for (const l of listeners) l();
}

export function getSnapshot() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(patch) {
  state = { ...state, ...patch };
  emit();
}

export function markSyncing() {
  set({ phase: 'syncing' });
}

export function markSynced() {
  set({ phase: 'idle', lastSyncedAt: Date.now() });
  refreshPending();
}

export function markError() {
  set({ phase: 'error' });
}

// Leest de actuele queue-lengte uit IndexedDB en publiceert die.
export async function refreshPending() {
  try {
    const queue = await getQueue();
    set({ pending: Array.isArray(queue) ? queue.length : 0 });
  } catch {
    // queue niet leesbaar: laat pending ongemoeid
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => set({ online: true }));
  window.addEventListener('offline', () => set({ online: false }));
  // eerste meting bij app-start
  refreshPending();
}
