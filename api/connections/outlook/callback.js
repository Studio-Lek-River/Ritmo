// Microsoft-redirect terug naar Ritmo (S07): geen Bearer-header (dit is de
// browser die terugkomt van de consent-pagina). Valideert de HMAC-`state`
// (handtekening + exp), wisselt de `code` server-side in voor tokens en
// bewaart die uitsluitend in Vault via connections_set_secret (zet
// status='connected'). Eindigt altijd met een 302 terug naar het
// Account-scherm — nooit met een token in de redirect-URL.
// Zie docs/slices/S07-outlook-lezen.md.
import {
  getServiceClient,
  missingOutlookEnv,
  verifyOAuthState,
  MS_TOKEN_URL,
  OUTLOOK_SCOPES,
} from './_shared.js';

function redirectTo(res, params) {
  const query = new URLSearchParams(params).toString();
  res.writeHead(302, { Location: `/?${query}` });
  res.end();
}

function redirectSuccess(res) {
  redirectTo(res, { tab: 'account', outlook: 'connected' });
}

function redirectError(res, reason) {
  redirectTo(res, { tab: 'account', outlook: 'error', reason });
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingOutlookEnv();
  if (missingEnv.length) {
    console.error('connections/outlook/callback missing env:', missingEnv.join(', '));
    return redirectError(res, 'server_config');
  }

  const query = req.query || {};
  const code = typeof query.code === 'string' ? query.code : null;
  const state = typeof query.state === 'string' ? query.state : null;
  const msError = typeof query.error === 'string' ? query.error : null;

  if (msError) {
    console.warn('connections/outlook/callback ms error', msError, query.error_description);
    return redirectError(res, 'ms_auth');
  }

  const statePayload = verifyOAuthState(state);
  if (!statePayload) {
    return redirectError(res, 'invalid_state');
  }

  if (!code) {
    return redirectError(res, 'ms_auth');
  }

  const supabase = getServiceClient();

  try {
    const { data: connection, error: fetchError } = await supabase
      .from('connections')
      .select('id')
      .eq('account_id', statePayload.account_id)
      .eq('provider', 'outlook')
      .is('external_account', null)
      .maybeSingle();

    if (fetchError || !connection) {
      console.error('connections/outlook/callback connection lookup failed', fetchError);
      return redirectError(res, 'not_found');
    }

    const tokenBody = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: process.env.MS_CLIENT_ID,
      client_secret: process.env.MS_CLIENT_SECRET,
      redirect_uri: process.env.MS_OAUTH_REDIRECT_URI,
      code,
      scope: OUTLOOK_SCOPES,
    });

    const tokenResponse = await fetch(MS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: tokenBody.toString(),
    });
    const tokenData = await tokenResponse.json().catch(() => ({}));

    if (!tokenResponse.ok) {
      console.error('connections/outlook/callback token exchange failed', tokenResponse.status, tokenData);
      return redirectError(res, tokenResponse.status === 429 ? 'ms_rate_limit' : 'ms_auth');
    }

    const nowSeconds = Math.floor(Date.now() / 1000);
    const secret = JSON.stringify({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expires_at: nowSeconds + (Number(tokenData.expires_in) || 0),
      scope: tokenData.scope || OUTLOOK_SCOPES,
    });

    const { error: rpcError } = await supabase.rpc('connections_set_secret', {
      p_connection_id: connection.id,
      p_secret: secret,
    });

    if (rpcError) {
      console.error('connections/outlook/callback rpc failed', rpcError);
      return redirectError(res, 'unexpected');
    }

    return redirectSuccess(res);
  } catch (err) {
    console.error('connections/outlook/callback error', err);
    return redirectError(res, 'unexpected');
  }
}
