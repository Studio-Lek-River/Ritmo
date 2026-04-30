// Ritmo storage layer - uses browser localStorage
// Replaces the artifact window.storage API with a real implementation

const PREFIX = 'ritmo:';

export const storage = {
  async get(key) {
    try {
      const value = localStorage.getItem(PREFIX + key);
      if (value === null) return null;
      return { key, value };
    } catch (e) {
      console.error('Storage get error:', e);
      return null;
    }
  },

  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      return { key, value };
    } catch (e) {
      console.error('Storage set error:', e);
      return null;
    }
  },

  async delete(key) {
    try {
      localStorage.removeItem(PREFIX + key);
      return { key, deleted: true };
    } catch (e) {
      console.error('Storage delete error:', e);
      return null;
    }
  },

  async list(prefix = '') {
    try {
      const keys = [];
      const fullPrefix = PREFIX + prefix;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(fullPrefix)) {
          keys.push(k.replace(PREFIX, ''));
        }
      }
      return { keys, prefix };
    } catch (e) {
      console.error('Storage list error:', e);
      return null;
    }
  }
};

// Make available on window for the App.jsx code to work unchanged
if (typeof window !== 'undefined') {
  window.storage = storage;
}