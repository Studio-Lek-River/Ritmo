// Voorgedefinieerde module-templates die gebruikers kunnen kiezen bij het
// aanmaken van een nieuwe module. Iconen verwijzen naar keys in ICON_OPTIONS
// in App.jsx — case-sensitive en moeten exact matchen.
//
// Tweetalig: namen, items, opties en categorieën worden vertaald via i18n.
// `getModulePresets(t)` resolved alle keys naar de huidige taal en geeft
// dezelfde shape terug als de oude statische export, zodat call-sites
// minimaal hoeven te wijzigen.

import { t as defaultT } from '../i18n/useTranslation';

function buildPresets(t) {
  return {
    checklist: [
      {
        nameKey: 'presets.morningRoutine.name',
        name: t('presets.morningRoutine.name'),
        icon: 'Sun',
        color: 'amber',
        items: t('presets.morningRoutine.items'),
      },
      {
        nameKey: 'presets.eveningRoutine.name',
        name: t('presets.eveningRoutine.name'),
        icon: 'Moon',
        color: 'indigo',
        items: t('presets.eveningRoutine.items'),
      },
      {
        nameKey: 'presets.physio.name',
        name: t('presets.physio.name'),
        icon: 'Activity',
        color: 'purple',
        items: t('presets.physio.items'),
      },
      {
        nameKey: 'presets.meals.name',
        name: t('presets.meals.name'),
        icon: 'UtensilsCrossed',
        color: 'orange',
        allowNotes: true,
        items: t('presets.meals.items'),
      },
    ],
    choice: [
      {
        nameKey: 'presets.outdoorMovement.name',
        name: t('presets.outdoorMovement.name'),
        icon: 'Footprints',
        color: 'green',
        options: t('presets.outdoorMovement.options'),
      },
      {
        nameKey: 'presets.mood.name',
        name: t('presets.mood.name'),
        icon: 'Smile',
        color: 'yellow',
        options: t('presets.mood.options'),
      },
    ],
    counter: [
      {
        nameKey: 'presets.productiveWork.name',
        name: t('presets.productiveWork.name'),
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
        name: t('presets.drinking.name'),
        icon: 'GlassWater',
        color: 'cyan',
        unit: 'ml',
        dailyGoal: 2000,
        presets: [250, 500, 750],
        categoriesEnabled: false,
        categories: t('presets.drinking.categories'),
      },
      {
        nameKey: 'presets.reading.name',
        name: t('presets.reading.name'),
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
        name: t('presets.steps.name'),
        icon: 'Footprints',
        color: 'green',
        unit: 'stappen',
        dailyGoal: 8000,
        presets: [1000, 2500],
        categoriesEnabled: false,
        categories: [],
      },
    ],
    tasks: [
      { nameKey: 'presets.workTasks.name', name: t('presets.workTasks.name'), icon: 'Briefcase', color: 'blue' },
      { nameKey: 'presets.groceries.name', name: t('presets.groceries.name'), icon: 'ShoppingCart', color: 'orange' },
    ],
    projects: [
      { nameKey: 'presets.studyProjects.name', name: t('presets.studyProjects.name'), icon: 'GraduationCap', color: 'indigo' },
      { nameKey: 'presets.hobbyProjects.name', name: t('presets.hobbyProjects.name'), icon: 'Heart', color: 'pink' },
    ],
    collection: [
      {
        nameKey: 'presets.books.name',
        name: t('presets.books.name'),
        icon: 'Book',
        color: 'amber',
        trackingMode: 'completion',
        itemFields: { rating: true, notes: true, tags: true },
        tags: [],
        items: [],
      },
      {
        nameKey: 'presets.films.name',
        name: t('presets.films.name'),
        icon: 'Star',
        color: 'purple',
        trackingMode: 'completion',
        itemFields: { rating: true, notes: true, tags: true },
        tags: [],
        items: [],
      },
      {
        nameKey: 'presets.restaurants.name',
        name: t('presets.restaurants.name'),
        icon: 'Coffee',
        color: 'orange',
        trackingMode: 'count',
        itemFields: { rating: true, notes: true, tags: true },
        tags: [],
        items: [],
      },
    ],
    sleep: [
      {
        nameKey: 'presets.sleep.name',
        name: t('presets.sleep.name'),
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
