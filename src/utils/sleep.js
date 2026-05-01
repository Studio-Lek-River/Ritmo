// Pure helpers voor de slaap-module. Alle tijden zijn HH:MM strings (24u).
// Een nacht "hoort bij" de ochtend van opstaan: bed-doel komt uit de
// vorige weekdag, wake-doel uit de huidige weekdag.

import { WEEKDAY_KEYS, weekdayKeyForDate, previousWeekdayKey } from './dates';

export { WEEKDAY_KEYS, weekdayKeyForDate, previousWeekdayKey };

export function goalsForNight(moduleGoals, date) {
  if (!moduleGoals || !date) return { bed: null, wake: null };
  const today = weekdayKeyForDate(date);
  const yesterday = previousWeekdayKey(today);
  return {
    bed: moduleGoals[yesterday]?.bed ?? null,
    wake: moduleGoals[today]?.wake ?? null,
  };
}

export function parseHHMM(hhmm) {
  if (typeof hhmm !== 'string') return null;
  const m = hhmm.match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

// Verschil in minuten, gewrapped naar [-720, 720] zodat 23:00 vs 00:15
// als +75 wordt gerapporteerd in plaats van -1365.
export function timeDiffMinutes(actual, goal) {
  const a = parseHHMM(actual);
  const g = parseHHMM(goal);
  if (a == null || g == null) return null;
  let diff = a - g;
  if (diff > 720) diff -= 1440;
  else if (diff < -720) diff += 1440;
  return diff;
}

// Slaapduur in minuten met midnight-wrap. Returnt null als één tijd ontbreekt.
export function sleepDurationMinutes(bedTime, wakeTime) {
  const b = parseHHMM(bedTime);
  const w = parseHHMM(wakeTime);
  if (b == null || w == null) return null;
  let dur = w - b;
  if (dur <= 0) dur += 1440;
  return dur;
}

export function isOnTarget(dayData, goals, toleranceMinutes) {
  if (!dayData) return false;
  const tol = typeof toleranceMinutes === 'number' && toleranceMinutes >= 0
    ? toleranceMinutes
    : 15;
  const bedDiff = timeDiffMinutes(dayData.bedTime, goals?.bed);
  const wakeDiff = timeDiffMinutes(dayData.wakeTime, goals?.wake);
  if (bedDiff == null || wakeDiff == null) return false;
  return Math.abs(bedDiff) <= tol && Math.abs(wakeDiff) <= tol;
}

// daysData: [{ date: Date, dayData: object|null }]
// returns { averageDurationMinutes, nightsOnTarget, nightsLogged }
export function summarizeSleep(daysData, module) {
  let totalDuration = 0;
  let durationCount = 0;
  let nightsOnTarget = 0;
  let nightsLogged = 0;
  const tol = module?.toleranceMinutes ?? 15;

  for (const { date, dayData } of daysData) {
    if (!dayData) continue;
    const hasAny = dayData.bedTime || dayData.wakeTime || dayData.morningScore != null;
    if (hasAny) nightsLogged += 1;
    const dur = sleepDurationMinutes(dayData.bedTime, dayData.wakeTime);
    if (dur != null) {
      totalDuration += dur;
      durationCount += 1;
    }
    const goals = goalsForNight(module?.goals, date);
    if (isOnTarget(dayData, goals, tol)) nightsOnTarget += 1;
  }

  return {
    averageDurationMinutes: durationCount > 0 ? totalDuration / durationCount : null,
    nightsOnTarget,
    nightsLogged,
  };
}
