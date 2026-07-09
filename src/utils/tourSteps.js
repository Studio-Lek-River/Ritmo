// Bouwstenen voor de gezondheids-rondleiding (health-mode tutorial).
//
// De rondleiding leidt de gebruiker eenmalig langs elke gezondheidsmodule. De
// stappenlijst wordt afgeleid uit de aanwezige, ingeschakelde modules; de
// "ingevuld"-status wordt live uit de data berekend (geen aparte vlag), zodat
// het vinkje vanzelf klopt zodra er echt iets is ingevoerd.
import { HEALTH_MODULE_TYPES, isHealthModule } from './healthModules';
import { moduleStatusForDay } from './dayProgress';

// Vaste volgorde: eerst de gezondheidsdata-modules, dan de dagelijks te loggen
// modules (beweging = counter, bijwerkingen = checklist).
const TYPE_ORDER = [...HEALTH_MODULE_TYPES, 'counter', 'checklist'];

// De i18n-sleutel per module-type binnen de tour.types.* groep.
export function tourTypeKey(type) {
  if (type === 'counter') return 'counter';
  if (type === 'checklist') return 'checklist';
  return type; // measurements | medication | bodymap | injectionSchedule
}

// Geordende stappenlijst uit de ingeschakelde gezondheidsmodules.
export function buildTourSteps(modules) {
  return (modules || [])
    .filter((m) => m.enabled && isHealthModule(m))
    .slice()
    .sort((a, b) => TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type))
    .map((m) => ({ id: m.id, type: m.type, typeKey: tourTypeKey(m.type), module: m }));
}

// Bepaalt of een module eenmalig is ingevuld. Data-modules bewaren hun data op
// het module-object; dagelijkse modules (counter/checklist) in de dag-historie.
export function isModuleFilled(module, moduleData, history) {
  switch (module.type) {
    case 'measurements':
      return (module.metrics || []).some((m) => m && (m.events || []).length > 0);
    case 'medication':
      return (module.meds || []).length > 0;
    case 'bodymap':
      return (module.log || []).length > 0;
    case 'injectionSchedule':
      return (module.entries || []).length > 0;
    case 'counter':
    case 'checklist': {
      // Vandaag (live state) telt mee, en eenmalig ingevuld blijft ingevuld:
      // ook een eerdere dag in de historie maakt de stap klaar.
      if (moduleStatusForDay(module, { moduleData }, new Date()) !== 'none') return true;
      return Object.entries(history || {}).some(
        ([date, day]) => moduleStatusForDay(module, day, new Date(date)) !== 'none'
      );
    }
    default:
      return false;
  }
}

// Handige afgeleide: map van moduleId -> ingevuld (bool) voor alle stappen.
export function buildFilledMap(steps, moduleData, history) {
  const map = {};
  for (const step of steps) {
    map[step.id] = isModuleFilled(step.module, moduleData, history);
  }
  return map;
}
