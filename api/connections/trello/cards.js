// Kaarten + lijsten voor de aangevinkte Trello-borden (S08). Eén call per
// bord met nested resources (lijsten zijn nodig als subjects, zie
// trelloModules.js), sequentieel over max 10 borden — ruim binnen Trello's
// 100 req/10s. Een bord dat faalt gaat naar `failedBoardIds`; alleen als
// álle borden falen geeft dit endpoint 502. Nooit de rauwe Trello-payload
// doorgeven, altijd expliciet mappen (zelfde regel als
// api/connections/outlook/events.js).
import {
  getBearerToken,
  getServiceClient,
  missingTrelloEnv,
  requireTrelloConnection,
  classifyTrelloStatus,
  isTrelloRateLimited,
  BOARD_ID_REGEX,
  TRELLO_API_BASE,
} from './_shared.js';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
const MAX_BOARDS_PER_REQUEST = 10;
// Trello's eigen plafond op nested cards binnen een boards-call: een bord met
// meer open kaarten dan dit wordt stil afgekapt. Geen paginering in S08.
const CARD_LIMIT = 1000;

async function fetchBoard(boardId, token) {
  const params = new URLSearchParams({
    fields: 'id,name,shortUrl',
    lists: 'open',
    list_fields: 'id,name',
    cards: 'open',
    card_fields: 'id,name,due,dueComplete,idList,shortUrl',
    card_limit: String(CARD_LIMIT),
    key: process.env.TRELLO_API_KEY,
    token,
  });
  const response = await fetch(`${TRELLO_API_BASE}/boards/${boardId}?${params.toString()}`);
  if (!response.ok) {
    const err = new Error('trello_board_failed');
    err.status = response.status;
    throw err;
  }
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingTrelloEnv();
  if (missingEnv.length) {
    console.error('connections/trello/cards missing env:', missingEnv.join(', '));
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const rawBoardIds = Array.isArray(body.boardIds) ? body.boardIds : [];
  // Ook het path-injectie-hek: een boardId die hier niet aan voldoet komt
  // nooit in een Trello-URL terecht.
  const boardIds = rawBoardIds
    .filter((id) => typeof id === 'string' && BOARD_ID_REGEX.test(id))
    .slice(0, MAX_BOARDS_PER_REQUEST);

  if (boardIds.length === 0) {
    return res.status(200).json({ boards: [], failedBoardIds: [] });
  }

  const supabase = getServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }
  const accountId = userData.user.id;

  if (isTrelloRateLimited('cards', accountId, { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX })) {
    return res.status(429).json({ error: 'Te veel aanvragen. Probeer het straks opnieuw.', code: 'rate_limited' });
  }

  try {
    const { token, error } = await requireTrelloConnection(supabase, accountId);
    if (error) {
      const status = error === 'not_connected' ? 409 : 500;
      return res.status(status).json({ error: 'Trello is niet gekoppeld', code: error });
    }

    const boards = [];
    const failedBoardIds = [];
    let lastFailureStatus = null;

    // Sequentieel, niet Promise.all: houdt de upstream-belasting voorspelbaar
    // (zie de payload-minimalisatie-toelichting in de slice-spec).
    for (const boardId of boardIds) {
      try {
        const raw = await fetchBoard(boardId, token);
        boards.push({
          id: raw.id,
          name: raw.name || '',
          url: raw.shortUrl || '',
          lists: (raw.lists || []).map((list) => ({ id: list.id, name: list.name || '' })),
          cards: (raw.cards || []).map((card) => ({
            id: card.id,
            name: card.name || '',
            due: card.due || null,
            dueComplete: !!card.dueComplete,
            idList: card.idList,
            url: card.shortUrl || '',
          })),
        });
      } catch (err) {
        console.warn('connections/trello/cards board failed', boardId, err.status || err);
        failedBoardIds.push(boardId);
        lastFailureStatus = err.status || lastFailureStatus;
      }
    }

    if (boards.length === 0 && failedBoardIds.length > 0) {
      return res.status(502).json({ error: 'Kon Trello-kaarten niet ophalen', code: classifyTrelloStatus(lastFailureStatus) });
    }

    return res.status(200).json({ boards, failedBoardIds });
  } catch (err) {
    console.error('connections/trello/cards error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
