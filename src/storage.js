import {
  get as idbGet,
  set as idbSet,
  del as idbDel,
  keys as idbKeys,
  createStore,
} from 'idb-keyval';

const PREFIX = 'ritmo:';
const MIGRATION_FLAG = '__migrated_from_localstorage__';

const store = createStore('ritmo-db', 'ritmo-store');

let migrationPromise = null;

async function runMigration() {
  try {
    const alreadyMigrated = await idbGet(MIGRATION_FLAG, store);
    if (alreadyMigrated) return;

    if (typeof localStorage !== 'undefined') {
      const keysToMigrate = [];
      for (let i = 0; i < localStorage.length; i++) {
        const fullKey = localStorage.key(i);
        if (fullKey && fullKey.startsWith(PREFIX)) {
          keysToMigrate.push(fullKey);
        }
      }

      for (const fullKey of keysToMigrate) {
        const shortKey = fullKey.slice(PREFIX.length);
        const raw = localStorage.getItem(fullKey);
        if (raw == null) continue;
        await idbSet(shortKey, raw, store);
      }
    }

    await idbSet(MIGRATION_FLAG, true, store);
  } catch (err) {
    console.warn('Ritmo storage migration failed:', err);
  }
}

function ensureMigrated() {
  if (!migrationPromise) {
    migrationPromise = runMigration();
  }
  return migrationPromise;
}

export const storage = {
  async get(key) {
    await ensureMigrated();
    const value = await idbGet(key, store);
    if (value === undefined || value === null) return null;
    return { key, value };
  },

  async set(key, value) {
    await ensureMigrated();
    await idbSet(key, value, store);
    return { key, value };
  },

  async delete(key) {
    await ensureMigrated();
    await idbDel(key, store);
    return { key, deleted: true };
  },

  async list(prefix) {
    await ensureMigrated();
    const allKeys = await idbKeys(store);
    const filtered = allKeys.filter((k) => {
      if (k === MIGRATION_FLAG) return false;
      if (typeof k !== 'string') return false;
      if (prefix) return k.startsWith(prefix);
      return true;
    });
    return { keys: filtered, prefix };
  },
};

if (typeof window !== 'undefined') {
  window.storage = storage;
}

export default storage;
