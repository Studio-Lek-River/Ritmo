// Lijst van open Trello-borden voor de bord-kiezer (S08, TrelloBoardPicker).
// Bewust géén lijsten/kaarten hier (`lists=none`): dit endpoint vult alleen de
// checkbox-lijst; lijsten + kaarten komen pas via cards.js zodra een bord is
// aangevinkt (opt-in, zie AC5 in de slice-spec). Nooit de rauwe Trello-payload
// doorgeven, altijd expliciet mappen.
import {
  getBearerToken,
  getServiceClient,
  missingTrelloEnv,
  requireTrelloConnection,
  classifyTrelloStatus,
  isTrelloRateLimited,
  TRELLO_API_BASE,
} from './_shared.js';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingTrelloEnv();
  if (missingEnv.length) {
    console.error('connections/trello/boards missing env:', missingEnv.join(', '));
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

  if (isTrelloRateLimited('boards', accountId, { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX })) {
    return res.status(429).json({ error: 'Te veel aanvragen. Probeer het straks opnieuw.', code: 'rate_limited' });
  }

  try {
    const { connection, token, error } = await requireTrelloConnection(supabase, accountId);
    if (error) {
      const status = error === 'not_connected' ? 409 : 500;
      return res.status(status).json({ error: 'Trello is niet gekoppeld', code: error });
    }
    void connection;

    const params = new URLSearchParams({
      filter: 'open',
      fields: 'id,name,shortUrl',
      lists: 'none',
      key: process.env.TRELLO_API_KEY,
      token,
    });
    const boardsResponse = await fetch(`${TRELLO_API_BASE}/members/me/boards?${params.toString()}`);

    if (!boardsResponse.ok) {
      const errText = await boardsResponse.text().catch(() => '');
      console.error('connections/trello/boards upstream failed', boardsResponse.status, errText);
      return res.status(502).json({ error: 'Kon Trello-borden niet ophalen', code: classifyTrelloStatus(boardsResponse.status) });
    }

    const raw = await boardsResponse.json().catch(() => []);
    const boards = (Array.isArray(raw) ? raw : []).map((board) => ({
      id: board.id,
      name: board.name || '',
      url: board.shortUrl || '',
    }));

    return res.status(200).json({ boards });
  } catch (err) {
    console.error('connections/trello/boards error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
