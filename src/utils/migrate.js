export function migrateModuleConfig(module) {
  if (module.type !== 'timer') return module;
  if (module.unit !== undefined) return module;

  return {
    ...module,
    unit: 'minutes',
    dailyGoal: module.dailyGoalMinutes ?? 0,
    weeklyMax: module.weeklyMaxMinutes,
    presets: [],
    categoriesEnabled: false,
    categories: [],
  };
}

export function migrateDayModuleData(moduleData, moduleConfig) {
  if (!moduleData) return moduleData;
  if (moduleConfig?.type !== 'timer') return moduleData;
  if (moduleData.total !== undefined) return moduleData;

  return {
    ...moduleData,
    total: moduleData.minutes ?? 0,
  };
}
