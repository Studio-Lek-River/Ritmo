// Pure helpers voor het measurements-module-type.
// Metrics en hun events leven in settings.modules[i].metrics[j].events,
// niet in per-dag moduleData (analoog aan collections).

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// Vaste lijst eenheden. `key` is een interne identifier; `labelKey` resolved
// via i18n (`t(labelKey)`) voor de unit-dropdown. Het weergavesymbool is
// taal-onafhankelijk en komt uit `unitSymbol(key)`.
export const MEASUREMENT_UNITS = [
  { key: 'kg',      labelKey: 'modules.measurements.units.kg' },
  { key: 'g',       labelKey: 'modules.measurements.units.g' },
  { key: 'cm',      labelKey: 'modules.measurements.units.cm' },
  { key: 'mm',      labelKey: 'modules.measurements.units.mm' },
  { key: 'pct',     labelKey: 'modules.measurements.units.pct' },
  { key: 'mmHg',    labelKey: 'modules.measurements.units.mmHg' },
  { key: 'bpm',     labelKey: 'modules.measurements.units.bpm' },
  { key: 'celsius', labelKey: 'modules.measurements.units.celsius' },
  { key: 'mgdl',    labelKey: 'modules.measurements.units.mgdl' },
  { key: 'mmoll',   labelKey: 'modules.measurements.units.mmoll' },
];

const UNIT_SYMBOLS = {
  kg: 'kg',
  g: 'g',
  cm: 'cm',
  mm: 'mm',
  pct: '%',
  mmHg: 'mmHg',
  bpm: 'bpm',
  celsius: '°C',
  mgdl: 'mg/dL',
  mmoll: 'mmol/L',
};

export function unitSymbol(key) {
  return UNIT_SYMBOLS[key] ?? key ?? '';
}

export function isValidUnit(key) {
  return Object.prototype.hasOwnProperty.call(UNIT_SYMBOLS, key);
}

// Sorteert events; muteert het input-array niet.
export function sortedAsc(events) {
  return [...(events || [])].sort((a, b) => String(a.date).localeCompare(String(b.date)));
}

export function sortedDesc(events) {
  return [...(events || [])].sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

// Geeft basisstatistieken voor een metric, of `null` als er nog geen events zijn.
export function metricStats(metric) {
  const events = metric?.events || [];
  if (events.length === 0) return null;
  const asc = sortedAsc(events);
  const first = asc[0];
  const latest = asc[asc.length - 1];
  const previous = asc.length > 1 ? asc[asc.length - 2] : null;
  const totalChange = latest.value - first.value;
  const lastChange = previous ? latest.value - previous.value : null;
  return { first, latest, previous, totalChange, lastChange, count: asc.length };
}

// Locale-bewuste numerieke formattering. `decimals` bepaalt zowel min als max
// fraction digits zodat "81" als "81,0" verschijnt bij decimals=1.
export function formatMeasurementValue(value, decimals = 1, locale) {
  if (value === null || value === undefined || Number.isNaN(value)) return '';
  const d = clampDecimals(decimals);
  try {
    return new Intl.NumberFormat(locale, {
      minimumFractionDigits: d,
      maximumFractionDigits: d,
    }).format(value);
  } catch {
    return Number(value).toFixed(d);
  }
}

function clampDecimals(d) {
  const n = Number.isFinite(d) ? Math.round(d) : 1;
  if (n < 0) return 0;
  if (n > 2) return 2;
  return n;
}

// Parsert input uit een form-veld: accepteert komma OF punt als decimaal-
// scheidingsteken, retourneert `null` als de input geen geldig getal is.
export function parseMeasurementInput(raw) {
  if (raw === null || raw === undefined) return null;
  const s = String(raw).trim().replace(',', '.');
  if (s === '') return null;
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// Factory voor een nieuwe metric (config-niveau). `events` start altijd leeg.
export function createMetric({
  name,
  unit = 'kg',
  icon = 'Activity',
  decimals = 1,
  lowerIsBetter = false,
  target = null,
} = {}) {
  return {
    id: genId('metric'),
    name: name || '',
    unit,
    icon,
    decimals: clampDecimals(decimals),
    lowerIsBetter: !!lowerIsBetter,
    target: target === '' || target === undefined ? null : target,
    events: [],
  };
}

// Factory voor een event binnen een metric.
export function createEvent({ date, value, note = '' } = {}) {
  return {
    id: genId('event'),
    date: date || '',
    value: typeof value === 'number' ? value : Number(value),
    note: note || '',
  };
}
