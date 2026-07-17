// Lokale weergavevoorkeur (S03b): welke kleur hoort bij welk prioriteits-
// niveau in de takenpool-chips. Eén-op-één kloon van het sourcePrefs.js-
// patroon (DEFAULT_* + read-time-merge-accessor), maar een EIGEN
// `priorityPrefs`-key in de settings-blob, geen sub-key van `planPrefs`:
// `DEFAULT_PLAN_PREFS` staat gedupliceerd in App.jsx en migrate.js, en
// `migrateSettings` vult `planPrefs` alleen als het hele object ontbreekt —
// een nieuwe sub-key zou daar nooit landen. `sourcePrefs` heeft dat
// migratieprobleem niet, dus dat patroon hergebruiken we hier.
import { COLOR_OPTIONS } from './colors';

// Startkleuren uit COLOR_OPTIONS, niet hardcoded buiten deze default — de
// gebruiker overschrijft ze via de Voorkeuren-tab (PlanPreferencesPanel).
export const DEFAULT_PRIORITY_COLORS = { hoog: 'red', normaal: 'amber', laag: 'blue' };

// Merge met de default zodat een ontbrekend of ongeldig opgeslagen kleur
// nooit `undefined` teruggeeft of een kapotte klasse oplevert (zelfde
// consumer-side-validatie-precedent als WeekView.jsx:96-108). Bestaande
// settings zonder `priorityPrefs` blijven zo zonder migratie werken.
export function getPriorityColor(priorityPrefs, level) {
  const stored = priorityPrefs?.[level];
  return COLOR_OPTIONS.includes(stored) ? stored : DEFAULT_PRIORITY_COLORS[level];
}
