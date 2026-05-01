const COLOR_FALLBACK = { rose: 'pink' };

const VALID_COLORS = new Set([
  'red', 'orange', 'amber', 'yellow', 'green', 'teal', 'cyan',
  'blue', 'indigo', 'purple', 'pink',
]);

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

  if (m.color && COLOR_FALLBACK[m.color]) {
    m = { ...m, color: COLOR_FALLBACK[m.color] };
  }
  if (m.color && !VALID_COLORS.has(m.color)) {
    m = { ...m, color: 'blue' };
  }

  return m;
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
