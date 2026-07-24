import { set as idbSet, createStore } from 'idb-keyval';
import { supabase, isSyncEnabled } from './supabase';
import { getQueue, setQueue } from './syncQueue';
import { markSyncing, markSynced, markError } from './syncStatus';
import { mergeSyncedValue } from './mergeSettings';

// Generieke sync-queue flusher: drukt gequeuede upserts/deletes naar Supabase.
// Tabel-agnostisch — elk queue-item draagt zijn eigen `table` en `onConflict`.
let flushing = false;

// Zelfde IndexedDB-store en __sync:updated_at:<key>-conventie als
// userDataStorage.js, zodat een read-modify-write op de settings-rij hier
// ook lokaal consistent blijft.
const store = createStore('ritmo-db', 'ritmo-store');
function metaKey(key) {
  return `__sync:updated_at:${key}`;
}

// Read-modify-write voor een settings-upsert: haalt de huidige cloud-rij op,
// mergt hem met de lokale waarde uit dit queue-item (union van health-
// append-arrays, zie mergeSettings.js) en geeft het gemergde record terug
// zodat de upsert geen net gesyncte metingen van een ander apparaat
// overschrijft. Schrijft het resultaat ook terug naar lokale IndexedDB.
async function mergeSettingsBeforeUpsert(item) {
  const { data, error } = await supabase
    .from(item.table)
    .select('value')
    .eq('user_id', item.record.user_id)
    .eq('key', 'settings')
    .maybeSingle();
  if (error) throw error;

  const cloudValue = data?.value ?? null;
  const merged = mergeSyncedValue('settings', cloudValue, item.record.value);

  await idbSet('settings', JSON.stringify(merged), store);
  await idbSet(metaKey('settings'), item.record.updated_at, store);

  return { ...item, record: { ...item.record, value: merged } };
}

export async function flushQueue() {
  if (!isSyncEnabled() || flushing || !navigator.onLine) return;
  flushing = true;
  markSyncing();
  let hadFailure = false;
  try {
    const queue = await getQueue();
    const remaining = [];
    for (const item of queue) {
      try {
        if (item.op === 'upsert') {
          const isSettingsUpsert =
            item.table === 'user_data' && item.record?.key === 'settings';
          const upsertItem = isSettingsUpsert ? await mergeSettingsBeforeUpsert(item) : item;
          const { error } = await supabase
            .from(upsertItem.table)
            .upsert(
              upsertItem.record,
              upsertItem.onConflict ? { onConflict: upsertItem.onConflict } : undefined,
            );
          if (error) throw error;
        } else if (item.op === 'delete') {
          const { error } = await supabase
            .from(item.table)
            .delete()
            .match(item.match);
          if (error) throw error;
        }
      } catch (err) {
        hadFailure = true;
        item.attempts += 1;
        if (item.attempts < 5) {
          remaining.push(item);
        } else {
          console.warn('Ritmo sync gave up after 5 attempts', item, err);
        }
      }
    }
    await setQueue(remaining);
    if (hadFailure && remaining.length > 0) markError();
    else markSynced();
  } catch {
    markError();
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue);
  setInterval(flushQueue, 30_000);
}
