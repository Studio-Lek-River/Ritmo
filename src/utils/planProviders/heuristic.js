// Dunne omwikkeling van de S05/S06-heuristiek (`planDay`, ongewijzigd) tot
// het `planWithProvider`-contract (S11). Geen hints, geen provider-eigen
// config — dit is zowel de default-provider als waar de fallback-keten in
// planProviders/index.js altijd op terugvalt, dus AC2 (identieke indeling
// als vandaag) staat of valt met deze functie een pure pass-through blijven.
import { planDay } from '../planDay';

export async function runHeuristicProvider({ candidates, fixed, external, dayStart, dayEnd, slotStep, prefs }) {
  const { assignments, unplaceable } = planDay({ candidates, fixed, external, dayStart, dayEnd, slotStep, prefs });
  return { assignments, unplaceable, explanation: null };
}
