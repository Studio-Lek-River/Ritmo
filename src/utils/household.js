// Pure helpers for the Household feature. No React, no storage.
import { t, getLocale } from '../i18n/useTranslation';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function toMonthly(amount, frequency) {
  const n = Number(amount) || 0;
  switch (frequency) {
    case 'weekly':  return (n * 52) / 12;
    case 'yearly':  return n / 12;
    case 'monthly':
    default:        return n;
  }
}

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

export function parseEuroInput(str) {
  if (typeof str !== 'string') return Number(str) || 0;
  const cleaned = str.replace(/[^\d,.\-]/g, '').replace(',', '.');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
}

// Maps the begrotingspost.isUtility shorthand to the utilities-storage key.
// 'electric' is shorter for the dropdown but the storage uses 'electricity'.
const UTILITY_KEY_FROM_FLAG = { gas: 'gas', electric: 'electricity', water: 'water' };

export function utilityKeyOf(flag) {
  return UTILITY_KEY_FROM_FLAG[flag] || null;
}

export function monthKeyOf(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

// Returns the amount a single budget item contributes to the auto-projection
// for the given monthKey, or null if it does not apply (wrong month, due date
// not reached, no isUtility flag, weekly frequency, etc.).
export function utilityContributionFor(item, monthKey, today) {
  if (!item || !item.isUtility || !item.dueDay) return null;
  const [yearStr, monthStr] = monthKey.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() + 1 === month;

  if (item.frequency === 'monthly') {
    if (!isCurrentMonth) return null;
    if (today.getDate() < item.dueDay) return null;
    return Number(item.amount) || 0;
  }
  if (item.frequency === 'yearly') {
    if (!item.dueMonth || item.dueMonth !== month) return null;
    if (!isCurrentMonth) return null;
    if (today.getDate() < item.dueDay) return null;
    return Number(item.amount) || 0;
  }
  return null;
}

// Idempotent reconcile: rewrites the autoFromBudget sub-object on the current
// month's utilities entries based on the current budget. Never touches actual
// or budget fields. Safe to call on every mount.
export function reconcileUtilitiesAuto(utilities, budgetExpenses, today = new Date()) {
  const expenses = Array.isArray(budgetExpenses) ? budgetExpenses : [];
  const monthKey = monthKeyOf(today);
  const next = { ...(utilities || {}) };
  const currentMonth = { ...(next[monthKey] || {}) };
  let changed = false;

  ['water', 'electricity', 'gas'].forEach(k => {
    const slot = { ...(currentMonth[k] || {}) };
    const auto = {};
    expenses.forEach(item => {
      if (utilityKeyOf(item.isUtility) !== k) return;
      const contrib = utilityContributionFor(item, monthKey, today);
      if (contrib != null) auto[item.id] = contrib;
    });
    const had = slot.autoFromBudget;
    if (Object.keys(auto).length > 0) {
      slot.autoFromBudget = auto;
    } else if (had) {
      delete slot.autoFromBudget;
    }
    if (!shallowAutoEqual(had, slot.autoFromBudget)) changed = true;
    currentMonth[k] = slot;
  });

  if (!changed) return utilities || {};
  next[monthKey] = currentMonth;
  return next;
}

function shallowAutoEqual(a, b) {
  if (a === b) return true;
  if (!a || !b) return !a && !b;
  const ak = Object.keys(a);
  const bk = Object.keys(b);
  if (ak.length !== bk.length) return false;
  for (const k of ak) if (a[k] !== b[k]) return false;
  return true;
}

export function autoSumOf(utilitySlot) {
  const auto = utilitySlot && utilitySlot.autoFromBudget;
  if (!auto) return 0;
  return Object.values(auto).reduce((s, v) => s + (Number(v) || 0), 0);
}

export function totalActualOf(utilitySlot) {
  return (utilitySlot?.actual || 0) + autoSumOf(utilitySlot);
}

// Geeft mapping: dayOfMonth (1..daysInMonth) → array van events { item, kind }
// kind = 'income' | 'expense'. month is 0-indexed conform JS Date.
// Weekly items zonder dueWeekday krijgen fallback 1 (maandag).
export function eventsForMonth(budget, year, month) {
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
      if (item.enabled === false) return;
      if (item.frequency === 'monthly') {
        const day = Math.min(Number(item.dueDay) || 1, daysInMonth);
        push(day, item, kind);
      } else if (item.frequency === 'yearly' && Number(item.dueMonth) === month + 1) {
        const day = Math.min(Number(item.dueDay) || 1, daysInMonth);
        push(day, item, kind);
      } else if (item.frequency === 'weekly') {
        const target = Number(item.dueWeekday) || 1; // 1=ma … 7=zo
        for (let d = 1; d <= daysInMonth; d++) {
          const wd = new Date(year, month, d).getDay(); // 0=zo … 6=za
          const iso = wd === 0 ? 7 : wd;
          if (iso === target) push(d, item, kind);
        }
      }
    });
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
