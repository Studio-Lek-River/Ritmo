// Pure, deterministische normalisatie van Microsoft Graph calendarView-events
// (S07). Mapt een licht Graph-event (zoals `api/connections/outlook/events.js`
// teruggeeft: { id, subject, start, end, isAllDay }) naar (a) per-dag
// weergaveblokken { id, dateKey, start, end, title, allDay, source } voor
// WeekView en (b) het planDay-`external`-shape { start, end } per dag.
// Meerdaagse en all-day-events worden per kalenderdag gesplitst. Schrijft
// nooit naar opslag, gebruikt geen randomness/kloktijd in de mapping zelf:
// dezelfde Graph-response geeft altijd dezelfde output (AC6).
import { parseHHMM } from './sleep';

// Graph geeft (met een `Prefer: outlook.timezone="..."`-header) een
// wall-clock dateTime-string terug zonder offset, bv.
// "2024-01-15T09:30:00.0000000". Regex i.p.v. `new Date(...)` zodat het
// resultaat nooit van de tijdzone van de aanroepende runtime afhangt (browser
// of serverless function) — puur string-based ontleden.
const GRAPH_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/;

function parseGraphDateTime(value) {
  if (typeof value !== 'string') return null;
  const match = GRAPH_DATETIME_RE.exec(value);
  if (!match) return null;
  return { dateKey: `${match[1]}-${match[2]}-${match[3]}`, time: `${match[4]}:${match[5]}` };
}

// Eén dag bij een "YYYY-MM-DD"-dateKey optellen, via UTC-rekenwerk zodat het
// resultaat nooit afhangt van de tijdzone van de machine die dit uitvoert
// (browser in lokale tijd, serverless function meestal in UTC).
function addDayToDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d));
  utc.setUTCDate(utc.getUTCDate() + 1);
  const yy = utc.getUTCFullYear();
  const mm = String(utc.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(utc.getUTCDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

// Alle dateKeys in [startKey, endKey) (endKey exclusief, zoals Graph's
// all-day-einddatum). Hek van 60 dagen tegen corrupte/omgedraaide input.
function dateKeysInRange(startKey, endKey) {
  const keys = [];
  let cursor = startKey;
  let guard = 0;
  while (cursor < endKey && guard < 60) {
    keys.push(cursor);
    cursor = addDayToDateKey(cursor);
    guard += 1;
  }
  return keys;
}

const DAY_START_TIME = '00:00';
const DAY_END_TIME = '23:59';

// Mapt één Graph-event naar zijn per-dag weergaveblokken. `connectionId` vult
// de `source`-tak van normalizedItems.js (S02) zonder een nieuw
// module-type te introduceren.
export function mapOutlookEventToBlocks(event, { connectionId } = {}) {
  if (!event) return [];
  const start = parseGraphDateTime(event.start?.dateTime);
  const end = parseGraphDateTime(event.end?.dateTime);
  if (!start || !end) return [];

  const title = event.subject || '';
  const isAllDay = !!event.isAllDay;
  const source = { provider: 'outlook', connectionId: connectionId ?? null };
  const baseId = event.id || `${start.dateKey}-${start.time}-${title}`;

  if (isAllDay) {
    // Graph's all-day-einddatum is exclusief (de dag na de laatste dag).
    return dateKeysInRange(start.dateKey, end.dateKey).map((dateKey) => ({
      id: `${baseId}:${dateKey}`,
      dateKey,
      start: null,
      end: null,
      title,
      allDay: true,
      source,
    }));
  }

  if (start.dateKey === end.dateKey) {
    return [{
      id: baseId,
      dateKey: start.dateKey,
      start: start.time,
      end: end.time,
      title,
      allDay: false,
      source,
    }];
  }

  // Meerdaags getimed event: splits per kalenderdag, geklemd op dagranden
  // voor de tussenliggende dagen.
  const days = dateKeysInRange(start.dateKey, addDayToDateKey(end.dateKey));
  return days.map((dateKey) => ({
    id: `${baseId}:${dateKey}`,
    dateKey,
    start: dateKey === start.dateKey ? start.time : DAY_START_TIME,
    end: dateKey === end.dateKey ? end.time : DAY_END_TIME,
    title,
    allDay: false,
    source,
  }));
}

// Mapt een lijst Graph-events naar alle weergaveblokken (platte lijst, alle
// dagen door elkaar — de aanroeper groepeert zelf per dateKey indien nodig).
export function mapOutlookEventsToBlocks(events, options) {
  return (events || []).flatMap((event) => mapOutlookEventToBlocks(event, options));
}

// Bouwt het planDay-`external`-shape ({ start, end }) voor één dag uit de
// weergaveblokken van die dag. All-day-blokken hebben geen kloktijd en
// blokkeren daarom geen slots (ze verschijnen wel in de weergave, niet in de
// planning-berekening van planDay.js).
export function externalBlocksForDay(blocks, dateKey) {
  return (blocks || [])
    .filter((b) => b.dateKey === dateKey && !b.allDay && parseHHMM(b.start) != null && parseHHMM(b.end) != null)
    .map((b) => ({ start: b.start, end: b.end }));
}
