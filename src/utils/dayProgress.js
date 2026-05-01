import { getColorHex } from './colors';

// Returns 'full' | 'partial' | 'none' for a single module on a given day.
// Storage shapes match what App.jsx already writes (see WeekView/MonthView
// completion logic for the canonical reads).
export function moduleStatusForDay(module, dayData) {
  if (!dayData?.moduleData) return 'none';
  const d = dayData.moduleData[module.id] || {};

  switch (module.type) {
    case 'checklist': {
      const items = module.items || [];
      if (items.length === 0) return 'none';
      const done = items.filter(i => d[i.id]).length;
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
export function buildDayCellBackground(modules, dayData) {
  const completed = modules
    .filter(m => m.enabled && m.type !== 'tasks' && m.type !== 'projects')
    .filter(m => moduleStatusForDay(m, dayData) === 'full');

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
