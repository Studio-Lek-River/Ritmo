// Bestemmingsvoorkeur voor "Zet in agenda" (S12): welke agenda('s) de
// Outlook-write-knop vult. Gesynct via `settings` (de gebruiker kiest dit
// bewust per account, niet per apparaat) — zelfde read-time-merge-patroon als
// `getSourcePref` in sourcePrefs.js, alleen zonder per-provider key: er is
// hier maar één instelling met twee onafhankelijke vlaggen.
//
// Default: de niet-invasieve bestemming (de eigen "Ritmo"-agenda) staat aan,
// de invasieve (de hoofdagenda) is een expliciete keuze van de gebruiker —
// zie de slice-spec voor de onderbouwing (destructief pad, dubbeltel-risico).
export const DEFAULT_CALENDAR_WRITE_PREFS = { ritmo: true, primary: false };

// Merge met de default zodat een ontbrekende of oude sync (van vóór deze
// slice) nooit `undefined` teruggeeft — geen migratie nodig (AC18).
export function getCalendarWritePrefs(calendarWritePrefs) {
  return { ...DEFAULT_CALENDAR_WRITE_PREFS, ...(calendarWritePrefs || {}) };
}

// De bestemmingen die op dit moment aanstaan, in de vorm die het
// write-endpoint verwacht (`destinations: ['ritmo'|'primary']`). Leeg =
// beide bestemmingen uit = geen knop en geen write (AC12/AC18).
export function activeCalendarDestinations(calendarWritePrefs) {
  const prefs = getCalendarWritePrefs(calendarWritePrefs);
  return Object.keys(DEFAULT_CALENDAR_WRITE_PREFS).filter((key) => prefs[key]);
}
