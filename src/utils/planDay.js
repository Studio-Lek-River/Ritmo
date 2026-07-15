// Pure, deterministische heuristiek voor "Deel mijn dag in" (S05, uitgebreid
// in S06 met afstem-voorkeuren). Neemt een momentopname van de pool
// (candidates) en de al bezette tijd (fixed + de nog lege `external`-agenda-
// haak voor S07) en stelt tijden voor. Schrijft nooit naar opslag en
// gebruikt geen randomness/kloktijd — dezelfde input geeft altijd dezelfde
// output, zodat de aanroeper (App.jsx) vrij is om het resultaat te tonen
// (propose/concept) of meteen toe te passen (direct) via de bestaande
// handlers (moveItemToDay/setTaskTime).
import { DAGDEEL_THRESHOLDS, DEFAULT_BLOCK_MINUTES, dagdeelForTime } from './dayTimeline';
import { parseHHMM } from './sleep';

const OCHTEND_END_MIN = parseHHMM(DAGDEEL_THRESHOLDS.ochtendEnd);
const MIDDAG_END_MIN = parseHHMM(DAGDEEL_THRESHOLDS.middagEnd);

// Dagdelen in natuurlijke tijdvolgorde. De thresholds zelf blijven in
// dayTimeline.js (canonieke bron); dit is alleen de vaste iteratievolgorde
// die de S06-energie-ordening als tie-break gebruikt (alles-'neutral' =>
// deze volgorde => identiek aan S05's vroegste-slot-eerst).
const DAGDEEL_TOKENS = ['ochtend', 'middag', 'avond'];

// Energie-rang voor de S06-sorteervolgorde: hoger => eerder geprobeerd. Een
// ontbrekende/onbekende waarde valt terug op 'neutral', zodat een niet
// ingevulde voorkeur zich gedraagt als S05.
const ENERGY_RANK = { high: 2, neutral: 1, low: 0 };

// Rustbuffer (minuten) tussen twee auto-geplaatste kandidaten, per S06-
// voorkeur. 'none' (of ontbrekend) => 0 => geen wijziging t.o.v. S05.
const REST_MINUTES = { none: 0, light: 15, ample: 30 };

// Vult ontbrekende prefs-velden aan met de neutrale S06-default (= S05-
// gedrag). Nooit muteren van de meegegeven `prefs`.
function normalizePrefs(prefs) {
  const energy = prefs?.energy || {};
  return {
    energy: {
      ochtend: energy.ochtend || 'neutral',
      middag: energy.middag || 'neutral',
      avond: energy.avond || 'neutral',
    },
    deepWorkWindows: Array.isArray(prefs?.deepWorkWindows) ? prefs.deepWorkWindows : [],
    rest: prefs?.rest || 'none',
  };
}

// Dagdelen aflopend op energie (hoog -> neutraal -> laag), tie-break op
// tijdvolgorde. Bij alles-'neutral' is dit exact DAGDEEL_TOKENS, dus blijft
// het resultaat identiek aan S05 (zie candidateAttempts).
function energyOrderedDagdelen(energy) {
  return [...DAGDEEL_TOKENS].sort((a, b) => {
    const rankA = ENERGY_RANK[energy[a]] ?? ENERGY_RANK.neutral;
    const rankB = ENERGY_RANK[energy[b]] ?? ENERGY_RANK.neutral;
    if (rankA !== rankB) return rankB - rankA;
    return DAGDEEL_TOKENS.indexOf(a) - DAGDEEL_TOKENS.indexOf(b);
  });
}

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
// onderhoudt naast dayTimeline.js. `restMinutes` (S06) verbreedt alleen de
// door eerder geplaatste kandidaten toegevoegde intervallen (busy-entries met
// `isCandidate === true`) bij de overlap-toets; vaste fixed/external-blokken
// blijven ongewijzigd (0 => identiek aan S05).
function findSlot(rangeStart, rangeEnd, duration, slotStep, busy, windowPref, restMinutes = 0) {
  const snappedStart = Math.ceil(rangeStart / slotStep) * slotStep;
  for (let start = snappedStart; start + duration <= rangeEnd; start += slotStep) {
    if (windowPref && dagdeelForTime(minutesToHHMM(start)) !== windowPref) continue;
    const end = start + duration;
    const overlaps = busy.some(([busyStart, busyEnd, isCandidate]) => {
      const bufferedStart = isCandidate ? busyStart - restMinutes : busyStart;
      const bufferedEnd = isCandidate ? busyEnd + restMinutes : busyEnd;
      return start < bufferedEnd && end > bufferedStart;
    });
    if (!overlaps) return [start, end];
  }
  return null;
}

