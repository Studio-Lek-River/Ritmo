// Per onboarding-gebied: welke presets tonen we, en hoe gedragen ze zich?
//
// Module-presets worden gefilterd op `type`. De labels voor sub-items
// (Items / Opties / Vakken / Items / Klusjes) komen uit `onboarding.itemLabel.*`
// in i18n.

import { getModulePresets, getHouseholdPresets } from './presets';

// Module-types die thuishoren in de "Modules"-stap. `projects` en `collection`
// vallen er expres buiten — die krijgen elk een eigen stap.
const MODULES_TYPES = ['checklist', 'choice', 'counter', 'tasks', 'measurements', 'sleep'];

// Welke module-types ondersteunen sub-items in de uitklapbare editor?
// counter: complexe config (unit, dailyGoal, categories) — laat staan as-is
// measurements: metrics zijn complex (units, decimals) — laat staan
// sleep: goals per weekdag — niet zinvol in onboarding
const EXPANDABLE_MODULE_TYPES = new Set(['checklist', 'choice', 'tasks']);

// Geeft per gebied een lijst gedecoreerde presets terug. Elke preset krijgt:
//   - __key      stabiele identifier voor selectedPresetIds / presetItems
//   - __area     herkomst-gebied
//   - __expandable  of het uitklap-paneel getoond wordt
//   - __defaultLabels  default sub-itemlijst uit de preset
//   - __itemLabel  i18n-key voor de label in de editor (bv. "Items toevoegen")
export function getOnboardingPresets(area, t) {
  if (area === 'household') {
    const presets = getHouseholdPresets(t);
    return Object.values(presets).map(p => decorate(p, area, true, p.items, 'onboarding.itemLabel.household'));
  }

  const all = getModulePresets(t);
  const filterTypes =
    area === 'modules'     ? MODULES_TYPES :
    area === 'projects'    ? ['projects'] :
    area === 'collections' ? ['collection'] :
    [];

  const out = [];
  for (const type of filterTypes) {
    const arr = all[type] || [];
    for (const preset of arr) {
      const expandable = isExpandable(area, type);
      const defaultLabels = defaultLabelsFor(type, preset);
      const itemLabel = itemLabelKeyFor(area, type);
      out.push(decorate({ ...preset, type }, area, expandable, defaultLabels, itemLabel));
    }
  }
  return out;
}

function isExpandable(area, type) {
  if (area === 'projects') return true;     // subjects toevoegen
  if (area === 'collections') return true;  // collection-items toevoegen
  return EXPANDABLE_MODULE_TYPES.has(type);
}

function defaultLabelsFor(type, preset) {
  if (type === 'checklist') return preset.items || [];
  if (type === 'choice')    return preset.options || [];
  if (type === 'tasks')     return [];
  if (type === 'projects')  return [];
  if (type === 'collection')return [];
  return [];
}

function itemLabelKeyFor(area, type) {
  if (area === 'projects')    return 'onboarding.itemLabel.subjects';
  if (area === 'collections') return 'onboarding.itemLabel.items';
  if (type === 'checklist')   return 'onboarding.itemLabel.steps';
  if (type === 'choice')      return 'onboarding.itemLabel.options';
  if (type === 'tasks')       return 'onboarding.itemLabel.tasks';
  return 'onboarding.itemLabel.items';
}

function decorate(preset, area, expandable, defaultLabels, itemLabel) {
  return {
    ...preset,
    __key: preset.key || preset.nameKey,
    __area: area,
    __expandable: expandable,
    __defaultLabels: defaultLabels,
    __itemLabel: itemLabel,
  };
}

// Welke types mag een gebruiker kiezen op de "Zelf maken"-tab van de Modules-stap?
// measurements en sleep weglaten — zonder verdere config te complex.
export const CUSTOM_MODULE_TYPES = ['checklist', 'choice', 'counter', 'tasks'];
