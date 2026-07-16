// Device-local cache van de opgehaalde Outlook-agenda (S07d). Poort-0-keuze:
// events blijven lokaal gecachet zodat de Planner ze meteen toont bij het
// openen, ook offline — een bewuste herziening van S07's "nooit in opslag".
//
// Bewust géén `settings`/`day:`/`household:`-prefix op de cache-key:
// `isUserSyncKey` (src/sync/userDataStorage.js) laat alleen die drie naar het
// account syncen, en `src/utils/backup.js` exporteert alleen die drie.
// Agenda-inhoud blijft zo altijd op het apparaat en komt nooit in de cloud of
// in een geëxporteerd backup-bestand.
import { parseDateKey, addDays, fmtDateKey } from './dates';

const CACHE_KEY = 'agenda:outlook';
const CACHE_VERSION = 1;

// Snoeivenster: alles buiten [vandaag - 30d, vandaag + 90d] vervalt bij een
// merge, zodat de cache niet eeuwig blijft groeien met oude of verre dagen.
const RETENTION_PAST_DAYS = 30;
const RETENTION_FUTURE_DAYS = 90;

// Leest de cache. `null` bij een ontbrekende, onleesbare of andere-`version`
// cache. Geeft ook `null` (en wist de cache) wanneer `connectionId` is
// meegegeven en niet overeenkomt met de cache: na opnieuw koppelen of een
// ander account nooit andermans afspraken tonen. Een ontbrekende
// `connectionId` (nog onbekend, bv. tijdens het laden of offline) wordt
// bewust NIET als mismatch behandeld, anders zou de cache al verdwijnen vóór
// de koppelingsstatus zelfs maar bekend is (AC: blokken staan er direct,
// vóór en zonder netwerk).
export async function readAgendaCache(connectionId) {
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
    await clearAgendaCache();
    return null;
  }

  return cache;
}

export async function writeAgendaCache({ connectionId, fetchedAt, eventsByDate }) {
  const payload = {
    version: CACHE_VERSION,
    connectionId: connectionId ?? null,
    fetchedAt: fetchedAt ?? null,
    eventsByDate: eventsByDate || {},
  };
  await window.storage.set(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export async function clearAgendaCache() {
  await window.storage.delete(CACHE_KEY);
}

// Pure, deterministische merge (geen `new Date()` intern — `todayKey` komt
// van de aanroeper, zelfde lijn als outlookEvents.js). De zojuist opgehaalde
// dagen (`fetchedDateKeys`) VERVANGEN hun cache-versie, ook wanneer ze leeg
// terugkomen (een lege dag betekent een geannuleerde afspraak, geen "nog
// niets opgehaald"). Dagen buiten de opgehaalde week blijven ongemoeid staan.
// Snoeit daarna alles buiten [todayKey - 30d, todayKey + 90d].
export function mergeEventsByDate(cached, fresh, fetchedDateKeys, todayKey) {
  const merged = { ...(cached || {}) };

  (fetchedDateKeys || []).forEach((dateKey) => {
    const freshBlocks = fresh?.[dateKey];
    if (freshBlocks && freshBlocks.length > 0) {
      merged[dateKey] = freshBlocks;
    } else {
      delete merged[dateKey];
    }
  });

  if (todayKey) {
    const minKey = fmtDateKey(addDays(parseDateKey(todayKey), -RETENTION_PAST_DAYS));
    const maxKey = fmtDateKey(addDays(parseDateKey(todayKey), RETENTION_FUTURE_DAYS));
    Object.keys(merged).forEach((dateKey) => {
      if (dateKey < minKey || dateKey > maxKey) delete merged[dateKey];
    });
  }

  return merged;
}
