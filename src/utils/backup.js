import { storage } from '../storage';

const BACKUP_VERSION = 1;
const SETTINGS_KEY = 'settings';
const DAY_PREFIX = 'day:';

export async function exportData() {
  const settingsResult = await storage.get(SETTINGS_KEY);
  const dayKeys = await storage.list(DAY_PREFIX);

  const days = {};
  if (dayKeys && Array.isArray(dayKeys.keys)) {
    for (const key of dayKeys.keys) {
      const result = await storage.get(key);
      if (result && result.value !== undefined) {
        days[key] = result.value;
      }
    }
  }

  const payload = {
    app: 'ritmo',
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    data: {
      settings: settingsResult ? settingsResult.value : null,
      days,
    },
  };

  return JSON.stringify(payload, null, 2);
}

export async function downloadBackup() {
  const json = await exportData();
  const today = new Date().toISOString().slice(0, 10);
  const filename = `ritmo-backup-${today}.json`;

  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function validateBackup(parsed) {
  if (!parsed || typeof parsed !== 'object') return 'invalid_format';
  if (parsed.app !== 'ritmo') return 'not_ritmo';
  if (typeof parsed.version !== 'number') return 'no_version';
  if (parsed.version > BACKUP_VERSION) return 'newer_version';
  if (!parsed.data || typeof parsed.data !== 'object') return 'no_data';
  return null;
}

export async function importData(jsonString, { mode = 'replace' } = {}) {
  let parsed;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    throw new Error('parse_failed');
  }

  const validationError = validateBackup(parsed);
  if (validationError) {
    throw new Error(validationError);
  }

  const { settings, days } = parsed.data;

  if (mode === 'replace') {
    const existingDayKeys = await storage.list(DAY_PREFIX);
    if (existingDayKeys && Array.isArray(existingDayKeys.keys)) {
      for (const key of existingDayKeys.keys) {
        await storage.delete(key);
      }
    }
    await storage.delete(SETTINGS_KEY);
  }

  if (settings !== null && settings !== undefined) {
    await storage.set(SETTINGS_KEY, settings);
  }

  if (days && typeof days === 'object') {
    for (const [key, value] of Object.entries(days)) {
      if (typeof key !== 'string' || !key.startsWith(DAY_PREFIX)) continue;
      await storage.set(key, value);
    }
  }

  return {
    settingsRestored: settings !== null && settings !== undefined,
    daysRestored: days ? Object.keys(days).length : 0,
  };
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error('read_failed'));
    reader.readAsText(file);
  });
}
