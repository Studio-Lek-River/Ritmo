// Default modules voor nieuwe gebruikers. `nameKey` blijft op het module-object
// staan zodat de titel live met `t(nameKey)` wordt gerenderd; pas wanneer de
// gebruiker de module hernoemt schrijven we `name` (en wordt het user-data).
export const DEFAULT_MODULES = [
  { id: 'morning', nameKey: 'presets.defaultMorning', icon: 'Sun', color: 'amber', enabled: true, countInStreak: false, type: 'checklist', items: [] },
  { id: 'physio', nameKey: 'presets.defaultPhysio', icon: 'Activity', color: 'purple', enabled: true, countInStreak: false, type: 'checklist', items: [] },
  { id: 'walk', nameKey: 'presets.defaultWalk', icon: 'Footprints', color: 'green', enabled: true, countInStreak: false, type: 'choice', options: [] },
  { id: 'evening', nameKey: 'presets.defaultEvening', icon: 'Moon', color: 'indigo', enabled: true, countInStreak: false, type: 'checklist', items: [] },
  {
    id: 'work',
    nameKey: 'presets.defaultWork',
    icon: 'Briefcase',
    color: 'blue',
    enabled: true,
    countInStreak: false,
    type: 'counter',
    unit: 'minutes',
    dailyGoal: 120,
    weeklyMax: 360,
    presets: [],
    categoriesEnabled: false,
    categories: [],
    dailyGoalMinutes: 120,
    weeklyMaxMinutes: 360,
    // Optioneel, alleen counter-modules:
    //   counterDisplay?: 'bar' | 'glass'      weergave op de Vandaag-tab, default 'bar'
    //   glassShape?: 'tumbler' | 'highball'   glasvorm bij 'glass', default 'tumbler'
    // Afwezigheid telt overal als 'bar'/'tumbler'; geen migratie nodig.
  },
  { id: 'tasks', nameKey: 'presets.defaultTasks', icon: 'Check', color: 'pink', enabled: true, countInStreak: false, type: 'tasks' },
];

export function instantiateDefaults(mods) {
  return mods.map(m => ({ ...m }));
}
