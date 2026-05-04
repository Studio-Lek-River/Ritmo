// Date helpers for Ritmo. All day-key formatting uses LOCAL time, not UTC,
// so an evening at 23:00 still resolves to today's local date instead of
// shifting to tomorrow under UTC conversion.

export const MONTHS_NL = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december',
];

export const MONTHS_NL_SHORT = [
  'jan', 'feb', 'mrt', 'apr', 'mei', 'jun',
  'jul', 'aug', 'sep', 'okt', 'nov', 'dec',
];

export const DAYS_NL = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];
export const DAYS_SHORT_NL = ['zo', 'ma', 'di', 'wo', 'do', 'vr', 'za'];

// Maandag-eerste, capitalized, voor week/maand-grids die op WEEKDAY_KEYS-volgorde indexeren.
export const DAYS_SHORT_NL_MON_CAPS = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
export const MONTHS_NL_CAPS = MONTHS_NL.map(m => m.charAt(0).toUpperCase() + m.slice(1));

// Weekday keys with maandag-eerste volgorde voor module-config (goals per weekdag).
export const WEEKDAY_KEYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday'];

// JS getDay: 0=zondag..6=zaterdag. Map naar onze maandag-eerste keys.
export function weekdayKeyForDate(date) {
  const idx = date.getDay();
  return idx === 0 ? 'sunday' : WEEKDAY_KEYS[idx - 1];
}

export function previousWeekdayKey(weekdayKey) {
  const idx = WEEKDAY_KEYS.indexOf(weekdayKey);
  if (idx < 0) return weekdayKey;
  return WEEKDAY_KEYS[(idx + 6) % 7];
}

export function fmtDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function todayKey() {
  return fmtDateKey(new Date());
}

export function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(date, n) {
  const c = new Date(date);
  c.setDate(c.getDate() + n);
  return c;
}

export function sameDay(a, b) {
  return fmtDateKey(a) === fmtDateKey(b);
}

export function startOfWeek(date) {
  const c = new Date(date);
  const day = c.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  c.setDate(c.getDate() + diff);
  c.setHours(0, 0, 0, 0);
  return c;
}

export function isToday(date) {
  return sameDay(date, new Date());
}

export function isYesterday(date) {
  return sameDay(date, addDays(new Date(), -1));
}

export function isEditable(date) {
  return isToday(date) || isYesterday(date);
}

export function isFuture(date) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d > today;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatDayTitle(date) {
  if (isToday(date)) return 'Vandaag';
  if (isYesterday(date)) return 'Gisteren';
  return capitalize(DAYS_NL[date.getDay()]);
}

export function formatDaySubtitle(date) {
  return `${date.getDate()} ${MONTHS_NL[date.getMonth()]}`;
}

export function formatWeekTitle(weekStart) {
  const todayWeek = startOfWeek(new Date());
  if (sameDay(weekStart, todayWeek)) return 'Deze week';
  if (sameDay(weekStart, addDays(todayWeek, -7))) return 'Vorige week';
  return `Week van ${weekStart.getDate()} ${MONTHS_NL_SHORT[weekStart.getMonth()]}`;
}

export function formatWeekRange(weekStart) {
  const end = addDays(weekStart, 6);
  const sm = MONTHS_NL_SHORT[weekStart.getMonth()];
  const em = MONTHS_NL_SHORT[end.getMonth()];
  return `${weekStart.getDate()} ${sm} tot ${end.getDate()} ${em}`;
}

export function formatMonthTitle(date) {
  return `${capitalize(MONTHS_NL[date.getMonth()])} ${date.getFullYear()}`;
}
