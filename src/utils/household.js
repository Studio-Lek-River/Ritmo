// Pure helpers for the Household feature. No React, no storage.
import { t, getLocale } from '../i18n/useTranslation';
import { parseDecimalInput } from './numberInput';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function daysBetween(date1, date2) {
  const a = new Date(date1);
  const b = new Date(date2);
  a.setHours(0, 0, 0, 0);
  b.setHours(0, 0, 0, 0);
  return Math.round((b - a) / MS_PER_DAY);
}

function getIntervalDays(chore) {
  switch (chore.recurrence) {
    case 'weekly':  return 7;
    case 'monthly': return 30;
    case 'custom':  return Math.max(1, Number(chore.customDays) || 1);
    case 'once':
    default:        return null;
  }
}

export function isOverdue(chore) {
  if (!chore || chore.recurrence === 'once') return false;
  if (!chore.lastCompletedAt) return true;
  const interval = getIntervalDays(chore);
  if (!interval) return false;
  const elapsed = daysBetween(chore.lastCompletedAt, new Date());
  return elapsed >= interval;
}

export function daysUntilDue(chore) {
  if (!chore || chore.recurrence === 'once') return null;
  const interval = getIntervalDays(chore);
  if (!interval) return null;
  if (!chore.lastCompletedAt) return -1;
  const elapsed = daysBetween(chore.lastCompletedAt, new Date());
  return interval - elapsed;
}

export function formatRelativeDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date();
  const diff = daysBetween(d, today);
  if (diff === 0) return t('dates.relative.today');
  if (diff === 1) return t('dates.relative.yesterday');
  if (diff > 1 && diff < 7) return t('dates.relative.daysAgo', { n: diff });
  if (diff < 0 && diff > -7) return t('dates.relative.inDays', { n: Math.abs(diff) });
  const monthShort = new Intl.DateTimeFormat(getLocale(), { month: 'short' })
    .format(d)
    .replace('.', '');
  return `${d.getDate()} ${monthShort}`;
}

export function formatEuro(n) {
  const num = Number(n) || 0;
  const fixed = num.toFixed(2);
  const [whole, decimals] = fixed.split('.');
  const withThousands = whole.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `€${withThousands},${decimals}`;
}

// Dunne wrapper om parseDecimalInput (#114): naam en 0-fallback blijven,
// zodat de `> 0`-validaties elders in Huishouden ongewijzigd blijven.
export function parseEuroInput(str) {
  return parseDecimalInput(str) ?? 0;
}

export function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Geeft mapping: dayOfMonth (1..daysInMonth) → array van events { item, kind }.
// kind = 'income' (recurring), 'expense' (recurring), 'oneTime' (eenmalige
// uitgave op specifieke datum). month is 0-indexed conform JS Date.
// Recurring items moeten actief zijn (binnen startDate/endDate) en op
// paymentDay van de maand vallen. OneTime items vallen op item.date.
export function eventsForMonth(budget, year, month) {
  const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const events = {};
  const push = (day, item, kind) => {
    if (!events[day]) events[day] = [];
    events[day].push({ item, kind });
  };

  ['income', 'expenses'].forEach(group => {
    const list = (budget && budget[group]) || [];
    const kind = group === 'income' ? 'income' : 'expense';
    list.forEach(item => {
      if (!item || item.enabled === false) return;
      if (!isActiveInMonth(item, monthKey)) return;
      const day = Math.min(daysInMonth, Math.max(1, Number(item.paymentDay) || 1));
      push(day, item, kind);
    });
  });

  const oneTime = (budget && budget.oneTime) || [];
  oneTime.forEach(item => {
    if (!item || !item.date || typeof item.date !== 'string') return;
    if (item.date.slice(0, 7) !== monthKey) return;
    const day = Math.min(daysInMonth, Math.max(1, Number(item.date.slice(8, 10)) || 1));
    push(day, item, 'oneTime');
  });

  return events;
}

export function netForDay(dayEvents) {
  return (dayEvents || []).reduce((sum, e) => {
    const sign = e.kind === 'income' ? 1 : -1;
    return sum + sign * (Number(e.item.amount) || 0);
  }, 0);
}

export function netForMonth(eventsByDay) {
  return Object.values(eventsByDay || {}).flat().reduce((sum, e) => {
    const sign = e.kind === 'income' ? 1 : -1;
    return sum + sign * (Number(e.item.amount) || 0);
  }, 0);
}

// === Vaste-lasten- en utilities-helpers (nieuw model) =======================

export const UTILITY_TYPES = ['water', 'elektra', 'gas', 'energie'];
export const ENERGY_GROUP = ['gas', 'elektra'];

// Eerste van huidige maand als ISO 'YYYY-MM-01'.
export function defaultStartDate(today = new Date()) {
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
}

