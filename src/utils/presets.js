// Voorgedefinieerde module-templates die gebruikers kunnen kiezen bij het
// aanmaken van een nieuwe module. Iconen verwijzen naar keys in ICON_OPTIONS
// in App.jsx — case-sensitive en moeten exact matchen.
//
// Tweetalig: items, opties en categorieën worden bij gebruik vertaald via i18n.
// De preset-naam zelf wordt NIET als `name` gebakken — alleen `nameKey` staat
// op de preset, zodat een module die uit zo'n preset komt taal-reactief blijft.
// `getModulePresets(t)` resolved alle inhoud naar de huidige taal en geeft
// dezelfde shape terug als de oude statische export, zodat call-sites
// minimaal hoeven te wijzigen.

import { t as defaultT } from '../i18n/useTranslation';

function buildPresets(t) {
  return {
    checklist: [
      {
        nameKey: 'presets.morningRoutine.name',
        icon: 'Sun',
        color: 'amber',
        items: t('presets.morningRoutine.items'),
      },
      {
        nameKey: 'presets.eveningRoutine.name',
        icon: 'Moon',
        color: 'indigo',
        items: t('presets.eveningRoutine.items'),
      },
      {
        nameKey: 'presets.physio.name',
        icon: 'Activity',
        color: 'purple',
        items: t('presets.physio.items'),
      },
      {
        nameKey: 'presets.meals.name',
        icon: 'UtensilsCrossed',
        color: 'orange',
        allowNotes: true,
        items: t('presets.meals.items'),
      },
      {
        nameKey: 'presets.bijwerkingen.name',
        icon: 'HeartPulse',
        color: 'red',
        health: true,
        items: t('presets.bijwerkingen.items'),
      },
    ],
    choice: [
      {
        nameKey: 'presets.outdoorMovement.name',
        icon: 'Footprints',
        color: 'green',
        options: t('presets.outdoorMovement.options'),
      },
      {
        nameKey: 'presets.mood.name',
        icon: 'Smile',
        color: 'yellow',
        options: t('presets.mood.options'),
      },
    ],
    counter: [
      {
        nameKey: 'presets.productiveWork.name',
        icon: 'Briefcase',
        color: 'blue',
        unit: 'minutes',
        dailyGoal: 240,
        presets: [15, 30, 60],
        categoriesEnabled: false,
        categories: [],
      },
      {
        nameKey: 'presets.drinking.name',
        icon: 'GlassWater',
        color: 'cyan',
        unit: 'ml',
        dailyGoal: 2000,
        presets: [250, 500, 750],
        categoriesEnabled: false,
        categories: t('presets.drinking.categories'),
        celebration: { enabled: true, animation: 'cowDrinkMilk', mode: 'overlay' },
      },
      {
        nameKey: 'presets.reading.name',
        icon: 'Book',
        color: 'purple',
        unit: 'minutes',
        dailyGoal: 30,
        presets: [10, 20],
        categoriesEnabled: false,
        categories: [],
      },
      {
        nameKey: 'presets.steps.name',
        icon: 'Footprints',
        color: 'green',
        unit: 'stappen',
        dailyGoal: 8000,
        presets: [1000, 2500],
        categoriesEnabled: false,
        categories: [],
      },
      {
        nameKey: 'presets.beweging.name',
        icon: 'Activity',
        color: 'green',
        health: true,
        unit: 'minutes',
        dailyGoal: 30,
        presets: [10, 20, 30],
        categoriesEnabled: true,
        categories: t('presets.beweging.categories'),
      },
    ],
    tasks: [
      { nameKey: 'presets.workTasks.name', icon: 'Briefcase', color: 'blue' },
      { nameKey: 'presets.groceries.name', icon: 'ShoppingCart', color: 'orange' },
    ],
    projects: [
      { nameKey: 'presets.studyProjects.name', icon: 'GraduationCap', color: 'indigo' },
      { nameKey: 'presets.hobbyProjects.name', icon: 'Heart', color: 'pink' },
    ],
    collection: [
      {
        nameKey: 'presets.books.name',
        icon: 'Book',
        color: 'amber',
        trackingMode: 'completion',
        itemFields: { rating: true, notes: true, tags: true },
        tagGroups: [],
        items: [],
      },
      {
        nameKey: 'presets.films.name',
        icon: 'Star',
        color: 'purple',
        trackingMode: 'completion',
        itemFields: { rating: true, notes: true, tags: true },
        tagGroups: [],
        items: [],
      },
      {
        nameKey: 'presets.restaurants.name',
        icon: 'Coffee',
        color: 'orange',
        trackingMode: 'count',
        itemFields: { rating: true, notes: true, tags: true },
        tagGroups: [],
        items: [],
      },
      {
        nameKey: 'presets.laundry.name',
        icon: 'Droplets',
        color: 'cyan',
        enabled: true,
        countInStreak: false,
        trackingMode: 'count',
        itemFields: { rating: true, notes: false, tags: true },
        tagGroups: [
          {
            id: 'soort',
            labelKey: 'presets.laundry.groupSoort',
            color: 'cyan',
            allowMultiple: false,
            tags: [
              { id: 'soort-wasmiddel', labelKey: 'presets.laundry.tagWasmiddel' },
              { id: 'soort-wasparfum', labelKey: 'presets.laundry.tagWasparfum' },
            ],
          },
          {
            id: 'merk',
            labelKey: 'presets.laundry.groupMerk',
            color: 'purple',
            allowMultiple: false,
            tags: [],
          },
          {
            id: 'geur',
            labelKey: 'presets.laundry.groupGeur',
            color: 'pink',
            allowMultiple: true,
            tags: [],
          },
        ],
        items: [],
      },
    ],
    measurements: [
      {
        nameKey: 'presets.health.name',
        icon: 'Heart',
        color: 'pink',
        metrics: [
          { nameKey: 'presets.health.metrics.weight', unit: 'kg',  icon: 'Scale',   decimals: 1, lowerIsBetter: true,  target: null },
          { nameKey: 'presets.health.metrics.muscle', unit: 'kg',  icon: 'Zap',     decimals: 1, lowerIsBetter: false, target: null },
          { nameKey: 'presets.health.metrics.fat',    unit: 'pct', icon: 'Droplet', decimals: 1, lowerIsBetter: true,  target: null },
          { nameKey: 'presets.health.metrics.waist',  unit: 'cm',  icon: 'Ruler',   decimals: 0, lowerIsBetter: true,  target: null },
        ],
      },
      {
        nameKey: 'presets.weightLoss.name',
        icon: 'Scale',
        color: 'teal',
        metrics: [
          { nameKey: 'presets.weightLoss.metrics.weight', unit: 'kg', icon: 'Scale', decimals: 1, lowerIsBetter: true, target: null },
          { nameKey: 'presets.weightLoss.metrics.waist',  unit: 'cm', icon: 'Ruler', decimals: 0, lowerIsBetter: true, target: null },
          { nameKey: 'presets.weightLoss.metrics.leg',    unit: 'cm', icon: 'Ruler', decimals: 0, lowerIsBetter: true, target: null },
          { nameKey: 'presets.weightLoss.metrics.arm',    unit: 'cm', icon: 'Ruler', decimals: 0, lowerIsBetter: true, target: null },
        ],
      },
      {
        nameKey: 'presets.bloodpressure.name',
        icon: 'HeartPulse',
        color: 'red',
        metrics: [
          { nameKey: 'presets.bloodpressure.metrics.systolic',  unit: 'mmHg', icon: 'Activity', decimals: 0, lowerIsBetter: true, target: null },
          { nameKey: 'presets.bloodpressure.metrics.diastolic', unit: 'mmHg', icon: 'Activity', decimals: 0, lowerIsBetter: true, target: null },
        ],
      },
      {
        nameKey: 'presets.heartrate.name',
        icon: 'HeartPulse',
        color: 'red',
        metrics: [
          { nameKey: 'presets.heartrate.metrics.resting', unit: 'bpm', icon: 'Activity', decimals: 0, lowerIsBetter: true, target: null },
        ],
      },
    ],
    sleep: [
      {
        nameKey: 'presets.sleep.name',
        icon: 'BedDouble',
        color: 'indigo',
        goals: {
          monday:    { bed: '23:00', wake: '07:00' },
          tuesday:   { bed: '23:00', wake: '07:00' },
          wednesday: { bed: '23:00', wake: '07:00' },
          thursday:  { bed: '23:00', wake: '07:00' },
          friday:    { bed: '00:00', wake: '08:30' },
          saturday:  { bed: '00:00', wake: '09:00' },
          sunday:    { bed: '23:00', wake: '07:30' },
        },
        showMorningScore: true,
        toleranceMinutes: 15,
      },
    ],
  };
}