// Bepaalt de probeervolgorde van [rangeStart, rangeEnd, windowPref]-pogingen
// voor één kandidaat. Een expliciete per-taak `window` wint altijd (S05,
// ongewijzigd). Zonder `window` geldt de S06-energie-ordening; een
// `deepWork`-kandidaat met gezette `deepWorkWindows` beperkt die volgorde tot
// de dagdelen uit die voorkeur (lege `deepWorkWindows` => geen effect).
// `rangeEnd` blijft telkens het volledige dagbereik (niet geklemd op het
// dagdeel-einde) zodat een kandidaat, net als in S05, ook een gat mag pakken
// waarvan het einde over de dagdeelgrens heen loopt.
function candidateAttempts(candidate, prefs, startMin, endMin) {
  if (candidate.window) {
    const range = windowRangeMinutes(candidate.window, startMin, endMin);
    return range ? [[range[0], range[1], candidate.window]] : [];
  }

  let dagdelen = energyOrderedDagdelen(prefs.energy);
  if (candidate.deepWork && prefs.deepWorkWindows.length > 0) {
    dagdelen = dagdelen.filter(d => prefs.deepWorkWindows.includes(d));
  }
  return dagdelen.map(d => [startMin, endMin, d]);
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

// planDay({ candidates, fixed, external, dayStart, dayEnd, slotStep, prefs }) =>
//   { assignments: [{ key, time, duration }], unplaceable: [key] }
// `prefs` (S06) = { energy, deepWorkWindows, rest }, optioneel. Ontbrekende
// velden vallen terug op de neutrale default, wat identiek is aan S05.
export function planDay({
  candidates = [],
  fixed = [],
  external = [],
  dayStart,
  dayEnd,
  slotStep = DEFAULT_BLOCK_MINUTES,
  prefs,
} = {}) {
  const startMin = parseHHMM(dayStart);
  const endMin = parseHHMM(dayEnd);
  const step = Number.isFinite(slotStep) && slotStep > 0 ? slotStep : DEFAULT_BLOCK_MINUTES;

  if (startMin == null || endMin == null || endMin <= startMin) {
    return { assignments: [], unplaceable: candidates.map(c => c.key) };
  }

  const normalizedPrefs = normalizePrefs(prefs);
  const restMinutes = REST_MINUTES[normalizedPrefs.rest] ?? 0;
  const busy = buildBusyIntervals(fixed, external, startMin, endMin);
  const assignments = [];
  const unplaceable = [];

  sortCandidates(candidates).forEach(candidate => {
    const duration = Number.isFinite(candidate.duration) && candidate.duration > 0
      ? candidate.duration
      : DEFAULT_BLOCK_MINUTES;

    let slot = null;
    for (const [rangeStart, rangeEnd, windowPref] of candidateAttempts(candidate, normalizedPrefs, startMin, endMin)) {
      slot = findSlot(rangeStart, rangeEnd, duration, step, busy, windowPref, restMinutes);
      if (slot) break;
    }
    if (!slot) {
      unplaceable.push(candidate.key);
      return;
    }
    const [start, end] = slot;
    busy.push([start, end, true]);
    busy.sort((a, b) => a[0] - b[0]);
    assignments.push({ key: candidate.key, time: minutesToHHMM(start), duration });
  });

  return { assignments, unplaceable };
}
