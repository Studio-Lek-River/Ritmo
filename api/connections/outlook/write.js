// Schrijft de dagplanning van Ritmo deterministisch naar Outlook (S12): geen
// enkele LLM-aanroep in dit pad (AC15), alleen directe Graph-calls. Blauwdruk
// is events.js: zelfde JWT-verificatie en dezelfde connection/secret/refresh-
// keten, nu gedeeld via `requireOutlookConnection` (_shared.js) zodat de twee
// endpoints niet uit elkaar kunnen lopen.
//
// Algoritme per bestemming (`ritmo` en/of `primary`): agenda stateless
// resolven -> getagde events van die dag ophalen -> batch-delete -> batch-
// create. Delete-dan-create, geen diff/PATCH: een Ritmo-blok draagt geen
// gebruikersstatus (geen deelnemers, geen antwoorden), dus er valt niets te
// behouden — delete+create is per constructie idempotent, en delete eerst
// zodat een halve mislukking iets *mist* in plaats van dubbelingen te maken.
//
// Destructief pad: de delete-lijst komt uitsluitend uit events die, via
// `$expand=singleValueExtendedProperties`, de exacte tagwaarde `v1|<dateKey>`
// dragen (RITMO_TAG_ID in _shared.js) — nooit `categories` en nooit de
// titel. Zie de slice-spec voor de volledige onderbouwing.
import {
  getBearerToken,
  getServiceClient,
  missingOutlookEnv,
  requireOutlookConnection,
  graphBatch,
  hasWriteScope,
  ritmoTagValue,
  GRAPH_BASE_URL,
  GRAPH_CALENDARS_URL,
  GRAPH_PRIMARY_CALENDAR_URL,
  RITMO_CALENDAR_NAME,
  RITMO_TAG_ID,
  RITMO_CATEGORY,
  MAX_WRITE_BLOCKS,
} from './_shared.js';

const DATE_KEY_REGEX = /^\d{4}-\d{2}-\d{2}$/;
const KNOWN_DESTINATIONS = ['ritmo', 'primary'];
// Harde lus-limiet op paginering (zowel de agenda-lijst als het getagde
// leespad hieronder) — nooit oneindig doorpagineren op een onverwachte Graph-
// respons.
const MAX_LIST_PAGES = 10;

function isIsoInstant(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

// Harde validatie vóór élke Graph-call — dit endpoint verwijdert events uit
// de echte agenda van de gebruiker, dus elke onduidelijkheid geeft hier een
// 400 in plaats van halverwege een destructieve batch.
function validateBody(body) {
  const { dateKey, windowStart, windowEnd, destinations, blocks } = body;

  if (typeof dateKey !== 'string' || !DATE_KEY_REGEX.test(dateKey)) return false;
  if (!isIsoInstant(windowStart) || !isIsoInstant(windowEnd)) return false;
  const windowStartMs = Date.parse(windowStart);
  const windowEndMs = Date.parse(windowEnd);
  if (windowEndMs <= windowStartMs) return false;

  if (!Array.isArray(destinations) || destinations.length === 0) return false;
  if (!destinations.every((d) => KNOWN_DESTINATIONS.includes(d))) return false;
  if (new Set(destinations).size !== destinations.length) return false;

  // `blocks: []` is geldig (betekent "maak dag X leeg").
  if (!Array.isArray(blocks) || blocks.length > MAX_WRITE_BLOCKS) return false;

  return blocks.every((block) => {
    if (!block || typeof block !== 'object') return false;
    if (typeof block.key !== 'string' || block.key.length === 0) return false;
    if (typeof block.title !== 'string') return false;
    if (!isIsoInstant(block.start) || !isIsoInstant(block.end)) return false;
    const startMs = Date.parse(block.start);
    const endMs = Date.parse(block.end);
    if (endMs <= startMs) return false;
    if (startMs < windowStartMs || endMs > windowEndMs) return false;
    return true;
  });
}

async function resolvePrimaryCalendarId(accessToken) {
  const response = await fetch(`${GRAPH_PRIMARY_CALENDAR_URL}?$select=id`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const err = new Error('graph_calendar_lookup_failed');
    err.status = response.status;
    throw err;
  }
  const data = await response.json().catch(() => ({}));
  return data.id;
}

// `primary` -> GET /me/calendar (bestaat altijd). `ritmo` -> pagineer
// /me/calendars, match op naam, anders POST /me/calendars {name:'Ritmo'}.
// Stateless: geen opgeslagen id, dus geen migratie nodig — de tweede klik
// hergebruikt de agenda simpelweg omdat hij al bestaat (AC4).
async function resolveRitmoCalendarId(accessToken) {
  let url = `${GRAPH_CALENDARS_URL}?$select=id,name&$top=50`;
  for (let page = 0; page < MAX_LIST_PAGES && url; page += 1) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      const err = new Error('graph_calendar_lookup_failed');
      err.status = response.status;
      throw err;
    }
    const data = await response.json().catch(() => ({}));
    const match = (data.value || []).find((cal) => cal.name === RITMO_CALENDAR_NAME);
    if (match) return match.id;
    url = data['@odata.nextLink'] || null;
  }

  const createResponse = await fetch(GRAPH_CALENDARS_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: RITMO_CALENDAR_NAME }),
  });
  if (!createResponse.ok) {
    const err = new Error('graph_calendar_create_failed');
    err.status = createResponse.status;
    throw err;
  }
  const created = await createResponse.json().catch(() => ({}));
  return created.id;
}

