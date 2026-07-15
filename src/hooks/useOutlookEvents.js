import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOutlookEvents } from '../sync/connections';
import { mapOutlookEventsToBlocks } from '../utils/outlookEvents';
import { addDays } from '../utils/dates';

// Ephemere Outlook-agendafetch voor de zichtbare planner-week (S07/S07a).
// Haalt alleen op wanneer `enabled` (een verbonden Outlook-koppeling, de
// Planner-view open, EN de gebruiker expliciet op "importeren" heeft
// geklikt — bepaald door de aanroeper) waar is; zonder koppeling of buiten de
// Planner blijft dit een no-op (principe 2, geen achtergrondverkeer zonder
// actieve koppeling/view/klik). Resultaat leeft alleen in React-state, nooit
// in opslag (AC5/AC6): een refresh van de pagina haalt gewoon opnieuw op.
// `refetch` (herbruikte fetch-logica) laat de aanroeper de huidige range
// handmatig opnieuw ophalen ("vernieuwen"); `error` maakt een mislukte fetch
// zichtbaar voor de aanroeper (bv. een toast) i.p.v. hem alleen te loggen.
//
// `refetch` draait buiten de effect-cyclus om, dus een per-call
// `cancelled`-closure (die React alleen bij een effect-cleanup zou
// aanroepen) volstaat niet: een trage refetch van een oude week zou dan de
// state nog kunnen overschrijven nadat een nieuwere fetch (effect of
// refetch) al is gestart. In plaats daarvan telt een gedeelde
// `requestToken`-ref elke fetch-start; alleen de fetch met de nieuwste token
// mag nog state zetten wanneer hij resolvet.
export default function useOutlookEvents({ enabled, weekDays, connectionId }) {
  const [eventsByDate, setEventsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const requestToken = useRef(0);

  const firstDateKey = weekDays && weekDays.length > 0 ? weekDays[0].dateKey : null;
  const lastDateKey = weekDays && weekDays.length > 0 ? weekDays[weekDays.length - 1].dateKey : null;

  const fetchRange = useCallback(() => {
    if (!enabled || !weekDays || weekDays.length === 0) {
      requestToken.current += 1;
      setEventsByDate({});
      return () => {};
    }

    const token = ++requestToken.current;
    setLoading(true);
    setError(null);

    const start = weekDays[0].date.toISOString();
    const end = addDays(weekDays[weekDays.length - 1].date, 1).toISOString();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    fetchOutlookEvents({ start, end, timeZone })
      .then((data) => {
        if (requestToken.current !== token) return;
        const blocks = mapOutlookEventsToBlocks(data?.events || [], { connectionId });
        const grouped = {};
        blocks.forEach((block) => {
          if (!grouped[block.dateKey]) grouped[block.dateKey] = [];
          grouped[block.dateKey].push(block);
        });
        setEventsByDate(grouped);
      })
      .catch((err) => {
        console.warn('Ritmo outlook events fetch failed', err);
        if (requestToken.current === token) {
          setEventsByDate({});
          setError(err);
        }
      })
      .finally(() => {
        if (requestToken.current === token) setLoading(false);
      });

    return () => { requestToken.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, firstDateKey, lastDateKey, connectionId]);

  useEffect(() => fetchRange(), [fetchRange]);

  return { eventsByDate, loading, error, refetch: fetchRange };
}
