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
// faalde houdt zijn vorige cache-versie); een mislukte fetch laat de state
// ONGEMOEID en zet alleen `error`, zodat een netwerkfout nooit het rooster of
// de projectenlijst leegveegt. `refetch` laat de aanroeper de huidige
// bordselectie handmatig opnieuw ophalen ("vernieuwen").
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
        const merged = mergeTrelloBoards(
          cacheBoardsRef.current,
          boardIds,
          data?.boards || [],
          data?.failedBoardIds || [],
        );
        cacheBoardsRef.current = merged;
        const fetchedAt = new Date().toISOString();
        setBoards(merged);
        setLastSyncedAt(fetchedAt);
        writeTrelloCache({ fetchedAt, boards: merged });
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
