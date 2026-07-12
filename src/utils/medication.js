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
    // H10: dagrooster is opt-in en staat standaard uit, zodat bestaande
    // medicijnen ongewijzigd blijven totdat de gebruiker het bewust inschakelt.
    scheduleEnabled: false,
    startTime: '08:00',
    intervalHours: 0,
    dosesPerDay: 1,
    intakeLog: [],
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

// === H10: dagrooster-helpers ================================================
// Lokale kopieën van dayTimeline.js' timeToMinutes/minutesToTime (die module
// exporteert ze niet). Puur en defensief: ongeldige/ontbrekende tijd => null.

function timeToMinutes(time) {
  if (!time || typeof time !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function minutesToTime(minutes) {
  if (minutes == null || Number.isNaN(minutes)) return null;
  const total = Math.round(minutes);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// Gesorteerde 'HH:MM'-lijst van de doses die op `dateKey` al zijn ingenomen,
// afgeleid uit med.intakeLog (nooit een aparte opgeslagen "vandaag"-staat).
export function medIntakesForDay(med, dateKey) {
  const log = Array.isArray(med?.intakeLog) ? med.intakeLog : [];
  return log
    .filter((entry) => entry && entry.date === dateKey && typeof entry.time === 'string')
    .map((entry) => entry.time)
    .sort();
}

// Levert `dosesPerDay` slots { index, time, status }. Dynamisch: al ingenomen
// doses krijgen hun werkelijke tijd (status 'taken'); de eerstvolgende
// openstaande dosis ('next') valt op laatste inname + intervalHours, of op
// startTime als er die dag nog niets is ingenomen; latere doses ('upcoming')
// worden vanaf 'next' geprojecteerd met intervalHours. Guards: bij
// intervalHours <= 0 of dosesPerDay <= 1 is er maar één dosis (op startTime),
// zonder projectie. Ontbrekende velden lezen als de createMed-defaults.
export function medScheduleForDay(med, dateKey) {
  const dosesPerDay = Math.max(1, Number(med?.dosesPerDay) || 1);
  const intervalHours = Number(med?.intervalHours) || 0;
  const startTime = (typeof med?.startTime === 'string' && med.startTime) || '08:00';
  const intakes = medIntakesForDay(med, dateKey);

  if (intervalHours <= 0 || dosesPerDay <= 1) {
    const taken = intakes.length > 0;
    return [{
      index: 0,
      time: taken ? intakes[0] : startTime,
      status: taken ? 'taken' : 'next',
    }];
  }

  const intervalMinutes = intervalHours * 60;
  const startMinutes = timeToMinutes(startTime) ?? timeToMinutes('08:00');
  const takenCount = Math.min(intakes.length, dosesPerDay);

  const slots = [];
  for (let i = 0; i < takenCount; i += 1) {
    slots.push({ index: i, time: intakes[i], status: 'taken' });
  }

  if (takenCount < dosesPerDay) {
    const lastTakenMinutes = takenCount > 0 ? timeToMinutes(intakes[takenCount - 1]) : null;
    const nextMinutes = lastTakenMinutes != null ? lastTakenMinutes + intervalMinutes : startMinutes;
    slots.push({ index: takenCount, time: minutesToTime(nextMinutes), status: 'next' });

    for (let i = takenCount + 1; i < dosesPerDay; i += 1) {
      const upcomingMinutes = nextMinutes + intervalMinutes * (i - takenCount);
      slots.push({ index: i, time: minutesToTime(upcomingMinutes), status: 'upcoming' });
    }
  }

  return slots;
}

// 'HH:MM' van de eerstvolgende openstaande dosis op `dateKey`, of null als
// alle doses van die dag al zijn ingenomen.
export function medNextDue(med, dateKey) {
  const next = medScheduleForDay(med, dateKey).find((slot) => slot.status === 'next');
  return next ? next.time : null;
}