export function getModulePresets(t) {
  return buildPresets(t || defaultT);
}

// Backwards-compat alias: dynamische property-getter die telkens met de huidige
// taal resolved. Bestaande consumers die `MODULE_PRESETS[type]` doen krijgen
// nog steeds een werkende array, maar de strings volgen de actieve taal.
export const MODULE_PRESETS = new Proxy({}, {
  get(_target, prop) {
    const all = buildPresets(defaultT);
    return all[prop];
  },
  ownKeys() {
    return Object.keys(buildPresets(defaultT));
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});

// Huishouden-presets voor de onboarding-flow. In tegenstelling tot module-presets
// worden deze geschreven naar aparte storage-keys (`household:chores` en
// `household:groceries`), niet naar `settings.modules`.
//
// Per preset:
//   - target: 'chores' (regelmatige klusjes) of 'groceries' (vaste boodschappen)
//   - recurrence/customDays: meegegeven aan elke chore-rij bij commit
//   - isStaple: meegegeven aan elke grocery-rij bij commit
//   - items: standaardlijst (i18n), gebruiker mag aanvullen of verwijderen
function buildHouseholdPresets(t) {
  return {
    choresWeekly: {
      key: 'choresWeekly',
      nameKey: 'presets.household.choresWeekly.name',
      icon: 'BrushCleaning',
      color: 'cyan',
      target: 'chores',
      recurrence: 'weekly',
      items: t('presets.household.choresWeekly.items'),
    },
    choresMonthly: {
      key: 'choresMonthly',
      nameKey: 'presets.household.choresMonthly.name',
      icon: 'Sparkles',
      color: 'indigo',
      target: 'chores',
      recurrence: 'monthly',
      items: t('presets.household.choresMonthly.items'),
    },
    staples: {
      key: 'staples',
      nameKey: 'presets.household.staples.name',
      icon: 'ShoppingCart',
      color: 'amber',
      target: 'groceries',
      isStaple: true,
      items: t('presets.household.staples.items'),
    },
    maintenance: {
      key: 'maintenance',
      nameKey: 'presets.household.maintenance.name',
      icon: 'Drill',
      color: 'orange',
      target: 'chores',
      recurrence: 'custom',
      customDays: 90,
      items: t('presets.household.maintenance.items'),
    },
  };
}

export function getHouseholdPresets(t) {
  return buildHouseholdPresets(t || defaultT);
}

export const HOUSEHOLD_PRESETS = new Proxy({}, {
  get(_target, prop) {
    const all = buildHouseholdPresets(defaultT);
    return all[prop];
  },
  ownKeys() {
    return Object.keys(buildHouseholdPresets(defaultT));
  },
  getOwnPropertyDescriptor() {
    return { enumerable: true, configurable: true };
  },
});
