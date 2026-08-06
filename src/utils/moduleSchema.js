// Enige bron van waarheid voor de 11 module-types: labels, iconen, kleuren
// en de minimale defaults van een nieuwe module. `selectType` en
// `openModuleEditor` (in App.jsx) mergen defaults op bestaande state (met
// behoud van `prev`, bijvoorbeeld bij type-wissel) en houden bewust hun
// eigen pad — dat is een andere use case dan "geef me de lege defaults".

const DEFAULT_SLEEP_GOALS = {
  monday:    { bed: '23:00', wake: '07:00' },
  tuesday:   { bed: '23:00', wake: '07:00' },
  wednesday: { bed: '23:00', wake: '07:00' },
  thursday:  { bed: '23:00', wake: '07:00' },
  friday:    { bed: '00:00', wake: '08:30' },
  saturday:  { bed: '00:00', wake: '09:00' },
  sunday:    { bed: '23:00', wake: '07:30' },
};

export const MODULE_TYPES = [
  {
    id: 'checklist',
    labelKey: 'modules.types.checklist',
    descKey: 'modules.types.checklistDesc',
    defaultIcon: 'Star',
    defaultColor: 'blue',
    defaults: () => ({ items: [] }),
    proposalFields: ['items'],
    itemFields: ['label', 'description', 'target'],
  },
  {
    id: 'choice',
    labelKey: 'modules.types.choice',
    descKey: 'modules.types.choiceDesc',
    defaultIcon: 'Star',
    defaultColor: 'blue',
    defaults: () => ({ options: [] }),
    proposalFields: ['options'],
  },
  {
    id: 'counter',
    labelKey: 'modules.types.counter',
    descKey: 'modules.types.counterDesc',
    defaultIcon: 'Star',
    defaultColor: 'blue',
    defaults: () => ({
      unit: 'minutes',
      dailyGoal: 30,
      presets: [],
      categoriesEnabled: false,
      categories: [],
    }),
    proposalFields: ['unit', 'dailyGoal', 'presets', 'categoriesEnabled', 'categories'],
  },
  {
    id: 'tasks',
    labelKey: 'modules.types.tasks',
    descKey: 'modules.types.tasksDesc',
    defaultIcon: 'Star',
    defaultColor: 'blue',
    defaults: () => ({}),
  },
  {
    id: 'projects',
    labelKey: 'modules.types.projects',
    descKey: 'modules.types.projectsDesc',
    defaultIcon: 'GraduationCap',
    defaultColor: 'blue',
    defaults: () => ({ subjects: [] }),
    proposalFields: ['subjects'],
  },
  {
    id: 'sleep',
    labelKey: 'modules.types.sleep',
    descKey: 'modules.types.sleepDesc',
    defaultIcon: 'Star',
    defaultColor: 'blue',
    defaults: () => ({
      goals: DEFAULT_SLEEP_GOALS,
      toleranceMinutes: 15,
      showMorningScore: true,
    }),
    proposalFields: ['goals', 'toleranceMinutes', 'showMorningScore'],
  },
  {
    id: 'collection',
    labelKey: 'modules.types.collection',
    descKey: 'modules.types.collectionDesc',
    defaultIcon: 'Star',
    defaultColor: 'blue',
    defaults: () => ({
      trackingMode: 'completion',
      itemFields: { rating: true, notes: true, tags: true },
      tagGroups: [],
      items: [],
      countInStreak: false,
    }),
    proposalFields: ['trackingMode', 'itemFields', 'tagGroups', 'items'],
    itemFields: ['name', 'rating', 'notes', 'tags'],
  },
  {
    id: 'measurements',
    labelKey: 'modules.types.measurements',
    descKey: 'modules.types.measurementsDesc',
    defaultIcon: 'Heart',
    defaultColor: 'blue',
    defaults: () => ({ metrics: [], countInStreak: false }),
    proposalFields: ['metrics'],
  },
  {
    id: 'medication',
    labelKey: 'modules.types.medication',
    descKey: 'modules.types.medicationDesc',
    defaultIcon: 'Cross',
    defaultColor: 'blue',
    defaults: () => ({ meds: [], countInStreak: false }),
    proposalFields: ['meds'],
  },
  {
    id: 'bodymap',
    labelKey: 'modules.types.bodymap',
    descKey: 'modules.types.bodymapDesc',
    defaultIcon: 'Target',
    defaultColor: 'blue',
    defaults: () => ({ log: [], countInStreak: false }),
  },
  {
    id: 'injectionSchedule',
    labelKey: 'modules.types.injectionSchedule',
    descKey: 'modules.types.injectionScheduleDesc',
    defaultIcon: 'CalendarClock',
    defaultColor: 'blue',
    defaults: () => ({ entries: [], countInStreak: false }),
    proposalFields: ['entries'],
  },
];

export const COUNTER_UNITS = ['minutes', 'ml', 'l', 'glas', 'pages', 'km', 'kcal', 'reps'];

export function getModuleType(typeId) {
  return MODULE_TYPES.find(m => m.id === typeId) || null;
}

export function getTypeOptions(t) {
  return MODULE_TYPES.map(({ id, labelKey, descKey }) => ({
    id,
    label: t(labelKey),
    desc: t(descKey),
  }));
}

export function emptyDefaultsForType(typeId) {
  const entry = getModuleType(typeId);
  return entry ? entry.defaults() : {};
}
