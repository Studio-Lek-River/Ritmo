// Lokale weergavevoorkeuren per gekoppelde bron (S07c): kleur en of de bron
// meetelt in de planner (rooster-blokken + "deel mijn dag in"-blokkering).
// In lijn met defaultModules.js: een apparaat-voorkeur, nooit gesynchroniseerd
// naar het account (de connections-tabel is voor `authenticated` alleen
// leesbaar, zie sync/connections.js).
import { Calendar, Github, Trello } from 'lucide-react';

// Provider -> icoon. Eén mapping, hergebruikt door SourcesPanel (het paneel)
// en WeekView (agendablokken + legenda) — geen tweede kopie.
export const SOURCE_ICONS = {
  outlook: Calendar,
  github: Github,
  trello: Trello,
};

// Startkleuren uit COLOR_OPTIONS (utils/colors.js), niet hardcoded buiten
// deze default. `visible: true` zodat een net gekoppelde bron meteen meedoet
// in de planner.
export const DEFAULT_SOURCE_PREFS = {
  outlook: { color: 'blue', visible: true },
  github: { color: 'indigo', visible: true },
  trello: { color: 'teal', visible: true },
};

// Merge met de default zodat een ontbrekende of onbekende providerkey nooit
// `undefined` teruggeeft. Bestaande settings zonder `sourcePrefs` (of met een
// provider die nog geen default heeft) blijven zo zonder migratie werken.
// Een écht onbekende provider krijgt geen hardcoded kleur: `color` blijft
// `undefined` en `getColorClasses` valt vanzelf terug op de neutrale
// zinc-tint.
export function getSourcePref(sourcePrefs, provider) {
  const base = DEFAULT_SOURCE_PREFS[provider] || { color: undefined, visible: true };
  return { ...base, ...(sourcePrefs?.[provider] || {}) };
}
