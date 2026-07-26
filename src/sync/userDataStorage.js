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
import { flushQueue } from './flush';
import { markSyncing, markSynced, markError, refreshPending } from './syncStatus';
import { markPullReady, bumpRevision } from './pullState';
import { mergeSyncedValue } from './mergeSettings';

const store = createStore('ritmo-db', 'ritmo-store');
const TABLE = 'user_data';
const ON_CONFLICT = 'user_id,key';
// Onthoudt per apparaat de conflictkeuze. Valt onder de bestaande
// `__sync:`-uitsluiting in storage.js, dus lekt niet in list() en telt niet
// als sync-key. Alleen 'cloud' wordt bewaard (zie pullUserData).
const CONFLICT_POLICY_KEY = '__sync:conflict_policy';

let currentUserId = null;

// Resolvet zodra de initiële auth-status bekend is. setUserData/deleteUserData
// wachten hierop, zodat een write vlak na het openen (vóór getCurrentUser klaar
// is) niet stilletjes zonder sync-metadata en cloud-push wordt weggeschreven.
let resolveAuthReady;
const authReady = new Promise((r) => {
  resolveAuthReady = r;
});

if (isSyncEnabled()) {
  getCurrentUser().then((u) => {
    currentUserId = u?.id ?? null;
    resolveAuthReady();
    // Geen gebruiker: er komt geen ophaal, dus de poort mag meteen open.
    if (!currentUserId) markPullReady();
  });
  onAuthChange((user) => {
    currentUserId = user?.id ?? null;
  });
} else {
  resolveAuthReady();
  // Sync staat uit: schrijfacties hebben nooit op een ophaal te wachten.
  markPullReady();
}

export function isUserSyncKey(key) {
  if (typeof key !== 'string') return false;
  if (key === 'settings') return true;
  if (key.startsWith('day:')) return true;
  if (key.startsWith('household:')) return true;
  if (key.startsWith('nutrition:')) return true;
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

  if (!isSyncEnabled()) return;
  await authReady;
  if (!currentUserId) return;

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

  if (!isSyncEnabled()) return;
  await authReady;
  if (!currentUserId) return;

  await enqueue({
    op: 'delete',
    table: TABLE,
    match: { user_id: currentUserId, key },
  });

  await refreshPending();
  flushQueue();
}

// Mergt een gepulde settings-cloudwaarde met de lokale waarde (union van
// health-append-arrays, zie mergeSettings.js), schrijft het resultaat lokaal
// weg en enqueuet — als loop-guard tegen oneindig ping-pong — alleen een
// push van het mergeresultaat als dat verschilt van de cloudwaarde.
async function applySettingsMerge(userId, cloudValue, cloudUpdatedAt, localValue) {
  const merged = mergeSyncedValue('settings', cloudValue, localValue);
  const cloudNormalized = JSON.stringify(toJsonValue(cloudValue));
  const mergedNormalized = JSON.stringify(merged);

  await idbSet('settings', toStorageValue(merged), store);

  if (mergedNormalized === cloudNormalized) {
    await idbSet(metaKey('settings'), cloudUpdatedAt, store);
    return { pushed: false };
  }

  const now = new Date().toISOString();
  await idbSet(metaKey('settings'), now, store);
  await enqueue({
    op: 'upsert',
    table: TABLE,
    onConflict: ON_CONFLICT,
    record: {
      user_id: userId,
      key: 'settings',
      value: merged,
      updated_at: now,
    },
  });
  return { pushed: true };
}

async function listLocalSyncKeys() {
  const all = await idbKeys(store);
  return all.filter((k) => typeof k === 'string' && isUserSyncKey(k));
}

export async function pullUserData(userId, resolveConflict) {
  if (!isSyncEnabled() || !userId) {
    // Geen ophaal te verwachten: de poort mag niet op deze uitkomst blijven wachten.
    markPullReady();
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
    // Ook bij een mislukte ophaal is de eerste poging klaar; de poort mag
    // open, anders blokkeren schrijfacties op een ophaal die nooit lukt.
    markPullReady();
    return { pulled: 0, pushed: 0, conflicts: 0, error };
  }

  const cloudRows = (data || []).filter((row) => isUserSyncKey(row.key));
  const cloudKeySet = new Set(cloudRows.map((r) => r.key));

  const conflicts = [];
  let pulled = 0;
  let pushed = 0;
  // Onthoudt de conflict-keuze buiten het if-blok hieronder, zodat we na
  // afloop kunnen bepalen of er lokaal daadwerkelijk iets is opgelost.
  let conflictChoice = null;

  for (const row of cloudRows) {
    const localValue = await idbGet(row.key, store);
    const localMeta = await idbGet(metaKey(row.key), store);

    const localExists = localValue !== undefined && localValue !== null;

    if (!localExists) {
      if (row.key === 'settings') {
        const { pushed: didPush } = await applySettingsMerge(userId, row.value, row.updated_at, localValue);
        if (didPush) pushed += 1;
      } else {
        await idbSet(row.key, toStorageValue(row.value), store);
        await idbSet(metaKey(row.key), row.updated_at, store);
      }
      pulled += 1;
      continue;
    }

    if (!localMeta) {
      conflicts.push({ key: row.key, cloud: row });
      continue;
    }

    if (new Date(row.updated_at) > new Date(localMeta)) {
      if (row.key === 'settings') {
        const { pushed: didPush } = await applySettingsMerge(userId, row.value, row.updated_at, localValue);
        if (didPush) pushed += 1;
      } else {
        await idbSet(row.key, toStorageValue(row.value), store);
        await idbSet(metaKey(row.key), row.updated_at, store);
      }
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

  if (conflicts.length > 0) {
    // Zodra de gebruiker één keer 'cloud' koos, onthouden we dat op dit
    // apparaat en lossen we volgende conflicten stil op zonder opnieuw te
    // vragen. 'local' wordt bewust niet onthouden (blijft eenmalig).
    const savedPolicy = await idbGet(CONFLICT_POLICY_KEY, store);
    let choice = null;
    if (savedPolicy === 'cloud') {
      choice = 'cloud';
    } else if (typeof resolveConflict === 'function') {
      choice = await resolveConflict(
        conflicts.map((c) => ({ key: c.key, cloudUpdatedAt: c.cloud.updated_at })),
      );
      if (choice === 'cloud') {
        await idbSet(CONFLICT_POLICY_KEY, 'cloud', store);
      }
    }
    conflictChoice = choice;

    const resolutionNow = new Date().toISOString();
    for (const { key, cloud } of conflicts) {
      if (!choice) break;
      if (choice === 'cloud') {
        if (key === 'settings') {
          const localValueForKey = await idbGet(key, store);
          const { pushed: didPush } = await applySettingsMerge(userId, cloud.value, cloud.updated_at, localValueForKey);
          if (didPush) pushed += 1;
        } else {
          await idbSet(key, toStorageValue(cloud.value), store);
          await idbSet(metaKey(key), cloud.updated_at, store);
        }
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

  // Herlaad-signaal voor lezers (App.jsx, useStoredState): alleen omhoog als
  // deze ophaal lokaal daadwerkelijk iets heeft veranderd of opgelost.
  const conflictsResolved = conflicts.length > 0 && !!conflictChoice;
  if (pulled > 0 || conflictsResolved) bumpRevision();
  markPullReady();

  return { pulled, pushed, conflicts: conflicts.length, error: null };
}

export async function hasPendingConflicts(userId) {
  if (!isSyncEnabled() || !userId) return false;
  const queue = await getQueue();
  return queue.some(
    (item) => item.table === TABLE && item.record?.user_id === userId,
  );
}
