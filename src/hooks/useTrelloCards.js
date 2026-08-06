import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchTrelloCards } from '../sync/connections';
import { readTrelloCache, writeTrelloCache, mergeTrelloBoards } from '../utils/trelloCache';

// Cache-first Trello-kaartenfetch (S08), structureel gelijk aan
// useOutlookEvents.js:
//
// - `active`: mag Trello überhaupt meedoen (een koppeling die verbonden is of
//   nog laadt). Zodra dit uit gaat wordt `boards` leeggemaakt, zodat een
//   verbroken koppeling nooit wees-projecten kan achterlaten.
// - `enabled`: mag er nu ook echt gefetcht worden (`active` plus minstens één
//   aangevinkt bord, zie AC5 — geen cards-request vóór opt-in per bord).
//
// Het resultaat leeft niet alleen in React-state: bij mount seedt deze hook
// zijn state uit `trelloCache.js` (device-local), zodat borden er al staan
// vóór de eerste fetch en ook zonder netwerk (AC14). Een geslaagde fetch
// merget zijn resultaat zowel naar de cache als naar state
// (`mergeTrelloBoards`, puur en deterministisch — een bord dat dít keer
// faalde houdt zijn vorige cache-versie); een volledig mislukte fetch (de
// `.catch()`-tak) laat de state ONGEMOEID en zet alleen `error`. Een
// gedeeltelijk mislukte fetch (200 met een niet-lege `failedBoardIds`, sinds
// #120 mogelijk — zie de toelichting hieronder) zet BEIDE: de geslaagde
// borden landen in state/cache zoals gewoonlijk, én `error` wordt gezet zodat
// de aanroeper alsnog kan melden dat niet alles is gelukt. Zo veegt een
// netwerk- of accountfout nooit het rooster of de projectenlijst leeg.
// `refetch` laat de aanroeper de huidige bordselectie handmatig opnieuw
// ophalen ("vernieuwen").
//
// Een gedeelde `requestToken`-ref telt elke fetch-start; alleen de fetch met
// de nieuwste token mag nog state zetten wanneer hij resolvet (zelfde
// race-bescherming als useOutlookEvents.js).
//
// #120 (meerdere Trello-accounts): `boardIds` wordt `boardPairs`
// (`{ connectionId, boardId }[]`, zie trelloBoardPrefs.js), en er komt een
// nieuwe `connectionIds`-prop bij (alle momenteel verbonden Trello-rijen) die
// naar `readTrelloCache` gaat om borden van een inmiddels verbroken account
// te prunen. `mergeTrelloBoards` blijft ongewijzigd (puur, board-id-based) —
// de request-key wordt hier de gesorteerde `connectionId:boardId`-lijst.
//
// #120/AC8-fix: vóór meerdere accounts was "dit account faalt" altijd "alles
// faalt", dus ving de `.catch()`-tak elke fout af. Sinds de fan-out in
// cards.js geeft een gedeeltelijke mislukking (één account met een
// ingetrokken token, andere accounts wel geldig) een 200 terug mét een
// gevulde `failedBoardIds` — dat moet dus OOK `error` zetten (naast het
// gewone succespad: boards/cache bijwerken met de gelukte borden, hun vorige
// cache-versie voor de mislukte), anders faalt zo'n account volledig stil en
// vuurt de bestaande toast in ProductivitySuiteView nooit. `error` wordt bij
// elke fetch-start eerst op `null` gezet (zie hieronder): een volgende,
// volledig geslaagde fetch veegt een oude fout dus vanzelf weg, en een
// herhaalde mislukking zet telkens een nieuw object (`null` -> waarde is
// altijd een wijziging), zodat de toast-effect in ProductivitySuiteView
// (die op een verandering van deze waarde reageert) ook bij opeenvolgende
// fouten opnieuw afgaat.
export default function useTrelloCards({ active, enabled, boardPairs, connectionIds }) {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const requestToken = useRef(0);
  // Spiegelt de laatst bekende (gecachete of gemergede) boards, zodat een
  // geslaagde fetch kan mergen zonder de cache opnieuw van schijf te lezen.
  const cacheBoardsRef = useRef([]);

  const pairs = boardPairs || [];
  const boardIds = pairs.map((pair) => pair.boardId);
  const pairsKey = pairs.map((pair) => `${pair.connectionId}:${pair.boardId}`).slice().sort().join(',');
  const connectionIdsKey = Array.isArray(connectionIds) ? connectionIds.slice().sort().join(',') : '';

  useEffect(() => {
    if (!active) {
      cacheBoardsRef.current = [];
      setBoards([]);
      setLastSyncedAt(null);
      return () => {};
    }
    let cancelled = false;
    readTrelloCache(connectionIds).then((cache) => {
      if (cancelled) return;
      const seeded = cache?.boards || [];
      cacheBoardsRef.current = seeded;
      setBoards(seeded);
      setLastSyncedAt(cache?.fetchedAt || null);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, connectionIdsKey]);

  const fetchBoards = useCallback(() => {
    if (!enabled || pairs.length === 0) {
      requestToken.current += 1;
      return () => {};
    }

    const token = ++requestToken.current;
    setLoading(true);
    setError(null);

    fetchTrelloCards(pairs)
      .then((data) => {
        if (requestToken.current !== token) return;
        const failedBoardIds = data?.failedBoardIds || [];
        const merged = mergeTrelloBoards(
          cacheBoardsRef.current,
          boardIds,
          data?.boards || [],
          failedBoardIds,
        );
        cacheBoardsRef.current = merged;
        const fetchedAt = new Date().toISOString();
        setBoards(merged);
        setLastSyncedAt(fetchedAt);
        writeTrelloCache({ fetchedAt, boards: merged });
        // Gedeeltelijke mislukking (AC8): de geslaagde borden staan al in
        // `merged`/de cache hierboven, dit meldt alleen dat minstens één
        // account niet is gelukt. Een nieuw object bij elke keer, zodat een
        // opeenvolgende mislukking altijd als wijziging telt (zie de comment
        // bovenaan dit bestand).
        if (failedBoardIds.length > 0) {
          const partialError = new Error('trello_cards_partial_failure');
          partialError.code = 'partial_failure';
          partialError.failedBoardIds = failedBoardIds;
          setError(partialError);
        }
      })
      .catch((err) => {
        console.warn('Ritmo trello cards fetch failed', err);
        if (requestToken.current === token) {
          setError(err);
        }
      })
      .finally(() => {
        if (requestToken.current === token) setLoading(false);
      });

    return () => { requestToken.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, pairsKey]);

  useEffect(() => fetchBoards(), [fetchBoards]);

  return { boards, loading, error, lastSyncedAt, refetch: fetchBoards };
}
