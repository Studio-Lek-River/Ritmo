// Verbreekt een koppeling: verifieert de Supabase-JWT van de aanroepende
// gebruiker, verwijdert het bijbehorende Vault-secret en zet de connection-rij
// op status = 'disconnected'. Draait server-side met de service-role-key
// (zie CLAUDE.md / docs/slices/S02-connections-items-model.md); de sleutel komt
// nooit in de browser-bundel terecht.
import { createClient } from '@supabase/supabase-js';

function getBearerToken(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
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

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }

  try {
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('id, account_id')
      .eq('id', connectionId)
      .maybeSingle();

    if (fetchError) {
      console.error('connections/disconnect fetch failed', fetchError);
      return res.status(500).json({ error: 'Kon koppeling niet ophalen', code: 'fetch_failed' });
    }

    if (!connection || connection.account_id !== userData.user.id) {
      return res.status(404).json({ error: 'Koppeling niet gevonden', code: 'not_found' });
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
