// Device-local cache van de opgehaalde Trello-borden/lijsten/kaarten (S08).
// Bewust géén `settings`/`day:`/`household:`-prefix op de cache-key:
// `isUserSyncKey` (src/sync/userDataStorage.js) laat alleen die drie naar het
// account syncen, en `src/utils/backup.js` exporteert alleen die drie.
// Bordnamen, lijstnamen en kaarttitels blijven zo altijd op het apparaat en
// komen nooit in de cloud of in een geëxporteerd backup-bestand (zie de
// kernbeslissing "afgeleide modules" in de slice-spec). `agendaCache.js` is
// hiervoor de blauwdruk, niet `sourcePrefs.js` (waarvan de "nooit
// gesynchroniseerd"-comment feitelijk onjuist is, zie Valkuil 1).
const CACHE_KEY = 'trello:cards';
const CACHE_VERSION = 1;

// Leest de cache. `null` bij een ontbrekende, onleesbare of andere-`version`
// cache. Geeft ook `null` (en wist de cache) wanneer `connectionId` is
// meegegeven en niet overeenkomt met de cache: na opnieuw koppelen nooit
// andermans borden tonen. Een ontbrekende `connectionId` (nog onbekend, bv.
// tijdens het laden) telt bewust NIET als mismatch, anders zou de cache al
// verdwijnen vóór de koppelingsstatus zelfs maar bekend is (AC14: borden
// staan er direct, vóór en zonder netwerk).
export async function readTrelloCache(connectionId) {
  let cache;
  try {
    const result = await window.storage.get(CACHE_KEY);
    if (!result?.value) return null;
    cache = JSON.parse(result.value);
  } catch {
    return null;
  }
  if (!cache || cache.version !== CACHE_VERSION) return null;

  if (connectionId && cache.connectionId && cache.connectionId !== connectionId) {
    await clearTrelloCache();
    return null;
  }

  return cache;
}

export async function writeTrelloCache({ connectionId, fetchedAt, boards }) {
  const payload = {
    version: CACHE_VERSION,
    connectionId: connectionId ?? null,
    fetchedAt: fetchedAt ?? null,
    boards: boards || [],
  };
  await window.storage.set(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export async function clearTrelloCache() {
  await window.storage.delete(CACHE_KEY);
}

// Pure, deterministische merge. `cards.js` levert per fetch het volledige
// beeld van de opgevraagde `boardIds`, dus dit is geen dagdeel-merge zoals
// `mergeEventsByDate` — wél nodig om een bord dat dít keer faalde
// (`failedBoardIds`) zijn vorige, nog goede cache-versie te laten houden in
// plaats van hem stilletjes te laten verdwijnen (nooit de state leegvegen bij
// een gedeeltelijke fout, zie AC14). Een bord dat niet meer in `boardIds`
// zit (de gebruiker heeft het uitgevinkt) valt vanzelf weg.
export function mergeTrelloBoards(previousBoards, boardIds, freshBoards, failedBoardIds) {
  const prevById = new Map((previousBoards || []).map((b) => [b.id, b]));
  const freshById = new Map((freshBoards || []).map((b) => [b.id, b]));
  const failedSet = new Set(failedBoardIds || []);

  return (boardIds || [])
    .map((id) => {
      if (freshById.has(id)) return freshById.get(id);
      if (failedSet.has(id) && prevById.has(id)) return prevById.get(id);
      return null;
    })
    .filter(Boolean);
}
