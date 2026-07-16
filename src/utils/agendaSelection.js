// Welke agendapunten meetellen als bezette tijd bij "deel mijn dag in".
// Opt-in: alleen de ids die de gebruiker aanvinkt worden bewaard, dus een
// afspraak die er nieuw bij komt blokkeert nooit ongevraagd de dag.
//
// Bewust géén `settings`/`day:`/`household:`-prefix op de key, om dezelfde
// reden als agendaCache.js: `isUserSyncKey` (src/sync/userDataStorage.js) en
// `src/utils/backup.js` kijken alleen naar die drie, dus deze selectie (die
// afspraak-ids bevat) blijft altijd op het apparaat en komt nooit in de cloud
// of in een backup-bestand. Zelfde levensduur als de agendacache: bij een
// verbroken koppeling wist App.jsx allebei.
const SELECTION_KEY = 'agenda:outlook:selection';
const SELECTION_VERSION = 1;

// Lege lijst bij een ontbrekende, onleesbare of andere-`version` selectie: de
// veilige kant, want "niets aangevinkt" betekent gewoon dat de planner nergens
// omheen plant.
export async function readAgendaSelection() {
  try {
    const result = await window.storage.get(SELECTION_KEY);
    if (!result?.value) return [];
    const parsed = JSON.parse(result.value);
    if (!parsed || parsed.version !== SELECTION_VERSION) return [];
    return Array.isArray(parsed.includedIds) ? parsed.includedIds : [];
  } catch {
    return [];
  }
}

export async function writeAgendaSelection(includedIds) {
  await window.storage.set(SELECTION_KEY, JSON.stringify({
    version: SELECTION_VERSION,
    includedIds: includedIds || [],
  }));
}

export async function clearAgendaSelection() {
  await window.storage.delete(SELECTION_KEY);
}

// Pure snoei: houdt alleen ids die nog in de opgehaalde agenda voorkomen, zodat
// de selectie niet blijft groeien met afspraken die allang verlopen of
// geannuleerd zijn. Een lege `knownIds` betekent "agenda nog niet geladen" en
// laat de selectie bewust met rust — anders zou één keer openen zonder agenda
// alles wissen.
export function pruneSelection(includedIds, knownIds) {
  const ids = includedIds || [];
  if (!knownIds || knownIds.size === 0) return ids;
  return ids.filter((id) => knownIds.has(id));
}
