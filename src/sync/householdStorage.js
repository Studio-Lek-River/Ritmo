import { get as idbGet, set as idbSet, del as idbDel, createStore } from 'idb-keyval';
import { supabase, isSyncEnabled } from './supabase';
import { enqueue, getQueue, setQueue } from './syncQueue';

const store = createStore('ritmo-db', 'ritmo-store');
const SHARED_PREFIX = 'shared:';

// shared:<householdId>:<moduleId>:<userId>:<date>
function parseSharedKey(key) {
  const parts = key.split(':');
  if (parts.length !== 5 || parts[0] !== 'shared') return null;
  return {
    householdId: parts[1],
    moduleId: parts[2],
    userId: parts[3],
    date: parts[4],
  };
}

export function isSharedKey(key) {
  return typeof key === 'string' && key.startsWith(SHARED_PREFIX);
}

export async function getShared(key) {
  const value = await idbGet(key, store);
  if (value === undefined || value === null) return null;
  return value;
}

export async function setShared(key, value) {
  await idbSet(key, value, store);

  if (!isSyncEnabled()) return;
  const parsed = parseSharedKey(key);
  if (!parsed) return;

  await enqueue({
    op: 'upsert',
    table: 'household_module_data',
    record: {
      household_id: parsed.householdId,
      module_id: parsed.moduleId,
      user_id: parsed.userId,
      date: parsed.date,
      data: typeof value === 'string' ? JSON.parse(value) : value,
      updated_at: new Date().toISOString(),
    },
  });

  flushQueue();
}

export async function deleteShared(key) {
  await idbDel(key, store);
}

let flushing = false;

export async function flushQueue() {
  if (!isSyncEnabled() || flushing || !navigator.onLine) return;
  flushing = true;
  try {
    const queue = await getQueue();
    const remaining = [];
    for (const item of queue) {
      try {
        if (item.op === 'upsert') {
          const { error } = await supabase
            .from(item.table)
            .upsert(item.record, {
              onConflict: 'household_id,module_id,user_id,date',
            });
          if (error) throw error;
        }
      } catch (err) {
        item.attempts += 1;
        if (item.attempts < 5) {
          remaining.push(item);
        } else {
          console.warn('Ritmo sync gave up after 5 attempts', item, err);
        }
      }
    }
    await setQueue(remaining);
  } finally {
    flushing = false;
  }
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', flushQueue);
  setInterval(flushQueue, 30_000);
}