// Ophalen via `$expand=singleValueExtendedProperties($filter=id eq '...')` op
// de agenda-specifieke calendarView (NIET `$filter` rechtstreeks op
// calendarView — dat geeft een 500, zie de slice-spec) en pas daarna in JS
// filteren op de exacte tagwaarde. Dit is de enige plaats die bepaalt wat er
// straks verwijderd mag worden.
async function fetchTaggedEvents(accessToken, calendarId, dateKey, windowStart, windowEnd) {
  const tagValue = ritmoTagValue(dateKey);
  const params = new URLSearchParams({
    startDateTime: windowStart,
    endDateTime: windowEnd,
    $select: 'id,subject',
    $expand: `singleValueExtendedProperties($filter=id eq '${RITMO_TAG_ID}')`,
    $top: '250',
  });
  let url = `${GRAPH_BASE_URL}/me/calendars/${calendarId}/calendarView?${params.toString()}`;

  const tagged = [];
  for (let page = 0; page < MAX_LIST_PAGES && url; page += 1) {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      const err = new Error('graph_read_failed');
      err.status = response.status;
      throw err;
    }
    const data = await response.json().catch(() => ({}));
    (data.value || []).forEach((event) => {
      const props = event.singleValueExtendedProperties || [];
      const match = props.find((p) => p.id === RITMO_TAG_ID);
      // Guard vlak vóór de delete-lijst: uitsluitend een exacte
      // tagwaarde-match komt in aanmerking.
      if (match && match.value === tagValue) tagged.push({ id: event.id });
    });
    url = data['@odata.nextLink'] || null;
  }
  return tagged;
}

// `events` is `{ id }[]`. Retourneert het aantal mislukte deletes en of er
// een 403 tussen zat (mogelijke scope-regressie, zie classifyGraphWriteStatus
// in de handler).
async function deleteEvents(accessToken, events) {
  if (events.length === 0) return { failed: 0, scopeIssue: false };
  const requests = events.map((event, idx) => ({ id: String(idx), method: 'DELETE', url: `/me/events/${event.id}` }));
  const responses = await graphBatch(accessToken, requests);
  let failed = 0;
  let scopeIssue = false;
  responses.forEach((r) => {
    if (!r || r.status >= 300 || r.status === 0) {
      failed += 1;
      if (r?.status === 403) scopeIssue = true;
    }
  });
  return { failed, scopeIssue };
}

// `isReminderOn: false` (Ritmo zet nooit ongevraagd meldingen aan),
// `showAs: 'busy'`, de zachte `categories`-tag voor het leespad en de harde
// extended property voor het verwijderpad. Geen body-tekst, geen server-side
// i18n nodig: het subject is het eigen label van de gebruiker.
async function createEvents(accessToken, calendarId, blocks, dateKey) {
  if (blocks.length === 0) return { createdIds: [], failed: 0, scopeIssue: false };
  const tagValue = ritmoTagValue(dateKey);
  const requests = blocks.map((block, idx) => ({
    id: String(idx),
    method: 'POST',
    url: `/me/calendars/${calendarId}/events`,
    headers: { 'Content-Type': 'application/json' },
    body: {
      subject: block.title,
      isReminderOn: false,
      showAs: 'busy',
      categories: [RITMO_CATEGORY],
      start: { dateTime: block.start.replace(/Z$/, ''), timeZone: 'UTC' },
      end: { dateTime: block.end.replace(/Z$/, ''), timeZone: 'UTC' },
      singleValueExtendedProperties: [{ id: RITMO_TAG_ID, value: tagValue }],
    },
  }));
  const responses = await graphBatch(accessToken, requests);
  const createdIds = [];
  let failed = 0;
  let scopeIssue = false;
  responses.forEach((r) => {
    if (r && r.status >= 200 && r.status < 300 && r.body?.id) {
      createdIds.push(r.body.id);
    } else {
      failed += 1;
      if (r?.status === 403) scopeIssue = true;
    }
  });
  return { createdIds, failed, scopeIssue };
}

