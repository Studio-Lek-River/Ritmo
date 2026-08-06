// Pure helpers voor "Zet in agenda" (S12): bouwen de Ritmo-blokken en de
// Graph-write-payload uit de bestaande dag-tijdlijn (buildDayTimeline). Geen
// opslag, geen netwerk — dat gebeurt in `sync/connections.js`
// (`writeOutlookDay`) resp. `api/connections/outlook/write.js`.
//
// `toUtcInstant` is de enige plek waar lokale wandkloktijd een absoluut
// moment wordt: alles gaat als UTC-instant de deur uit, zodat het
// write-endpoint zelf niets van tijdzones hoeft te weten. `new Date(y, m, d,
// h, min)` interpreteert altijd in de tijdzone van dit toestel en verwerkt
// een DST-overgang op die datum vanzelf correct — er is geen handmatige
// tijdzone-rekenkunde nodig.
import { parseDateKey } from './dates';
import { DEFAULT_BLOCK_MINUTES } from './dayTimeline';

function timeToMinutes(hhmm) {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(hhmm || '').trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Zet een lokale wandkloktijd ("HH:MM") op `dateKey` om naar een absoluut
// UTC-moment (ISO 8601, met 'Z'). `null` bij een ongeldige tijd.
export function toUtcInstant(dateKey, hhmm) {
  const minutes = timeToMinutes(hhmm);
  if (minutes == null) return null;
  const base = parseDateKey(dateKey);
  const local = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, minutes, 0, 0);
  return local.toISOString();
}

// Het venster van dag `dateKey` in UTC (lokale middernacht tot de
// eerstvolgende middernacht) — voor `windowStart`/`windowEnd` in het
// write-request; de server valideert dat elk blok hierbinnen valt.
export function dayWindowUtc(dateKey) {
  const base = parseDateKey(dateKey);
  const start = new Date(base.getFullYear(), base.getMonth(), base.getDate(), 0, 0, 0, 0);
  const end = new Date(start.getTime());
  end.setDate(end.getDate() + 1);
  return { windowStart: start.toISOString(), windowEnd: end.toISOString() };
}

// Bouwt de blokkenlijst uit de dag-tijdlijn (buildDayTimeline, zonder
// `handlers` — zie `App.jsx`'s `buildDayBlocks`): alleen items met een tijd,
// in de compacte vorm die het write-endpoint verwacht. Start/eind gaan al als
// UTC-instant de deur uit; het subject is het eigen label van de gebruiker
// (geen server-side i18n nodig).
export function buildCalendarBlocks(timelineItems, { dateKey } = {}) {
  return (timelineItems || [])
    .filter((item) => item.time)
    .map((item) => {
      const start = toUtcInstant(dateKey, item.time);
      if (!start) return null;
      const durationMinutes = Number(item.duration) > 0 ? Number(item.duration) : DEFAULT_BLOCK_MINUTES;
      const end = new Date(new Date(start).getTime() + durationMinutes * 60000).toISOString();
      return { key: item.key, title: item.label || '', start, end };
    })
    .filter(Boolean);
}

// Bouwt de volledige request-body voor `writeOutlookDay`.
export function buildWritePayload({ dateKey, blocks, destinations }) {
  const { windowStart, windowEnd } = dayWindowUtc(dateKey);
  return { dateKey, windowStart, windowEnd, destinations: destinations || [], blocks: blocks || [] };
}
