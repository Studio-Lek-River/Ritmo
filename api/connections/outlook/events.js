// Leest de Outlook-agenda voor een datum-range (S07): verifieert de
// Supabase-JWT, leest het Vault-secret van de aanroeper zijn outlook-
// connection, ververst het access-token server-side indien verlopen
// (grant_type=refresh_token, geroteerde tokens terug via
// connections_set_secret) en roept daarna Microsoft Graph se calendarView
// aan. Geeft een lichte, genormaliseerde event-selectie terug (nooit de
// volledige Graph-payload) en slaat agenda-inhoud nergens op (ephemeer,
// principe 2). Zie docs/slices/S07-outlook-lezen.md.
import {
  getBearerToken,
  getServiceClient,
  missingOutlookEnv,
  MS_TOKEN_URL,
  GRAPH_CALENDARVIEW_URL,
  OUTLOOK_SCOPES,
  TOKEN_REFRESH_MARGIN_SECONDS,
} from './_shared.js';

function classifyGraphStatus(status) {
  if (status === 401 || status === 403) return 'ms_auth';
  if (status === 429) return 'ms_rate_limit';
  return 'ms_error';
}

async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: process.env.MS_CLIENT_ID,
    client_secret: process.env.MS_CLIENT_SECRET,
    refresh_token: refreshToken,
    scope: OUTLOOK_SCOPES,
  });

  const response = await fetch(MS_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error('token_refresh_failed');
    err.status = response.status;
    throw err;
  }
  return data;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  if (missingOutlookEnv()) {
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
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('id, status')
      .eq('account_id', accountId)
      .eq('provider', 'outlook')
      .is('external_account', null)
      .maybeSingle();

    if (fetchError) {
      console.error('connections/outlook/events connection lookup failed', fetchError);
      return res.status(500).json({ error: 'Kon koppeling niet ophalen', code: 'unexpected' });
    }
    if (!connection || connection.status !== 'connected') {
      return res.status(409).json({ error: 'Outlook is niet gekoppeld', code: 'not_connected' });
    }

    const { data: secretRaw, error: secretError } = await supabase.rpc('connections_get_secret', {
      p_connection_id: connection.id,
    });
    if (secretError || !secretRaw) {
      return res.status(409).json({ error: 'Outlook is niet gekoppeld', code: 'not_connected' });
    }

    let secret;
    try {
      secret = JSON.parse(secretRaw);
    } catch {
      console.error('connections/outlook/events secret parse failed');
      return res.status(500).json({ error: 'Ongeldige koppelingsgegevens', code: 'unexpected' });
    }

    let accessToken = secret.access_token;
    let refreshToken = secret.refresh_token;
    let expiresAt = secret.expires_at;
    const nowSeconds = Math.floor(Date.now() / 1000);
    const isExpired = !accessToken || typeof expiresAt !== 'number'
      || expiresAt - TOKEN_REFRESH_MARGIN_SECONDS <= nowSeconds;

    if (isExpired) {
      if (!refreshToken) {
        return res.status(409).json({ error: 'Outlook-koppeling is verlopen', code: 'not_connected' });
      }

      let refreshed;
      try {
        refreshed = await refreshAccessToken(refreshToken);
      } catch (err) {
        console.error('connections/outlook/events refresh failed', err);
        return res.status(502).json({ error: 'Vernieuwen van de koppeling is mislukt', code: 'token_refresh_failed' });
      }

      accessToken = refreshed.access_token;
      refreshToken = refreshed.refresh_token || refreshToken;
      expiresAt = nowSeconds + (Number(refreshed.expires_in) || 0);

      const { error: rotateError } = await supabase.rpc('connections_set_secret', {
        p_connection_id: connection.id,
        p_secret: JSON.stringify({
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_at: expiresAt,
          scope: refreshed.scope || secret.scope || OUTLOOK_SCOPES,
        }),
      });
      if (rotateError) {
        // Niet blokkerend: het zojuist vernieuwde token werkt nu nog steeds
        // voor deze aanroep; een volgende call refresht opnieuw als het
        // wegschrijven weer faalt.
        console.error('connections/outlook/events rotate failed', rotateError);
      }
    }

    const params = new URLSearchParams({
      startDateTime: start,
      endDateTime: end,
      $select: 'id,subject,start,end,isAllDay',
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
    const events = (graphData.value || []).map((event) => ({
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
