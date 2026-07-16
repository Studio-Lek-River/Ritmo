import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchOutlookEvents } from '../sync/connections';
import { mapOutlookEventsToBlocks } from '../utils/outlookEvents';
import { addDays } from '../utils/dates';
import { readAgendaCache, writeAgendaCache, mergeEventsByDate } from '../utils/agendaCache';

// Cache-first Outlook-agendafetch voor de zichtbare planner-week (S07/S07a,
// cache-first sinds S07d). Twee losse schakelaars van de aanroeper:
//
// - `active`: mag deze agenda überhaupt meedoen (een koppeling die verbonden
//   is of nog laadt, EN de gebruiker heeft de agenda al eens laten zien). Dit
//   is de enige bron van waarheid voor "zijn er agenda-items": zodra hij uit
//   gaat is `eventsByDate` leeg, zodat een verbroken koppeling nergens meer
//   wees-afspraken kan achterlaten — niet in het rooster en ook niet in de
//   bezette tijd van "deel mijn dag in". Een nog-ladende koppelingsstatus telt
//   bewust als actief, anders zou de cache-seed op elke herlaad op het netwerk
//   moeten wachten.
// - `enabled`: mag er nu ook echt gefetcht worden (`active` plus de
//   Planner-view open). Buiten de Planner blijft dit een no-op voor het
//   fetchen (principe 2, geen achtergrondverkeer zonder actieve
//   koppeling/view/klik), maar blijft de al geladen agenda staan.
//
// Het resultaat leeft niet meer alleen in React-state: bij mount seedt deze
// hook zijn state uit `agendaCache.js` (device-local, zie die module voor de
// privacy-afweging), zodat het rooster al gevuld is vóór de eerste fetch en
// ook zonder netwerk (S07d, herziening van het oorspronkelijke "nooit in
// opslag"-uitgangspunt van S07). Een geslaagde fetch merget zijn resultaat
// zowel naar de cache als naar state (`mergeEventsByDate`, puur en
// deterministisch); een mislukte fetch laat de state ONGEMOEID en zet alleen
// `error` aan, zodat een netwerkfout nooit meer het rooster leegveegt.
// `lastSyncedAt` (uit de cache dan wel de laatste geslaagde fetch) laat de
// aanroeper een "bijgewerkt om"-regel tonen. `refetch` laat de aanroeper de
// huidige range handmatig opnieuw ophalen ("vernieuwen").
//
// `refetch` draait buiten de effect-cyclus om, dus een per-call
// `cancelled`-closure (die React alleen bij een effect-cleanup zou
// aanroepen) volstaat niet: een trage refetch van een oude week zou dan de
// state nog kunnen overschrijven nadat een nieuwere fetch (effect of
// refetch) al is gestart. In plaats daarvan telt een gedeelde
// `requestToken`-ref elke fetch-start; alleen de fetch met de nieuwste token
// mag nog state zetten wanneer hij resolvet.
export default function useOutlookEvents({ active, enabled, weekDays, connectionId, todayKey }) {
  const [eventsByDate, setEventsByDate] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const requestToken = useRef(0);
  // Spiegelt de laatst bekende (gecachete of gemergede) eventsByDate, zodat
  // een geslaagde fetch kan mergen zonder de cache opnieuw van schijf te
  // lezen (en zonder een race met de mount-seed hieronder).
  const cacheEventsRef = useRef({});

  const firstDateKey = weekDays && weekDays.length > 0 ? weekDays[0].dateKey : null;
  const lastDateKey = weekDays && weekDays.length > 0 ? weekDays[weekDays.length - 1].dateKey : null;

  // Cache-first seed: draait op mount en telkens wanneer `connectionId`
  // verandert (bv. na opnieuw koppelen), zodat een cache van een andere
  // koppeling nooit blijft hangen (zie `readAgendaCache`).
  //
  // Gaat `active` uit (koppeling verbroken, of de agenda niet meer getoond),
  // dan wordt de state hier direct leeggemaakt en start er geen nieuwe seed.
  // De `cancelled`-cleanup hoort bij die garantie: een seed die nog onderweg
  // was toen `active` uitging, mag zijn resultaat niet alsnog terugzetten.
  useEffect(() => {
    if (!active) {
      cacheEventsRef.current = {};
      setEventsByDate({});
      setLastSyncedAt(null);
      return () => {};
    }
    let cancelled = false;
    readAgendaCache(connectionId).then((cache) => {
      if (cancelled) return;
      const seeded = cache?.eventsByDate || {};
      cacheEventsRef.current = seeded;
      setEventsByDate(seeded);
      setLastSyncedAt(cache?.fetchedAt || null);
    });
    return () => { cancelled = true; };
  }, [active, connectionId]);

  const fetchRange = useCallback(() => {
    if (!enabled || !weekDays || weekDays.length === 0) {
      requestToken.current += 1;
      return () => {};
    }

    const token = ++requestToken.current;
    setLoading(true);
    setError(null);

    const start = weekDays[0].date.toISOString();
    const end = addDays(weekDays[weekDays.length - 1].date, 1).toISOString();
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const fetchedDateKeys = weekDays.map((d) => d.dateKey);

    fetchOutlookEvents({ start, end, timeZone })
      .then((data) => {
        if (requestToken.current !== token) return;
        const blocks = mapOutlookEventsToBlocks(data?.events || [], { connectionId });
        const fresh = {};
        blocks.forEach((block) => {
          if (!fresh[block.dateKey]) fresh[block.dateKey] = [];
          fresh[block.dateKey].push(block);
        });

        const merged = mergeEventsByDate(cacheEventsRef.current, fresh, fetchedDateKeys, todayKey);
        cacheEventsRef.current = merged;
        const fetchedAt = new Date().toISOString();
        setEventsByDate(merged);
        setLastSyncedAt(fetchedAt);
        writeAgendaCache({ connectionId, fetchedAt, eventsByDate: merged });
      })
      .catch((err) => {
        console.warn('Ritmo outlook events fetch failed', err);
        if (requestToken.current === token) {
          setError(err);
        }
      })
      .finally(() => {
        if (requestToken.current === token) setLoading(false);
      });

    return () => { requestToken.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, firstDateKey, lastDateKey, connectionId, todayKey]);

  useEffect(() => fetchRange(), [fetchRange]);

  return { eventsByDate, loading, error, lastSyncedAt, refetch: fetchRange };
}
