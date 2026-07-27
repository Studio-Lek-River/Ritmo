// Opruimknop voor alle Ritmo-blokken (S12/#155): één actie die *alle*
// Ritmo-blokken uit de Outlook-agenda's van de gebruiker verwijdert, ongeacht
// datum en ongeacht welke bestemming op dit moment aanstaat in de
// instellingen — een vangnet om schoon af te sluiten, los van write.js dat
// altijd per dag werkt. Zelfde handler-patroon als write.js:406-432
// (method-check -> missingOutlookEnv -> getBearerToken ->
// supabase.auth.getUser -> requireOutlookConnection -> hasWriteScope -> 409
// scope_upgrade_required), zelfde `{ error, code }`-shape en dezelfde
// classifyGraphWriteStatus-afhandeling in de catch. Geen nieuwe foutcodes,
// dus ConnectionsSection.jsx's ERROR_KEYS hoeft niet uitgebreid.
//
// Het onderzoeksresultaat dat dit ontwerp bepaalt (zie de slice-spec, met
// verwijzing naar singleValueLegacyExtendedProperty-get): `$filter` op
// singleValueExtendedProperties wordt wél ondersteund op `/me/events` — anders
// dan op `calendarView`, dat op zo'n filter een 500 geeft (empirisch
// vastgesteld in S12/write.js). Eén query over `/me/events` dekt daarmee alle
// agenda's van de mailbox (Ritmo-agenda én hoofdagenda) zonder dat er een
// agenda geresolved hoeft te worden. Risico 1 (weigert Graph `$filter` +
// `$expand` samen op deze resource) en Risico 2 (dekt de filter toch niet de
// hele mailbox) uit de slice-spec zijn niet tegen de echte Graph te
// verifiëren vanuit deze omgeving en worden bij Poort 2 bevestigd.
//
// De Graph-`$filter` hieronder is uitdrukkelijk alleen een versmalling: de
// JS-guard `isRitmoTagValue` (_shared.js) is het enige criterium dat bepaalt
// of een event straks echt verwijderd wordt (de harde S12-regel) — nooit de
// zichtbare categorie `Ritmo`, die een gebruiker zelf op een eigen afspraak
// kan zetten.
import {
  getBearerToken,
  getServiceClient,
  missingOutlookEnv,
  requireOutlookConnection,
  graphBatch,
  hasWriteScope,
  isRitmoTagValue,
  RITMO_TAG_VALUE_PREFIX,
  GRAPH_BASE_URL,
  RITMO_TAG_ID,
} from './_shared.js';

// Scan telt tot maximaal dit aantal en meldt `atLeast: true` zodra de limiet
// geraakt is — een preview-klik hoeft nooit een onbegrensde mailbox helemaal
// te doorlopen.
const CLEANUP_SCAN_LIMIT = 500;
// Eén request ruimt maximaal dit aantal events op (10 batch-chunks van
// GRAPH_BATCH_CHUNK_SIZE) zodat een aanvraag nooit tegen een
// functie-timeout aanloopt (Risico 3 / Poort-0-beslissing 4 uit de
// slice-spec); de client herhaalt met `more === true` tot alles weg is.
const CLEANUP_DELETE_BATCH = 200;
// Harde lus-limiet op de paginering hieronder. Bewust een eigen constante en
// niet `MAX_LIST_PAGES` uit write.js: die is per dag geijkt (250 events per
// pagina volstaat ruim), dit pad is mailbox-breed en dus in aantal
// onbegrensd.
const MAX_CLEANUP_PAGES = 20;

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

// URLSearchParams i.p.v. handmatige string-concat, zodat de spaties, dubbele
// punt en slash in RITMO_TAG_ID correct ge-encodeerd worden — zelfde aanpak
// als fetchTaggedEvents in write.js.
function buildScanUrl() {
  const params = new URLSearchParams({
    $filter: `singleValueExtendedProperties/any(ep: ep/id eq '${RITMO_TAG_ID}' and startswith(ep/value, '${RITMO_TAG_VALUE_PREFIX}'))`,
    $expand: `singleValueExtendedProperties($filter=id eq '${RITMO_TAG_ID}')`,
    $select: 'id',
    $top: '100',
  });
  return `${GRAPH_BASE_URL}/me/events?${params.toString()}`;
}

