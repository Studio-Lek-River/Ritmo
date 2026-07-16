// Start van de Trello-koppeling (S08). Geen OAuth (Trello ondersteunt geen
// OAuth 2.0 en Ritmo gebruikt ook geen OAuth 1.0a): dit endpoint bouwt alleen
// de authorize-URL server-side, omdat TRELLO_API_KEY server-only is en de
// frontend de link dus niet zelf kan samenstellen. Verzekert de
// connections-rij (provider='trello', external_account=NULL); status blijft
// 'disconnected' tot token.js een geldig token opslaat. Zie
// docs/slices/S08-trello-lezen.md, Poort-0-beslissing 1.
import {
  getBearerToken,
  getServiceClient,
  missingTrelloEnv,
  ensureTrelloConnectionRow,
  TRELLO_AUTHORIZE_URL,
} from './_shared.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingTrelloEnv();
  if (missingEnv.length) {
    console.error('connections/trello/start missing env:', missingEnv.join(', '));
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

  try {
    const { error } = await ensureTrelloConnectionRow(supabase, userData.user.id);
    if (error) {
      console.error('connections/trello/start ensure row failed', error);
      return res.status(500).json({ error: 'Kon koppeling niet voorbereiden', code: 'unexpected' });
    }

    // Geen `return_url`: Trello toont het token dan zelf op een pagina in
    // plaats van het naar een callback te redirecten. Zo komt het token nooit
    // in een URL, fragment of browsergeschiedenis van Ritmo (Poort-0).
    const params = new URLSearchParams({
      key: process.env.TRELLO_API_KEY,
      scope: 'read',
      expiration: 'never',
      response_type: 'token',
    });

    return res.status(200).json({ authorizeUrl: `${TRELLO_AUTHORIZE_URL}?${params.toString()}` });
  } catch (err) {
    console.error('connections/trello/start error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
