// Levert de minimale, type-specifieke defaults voor een nieuwe module.
// Onboarding "Zelf maken" gebruikt dit om een lege module te seeden;
// ModuleEditor's selectType behoudt zijn eigen pad omdat het transitions
// tussen types afhandelt (met prev-state behoud) — een andere use case.

const DEFAULT_SLEEP_GOALS = {
  monday:    { bed: '23:00', wake: '07:00' },
  tuesday:   { bed: '23:00', wake: '07:00' },
  wednesday: { bed: '23:00', wake: '07:00' },
  thursday:  { bed: '23:00', wake: '07:00' },
  friday:    { bed: '00:00', wake: '08:30' },
  saturday:  { bed: '00:00', wake: '09:00' },
  sunday:    { bed: '23:00', wake: '07:30' },
};

export function emptyDefaultsForType(typeId) {
  switch (typeId) {
    case 'checklist':
      return { items: [] };
    case 'choice':
      return { options: [] };
    case 'counter':
      return {
        unit: 'minutes',
        dailyGoal: 30,
        presets: [],
        categoriesEnabled: false,
        categories: [],
      };
    case 'tasks':
      return {};
    case 'projects':
      return { subjects: [] };
    case 'collection':
      return {
        trackingMode: 'completion',
        itemFields: { rating: true, notes: true, tags: true },
        tagGroups: [],
        items: [],
        countInStreak: false,
      };
    case 'measurements':
      return { metrics: [], countInStreak: false };
    case 'medication':
      return { meds: [], countInStreak: false };
    case 'bodymap':
      return { log: [], countInStreak: false };
    case 'injectionSchedule':
      return { entries: [], countInStreak: false };
    case 'sleep':
      return {
        goals: DEFAULT_SLEEP_GOALS,
        toleranceMinutes: 15,
        showMorningScore: true,
      };
    default:
      return {};
  }
}
