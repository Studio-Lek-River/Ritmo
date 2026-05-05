// Date helpers for Ritmo. Day-key formatting uses LOCAL time, not UTC,
// so an evening at 23:00 still resolves to today's local date instead of
// shifting to tomorrow under UTC conversion.
//
// Maand- en dagnamen komen via Intl.DateTimeFormat met de huidige locale.
// UI-labels (Vandaag, Deze week, Week van...) komen via i18n.

import { getCurrentLanguage, getLocale, t } from '../i18n/useTranslation';

// Weekday-keys gebruikt door module-config (goals per weekdag) en kalender-grids.
// Volgorde: maandag-eerste.
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
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// --- Locale-aware Intl-helpers --------------------------------------------

function formatViaIntl(date, opts) {
  return new Intl.DateTimeFormat(getLocale(), opts).format(date);
}

export function monthNameLong(date) {
  return formatViaIntl(date, { month: 'long' });
}

export function monthNameShort(date) {
  return formatViaIntl(date, { month: 'short' });
}

export function weekdayNameLong(date) {
  return formatViaIntl(date, { weekday: 'long' });
}

export function weekdayNameShort(date) {
  return formatViaIntl(date, { weekday: 'short' });
}

// Maandag-eerste, gecapitaliseerde korte dag-labels voor week/maand-grids
// die op WEEKDAY_KEYS-volgorde indexeren. Genereert via Intl in de huidige taal.
export function shortWeekdayLabelsMondayFirst() {
  // Use a known monday as anchor (any week is fine since we extract names).
  const anchor = new Date(2024, 0, 1); // Mon 1 Jan 2024
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(anchor, i);
    const name = weekdayNameShort(d);
    return capitalize(name).slice(0, 2);
  });
}

// Lange maandnamen array (12), gecapitaliseerd. Gebruikt door MonthView header.
export function longMonthLabels() {
  return Array.from({ length: 12 }, (_, m) => {
    const d = new Date(2024, m, 1);
    return capitalize(monthNameLong(d));
  });
}

// --- Semantische UI-formatters --------------------------------------------

export function formatDayTitle(date) {
  if (isToday(date)) return t('common.today');
  if (isYesterday(date)) return t('common.yesterday');
  return capitalize(weekdayNameLong(date));
}

export function formatDaySubtitle(date) {
  return `${date.getDate()} ${monthNameLong(date)}`;
}

export function formatWeekTitle(weekStart) {
  const todayWeek = startOfWeek(new Date());
  if (sameDay(weekStart, todayWeek)) return t('dates.thisWeek');
  if (sameDay(weekStart, addDays(todayWeek, -7))) return t('dates.previousWeek');
  return t('dates.weekOf', { date: `${weekStart.getDate()} ${monthNameShort(weekStart)}` });
}

export function formatWeekRange(weekStart) {
  const end = addDays(weekStart, 6);
  return t('dates.weekRange', {
    startDay: weekStart.getDate(),
    startMonth: monthNameShort(weekStart),
    endDay: end.getDate(),
    endMonth: monthNameShort(end),
  });
}

export function formatMonthTitle(date) {
  return `${capitalize(monthNameLong(date))} ${date.getFullYear()}`;
}

// Lange weekdag-naam — gebruikt door SleepModule's ModuleEditor.
export function weekdayLabelLong(weekdayKey) {
  const idx = WEEKDAY_KEYS.indexOf(weekdayKey);
  if (idx < 0) return weekdayKey;
  // Anchor op een bekende maandag; tel idx dagen op.
  const anchor = new Date(2024, 0, 1); // Mon
  return capitalize(weekdayNameLong(addDays(anchor, idx)));
}

// Backwards-compat: alleen behouden voor lopende imports tijdens migratie. Zal
// worden verwijderd zodra geen consument deze meer gebruikt. Genereert ALTIJD
// in de huidige taal via Intl, niet vastgepind op Nederlands.
export function getDaysShortMonCaps() { return shortWeekdayLabelsMondayFirst(); }
export function getMonthsLongCaps() { return longMonthLabels(); }

export function formatRelativeDate(dateStr) {
  const date = parseDateKey(dateStr);
  if (isToday(date)) return t('dates.relative.today');
  if (isYesterday(date)) return t('dates.relative.yesterday');
  const diffDays = Math.floor((new Date() - date) / 86400000);
  if (diffDays < 7) return t('dates.relative.daysAgo', { n: diffDays });
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 9) return t('dates.relative.weeksAgo', { n: diffWeeks });
  return t('dates.relative.onDate', {
    date: date.toLocaleDateString(getLocale(), { day: 'numeric', month: 'short' }),
  });
}

// Voor consumenten die alleen de huidige taal-code nodig hebben.
export { getCurrentLanguage, getLocale };
