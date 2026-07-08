import { getColorHex } from './colors';
import { goalsForNight, isOnTarget } from './sleep';

// Lazily normalises legacy boolean checklist-item data to the new object form
// `{ checked?, progress?, note? }`. Reads only — writes always use the new shape.
export function normalizeChecklistItemData(value) {
  if (value === true) return { checked: true };
  if (value === false || value == null) return {};
  if (typeof value === 'object') return value;
  return {};
}

export function isChecklistItemComplete(item, raw) {
  const data = normalizeChecklistItemData(raw);
  if (item.target) return (data.progress || 0) >= item.target;
  return !!data.checked;
}

// Returns 'full' | 'partial' | 'none' for a single module on a given day.
// Storage shapes match what App.jsx already writes (see WeekView/MonthView
// completion logic for the canonical reads).
export function moduleStatusForDay(module, dayData, date) {
  if (!dayData?.moduleData) return 'none';
  const d = dayData.moduleData[module.id] || {};

  switch (module.type) {
    case 'checklist': {
      const items = module.items || [];
      if (items.length === 0) return 'none';
      const done = items.filter(i => isChecklistItemComplete(i, d[i.id])).length;
      if (done === items.length) return 'full';
      if (done > 0) return 'partial';
      return 'none';
    }
    case 'choice':
      return d.completed ? 'full' : 'none';
    case 'counter': {
      const goal = module.dailyGoal ?? module.dailyGoalMinutes ?? 0;
      const value = d.total ?? d.minutes ?? 0;
      if (goal === 0) return value > 0 ? 'full' : 'none';
      if (value >= goal) return 'full';
      if (value > 0) return 'partial';
      return 'none';
    }
    case 'sleep': {
      const goals = goalsForNight(module.goals, date);
      const tol = module.toleranceMinutes ?? 15;
      if (isOnTarget(d, goals, tol)) return 'full';
      if (d.bedTime || d.wakeTime || d.morningScore != null) return 'partial';
      return 'none';
    }
    case 'tasks':
    case 'projects':
      return 'none';
    default:
      return 'none';
  }
}

// Builds a CSS background value (string) for a day cell, or null when no
// modules are fully completed. Variant B: only 'full' modules contribute,
// split into equal segments left-to-right in module order.
export function buildDayCellBackground(modules, dayData, date) {
  const completed = modules
    .filter(m => m.enabled && canCountInStreak(m.type))
    .filter(m => moduleStatusForDay(m, dayData, date) === 'full');

  if (completed.length === 0) return null;
  if (completed.length === 1) return getColorHex(completed[0].color);

  const step = 100 / completed.length;
  const stops = completed.map((m, i) => {
    const c = getColorHex(m.color);
    const from = (i * step).toFixed(2);
    const to = ((i + 1) * step).toFixed(2);
    return `${c} ${from}%, ${c} ${to}%`;
  }).join(', ');
  return `linear-gradient(to right, ${stops})`;
}

const GLOW_TRACKABLE_TYPES = new Set(['checklist', 'choice', 'counter', 'sleep']);

export const NON_TRACKABLE_TYPES = new Set(['projects', 'collection', 'tasks', 'measurements', 'medication', 'bodymap']);

export function canCountInStreak(moduleType) {
  return !NON_TRACKABLE_TYPES.has(moduleType);
}

export function isDayFullyComplete(modules, dayData, date) {
  const trackable = modules.filter(
    m => m.enabled && GLOW_TRACKABLE_TYPES.has(m.type)
  );
  if (trackable.length === 0) return false;
  return trackable.every(
    m => moduleStatusForDay(m, dayData, date) === 'full'
  );
}
