// Voorgedefinieerde module-templates die gebruikers kunnen kiezen bij
// het aanmaken van een nieuwe module. Iconen verwijzen naar keys in
// ICON_OPTIONS in App.jsx — case-sensitive en moeten exact matchen.

export const MODULE_PRESETS = {
  checklist: [
    {
      name: 'Ochtendroutine',
      icon: 'Sun',
      color: 'amber',
      items: ['Wakker worden', 'Tanden poetsen', 'Ontbijt'],
    },
    {
      name: 'Avondroutine',
      icon: 'Moon',
      color: 'indigo',
      items: ['Telefoon weg', 'Tanden poetsen', 'Lezen'],
    },
    {
      name: 'Fysio-oefeningen',
      icon: 'Activity',
      color: 'purple',
      items: ['Oefening 1', 'Oefening 2'],
    },
  ],
  choice: [
    {
      name: 'Beweging buiten',
      icon: 'Footprints',
      color: 'green',
      options: ['Wandelen', 'Fietsen', 'Hardlopen'],
    },
    {
      name: 'Stemming',
      icon: 'Smile',
      color: 'yellow',
      options: ['Goed', 'Oké', 'Mwah'],
    },
  ],
  counter: [
    {
      name: 'Productief werk',
      icon: 'Briefcase',
      color: 'blue',
      unit: 'minutes',
      dailyGoal: 240,
      presets: [15, 30, 60],
      categoriesEnabled: false,
      categories: [],
    },
    {
      name: 'Drinken',
      icon: 'GlassWater',
      color: 'cyan',
      unit: 'ml',
      dailyGoal: 2000,
      presets: [250, 500, 750],
      categoriesEnabled: false,
      categories: ['Water', 'Thee', 'Koffie', 'Frisdrank'],
    },
    {
      name: 'Lezen',
      icon: 'Book',
      color: 'purple',
      unit: 'minutes',
      dailyGoal: 30,
      presets: [10, 20],
      categoriesEnabled: false,
      categories: [],
    },
    {
      name: 'Stappen',
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
    { name: 'Werk-taken', icon: 'Briefcase', color: 'blue' },
    { name: 'Boodschappen', icon: 'ShoppingCart', color: 'orange' },
  ],
  projects: [
    { name: 'Studie', icon: 'GraduationCap', color: 'indigo' },
    { name: "Hobby's", icon: 'Heart', color: 'pink' },
  ],
  sleep: [
    {
      name: 'Slaap',
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
