// Pure helpers voor de Inzicht-view.
// Period-helpers + aggregators per module-type.
// Sleep-aggregatie hergebruikt summarizeSleep uit ./sleep.

import { fmtDateKey, parseDateKey, addDays } from './dates';
import { isChecklistItemComplete } from './dayProgress';
import { projectProgress, isOverdue } from './projects';
import { summarizeSleep } from './sleep';

// 'Alles' wordt geclamp op deze waarde voor performance en grafiek-leesbaarheid.
export const ALL_PERIOD_DAYS = 90;

// period: '7' | '30' | '90' | 'all'
// Returns { fromKey, toKey, dayKeys } — dayKeys gesorteerd oudste-naar-nieuwste, inclusief beide grenzen.
export function rangeForPeriod(period, today = new Date()) {
  const days = period === 'all' ? ALL_PERIOD_DAYS : parseInt(period, 10);
  const span = Number.isFinite(days) && days > 0 ? days : 7;
  const toKey = fmtDateKey(today);
  const fromKey = fmtDateKey(addDays(today, -(span - 1)));
  const dayKeys = [];
  for (let i = span - 1; i >= 0; i--) {
    dayKeys.push(fmtDateKey(addDays(today, -i)));
  }
  return { fromKey, toKey, dayKeys };
}

// Bouwt voor de UI handige array: [{ key, date, dayData }] waarbij dayData het volledige
// day-object is (of null als de dag geen entry heeft in history).
export function buildDays(history, dayKeys) {
  return dayKeys.map(key => ({
    key,
    date: parseDateKey(key),
    dayData: history?.[key] || null,
  }));
}

// Zoals buildDays, maar de actieve dag (vandaag) leest uit moduleData i.p.v.
// history — nodig in Week/Maand waar de data van vandaag nog niet in history staat.
export function buildDaysWithActive(dayKeys, { history, activeDateKey, moduleData }) {
  return dayKeys.map(key => ({
    key,
    date: parseDateKey(key),
    dayData: key === activeDateKey ? { moduleData } : (history?.[key] || null),
  }));
}

// --- Counter ---------------------------------------------------------------

export function aggregateCounter(mod, days) {
  const goal = mod.dailyGoal ?? mod.dailyGoalMinutes ?? 0;
  let total = 0;
  let goalHitDays = 0;
  let daysWithEntry = 0;
  const series = days.map(({ key, dayData }) => {
    const d = dayData?.moduleData?.[mod.id] || {};
    const value = d.total ?? d.minutes ?? 0;
    if (value > 0) {
      daysWithEntry += 1;
      total += value;
      if (goal > 0 && value >= goal) goalHitDays += 1;
    }
    return { key, value };
  });
  const denom = days.length;
  const average = denom > 0 ? total / denom : 0;
  return { total, average, daysWithEntry, goalHitDays, totalDays: denom, goal, series };
}

// --- Checklist -------------------------------------------------------------

export function aggregateChecklist(mod, days) {
  const items = mod.items || [];
  const daysWithEntry = days.filter(d => d.dayData?.moduleData?.[mod.id]).length;
  const perItem = items.map(item => {
    let completedDays = 0;
    for (const { dayData } of days) {
      const md = dayData?.moduleData?.[mod.id];
      if (!md) continue;
      if (isChecklistItemComplete(item, md[item.id])) completedDays += 1;
    }
    const pct = daysWithEntry === 0 ? 0 : Math.round((completedDays / daysWithEntry) * 100);
    return { id: item.id, label: item.text || item.label || item.name || item.id, completedDays, totalDays: daysWithEntry, pct };
  });
  const avgPct = perItem.length === 0 ? 0
    : Math.round(perItem.reduce((s, i) => s + i.pct, 0) / perItem.length);
  return { perItem, avgPct, daysWithEntry };
}

// Bouwt een per-item/per-dag matrix voor de checklist-heatmap: één rij per item,
// per dag een cel met of dat item die dag als voltooid geldt.
export function checklistDayMatrix(mod, days) {
  const items = mod.items || [];
  return items.map(item => ({
    id: item.id,
    label: item.text || item.label || item.name || item.id,
    cells: days.map(({ key, date, dayData }) => {
      const md = dayData?.moduleData?.[mod.id];
      return { key, date, complete: md ? isChecklistItemComplete(item, md[item.id]) : false };
    }),
  }));
}

// --- Choice ----------------------------------------------------------------

export function aggregateChoice(mod, days) {
  const options = mod.options || [];
  const counts = new Map();
  let doneDays = 0;
  for (const { dayData } of days) {
    const md = dayData?.moduleData?.[mod.id];
    if (!md) continue;
    if (md.completed) doneDays += 1;
    const sel = md.selectedOption;
    if (sel) counts.set(sel, (counts.get(sel) || 0) + 1);
  }
  const byOption = options.map(opt => ({
    id: opt.id,
    label: opt.label || opt.text || opt.name || opt.id,
    count: counts.get(opt.id) || 0,
  })).sort((a, b) => b.count - a.count);
  const top = byOption[0] && byOption[0].count > 0 ? byOption[0] : null;
  return { doneDays, totalDays: days.length, byOption, top };
}

// --- Sleep -----------------------------------------------------------------

export function aggregateSleep(mod, days) {
  const slim = days.map(({ date, dayData }) => ({
    date,
    dayData: dayData?.moduleData?.[mod.id] || null,
  }));
  return { ...summarizeSleep(slim, mod), totalDays: days.length, perNight: slim };
}

// --- Collection ------------------------------------------------------------

export function aggregateCollection(mod, days) {
  const dayKeySet = new Set(days.map(d => d.key));
  const items = mod.items || [];
  const itemCounts = items.map(item => {
    const events = item.events || [];
    const inRange = events.filter(ev => ev.date && dayKeySet.has(ev.date));
    return { id: item.id, name: item.name || item.label || item.id, count: inRange.length };
  });
  const totalEvents = itemCounts.reduce((s, i) => s + i.count, 0);
  const topItems = [...itemCounts].sort((a, b) => b.count - a.count).slice(0, 3).filter(i => i.count > 0);
  return { totalEvents, totalDays: days.length, byItem: itemCounts, topItems };
}

// --- Tasks (custom day-tasks) ----------------------------------------------

export function aggregateTasks(days) {
  let completed = 0;
  let total = 0;
  for (const { dayData } of days) {
    const list = dayData?.customTasks || [];
    for (const task of list) {
      total += 1;
      if (task.done || task.completed) completed += 1;
    }
  }
  return { completed, total, totalDays: days.length };
}

// --- Projects --------------------------------------------------------------

export function aggregateProjects(mod) {
  const subjects = mod.subjects || [];
  const progress = projectProgress(mod);
  let activeSubjects = 0;
  let completedSubjects = 0;
  let overdueCount = 0;
  for (const s of subjects) {
    const subgoals = s.subgoals || [];
    if (subgoals.length === 0) continue;
    const allDone = subgoals.every(g => g.completed);
    if (allDone) completedSubjects += 1;
    else activeSubjects += 1;
    for (const g of subgoals) {
      if (isOverdue(g.deadline, g.completed)) overdueCount += 1;
    }
  }
  return { progress, activeSubjects, completedSubjects, overdueCount };
}
