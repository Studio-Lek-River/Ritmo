// Per-bord Trello-voorkeuren: telt dit bord mee in de planner (`include`) en
// welke lijst daarbinnen als "altijd"-lijst geldt (`alwaysListId`, elke dag in
// de pool ongeacht due-datum). Apart van `trelloCache.js` zodat de bordkeuze
// een cache-wipe overleeft (verbreken wist de cache maar mag de
// bordselectie-geschiedenis niet per se meeslepen vóór de aanroeper dat zelf
// beslist — zie App.jsx's wasTrelloConnectedRef-effect, dat beide bewust
// samen wist bij een verbroken koppeling).
//
// Bewust géén `settings`/`day:`/`household:`-prefix (zelfde reden als
// trelloCache.js/agendaSelection.js): dit blijft altijd device-local.
const PREFS_KEY = 'trello:boardPrefs';
const PREFS_VERSION = 1;

const EMPTY_PREF = { include: false, alwaysListId: null };

// Leest de voorkeuren. `{ boards: {} }` bij een ontbrekende, onleesbare of
// andere-`version` cache — de veilige kant, want "niets aangevinkt" betekent
// gewoon dat er geen Trello-projecten worden afgeleid. Een `connectionId`-
// mismatch wist de voorkeuren (na opnieuw koppelen nooit andermans
// bordselectie hergebruiken); een ontbrekende `connectionId` telt bewust niet
// als mismatch (zelfde reden als trelloCache.js).
export async function readTrelloBoardPrefs(connectionId) {
  let parsed;
  try {
    const result = await window.storage.get(PREFS_KEY);
    if (!result?.value) return { boards: {} };
    parsed = JSON.parse(result.value);
  } catch {
    return { boards: {} };
  }
  if (!parsed || parsed.version !== PREFS_VERSION) return { boards: {} };

  if (connectionId && parsed.connectionId && parsed.connectionId !== connectionId) {
    await clearTrelloBoardPrefs();
    return { boards: {} };
  }

  return { boards: parsed.boards || {} };
}

export async function writeTrelloBoardPrefs({ connectionId, boards }) {
  const payload = {
    version: PREFS_VERSION,
    connectionId: connectionId ?? null,
    boards: boards || {},
  };
  await window.storage.set(PREFS_KEY, JSON.stringify(payload));
  return payload;
}

export async function clearTrelloBoardPrefs() {
  await window.storage.delete(PREFS_KEY);
}

// Merge met de default zodat een ontbrekend bord nooit `undefined` teruggeeft
// (zelfde patroon als `getSourcePref` in sourcePrefs.js).
export function getBoardPref(boardPrefs, boardId) {
  return { ...EMPTY_PREF, ...(boardPrefs?.boards?.[boardId] || {}) };
}

// Alle bord-ids die momenteel zijn aangevinkt (`include: true`) — de lijst die
// naar `fetchTrelloCards`/`useTrelloCards` gaat.
export function includedBoardIds(boardPrefs) {
  const boards = boardPrefs?.boards || {};
  return Object.keys(boards).filter((id) => boards[id]?.include);
}
