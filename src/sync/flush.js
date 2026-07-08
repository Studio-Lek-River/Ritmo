import { supabase, isSyncEnabled } from './supabase';
import { getQueue, setQueue } from './syncQueue';
import { markSyncing, markSynced, markError } from './syncStatus';

// Generieke sync-queue flusher: drukt gequeuede upserts/deletes naar Supabase.
// Tabel-agnostisch — elk queue-item draagt zijn eigen `table` en `onConflict`.
let flushing = false;

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
          const { error } = await supabase
            .from(item.table)
            .upsert(item.record, item.onConflict ? { onConflict: item.onConflict } : undefined);
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
