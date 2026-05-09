// Vertaalt de OnboardingView-state naar concrete modules + household-records.
//
// Output:
//   { modules: [...], chores: [...], groceries: [...] }
//
// `modules` gaat naar settings.modules (geschreven door App.jsx's save-effect).
// `chores` en `groceries` worden direct naar window.storage geschreven door
// de OnboardingView vóór onComplete().

import { applyModulePreset } from './applyModulePreset';
import { genId } from './genId';
import { createSubject } from './createSubject';
import { createItem } from './collections';
import { emptyDefaultsForType } from './emptyModule';
import { getOnboardingPresets } from './onboardingPresets';

function stripDecorations(p) {
  const { __key, __area, __expandable, __defaultLabels, __itemLabel, key, ...rest } = p;
  return rest;
}

function moduleFromPreset(preset, labels) {
  const plain = stripDecorations(preset);
  const mod = applyModulePreset({ type: plain.type }, plain);

  // User-edited sub-items overschrijven preset-defaults.
  if (preset.type === 'projects') {
    mod.subjects = labels.map(name => createSubject(name));
  } else if (preset.type === 'collection') {
    mod.items = labels.map(name => createItem(name));
  } else if (preset.type === 'checklist') {
    mod.items = labels.map(label => ({ id: genId('items'), label }));
  } else if (preset.type === 'choice') {
    mod.options = labels.map(label => ({ id: genId('options'), label }));
  }
  // counter/measurements/sleep/tasks: preset-defaults blijven leidend.

  return {
    ...mod,
    id: genId(plain.type || 'mod'),
    enabled: true,
    countInStreak: false,
  };
}

function customModulesFor(area, customItems, t) {
  if (area === 'modules') {
    // Eén module per item, type uit dropdown.
    return customItems.map(({ name, type }) => {
      const moduleType = type || 'checklist';
      return {
        id: genId(moduleType),
        name,
        type: moduleType,
        icon: 'Sparkles',
        color: 'blue',
        enabled: true,
        countInStreak: false,
        ...emptyDefaultsForType(moduleType),
      };
    });
  }
  if (area === 'projects') {
    if (customItems.length === 0) return [];
    return [{
      id: genId('projects'),
      name: customItems.length === 1 ? customItems[0].name : t('onboarding.customModuleName.projects'),
      type: 'projects',
      icon: 'GraduationCap',
      color: 'cyan',
      enabled: true,
      countInStreak: false,
      subjects: customItems.map(c => createSubject(c.name)),
    }];
  }
  if (area === 'collections') {
    if (customItems.length === 0) return [];
    return [{
      id: genId('collection'),
      name: customItems.length === 1 ? customItems[0].name : t('onboarding.customModuleName.collections'),
      type: 'collection',
      icon: 'Sparkles',
      color: 'amber',
      enabled: true,
      countInStreak: false,
      ...emptyDefaultsForType('collection'),
    }];
  }
  return [];
}

export function buildOnboardingResult(areaState, t) {
  const modules = [];
  const chores = [];
  const groceries = [];

  for (const area of ['modules', 'projects', 'collections']) {
    const s = areaState[area];
    if (!s || s.tab === 'skip') continue;

    if (s.tab === 'presets') {
      const presets = getOnboardingPresets(area, t);
      for (const preset of presets) {
        if (!s.selectedPresetIds[preset.__key]) continue;
        const labels = s.presetItems[preset.__key] ?? preset.__defaultLabels;
        modules.push(moduleFromPreset(preset, labels));
      }
    } else if (s.tab === 'custom') {
      modules.push(...customModulesFor(area, s.custom, t));
    }
  }

  // Household: schrijven naar aparte storage-keys
  const h = areaState.household;
  if (h && h.tab !== 'skip') {
    if (h.tab === 'presets') {
      const presets = getOnboardingPresets('household', t);
      for (const preset of presets) {
        if (!h.selectedPresetIds[preset.__key]) continue;
        const labels = h.presetItems[preset.__key] ?? preset.__defaultLabels;
        if (preset.target === 'chores') {
          for (const name of labels) {
            chores.push({
              id: genId('chore'),
              name,
              recurrence: preset.recurrence,
              ...(preset.customDays ? { customDays: preset.customDays } : {}),
              lastCompletedAt: null,
            });
          }
        } else if (preset.target === 'groceries') {
          for (const name of labels) {
            groceries.push({
              id: genId('grocery'),
              name,
              checked: false,
              isStaple: !!preset.isStaple,
            });
          }
        }
      }
    } else if (h.tab === 'custom') {
      // Custom huishouden-items worden default als wekelijkse chores opgeslagen.
      for (const item of h.custom) {
        chores.push({
          id: genId('chore'),
          name: item.name,
          recurrence: 'weekly',
          lastCompletedAt: null,
        });
      }
    }
  }

  return { modules, chores, groceries };
}
