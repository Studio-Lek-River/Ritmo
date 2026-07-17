// Start van de GitHub-OAuth-flow (S09). Spiegelt outlook/start.js: verifieert
// de Supabase-JWT van de aanroepende gebruiker, zorgt dat er een
// connections-rij bestaat voor dit account (provider='github',
// external_account=NULL, via de generieke ensureConnectionRow) en geeft een
// `authorizeUrl` terug met een HMAC-ondertekende `state` (CSRF, Valkuil 7 in
// de slice-spec: dit is de enige bescherming tussen start.js en callback.js).
// Draait server-side met de service-role-key; die komt nooit in de
// browser-bundel terecht. Zie docs/slices/S09-github-lezen.md.
import {
  getBearerToken,
  getServiceClient,
  missingGithubEnv,
  ensureConnectionRow,
  signOAuthState,
  GITHUB_AUTHORIZE_URL,
  GITHUB_SCOPES,
} from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingGithubEnv();
  if (missingEnv.length) {
    console.error('connections/github/start missing env:', missingEnv.join(', '));
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const supabase = getServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }

  const accountId = userData.user.id;

  try {
    const { error: ensureError } = await ensureConnectionRow(supabase, accountId, 'github');
    if (ensureError) {
      console.error('connections/github/start ensure row failed', ensureError);
      return res.status(500).json({ error: 'Kon koppeling niet voorbereiden', code: 'unexpected' });
    }

    const state = signOAuthState({ accountId });
    const params = new URLSearchParams({
      client_id: process.env.GITHUB_CLIENT_ID,
      redirect_uri: process.env.GITHUB_OAUTH_REDIRECT_URI,
      scope: GITHUB_SCOPES,
      state,
    });

    return res.status(200).json({ authorizeUrl: `${GITHUB_AUTHORIZE_URL}?${params.toString()}` });
  } catch (err) {
    console.error('connections/github/start error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
