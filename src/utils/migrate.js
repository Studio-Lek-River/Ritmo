import { WEEKDAY_KEYS } from './dates';
import { NON_TRACKABLE_TYPES } from './dayProgress';
import en from '../i18n/en';
import nl from '../i18n/nl';

function lookupKey(dict, key) {
  return key.split('.').reduce(
    (acc, part) => (acc && typeof acc === 'object') ? acc[part] : undefined,
    dict,
  );
}

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

  if (m.type === 'counter' && m.celebration === undefined) {
    const isWater = m.nameKey === 'presets.drinking.name';
    m = {
      ...m,
      celebration: {
        enabled: isWater,
        animation: 'cowDrinkMilk',
        mode: 'overlay',
      },
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

  if (NON_TRACKABLE_TYPES.has(m.type) && m.countInStreak !== false) {
    m = { ...m, countInStreak: false };
  }

  if (m.type === 'collection') {
    m = {
      ...m,
      countInStreak: false,
      trackingMode: m.trackingMode || 'completion',
      itemFields: { rating: true, notes: true, tags: true, ...(m.itemFields || {}) },
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

  if (m.type === 'measurements') {
    m = {
      ...m,
      metrics: Array.isArray(m.metrics)
        ? m.metrics.map((metric) => ({
            target: null,
            lowerIsBetter: false,
            decimals: 1,
            ...(metric || {}),
            events: Array.isArray(metric?.events) ? metric.events : [],
          }))
        : [],
    };
  }

  if (m.type === 'medication') {
    m = {
      ...m,
      meds: Array.isArray(m.meds)
        ? m.meds.filter(Boolean).map((med) => ({
            unit: '',
            dose: 0,
            supply: 0,
            perWeek: 1,
            injectable: false,
            color: 'blue',
            ...med,
          }))
        : [],
    };
  }

  if (m.type === 'bodymap') {
    m = {
      ...m,
      log: Array.isArray(m.log) ? m.log : [],
    };
  }

  if (m.type === 'collection' && !m.tagGroups) {
    const oldTags = Array.isArray(m.tags) ? m.tags : [];
    const tagGroups = oldTags.length === 0
      ? []
      : [{
          id: 'default',
          labelKey: 'collections.tagGroupDefault',
          color: VALID_COLORS.has(oldTags[0]?.color) ? oldTags[0].color : 'blue',
          allowMultiple: true,
          tags: oldTags.map(({ id, label }) => ({ id, label })),
        }];
    const { tags: _drop, ...rest } = m;
    m = { ...rest, tagGroups };
  }

  if (m.color && COLOR_FALLBACK[m.color]) {
    m = { ...m, color: COLOR_FALLBACK[m.color] };
  }
  if (m.color && !VALID_COLORS.has(m.color)) {
    m = { ...m, color: 'blue' };
  }

  // Vroege builds bakten `name` bij instantiatie — daardoor bleven defaults in
  // de oude taal staan na een language switch. Als `name` exact matcht met de
  // EN- of NL-vertaling van `nameKey` is het auto-gebakken; we strippen het
  // zodat resolveModuleName voortaan live `t(nameKey)` gebruikt.
  if (m.nameKey && m.name) {
    const enName = lookupKey(en, m.nameKey);
    const nlName = lookupKey(nl, m.nameKey);
    if (m.name === enName || m.name === nlName) {
      const { name: _drop, ...rest } = m;
      m = rest;
    }
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
  if (out.appMode === undefined) out.appMode = 'standard';
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

// === Vaste-lasten-model: migratie van budget + utilities + config ===========
//
// Conversie van het oude isUtility-koppelmodel naar het nieuwe vaste-lasten-
// model. Idempotent: tweede aanroep is no-op zodra alle velden zijn omgezet.
// Caller leest household:budget/utilities/config rechtstreeks via window.storage
// (niet via useStoredState — dat introduceert een race) en schrijft alleen
// terug als result.changed === true.

const ISUTILITY_TO_UTILITYTYPE = { electric: 'elektra', gas: 'gas', water: 'water' };

function migrateRecurringItem(item, todayStartDate) {
  let next = item || {};

  if ('frequency' in next) {
    const oldAmount = Number(next.amount) || 0;
    let monthly = oldAmount;
    if (next.frequency === 'weekly') monthly = (oldAmount * 52) / 12;
    else if (next.frequency === 'yearly') monthly = oldAmount / 12;
    if (next.frequency === 'weekly' || next.frequency === 'yearly') {
      // eslint-disable-next-line no-console
      console.log(`[migrate-household] frequency='${next.frequency}' op item "${next.name}" omgerekend naar maandelijks. Controleer paymentDay.`);
    }
    const { frequency: _f, dueMonth: _dm, dueWeekday: _dw, ...rest } = next;
    next = { ...rest, amount: monthly };
  }

  const hasDueDay = 'dueDay' in next;
  const lacksPaymentDay = next.paymentDay === undefined;
  if (hasDueDay || lacksPaymentDay) {
    const day = Number(next.dueDay) || Number(next.paymentDay) || 1;
    const { dueDay: _dd, ...rest } = next;
    next = { ...rest, paymentDay: Math.min(28, Math.max(1, day)) };
  }

  if (next.startDate === undefined) {
    next = { ...next, startDate: todayStartDate };
  }
  if (next.endDate === undefined) {
    next = { ...next, endDate: null };
  }

  if ('isUtility' in next) {
    const { isUtility, ...rest } = next;
    const mapped = ISUTILITY_TO_UTILITYTYPE[isUtility];
    next = mapped ? { ...rest, utilityType: mapped } : rest;
  }

  return next;
}

export function migrateHousehold(budget, utilities, config, today = new Date()) {
  const todayStartDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  let changed = false;

  // ---- Budget ----
  const safeBudget = budget && typeof budget === 'object' ? budget : {};
  const oldIncome = Array.isArray(safeBudget.income) ? safeBudget.income : [];
  const oldExpenses = Array.isArray(safeBudget.expenses) ? safeBudget.expenses : [];
  const oldOneTime = Array.isArray(safeBudget.oneTime) ? safeBudget.oneTime : null;

  const itemsNeedMigration = [...oldIncome, ...oldExpenses].some(it =>
    it && (
      'frequency' in it ||
      'dueDay' in it ||
      'isUtility' in it ||
      it.paymentDay === undefined ||
      it.startDate === undefined ||
      it.endDate === undefined
    )
  );
  const needsOneTime = oldOneTime === null;

  let nextBudget = safeBudget;
  if (itemsNeedMigration || needsOneTime) {
    nextBudget = {
      ...safeBudget,
      income: oldIncome.map(it => migrateRecurringItem(it, todayStartDate)),
      expenses: oldExpenses.map(it => migrateRecurringItem(it, todayStartDate)),
      oneTime: oldOneTime || [],
    };
    changed = true;
  }

  // ---- Config ----
  let nextConfig = config && typeof config === 'object' ? config : {};
  if ('energyCombined' in nextConfig) {
    const { energyCombined: _ec, ...rest } = nextConfig;
    nextConfig = rest;
    changed = true;
  }

  // ---- Utilities ----
  const safeUtilities = utilities && typeof utilities === 'object' ? utilities : {};
  const hasActuals = 'actuals' in safeUtilities;
  const oldShapeKeys = Object.keys(safeUtilities).filter(k => /^\d{4}-\d{2}$/.test(k));
  const isOldShape = !hasActuals && oldShapeKeys.length > 0;
  const isEmpty = !hasActuals && oldShapeKeys.length === 0;

  let nextUtilities = safeUtilities;
  if (isOldShape) {
    const newActuals = {};
    const typeMap = { water: 'water', electricity: 'elektra', gas: 'gas' };
    for (const monthKey of oldShapeKeys) {
      const monthData = safeUtilities[monthKey];
      if (!monthData || typeof monthData !== 'object') continue;
      const out = {};
      for (const [oldType, newType] of Object.entries(typeMap)) {
        const slot = monthData[oldType];
        if (!slot || typeof slot !== 'object') continue;
        const actual = Number(slot.actual) || 0;
        const auto = slot.autoFromBudget && typeof slot.autoFromBudget === 'object'
          ? Object.values(slot.autoFromBudget).reduce((s, v) => s + (Number(v) || 0), 0)
          : 0;
        const total = actual + auto;
        if (total > 0) out[newType] = total;
      }
      if (Object.keys(out).length > 0) newActuals[monthKey] = out;
    }
    nextUtilities = { actuals: newActuals };
    changed = true;
  } else if (isEmpty) {
    nextUtilities = { actuals: {} };
    changed = true;
  } else if (hasActuals) {
    if ('expenses' in safeUtilities || typeof safeUtilities.actuals !== 'object' || safeUtilities.actuals === null) {
      nextUtilities = { actuals: safeUtilities.actuals && typeof safeUtilities.actuals === 'object' ? safeUtilities.actuals : {} };
      changed = true;
    }
  }

  return { budget: nextBudget, utilities: nextUtilities, config: nextConfig, changed };
}