// Eén bestemming: resolve -> ophalen -> delete -> create -> read-back-
// verificatie. Gooit een 403-gemarkeerde error zodra een batch-item op scope
// wijst, zodat de handler die (samen met een rechtstreekse Graph-403) via één
// centrale classifier afhandelt.
async function writeDestination({ accessToken, destination, dateKey, windowStart, windowEnd, blocks }) {
  const calendarId = destination === 'primary'
    ? await resolvePrimaryCalendarId(accessToken)
    : await resolveRitmoCalendarId(accessToken);

  const taggedEvents = await fetchTaggedEvents(accessToken, calendarId, dateKey, windowStart, windowEnd);
  const del = await deleteEvents(accessToken, taggedEvents);
  const create = await createEvents(accessToken, calendarId, blocks, dateKey);

  if (del.scopeIssue || create.scopeIssue) {
    const err = new Error('graph_write_forbidden');
    err.status = 403;
    throw err;
  }

  let failed = del.failed + create.failed;

  // Read-back-verificatie: zijn er blokken geschreven maar komt er *nul*
  // getagd terug, dan rollback van de zojuist aangemaakte ids (risico 1 uit
  // de slice-spec: extended properties die stil gedropt worden).
  if (blocks.length > 0 && create.createdIds.length > 0) {
    const persisted = await fetchTaggedEvents(accessToken, calendarId, dateKey, windowStart, windowEnd);
    if (persisted.length === 0) {
      await deleteEvents(accessToken, create.createdIds.map((id) => ({ id })));
      return { failed: blocks.length, tagUnsupported: true };
    }
  }

  return { failed, tagUnsupported: false };
}

function classifyGraphWriteStatus(status) {
  if (status === 403) return 'scope_upgrade_required';
  if (status === 401) return 'ms_auth';
  if (status === 429) return 'ms_rate_limit';
  return 'ms_error';
}

const GRAPH_ERROR_MESSAGES = {
  scope_upgrade_required: 'Outlook moet opnieuw gekoppeld worden om te kunnen schrijven',
  ms_auth: 'Microsoft heeft de aanvraag geweigerd',
  ms_rate_limit: 'Microsoft limiteert dit moment de aanvragen',
  ms_error: 'Microsoft gaf een onverwachte fout terug',
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingOutlookEnv();
  if (missingEnv.length) {
    console.error('connections/outlook/write missing env:', missingEnv.join(', '));
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (!validateBody(body)) {
    return res.status(400).json({ error: 'Ongeldige aanvraag', code: 'invalid_request' });
  }
  const { dateKey, windowStart, windowEnd, destinations, blocks } = body;

  const supabase = getServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }
  const accountId = userData.user.id;

  try {
    const required = await requireOutlookConnection(supabase, accountId, { logLabel: 'connections/outlook/write' });
    if (required.error) {
      if (required.error === 'token_refresh_failed') {
        return res.status(502).json({ error: 'Vernieuwen van de koppeling is mislukt', code: 'token_refresh_failed' });
      }
      if (required.error === 'not_connected') {
        return res.status(409).json({ error: 'Outlook is niet gekoppeld', code: 'not_connected' });
      }
      return res.status(500).json({ error: 'Kon koppeling niet ophalen', code: 'unexpected' });
    }
    const { accessToken, scope } = required;

    // Vooraf, zonder één Graph-call: een koppeling die nooit om schrijfrecht
    // is gevraagd krijgt hier een nette "opnieuw koppelen"-melding in plaats
    // van een Graph-403 halverwege een destructieve batch (AC2).
    if (!hasWriteScope(scope)) {
      return res.status(409).json({ error: GRAPH_ERROR_MESSAGES.scope_upgrade_required, code: 'scope_upgrade_required' });
    }

    let totalFailed = 0;
    let anyTagUnsupported = false;

    // Sequentieel: 'ritmo' en 'primary' resolven allebei hun eigen agenda en
    // raken elkaar dus nooit, maar dit blijft de voorspelbare vorm (geen
    // parallelle races tegen dezelfde Graph-rate-limit).
    for (const destination of destinations) {
      // eslint-disable-next-line no-await-in-loop
      const result = await writeDestination({ accessToken, destination, dateKey, windowStart, windowEnd, blocks });
      totalFailed += result.failed;
      if (result.tagUnsupported) anyTagUnsupported = true;
    }

    if (anyTagUnsupported) {
      console.error('connections/outlook/write tag not persisted, rolled back', { destinations: destinations.length });
      return res.status(502).json({ error: 'Outlook ondersteunt het markeren van Ritmo-blokken niet op dit account', code: 'tag_unsupported' });
    }

    if (totalFailed > 0) {
      console.error('connections/outlook/write partial failure', { failed: totalFailed });
      return res.status(200).json({ written: true, partial: true, failed: totalFailed });
    }

    return res.status(200).json({ written: true });
  } catch (err) {
    if (typeof err?.status === 'number') {
      const code = classifyGraphWriteStatus(err.status);
      console.error('connections/outlook/write graph error', err.status, err.message);
      return res.status(code === 'scope_upgrade_required' ? 409 : 502).json({ error: GRAPH_ERROR_MESSAGES[code], code });
    }
    console.error('connections/outlook/write error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
