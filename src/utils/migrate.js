import { WEEKDAY_KEYS } from './dates';

const COLOR_FALLBACK = { rose: 'pink' };

const VALID_COLORS = new Set([
  'red', 'orange', 'amber', 'yellow', 'green', 'teal', 'cyan',
  'blue', 'indigo', 'purple', 'pink',
]);

const DEFAULT_SLEEP_GOALS = {
  monday:    { bed: '23:00', wake: '07:00' },
  tuesday:   { bed: '23:00', wake: '07:00' },
  wednesday: { bed: '23:00', wake: '07:00' },
  thursday:  { bed: '23:00', wake: '07:00' },
  friday:    { bed: '00:00', wake: '08:30' },
  saturday:  { bed: '00:00', wake: '09:00' },
  sunday:    { bed: '23:00', wake: '07:30' },
};

export function migrateModuleConfig(module) {
  let m = module;

  if (m.type === 'timer') {
    m = { ...m, type: 'counter' };
  }

  if (m.type === 'counter' && m.unit === undefined) {
    m = {
      ...m,
      unit: 'minutes',
      dailyGoal: m.dailyGoalMinutes ?? 0,
      weeklyMax: m.weeklyMaxMinutes,
      presets: m.presets ?? [],
      categoriesEnabled: m.categoriesEnabled ?? false,
      categories: m.categories ?? [],
    };
  }

  if (m.type === 'sleep') {
    const goals = { ...DEFAULT_SLEEP_GOALS, ...(m.goals || {}) };
    for (const k of WEEKDAY_KEYS) {
      if (!goals[k] || !goals[k].bed || !goals[k].wake) {
        goals[k] = DEFAULT_SLEEP_GOALS[k];
      }
    }
    m = {
      ...m,
      goals,
      toleranceMinutes: typeof m.toleranceMinutes === 'number' && m.toleranceMinutes >= 1
        ? m.toleranceMinutes
        : 15,
      showMorningScore: typeof m.showMorningScore === 'boolean' ? m.showMorningScore : true,
    };
  }

  if (m.type === 'collection') {
    m = {
      ...m,
      countInStreak: false,
      trackingMode: m.trackingMode || 'completion',
      itemFields: { rating: true, notes: true, tags: true, ...(m.itemFields || {}) },
      tags: Array.isArray(m.tags) ? m.tags : [],
      items: Array.isArray(m.items)
        ? m.items.map((it) => ({
            tags: [],
            rating: 0,
            notes: '',
            events: [],
            ...it,
          }))
        : [],
    };
  }

  if (m.color && COLOR_FALLBACK[m.color]) {
    m = { ...m, color: COLOR_FALLBACK[m.color] };
  }
  if (m.color && !VALID_COLORS.has(m.color)) {
    m = { ...m, color: 'blue' };
  }

  return m;
}

// Niet-destructieve settings-migratie. Voegt nieuwe defaults toe wanneer keys ontbreken.
// Returnt het (mogelijk gewijzigde) settings-object. Mutatie van het origineel
// gebeurt niet — caller schrijft het resultaat terug naar storage.
export function migrateSettings(settings) {
  if (!settings || typeof settings !== 'object') return settings;
  const out = { ...settings };
  if (out.language === undefined) {
    out.language = 'auto';
  }
  return out;
}

export function migrateDayModuleData(moduleData, moduleConfig) {
  if (!moduleData) return moduleData;
  if (moduleConfig?.type !== 'counter') return moduleData;
  if (moduleData.total !== undefined) return moduleData;

  return {
    ...moduleData,
    total: moduleData.minutes ?? 0,
  };
}
