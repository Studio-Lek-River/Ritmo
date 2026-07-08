// Pure helpers voor het medication-module-type.
// Medicijnen leven in settings.modules[i].meds, niet in per-dag moduleData
// (mirror van het collection-opslagpatroon, zie collections.js).

import { genId } from './genId';

export const LOW_THRESHOLD_DAYS = 10;

export function createMed(name) {
  return {
    id: genId('med'),
    name,
    unit: '',
    dose: 0,
    supply: 0,
    perWeek: 1,
    injectable: false,
    color: 'blue',
  };
}

// Afgeleide, nooit opgeslagen waarde: hoeveel dagen de huidige voorraad nog meegaat.
export function medDaysLeft(med) {
  const perWeek = med?.perWeek;
  if (!perWeek || perWeek <= 0) return null;
  const supply = med?.supply ?? 0;
  return Math.round((supply * 7) / perWeek);
}

export function medIsLow(med) {
  const daysLeft = medDaysLeft(med);
  return daysLeft != null && daysLeft <= LOW_THRESHOLD_DAYS;
}

// Frequentie-presets: i18n-keys resp. freqDaily/freqEveryOther/freq1w/freq2w/freq3w.
export const FREQUENCY_OPTIONS = [
  { id: 'daily', perWeek: 7 },
  { id: 'everyOther', perWeek: 3.5 },
  { id: 'weekly', perWeek: 1 },
  { id: 'biweekly', perWeek: 0.5 },
  { id: 'triweekly', perWeek: 1 / 3 },
];

// i18n-keys (onder `medication.*`) per FREQUENCY_OPTIONS-id. Gedeeld tussen
// medicatie- en prikschema-UI zodat beide dezelfde frequentie-labels tonen.
export const FREQUENCY_LABEL_KEYS = {
  daily: 'freqDaily',
  everyOther: 'freqEveryOther',
  weekly: 'freq1w',
  biweekly: 'freq2w',
  triweekly: 'freq3w',
};