// Pagineert `/me/events` tot `limit` gevonden ids of geen `@odata.nextLink`
// meer, begrensd door MAX_CLEANUP_PAGES. Per event geldt `isRitmoTagValue`
// als laatste, echte controle vóór opname — de Graph-`$filter` hierboven is
// alleen een versmalling. Retourneert `{ ids, atLeast }`; `atLeast` is waar
// zodra de meegegeven `limit` geraakt is (er is dan waarschijnlijk meer).
async function scanRitmoEventIds(accessToken, limit) {
  let url = buildScanUrl();
  const ids = [];
  for (let page = 0; page < MAX_CLEANUP_PAGES && url && ids.length < limit; page += 1) {
    // eslint-disable-next-line no-await-in-loop
    const response = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!response.ok) {
      const err = new Error('graph_read_failed');
      err.status = response.status;
      throw err;
    }
    // eslint-disable-next-line no-await-in-loop
    const data = await response.json().catch(() => ({}));
    (data.value || []).forEach((event) => {
      if (ids.length >= limit) return;
      const props = event.singleValueExtendedProperties || [];
      const match = props.find((p) => p.id === RITMO_TAG_ID);
      if (!match || !isRitmoTagValue(match.value)) return;
      ids.push(event.id);
    });
    url = data['@odata.nextLink'] || null;
  }
  return { ids, atLeast: ids.length >= limit };
}

// Verwijdert een lijst event-ids via graphBatch (DELETE /me/events/{id}, de
// bestaande chunking + 429-retry uit _shared.js). Zelfde
// tellen/scope-signalering als deleteEvents in write.js.
async function deleteRitmoEvents(accessToken, ids) {
  if (ids.length === 0) return { deleted: 0, failed: 0, scopeIssue: false };
  const requests = ids.map((id, idx) => ({ id: String(idx), method: 'DELETE', url: `/me/events/${id}` }));
  const responses = await graphBatch(accessToken, requests);
  let deleted = 0;
  let failed = 0;
  let scopeIssue = false;
  responses.forEach((r) => {
    if (r && r.status >= 200 && r.status < 300) {
      deleted += 1;
    } else {
      failed += 1;
      if (r?.status === 403) scopeIssue = true;
    }
  });
  return { deleted, failed, scopeIssue };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingOutlookEnv();
  if (missingEnv.length) {
    console.error('connections/outlook/cleanup missing env:', missingEnv.join(', '));
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  // Enige body-veld: `scan`. Geen `destinations` — opruimen gaat per
  // definitie over álle bestemmingen (Poort-0-beslissing 5 uit de slice-spec).
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const scanOnly = body.scan === true;

  const supabase = getServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }
  const accountId = userData.user.id;

  try {
    const required = await requireOutlookConnection(supabase, accountId, { logLabel: 'connections/outlook/cleanup' });
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

    // Vooraf, zonder één Graph-call: een koppeling zonder schrijfrecht krijgt
    // hier een nette "opnieuw koppelen"-melding in plaats van een halve
    // opruimactie (AC7).
    if (!hasWriteScope(scope)) {
      return res.status(409).json({ error: GRAPH_ERROR_MESSAGES.scope_upgrade_required, code: 'scope_upgrade_required' });
    }

    if (scanOnly) {
      const { ids, atLeast } = await scanRitmoEventIds(accessToken, CLEANUP_SCAN_LIMIT);
      return res.status(200).json({ count: ids.length, atLeast });
    }

    const { ids } = await scanRitmoEventIds(accessToken, CLEANUP_DELETE_BATCH);
    const { deleted, failed, scopeIssue } = await deleteRitmoEvents(accessToken, ids);

    if (scopeIssue) {
      const err = new Error('graph_write_forbidden');
      err.status = 403;
      throw err;
    }

    // `more`: de scan raakte de batch-limiet, er is waarschijnlijk meer — de
    // client (CalendarCleanupSection.jsx) herhaalt dan de aanroep.
    return res.status(200).json({ deleted, failed, more: ids.length >= CLEANUP_DELETE_BATCH });
  } catch (err) {
    if (typeof err?.status === 'number') {
      const code = classifyGraphWriteStatus(err.status);
      console.error('connections/outlook/cleanup graph error', err.status, err.message);
      return res.status(code === 'scope_upgrade_required' ? 409 : 502).json({ error: GRAPH_ERROR_MESSAGES[code], code });
    }
    console.error('connections/outlook/cleanup error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
