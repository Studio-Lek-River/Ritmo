// Eén contract boven de S05-heuristiek en de S11-AI-providers:
//
//   planWithProvider({ providerId, candidates, fixed, external, prefs,
//     dayStart, dayEnd, slotStep, config })
//   => { assignments, unplaceable, explanation, providerUsed, fallbackFrom,
//        fallbackReason }
//
// Poort-0-besluit 1: de AI levert alleen volgorde/dagdeel-hints,
// `src/utils/planDay.js` plaatst en blijft zelf ongewijzigd (via
// `heuristic.js`/`applyHints.js`). De registry is data, geen if-keten: elke
// niet-heuristic provider levert een hint die via `planWithHints` vertaald
// wordt naar een indeling. Elke fout (ontbrekende config, netwerkfout,
// timeout, ongeldig antwoord) valt terug op `heuristic` — er komt altijd een
// indeling uit (AC4).
import { runHeuristicProvider } from './heuristic';
import { runLocalProvider } from './local';
import { runServerProvider } from './server';
import { planWithHints } from './applyHints';
import { isDesktopPlatform } from '../platform';

// `run` ontbreekt bewust bij 'heuristic': die loopt nooit door de
// hint-vertaling, zie de tak hieronder.
export const PLANNER_PROVIDERS = [
  { id: 'heuristic', desktopOnly: false },
  { id: 'local', desktopOnly: true, run: runLocalProvider },
  { id: 'server', desktopOnly: false, run: runServerProvider },
];

// Elke `fallbackReason` die de UI bereikt, moet een key hebben onder
// `planner.provider.reasons` in zowel nl.js als en.js — anders toont `t()`
// de kale key-string. Elke provider zou zelf al netjes moeten mappen (zie
// local.js/server.js), maar deze whitelist is de laatste garantie: een
// onbekende of nieuwe code (ook van een toekomstige provider) wordt hier
// alsnog `'unknown'` in plaats van dat hij ongefilterd doorlekt.
const KNOWN_FALLBACK_REASONS = new Set([
  'not_configured', 'network', 'timeout', 'invalid_response', 'desktop_only',
  'unauthenticated', 'server_config', 'unknown',
]);

function normalizeFallbackReason(code) {
  return KNOWN_FALLBACK_REASONS.has(code) ? code : 'unknown';
}

function resolveProvider(providerId) {
  return PLANNER_PROVIDERS.find((p) => p.id === providerId) || PLANNER_PROVIDERS[0];
}

async function fallbackToHeuristic(dayArgs, fallbackFrom, fallbackReason) {
  const { assignments, unplaceable } = await runHeuristicProvider(dayArgs);
  return {
    assignments,
    unplaceable,
    explanation: null,
    providerUsed: 'heuristic',
    fallbackFrom,
    fallbackReason,
  };
}

export async function planWithProvider({
  providerId,
  candidates = [],
  fixed = [],
  external = [],
  prefs,
  dayStart,
  dayEnd,
  slotStep,
  config,
} = {}) {
  const dayArgs = { candidates, fixed, external, dayStart, dayEnd, slotStep, prefs };
  const provider = resolveProvider(providerId);

  if (provider.id === 'heuristic' || typeof provider.run !== 'function') {
    const { assignments, unplaceable } = await runHeuristicProvider(dayArgs);
    return { assignments, unplaceable, explanation: null, providerUsed: 'heuristic', fallbackFrom: null, fallbackReason: null };
  }

  // Veiligheidsklep: de UI verbergt een desktop-only provider (`local`) op
  // mobiel (AC3), maar een corrupte of verouderde device-lokale opslag mag
  // nooit alsnog een netwerkcall forceren vanaf een apparaat waar dat niet
  // hoort.
  if (provider.desktopOnly && !isDesktopPlatform()) {
    return fallbackToHeuristic(dayArgs, provider.id, 'desktop_only');
  }

  try {
    const hint = await provider.run({ candidates, fixed, external, prefs, config });
    const { assignments, unplaceable } = planWithHints({ ...dayArgs, hint });
    return {
      assignments,
      unplaceable,
      explanation: hint.explanation || null,
      providerUsed: provider.id,
      fallbackFrom: null,
      fallbackReason: null,
    };
  } catch (err) {
    return fallbackToHeuristic(dayArgs, provider.id, normalizeFallbackReason(err?.code));
  }
}
