// GitHub-redirect terug naar Ritmo (S09). Spiegelt outlook/callback.js: geen
// Bearer-header (dit is de browser die terugkomt van de consent-pagina).
// Valideert de HMAC-`state` (handtekening + exp, Valkuil 7), wisselt de
// `code` server-side in voor een access-token en bewaart die uitsluitend in
// Vault via connections_set_secret (zet status='connected'). Anders dan
// Outlook: OAuth-App-tokens verlopen niet, dus geen `refresh_token`, geen
// `expires_at`, geen refresh-logica. Eindigt altijd met een 302 terug naar
// het Account-scherm — nooit met een token in de redirect-URL (Valkuil/AC2).
// Zie docs/slices/S09-github-lezen.md.
import {
  getServiceClient,
  missingGithubEnv,
  verifyOAuthState,
  GITHUB_TOKEN_URL,
  GITHUB_API_BASE,
  githubHeaders,
} from './_shared.js';

function redirectTo(res, params) {
  const query = new URLSearchParams(params).toString();
  res.writeHead(302, { Location: `/?${query}` });
  res.end();
}

function redirectSuccess(res) {
  redirectTo(res, { tab: 'account', github: 'connected' });
}

function redirectError(res, reason) {
  redirectTo(res, { tab: 'account', github: 'error', reason });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingGithubEnv();
  if (missingEnv.length) {
    console.error('connections/github/callback missing env:', missingEnv.join(', '));
    return redirectError(res, 'server_config');
  }

  const query = req.query || {};
  const code = typeof query.code === 'string' ? query.code : null;
  const state = typeof query.state === 'string' ? query.state : null;
  const ghError = typeof query.error === 'string' ? query.error : null;

  if (ghError) {
    console.warn('connections/github/callback gh error', ghError, query.error_description);
    return redirectError(res, 'github_auth');
  }

  const statePayload = verifyOAuthState(state);
  if (!statePayload) {
    return redirectError(res, 'invalid_state');
  }

  if (!code) {
    return redirectError(res, 'github_auth');
  }

  const supabase = getServiceClient();

  try {
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('id')
      .eq('account_id', statePayload.account_id)
      .eq('provider', 'github')
      .is('external_account', null)
      .maybeSingle();

    if (fetchError || !connection) {
      console.error('connections/github/callback connection lookup failed', fetchError);
      return redirectError(res, 'not_found');
    }

    // Valkuil 6: GitHub's token-exchange geeft standaard form-encoded terug.
    // Zonder `Accept: application/json` is `tokenData.access_token`
    // `undefined` en zou hier stilzwijgend een kapot secret worden opgeslagen.
    const tokenResponse = await fetch(GITHUB_TOKEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
      },
      body: new URLSearchParams({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GITHUB_OAUTH_REDIRECT_URI,
      }).toString(),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok || tokenData.error || typeof tokenData.access_token !== 'string' || !tokenData.access_token) {
      console.error('connections/github/callback token exchange failed', tokenResponse.status, tokenData.error || tokenData);
      return redirectError(res, 'github_auth');
    }

    const userResponse = await fetch(`${GITHUB_API_BASE}/user`, {
      headers: githubHeaders(tokenData.access_token),
    });
    if (!userResponse.ok) {
      console.error('connections/github/callback /user failed', userResponse.status);
      return redirectError(res, 'github_auth');
    }
    const ghUser = await userResponse.json().catch(() => ({}));
    const login = typeof ghUser.login === 'string' ? ghUser.login : '';

    const secret = JSON.stringify({
      access_token: tokenData.access_token,
      scope: tokenData.scope || '',
      login,
    });

    const { error: rpcError } = await supabase.rpc('connections_set_secret', {
      p_connection_id: connection.id,
      p_secret: secret,
    });

    if (rpcError) {
      console.error('connections/github/callback rpc failed', rpcError);
      return redirectError(res, 'unexpected');
    }

    // Label op de rij = de GitHub-login (AC1: "verbonden" met de login als
    // label). Niet blokkerend: het token staat al veilig in de Vault en de
    // status is al 'connected'; een label-schrijffout is cosmetisch.
    const { error: labelError } = await supabase
      .from('connections')
      .update({ label: login || null })
      .eq('id', connection.id);
    if (labelError) {
      console.error('connections/github/callback label update failed', labelError);
    }

    return redirectSuccess(res);
  } catch (err) {
    console.error('connections/github/callback error', err);
    return redirectError(res, 'unexpected');
  }
}
