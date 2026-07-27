// Per-bord Trello-voorkeuren: telt dit bord mee in de planner (`include`),
// welke lijst daarbinnen als "altijd"-lijst geldt (`alwaysListId`, elke dag in
// de pool ongeacht due-datum), en (sinds #120, meerdere Trello-accounts) bij
// welke connectie dit bord hoort (`connectionId`). Apart van `trelloCache.js`
// zodat de bordkeuze een cache-wipe overleeft (verbreken wist de cache maar
// mag de bordselectie-geschiedenis niet per se meeslepen vóór de aanroeper
// dat zelf beslist — zie App.jsx's opruim-effect bij een verbroken
// koppeling).
//
// Bewust géén `settings`/`day:`/`household:`-prefix (zelfde reden als
// trelloCache.js/agendaSelection.js): dit blijft altijd device-local.
const PREFS_KEY = 'trello:boardPrefs';
const PREFS_VERSION = 2;

const EMPTY_PREF = { include: false, alwaysListId: null, connectionId: null };

// Leest de voorkeuren. `{ boards: {} }` bij een ontbrekende, onleesbare of
// een niet-migreerbare `version` — de veilige kant, want "niets aangevinkt"
// betekent gewoon dat er geen Trello-projecten worden afgeleid.
//
// v1 -> v2-migratie (#120): v1 had één top-level `connectionId` voor de hele
// cache (één Trello-account was de S08-Poort-0-aanname); v2 draagt
// `connectionId` per bord, want borden van verschillende accounts kunnen nu
// naast elkaar aangevinkt staan. De oude top-level waarde wordt op elk bord
// gestempeld en meteen weggeschreven, zodat de bestaande bordselectie
// behouden blijft (AC6) en een volgende lees-actie al v2 aantreft.
//
// `connectionIds`: de connectie-ids die op dit moment verbonden zijn.
// `null`/`undefined` betekent "nog onbekend" (bv. tijdens het laden van
// `useConnections`) en slaat het prunen bewust over — anders zou de
// bordselectie al even verdwijnen vóórdat de koppelingsstatus bekend is. Een
// echte array prunet borden waarvan de connectie niet (meer) in die lijst
// voorkomt, in plaats van bij een mismatch de héle bordselectie te wissen
// (AC4): het verbreken van één account mag een ander account nooit raken.
export async function readTrelloBoardPrefs(connectionIds) {
  let parsed;
  try {
    const result = await window.storage.get(PREFS_KEY);
    if (!result?.value) return { boards: {} };
    parsed = JSON.parse(result.value);
  } catch {
    return { boards: {} };
  }
  if (!parsed || typeof parsed !== 'object') return { boards: {} };

  let boards;
  if (parsed.version === 1) {
    const legacyConnectionId = parsed.connectionId ?? null;
    boards = {};
    for (const [boardId, pref] of Object.entries(parsed.boards || {})) {
      boards[boardId] = { ...pref, connectionId: pref?.connectionId ?? legacyConnectionId };
    }
    await writeTrelloBoardPrefs({ boards });
  } else if (parsed.version === PREFS_VERSION) {
    boards = parsed.boards || {};
  } else {
    return { boards: {} };
  }

  if (Array.isArray(connectionIds)) {
    const allowed = new Set(connectionIds);
    boards = Object.fromEntries(
      Object.entries(boards).filter(([, pref]) => allowed.has(pref?.connectionId ?? null))
    );
  }

  return { boards };
}

export async function writeTrelloBoardPrefs({ boards }) {
  const payload = {
    version: PREFS_VERSION,
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

// Alle `{ connectionId, boardId }`-paren die momenteel zijn aangevinkt
// (`include: true`) — de lijst die naar `fetchTrelloCards`/`useTrelloCards`
// gaat. Vervangt `includedBoardIds` (S08): sinds #120 is het board-id alleen
// niet meer genoeg om te weten met welk account het opgehaald moet worden.
export function includedBoardPairs(boardPrefs) {
  const boards = boardPrefs?.boards || {};
  return Object.entries(boards)
    .filter(([, pref]) => pref?.include)
    .map(([boardId, pref]) => ({ connectionId: pref.connectionId ?? null, boardId }));
}
