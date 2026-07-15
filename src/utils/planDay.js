// Pure, deterministische heuristiek voor "Deel mijn dag in" (S05). Neemt een
// momentopname van de pool (candidates) en de al bezette tijd (fixed + de
// nog lege `external`-agenda-haak voor S07) en stelt tijden voor. Schrijft
// nooit naar opslag en gebruikt geen randomness/kloktijd — dezelfde input
// geeft altijd dezelfde output, zodat de aanroeper (App.jsx) vrij is om het
// resultaat te tonen (propose/concept) of meteen toe te passen (direct) via
// de bestaande handlers (moveItemToDay/setTaskTime).
import { DAGDEEL_THRESHOLDS, DEFAULT_BLOCK_MINUTES, dagdeelForTime } from './dayTimeline';
import { parseHHMM } from './sleep';

const OCHTEND_END_MIN = parseHHMM(DAGDEEL_THRESHOLDS.ochtendEnd);
const MIDDAG_END_MIN = parseHHMM(DAGDEEL_THRESHOLDS.middagEnd);

// Lokale inverse van sleep.js' parseHHMM (die module exporteert geen
// formatter terug naar "HH:MM"; zelfde duplicatie-precedent als
// utils/medication.js' minutesToTime).
function minutesToHHMM(minutes) {
  const wrapped = ((Math.round(minutes) % 1440) + 1440) % 1440;
  const h = Math.floor(wrapped / 60);
  const m = wrapped % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function clampToRange(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Bouwt de al-bezette intervallen (in minuten sinds middernacht) uit `fixed`
// en `external`, geklemd op [dayStart, dayEnd]. Ongeldige/onvolledige items
// worden overgeslagen in plaats van de hele planning te laten falen.
function buildBusyIntervals(fixed, external, startMin, endMin) {
  const intervals = [];

  (fixed || []).forEach(({ time, duration }) => {
    const start = parseHHMM(time);
    if (start == null) return;
    const dur = Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_BLOCK_MINUTES;
    const clampedStart = clampToRange(start, startMin, endMin);
    const clampedEnd = clampToRange(start + dur, startMin, endMin);
    if (clampedEnd > clampedStart) intervals.push([clampedStart, clampedEnd]);
  });

  (external || []).forEach(({ start, end }) => {
    const s = parseHHMM(start);
    const e = parseHHMM(end);
    if (s == null || e == null) return;
    const clampedStart = clampToRange(s, startMin, endMin);
    const clampedEnd = clampToRange(e, startMin, endMin);
    if (clampedEnd > clampedStart) intervals.push([clampedStart, clampedEnd]);
  });

  return intervals.sort((a, b) => a[0] - b[0]);
}

// Dagdeel-bereik voor een `window`-voorkeur, geklemd op [startMin, endMin].
// `null` betekent: dit dagdeel valt (na klemmen) volledig buiten de dag.
function windowRangeMinutes(window, startMin, endMin) {
  let rangeStart = startMin;
  let rangeEnd = endMin;
  if (window === 'ochtend') {
    rangeEnd = Math.min(endMin, OCHTEND_END_MIN);
  } else if (window === 'middag') {
    rangeStart = Math.max(startMin, OCHTEND_END_MIN);
    rangeEnd = Math.min(endMin, MIDDAG_END_MIN);
  } else if (window === 'avond') {
    rangeStart = Math.max(startMin, MIDDAG_END_MIN);
  }
  if (rangeEnd <= rangeStart) return null;
  return [rangeStart, rangeEnd];
}

// Eerste vrije, op `slotStep` gesnapte gat binnen [rangeStart, rangeEnd] dat
// `duration` past en niet overlapt met `busy`. Bij een window-candidate wordt
// de kandidaat-starttijd ook getoetst aan `dagdeelForTime` (de canonieke
// dagdeel-indeling), zodat deze module geen eigen kopie van die regel
// onderhoudt naast dayTimeline.js.
function findSlot(rangeStart, rangeEnd, duration, slotStep, busy, windowPref) {
  const snappedStart = Math.ceil(rangeStart / slotStep) * slotStep;
  for (let start = snappedStart; start + duration <= rangeEnd; start += slotStep) {
    if (windowPref && dagdeelForTime(minutesToHHMM(start)) !== windowPref) continue;
    const end = start + duration;
    const overlaps = busy.some(([busyStart, busyEnd]) => start < busyEnd && end > busyStart);
    if (!overlaps) return [start, end];
  }
  return null;
}

// Eerst candidates mét window (hun bereik is krapper, dus eerst plaatsen
// voorkomt onnodige verdringing), dan zonder window; binnen een groep
// stabiel op `order` (bronvolgorde).
function sortCandidates(candidates) {
  return [...candidates]
    .map((c, index) => ({ ...c, order: c.order ?? index }))
    .sort((a, b) => {
      const aHasWindow = !!a.window;
      const bHasWindow = !!b.window;
      if (aHasWindow !== bHasWindow) return aHasWindow ? -1 : 1;
      return a.order - b.order;
    });
}

// planDay({ candidates, fixed, external, dayStart, dayEnd, slotStep }) =>
//   { assignments: [{ key, time, duration }], unplaceable: [key] }
export function planDay({
  candidates = [],
  fixed = [],
  external = [],
  dayStart,
  dayEnd,
  slotStep = DEFAULT_BLOCK_MINUTES,
} = {}) {
  const startMin = parseHHMM(dayStart);
  const endMin = parseHHMM(dayEnd);
  const step = Number.isFinite(slotStep) && slotStep > 0 ? slotStep : DEFAULT_BLOCK_MINUTES;

  if (startMin == null || endMin == null || endMin <= startMin) {
    return { assignments: [], unplaceable: candidates.map(c => c.key) };
  }

  const busy = buildBusyIntervals(fixed, external, startMin, endMin);
  const assignments = [];
  const unplaceable = [];

  sortCandidates(candidates).forEach(candidate => {
    const duration = Number.isFinite(candidate.duration) && candidate.duration > 0
      ? candidate.duration
      : DEFAULT_BLOCK_MINUTES;
    const range = candidate.window
      ? windowRangeMinutes(candidate.window, startMin, endMin)
      : [startMin, endMin];
    const slot = range && findSlot(range[0], range[1], duration, step, busy, candidate.window);
    if (!slot) {
      unplaceable.push(candidate.key);
      return;
    }
    const [start, end] = slot;
    busy.push([start, end]);
    busy.sort((a, b) => a[0] - b[0]);
    assignments.push({ key: candidate.key, time: minutesToHHMM(start), duration });
  });

  return { assignments, unplaceable };
}
