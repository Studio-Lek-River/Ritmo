import { set as idbSet, createStore } from 'idb-keyval';
import { supabase, isSyncEnabled } from './supabase';
import { getQueue } from './syncQueue';

const store = createStore('ritmo-db', 'ritmo-store');
const subscriptions = new Map();

export function subscribeToHousehold(householdId, onConflict) {
  if (!isSyncEnabled()) return () => {};

  if (subscriptions.has(householdId)) {
    subscriptions.get(householdId).count += 1;
    return () => unsubscribe(householdId);
  }

  const channel = supabase
    .channel(`household:${householdId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'household_module_data',
        filter: `household_id=eq.${householdId}`,
      },
      async (payload) => {
        const row = payload.new || payload.old;
        if (!row) return;
        const key = `shared:${row.household_id}:${row.module_id}:${row.user_id}:${row.date}`;

        if (payload.eventType === 'DELETE') {
          await idbSet(key, null, store);
          return;
        }

        // Conflict detection: check if there is a queued write for this key
        // that is newer than what we received
        const queue = await getQueue();
        const queuedItem = queue.find(
          item =>
            item.op === 'upsert' &&
            item.record.household_id === row.household_id &&
            item.record.module_id === row.module_id &&
            item.record.user_id === row.user_id &&
            item.record.date === row.date,
        );

        const hasConflict = queuedItem &&
          new Date(queuedItem.record.updated_at) > new Date(row.updated_at);

        // Update local cache (stored as JSON string to match storage layer convention)
        await idbSet(key, JSON.stringify(row.data), store);

        if (hasConflict && onConflict) {
          onConflict({ key, row, updatedBy: row.user_id });
        }
      },
    )
    .subscribe();

  subscriptions.set(householdId, { channel, count: 1 });
  return () => unsubscribe(householdId);
}

function unsubscribe(householdId) {
  const entry = subscriptions.get(householdId);
  if (!entry) return;
  entry.count -= 1;
  if (entry.count <= 0) {
    supabase.removeChannel(entry.channel);
    subscriptions.delete(householdId);
  }
}
