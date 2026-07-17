// Verbreekt een koppeling: verifieert de Supabase-JWT van de aanroepende
// gebruiker, verwijdert het bijbehorende Vault-secret en zet de connection-rij
// op status = 'disconnected'. Draait server-side met de service-role-key
// (zie CLAUDE.md / docs/slices/S02-connections-items-model.md); de sleutel komt
// nooit in de browser-bundel terecht.
import { getBearerToken, getServiceClient } from './_shared.js';
import { TRELLO_API_BASE } from './trello/_shared.js';
import { GITHUB_API_BASE, GITHUB_STATIC_HEADERS } from './github/_shared.js';

// Re-geëxporteerd voor bestaande imports elders in de codebase
// (`getBearerToken` uit `disconnect.js`); de implementatie zelf leeft sinds
// S08 in `_shared.js`.
export { getBearerToken };

// Trekt het Trello-token in bij Trello zelf (S08b). Zonder deze stap vergeet
// Ritmo het token alleen lokaal, terwijl het bij Trello geldig blijft: tokens
// worden aangemaakt met `expiration: 'never'` (trello/start.js), dus de
// autorisatie zou anders eeuwig in het Trello-account blijven staan.
//
// Best-effort: een mislukte revoke (401 = al ingetrokken, netwerkfout,
// ontbrekende TRELLO_API_KEY) mag het verbreken nooit blokkeren. Anders zou een
// dood token de gebruiker opnieuw laten vastlopen op een rij die `connected`
// blijft — precies de bug die S08b oplost.
async function revokeTrelloToken(supabase, connectionId) {
  const key = process.env.TRELLO_API_KEY;
  if (!key) {
    console.warn('connections/disconnect: TRELLO_API_KEY ontbreekt, token niet ingetrokken');
    return;
  }

  try {
    const { data: secretRaw, error } = await supabase.rpc('connections_get_secret', {
      p_connection_id: connectionId,
    });
    if (error || !secretRaw) return;

    const token = JSON.parse(secretRaw)?.token;
    if (typeof token !== 'string' || !token) return;

    const params = new URLSearchParams({ key, token });
    const response = await fetch(`${TRELLO_API_BASE}/tokens/${token}?${params.toString()}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      console.warn('connections/disconnect: Trello revoke gaf status', response.status);
    }
  } catch (err) {
    console.warn('connections/disconnect: Trello revoke mislukt', err);
  }
}

// Trekt het OAuth-App-token in bij GitHub zelf (S09): `DELETE
// /applications/{client_id}/grant` met Basic-auth (client_id:client_secret)
// intrekt de hele grant (dus ook de autorisatie in het GitHub-account van de
// gebruiker), niet alleen dit ene token. Zonder deze stap vergeet Ritmo het
// token alleen lokaal terwijl de autorisatie bij GitHub blijft staan.
//
// Best-effort, zelfde motivatie als revokeTrelloToken: een mislukte revoke
// (ontbrekende env, netwerkfout, al ingetrokken) mag het verbreken nooit
// blokkeren.
async function revokeGithubToken(supabase, connectionId) {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('connections/disconnect: GITHUB_CLIENT_ID/SECRET ontbreekt, token niet ingetrokken');
    return;
  }

  try {
    const { data: secretRaw, error } = await supabase.rpc('connections_get_secret', {
      p_connection_id: connectionId,
    });
    if (error || !secretRaw) return;

    const accessToken = JSON.parse(secretRaw)?.access_token;
    if (typeof accessToken !== 'string' || !accessToken) return;

    const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(`${GITHUB_API_BASE}/applications/${clientId}/grant`, {
      method: 'DELETE',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        ...GITHUB_STATIC_HEADERS,
      },
      body: JSON.stringify({ access_token: accessToken }),
    });

    if (!response.ok && response.status !== 404) {
      console.warn('connections/disconnect: GitHub revoke gaf status', response.status);
    }
  } catch (err) {
    console.warn('connections/disconnect: GitHub revoke mislukt', err);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const body = req.body;
  const connectionId = body && typeof body === 'object' ? body.connectionId : null;
  if (typeof connectionId !== 'string' || connectionId.length === 0) {
    return res.status(400).json({ error: 'Ongeldige aanvraag', code: 'invalid_request' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }

  try {
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('id, account_id, provider')
      .eq('id', connectionId)
      .maybeSingle();

    if (fetchError) {
      console.error('connections/disconnect fetch failed', fetchError);
      return res.status(500).json({ error: 'Kon koppeling niet ophalen', code: 'fetch_failed' });
    }

    if (!connection || connection.account_id !== userData.user.id) {
      return res.status(404).json({ error: 'Koppeling niet gevonden', code: 'not_found' });
    }

    // Vóór het wissen: daarna is het token onleesbaar en dus niet meer in te
    // trekken bij Trello of GitHub.
    if (connection.provider === 'trello') {
      await revokeTrelloToken(supabase, connectionId);
    } else if (connection.provider === 'github') {
      await revokeGithubToken(supabase, connectionId);
    }

    const { error: rpcError } = await supabase.rpc('connections_clear_secret', {
      p_connection_id: connectionId,
    });

    if (rpcError) {
      console.error('connections/disconnect rpc failed', rpcError);
      return res.status(500).json({ error: 'Verbreken mislukt', code: 'disconnect_failed' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('connections/disconnect error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
