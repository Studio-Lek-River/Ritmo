// Vertaalt een AI-antwoord ({ order, windowHints, explanation }, S11) naar de
// bestaande heuristiek. Poort-0-besluit 1: de AI geeft nooit zelf kloktijden
// terug, alleen een volgorde plus optionele dagdeel-hints — `planDay.js`
// blijft de enige plaatser en blijft zelf ongewijzigd. Dit bestand doet twee
// dingen: het providerantwoord strikt valideren (`validatePlanHint`, gebruikt
// door zowel local.js als server.js) en de hint daadwerkelijk toepassen
// (`planWithHints`, gebruikt door planProviders/index.js).
import { planDay } from '../planDay';
import { DAGDEEL_ORDER } from '../dayTimeline';

// Geldige dagdeel-hints: dezelfde drie tokens als een taak-eigen `window`
// (DAGDEEL_ORDER minus het niet-plaatsbare 'ongepland').
const VALID_WINDOWS = DAGDEEL_ORDER.filter((d) => d !== 'ongepland');

// Strikte validatie van een providerantwoord (Ollama of de latere Ritmo AI):
// alles wat niet aan de vorm voldoet levert `null` op, zodat de aanroeper dit
// als "ongeldig antwoord" behandelt en op de heuristiek terugvalt. Onbekende
// extra velden op het object worden genegeerd; de drie bekende velden moeten,
// als ze aanwezig zijn, wél het juiste type hebben.
export function validatePlanHint(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;

  let order = [];
  if (raw.order !== undefined) {
    if (!Array.isArray(raw.order) || raw.order.some((key) => typeof key !== 'string')) return null;
    order = raw.order;
  }

  let windowHints = {};
  if (raw.windowHints !== undefined) {
    if (!raw.windowHints || typeof raw.windowHints !== 'object' || Array.isArray(raw.windowHints)) return null;
    for (const [key, value] of Object.entries(raw.windowHints)) {
      if (typeof key !== 'string' || !VALID_WINDOWS.includes(value)) return null;
    }
    windowHints = raw.windowHints;
  }

  let explanation = null;
  if (raw.explanation !== undefined) {
    if (typeof raw.explanation !== 'string') return null;
    explanation = raw.explanation;
  }

  return { order, windowHints, explanation };
}

// Herschrijft `candidate.order` volgens de hint (onbekende keys uit de hint
// worden genegeerd; candidates die de hint niet noemt komen achteraan, in hun
// eigen bronvolgorde) en zet `candidate.window` alleen waar de taak er zelf
// nog geen had — een expliciete per-taak voorkeur (S04) wint dus altijd van
// de AI-hint.
function applyCandidateHints(candidates, hint) {
  const knownKeys = new Set(candidates.map((c) => c.key));
  const orderedKnown = (hint.order || []).filter((key) => knownKeys.has(key));
  const orderedSet = new Set(orderedKnown);
  const missing = candidates
    .filter((c) => !orderedSet.has(c.key))
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map((c) => c.key);
  const finalOrder = [...orderedKnown, ...missing];
  const orderIndex = new Map(finalOrder.map((key, index) => [key, index]));

  return candidates.map((c) => ({
    ...c,
    order: orderIndex.get(c.key) ?? c.order,
    window: c.window || hint.windowHints?.[c.key] || c.window || '',
  }));
}

// Twee passen door `planDay`: eerst met de hints toegepast, daarna — alleen
// voor keys die daardoor onplaatsbaar werden — nogmaals zonder hint (AC5: een
// dagdeel-hint mag nooit een taak uit de dag duwen). De pass-1-toewijzingen
// tellen in pass 2 mee als bezette tijd (als extra `fixed`-blokken), zodat
// pass 2 er niet overheen plant.
export function planWithHints({ candidates, fixed, external, dayStart, dayEnd, slotStep, prefs, hint }) {
  const hinted = applyCandidateHints(candidates, hint);
  const pass1 = planDay({ candidates: hinted, fixed, external, dayStart, dayEnd, slotStep, prefs });

  if (pass1.unplaceable.length === 0) return pass1;

  const retryKeys = new Set(pass1.unplaceable);
  const retryCandidates = candidates.filter((c) => retryKeys.has(c.key));
  const busyFromPass1 = pass1.assignments.map((a) => ({ time: a.time, duration: a.duration }));
  const pass2 = planDay({
    candidates: retryCandidates,
    fixed: [...(fixed || []), ...busyFromPass1],
    external,
    dayStart,
    dayEnd,
    slotStep,
    prefs,
  });

  return {
    assignments: [...pass1.assignments, ...pass2.assignments],
    unplaceable: pass2.unplaceable,
  };
}
