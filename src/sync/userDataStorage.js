import {
  get as idbGet,
  set as idbSet,
  del as idbDel,
  keys as idbKeys,
  createStore,
} from 'idb-keyval';
import { supabase, isSyncEnabled } from './supabase';
import { onAuthChange, getCurrentUser } from './auth';
import { enqueue, getQueue } from './syncQueue';
import { flushQueue } from './householdStorage';
import { markSyncing, markSynced, markError, refreshPending } from './syncStatus';

const store = createStore('ritmo-db', 'ritmo-store');
const TABLE = 'user_data';
const ON_CONFLICT = 'user_id,key';

let currentUserId = null;

if (isSyncEnabled()) {
  getCurrentUser().then((u) => {
    currentUserId = u?.id ?? null;
  });
  onAuthChange((user) => {
    currentUserId = user?.id ?? null;
  });
}

export function isUserSyncKey(key) {
  if (typeof key !== 'string') return false;
  if (key === 'settings') return true;
  if (key.startsWith('day:')) return true;
  return false;
}

function metaKey(key) {
  return `__sync:updated_at:${key}`;
}

function toJsonValue(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function toStorageValue(value) {
  return typeof value === 'string' ? value : JSON.stringify(value);
}

export async function getUserData(key) {
  const value = await idbGet(key, store);
  if (value === undefined || value === null) return null;
  return value;
}

export async function setUserData(key, value) {
  await idbSet(key, value, store);

  if (!isSyncEnabled() || !currentUserId) return;

  const now = new Date().toISOString();
  await idbSet(metaKey(key), now, store);

  await enqueue({
    op: 'upsert',
    table: TABLE,
    onConflict: ON_CONFLICT,
    record: {
      user_id: currentUserId,
      key,
      value: toJsonValue(value),
      updated_at: now,
    },
  });

  await refreshPending();
  flushQueue();
}

export async function deleteUserData(key) {
  await idbDel(key, store);
  await idbDel(metaKey(key), store);

  if (!isSyncEnabled() || !currentUserId) return;

  await enqueue({
    op: 'delete',
    table: TABLE,
    match: { user_id: currentUserId, key },
  });

  await refreshPending();
  flushQueue();
}

async function listLocalSyncKeys() {
  const all = await idbKeys(store);
  return all.filter((k) => typeof k === 'string' && isUserSyncKey(k));
}

export async function pullUserData(userId, resolveConflict) {
  if (!isSyncEnabled() || !userId) {
    return { pulled: 0, pushed: 0, conflicts: 0, error: null };
  }

  markSyncing();

  const { data, error } = await supabase
    .from(TABLE)
    .select('key, value, updated_at')
    .eq('user_id', userId);

  if (error) {
    console.warn('Ritmo user_data pull failed', error);
    markError();
    return { pulled: 0, pushed: 0, conflicts: 0, error };
  }

  const cloudRows = (data || []).filter((row) => isUserSyncKey(row.key));
  const cloudKeySet = new Set(cloudRows.map((r) => r.key));

  const conflicts = [];
  let pulled = 0;
  let pushed = 0;

  for (const row of cloudRows) {
    const localValue = await idbGet(row.key, store);
    const localMeta = await idbGet(metaKey(row.key), store);

    const localExists = localValue !== undefined && localValue !== null;

    if (!localExists) {
      await idbSet(row.key, toStorageValue(row.value), store);
      await idbSet(metaKey(row.key), row.updated_at, store);
      pulled += 1;
      continue;
    }

    if (!localMeta) {
      conflicts.push({ key: row.key, cloud: row });
      continue;
    }

    if (new Date(row.updated_at) > new Date(localMeta)) {
      await idbSet(row.key, toStorageValue(row.value), store);
      await idbSet(metaKey(row.key), row.updated_at, store);
      pulled += 1;
    }
  }

  const localKeys = await listLocalSyncKeys();
  const now = new Date().toISOString();
  for (const key of localKeys) {
    if (cloudKeySet.has(key)) continue;
    const value = await idbGet(key, store);
    if (value === undefined || value === null) continue;
    await idbSet(metaKey(key), now, store);
    await enqueue({
      op: 'upsert',
      table: TABLE,
      onConflict: ON_CONFLICT,
      record: {
        user_id: userId,
        key,
        value: toJsonValue(value),
        updated_at: now,
      },
    });
    pushed += 1;
  }

  if (conflicts.length > 0 && typeof resolveConflict === 'function') {
    const choice = await resolveConflict(
      conflicts.map((c) => ({ key: c.key, cloudUpdatedAt: c.cloud.updated_at })),
    );

    const resolutionNow = new Date().toISOString();
    for (const { key, cloud } of conflicts) {
      if (choice === 'cloud') {
        await idbSet(key, toStorageValue(cloud.value), store);
        await idbSet(metaKey(key), cloud.updated_at, store);
        pulled += 1;
      } else {
        const localValue = await idbGet(key, store);
        if (localValue === undefined || localValue === null) continue;
        await idbSet(metaKey(key), resolutionNow, store);
        await enqueue({
          op: 'upsert',
          table: TABLE,
          onConflict: ON_CONFLICT,
          record: {
            user_id: userId,
            key,
            value: toJsonValue(localValue),
            updated_at: resolutionNow,
          },
        });
        pushed += 1;
      }
    }
  }

  flushQueue();

  markSynced();

  return { pulled, pushed, conflicts: conflicts.length, error: null };
}

export async function hasPendingConflicts(userId) {
  if (!isSyncEnabled() || !userId) return false;
  const queue = await getQueue();
  return queue.some(
    (item) => item.table === TABLE && item.record?.user_id === userId,
  );
}
