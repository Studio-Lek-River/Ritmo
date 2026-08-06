// Leest de Outlook-agenda voor een datum-range (S07): verifieert de
// Supabase-JWT, leest het Vault-secret van de aanroeper zijn outlook-
// connection, ververst het access-token server-side indien verlopen (via de
// gedeelde `requireOutlookConnection`, S12) en roept daarna Microsoft Graph
// se calendarView aan. Geeft een lichte, genormaliseerde event-selectie
// terug (nooit de volledige Graph-payload) en slaat agenda-inhoud nergens op
// (ephemeer, principe 2). Zie docs/slices/S07-outlook-lezen.md.
//
// S12: laat events met de categorie "Ritmo" weg — dat zijn blokken die
// write.js zelf heeft geschreven. Bewust een filter op `categories` (zacht,
// goedkoop in dit hete leespad) en niet op de extended property (hard, zou
// een `$expand` vergen die deze bestaande queryvorm niet breekt maar ook niet
// nodig heeft): een vals-positief hier laat hooguit een blok verkeerd weg uit
// de leesweergave, nooit een verwijdering.
import {
  getBearerToken,
  getServiceClient,
  missingOutlookEnv,
  GRAPH_CALENDARVIEW_URL,
  RITMO_CATEGORY,
  requireOutlookConnection,
} from './_shared.js';

function classifyGraphStatus(status) {
  if (status === 401 || status === 403) return 'ms_auth';
  if (status === 429) return 'ms_rate_limit';
  return 'ms_error';
}

function connectionErrorResponse(error) {
  if (error === 'token_refresh_failed') {
    return { status: 502, body: { error: 'Vernieuwen van de koppeling is mislukt', code: 'token_refresh_failed' } };
  }
  if (error === 'not_connected') {
    return { status: 409, body: { error: 'Outlook is niet gekoppeld', code: 'not_connected' } };
  }
  return { status: 500, body: { error: 'Kon koppeling niet ophalen', code: 'unexpected' } };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingOutlookEnv();
  if (missingEnv.length) {
    console.error('connections/outlook/events missing env:', missingEnv.join(', '));
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { start, end, timeZone } = body;
  if (typeof start !== 'string' || typeof end !== 'string') {
    return res.status(400).json({ error: 'Ongeldige aanvraag', code: 'invalid_request' });
  }

  const supabase = getServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }
  const accountId = userData.user.id;

  try {
    const required = await requireOutlookConnection(supabase, accountId, { logLabel: 'connections/outlook/events' });
    if (required.error) {
      const { status, body: errBody } = connectionErrorResponse(required.error);
      return res.status(status).json(errBody);
    }
    const { accessToken } = required;

    const params = new URLSearchParams({
      startDateTime: start,
      endDateTime: end,
      $select: 'id,subject,start,end,isAllDay,categories',
      $orderby: 'start/dateTime',
      $top: '250',
    });

    const graphHeaders = { Authorization: `Bearer ${accessToken}` };
    if (typeof timeZone === 'string' && timeZone.trim().length > 0) {
      graphHeaders['Prefer'] = `outlook.timezone="${timeZone.trim()}"`;
    }

    const graphResponse = await fetch(`${GRAPH_CALENDARVIEW_URL}?${params.toString()}`, {
      headers: graphHeaders,
    });

    if (!graphResponse.ok) {
      const errText = await graphResponse.text().catch(() => '');
      console.error('connections/outlook/events graph failed', graphResponse.status, errText);
      return res.status(502).json({ error: 'Kon Outlook-agenda niet ophalen', code: classifyGraphStatus(graphResponse.status) });
    }

    const graphData = await graphResponse.json().catch(() => ({}));
    const events = (graphData.value || [])
      // Ritmo's eigen geschreven blokken nooit als externe afspraak tonen
      // (S12, dubbeltel-risico laag 2 uit de slice-spec).
      .filter((event) => !(event.categories || []).includes(RITMO_CATEGORY))
      .map((event) => ({
        id: event.id,
        subject: event.subject || '',
        start: event.start,
        end: event.end,
        isAllDay: !!event.isAllDay,
      }));

    return res.status(200).json({ events });
  } catch (err) {
    console.error('connections/outlook/events error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
