// Kaarten + lijsten voor de aangevinkte Trello-borden (S08). Eén call per
// bord met nested resources (lijsten zijn nodig als subjects, zie
// trelloModules.js), sequentieel over max 10 borden totaal — ruim binnen
// Trello's 100 req/10s. Een bord dat faalt gaat naar `failedBoardIds`; alleen
// als álle borden falen geeft dit endpoint 502. Nooit de rauwe Trello-payload
// doorgeven, altijd expliciet mappen (zelfde regel als
// api/connections/outlook/events.js).
//
// #120: het lichaam wordt `{ boards: [{ connectionId, boardId }] }` (was
// `{ boardIds }`) — elk aangevinkt bord draagt nu ook van welk account het
// komt, want verschillende borden kunnen bij verschillende Trello-accounts
// horen. Gegroepeerd per `connectionId` zodat het token per account maar één
// keer wordt opgehaald. Validatie: de bestaande `BOARD_ID_REGEX` plus een
// UUID-check op `connectionId` (`CONNECTION_ID_REGEX`) en eigenaarschap via
// `requireTrelloConnection` — een onbekende of niet-eigen connectie levert
// nooit een upstream-call op.
import {
  getBearerToken,
  getServiceClient,
  missingTrelloEnv,
  requireTrelloConnection,
  classifyTrelloStatus,
  isTrelloRateLimited,
  BOARD_ID_REGEX,
  CONNECTION_ID_REGEX,
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
  const rawBoards = Array.isArray(body.boards) ? body.boards : [];
  // Ook het path-injectie-hek voor boardId: een waarde die hier niet aan
  // voldoet komt nooit in een Trello-URL terecht. connectionId wordt hier
  // alleen op formaat gecheckt (UUID); eigenaarschap + status controleert
  // `requireTrelloConnection` hieronder vóór elke upstream-call.
  const requestedPairs = rawBoards
    .filter((entry) => entry && typeof entry === 'object'
      && typeof entry.connectionId === 'string' && CONNECTION_ID_REGEX.test(entry.connectionId)
      && typeof entry.boardId === 'string' && BOARD_ID_REGEX.test(entry.boardId))
    .map((entry) => ({ connectionId: entry.connectionId, boardId: entry.boardId }))
    .slice(0, MAX_BOARDS_PER_REQUEST);

  if (requestedPairs.length === 0) {
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
    // Groeperen per connectie: het token van elk account wordt zo maar één
    // keer opgehaald, ongeacht hoeveel van zijn borden zijn aangevinkt.
    const boardIdsByConnection = new Map();
    for (const { connectionId, boardId } of requestedPairs) {
      const list = boardIdsByConnection.get(connectionId) || [];
      list.push(boardId);
      boardIdsByConnection.set(connectionId, list);
    }

    const boards = [];
    const failedBoardIds = [];
    let lastFailureStatus = null;

    // Sequentieel, niet Promise.all: houdt de upstream-belasting voorspelbaar
    // (zie de payload-minimalisatie-toelichting in de slice-spec).
    for (const [connectionId, connectionBoardIds] of boardIdsByConnection) {
      const { token, error } = await requireTrelloConnection(supabase, accountId, connectionId);
      if (error) {
        // Onbekende, niet-eigen of niet-verbonden connectie: nooit een
        // upstream-call, gewoon al zijn aangevinkte borden als mislukt melden.
        failedBoardIds.push(...connectionBoardIds);
        continue;
      }

      for (const boardId of connectionBoardIds) {
        try {
          const raw = await fetchBoard(boardId, token);
          boards.push({
            id: raw.id,
            name: raw.name || '',
            url: raw.shortUrl || '',
            connectionId,
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
