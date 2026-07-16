// Start van de Outlook-OAuth-flow (S07, authority `consumers`): verifieert de
// Supabase-JWT van de aanroepende gebruiker, zorgt dat er een connections-rij
// bestaat voor dit account (provider='outlook', external_account=NULL) en
// geeft een `authorizeUrl` terug met een HMAC-ondertekende `state` (CSRF).
// Draait server-side met de service-role-key; die komt nooit in de
// browser-bundel terecht. Zie docs/slices/S07-outlook-lezen.md.
import {
  getBearerToken,
  getServiceClient,
  missingOutlookEnv,
  signOAuthState,
  ensureConnectionRow,
  MS_AUTHORIZE_URL,
  OUTLOOK_SCOPES,
} from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingOutlookEnv();
  if (missingEnv.length) {
    console.error('connections/outlook/start missing env:', missingEnv.join(', '));
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    console.error('connections/outlook/start no bearer token on request');
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const supabase = getServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    console.error(
      'connections/outlook/start getUser failed:',
      userError?.status || '', userError?.message || userError || '(no error object)',
      '| has user:', !!userData?.user,
    );
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }

  const accountId = userData.user.id;

  try {
    const { error: ensureError } = await ensureConnectionRow(supabase, accountId, 'outlook');
    if (ensureError) {
      console.error('connections/outlook/start ensure row failed', ensureError);
      return res.status(500).json({ error: 'Kon koppeling niet voorbereiden', code: 'unexpected' });
    }

    const state = signOAuthState({ accountId });
    const params = new URLSearchParams({
      client_id: process.env.MS_CLIENT_ID,
      redirect_uri: process.env.MS_OAUTH_REDIRECT_URI,
      response_type: 'code',
      response_mode: 'query',
      scope: OUTLOOK_SCOPES,
      state,
    });

    return res.status(200).json({ authorizeUrl: `${MS_AUTHORIZE_URL}?${params.toString()}` });
  } catch (err) {
    console.error('connections/outlook/start error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
