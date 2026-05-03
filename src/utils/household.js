// Pure helpers for the Household feature. No React, no storage.

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

const NL_MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];

export function formatRelativeDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const today = new Date();
  const diff = daysBetween(d, today);
  if (diff === 0) return 'vandaag';
  if (diff === 1) return 'gisteren';
  if (diff > 1 && diff < 7) return `${diff} dagen geleden`;
  if (diff < 0 && diff > -7) return `over ${Math.abs(diff)} dagen`;
  return `${d.getDate()} ${NL_MONTHS_SHORT[d.getMonth()]}`;
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
