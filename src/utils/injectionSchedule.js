// Pure helpers voor het injectionSchedule-module-type.
// Een 'entry' plant wanneer je prikt: welk injecteerbaar medicijn (via
// injectableMeds(modules) uit bodymap.js), welke bodymap-zone (INJECTION_ZONES)
// en met welke frequentie (FREQUENCY_OPTIONS uit medication.js). Mirror van
// het opslagpatroon van medication.js/bodymap.js: entries leven in
// settings.modules[i].entries, niet in per-dag moduleData.

import { genId } from './genId';

export function createScheduleEntry(overrides = {}) {
  return {
    id: genId('inj'),
    medId: null,
    medModuleId: null,
    zone: null,
    frequencyId: 'weekly',
    ...overrides,
  };
}

// Zoekt het bijbehorende medicijn-object (uit injectableMeds(modules)) voor een entry.
export function scheduleEntryMed(entry, meds) {
  return (meds || []).find((m) => m.id === entry.medId && m.medModuleId === entry.medModuleId) || null;
}