// Geeft 'YYYY-MM-01' van de maand vóór newStartDate. Gebruikt om een lopend
// contract af te kappen wanneer een opvolger ingaat: de oude expense krijgt
// endDate = endDateBefore(opvolgerStart) zodat het in de eindmaand nog meetelt.
export function endDateBefore(newStartDate) {
  const [y, m] = newStartDate.slice(0, 7).split('-').map(Number);
  const prevYear = m === 1 ? y - 1 : y;
  const prevMonth = m === 1 ? 12 : m - 1;
  return `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
}

// Of een recurring item (income of expense) actief is in monthKey 'YYYY-MM'.
// endDate is inclusief — een item met endDate '2026-05-01' loopt nog in mei.
export function isActiveInMonth(item, monthKey) {
  if (!item || typeof monthKey !== 'string') return false;
  const startMonth = item.startDate ? item.startDate.slice(0, 7) : null;
  if (startMonth && startMonth > monthKey) return false;
  if (item.endDate) {
    const endMonth = item.endDate.slice(0, 7);
    if (endMonth < monthKey) return false;
  }
  return true;
}

export function getActiveItems(items, monthKey) {
  return (items || []).filter(it => isActiveInMonth(it, monthKey));
}

// Set van utilityType-strings die actief zijn op dateStr ('YYYY-MM-DD' of -01).
export function activeUtilityTypesAt(expenses, dateStr) {
  const monthKey = (dateStr || '').slice(0, 7);
  const set = new Set();
  for (const e of expenses || []) {
    if (!e?.utilityType) continue;
    if (isActiveInMonth(e, monthKey)) set.add(e.utilityType);
  }
  return set;
}

// Map van utilityType → boolean (true = optie moet in de UI uitgegrijsd zijn).
// Disabled wegens duplicaat OF wegens cross-conflict (energie ↔ gas/elektra).
export function disabledUtilityTypes(activeTypes) {
  const set = activeTypes instanceof Set ? activeTypes : new Set(activeTypes || []);
  const disabled = {};
  for (const type of UTILITY_TYPES) {
    if (set.has(type)) { disabled[type] = true; continue; }
    if (type === 'energie' && (set.has('gas') || set.has('elektra'))) { disabled[type] = true; continue; }
    if ((type === 'gas' || type === 'elektra') && set.has('energie')) { disabled[type] = true; continue; }
    disabled[type] = false;
  }
  return disabled;
}

// Bestaande expenses die in conflict komen met een nieuwe poging. Geeft de
// items terug zodat de UI kan tonen welke contracten worden afgekapt.
// ignoreId voorkomt dat een item dat we aan het bewerken zijn met zichzelf botst.
export function conflictingUtilityExpenses(expenses, newUtilityType, newStartDate, ignoreId = null) {
  if (!newUtilityType || !newStartDate) return [];
  const monthKey = newStartDate.slice(0, 7);
  const out = [];
  for (const e of expenses || []) {
    if (!e?.utilityType) continue;
    if (ignoreId && e.id === ignoreId) continue;
    if (!isActiveInMonth(e, monthKey)) continue;
    const sameType = e.utilityType === newUtilityType;
    const energieVsLoss = newUtilityType === 'energie' && (e.utilityType === 'gas' || e.utilityType === 'elektra');
    const lossVsEnergie = (newUtilityType === 'gas' || newUtilityType === 'elektra') && e.utilityType === 'energie';
    if (sameType || energieVsLoss || lossVsEnergie) out.push(e);
  }
  return out;
}

export function monthlyAmountForType(expenses, monthKey, utilityType) {
  return (expenses || [])
    .filter(e => e?.utilityType === utilityType && isActiveInMonth(e, monthKey))
    .reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

export function monthActualTotal(actuals, monthKey) {
  const slot = (actuals || {})[monthKey];
  if (!slot) return 0;
  return UTILITY_TYPES.reduce((s, t) => s + (Number(slot[t]) || 0), 0);
}

export function yearActualTotal(actuals, year) {
  const prefix = `${year}-`;
  return Object.entries(actuals || {})
    .filter(([k]) => k.startsWith(prefix))
    .reduce((s, [, slot]) => s + UTILITY_TYPES.reduce((sub, t) => sub + (Number(slot?.[t]) || 0), 0), 0);
}

export function monthlyIncomeTotal(income, monthKey) {
  return (income || [])
    .filter(it => isActiveInMonth(it, monthKey))
    .reduce((s, it) => s + (Number(it.amount) || 0), 0);
}

export function monthlyExpenseTotal(expenses, monthKey) {
  return (expenses || [])
    .filter(it => isActiveInMonth(it, monthKey))
    .reduce((s, it) => s + (Number(it.amount) || 0), 0);
}

export function monthlyNet(income, expenses, monthKey) {
  return monthlyIncomeTotal(income, monthKey) - monthlyExpenseTotal(expenses, monthKey);
}
