// Lijst van open Trello-borden voor de bord-kiezer (S08, TrelloBoardPicker).
// Bewust géén lijsten/kaarten hier (`lists=none`): dit endpoint vult alleen de
// checkbox-lijst; lijsten + kaarten komen pas via cards.js zodra een bord is
// aangevinkt (opt-in, zie AC5 in de slice-spec). Nooit de rauwe Trello-payload
// doorgeven, altijd expliciet mappen.
//
// #120: fant uit over ÁLLE verbonden Trello-rijen van dit account
// (`listConnectedRows`, inclusief een eventuele legacy-rij met
// `external_account IS NULL` — een koppeling van vóór deze slice blijft zo
// werken zonder opnieuw te koppelen), elk bord opgehaald met het token van
// zijn eigen account. Een bord dat onder twee accounts zichtbaar is
// verschijnt één keer (dedupe op board-id, eerste connectie wint), zodat
// hetzelfde bord nooit twee keer in de planner belandt. 502 alleen als álle
// accounts falen — zelfde vorm als de per-bord-afhandeling in cards.js.
import {
  getBearerToken,
  getServiceClient,
  missingTrelloEnv,
  listConnectedRows,
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
    const { connections: rows, error: listError } = await listConnectedRows(supabase, accountId, 'trello');
    if (listError) {
      console.error('connections/trello/boards list failed', listError);
      return res.status(500).json({ error: 'Kon Trello-koppelingen niet ophalen', code: 'unexpected' });
    }

    if (rows.length === 0) {
      return res.status(409).json({ error: 'Trello is niet gekoppeld', code: 'not_connected' });
    }

    // Eén regel per verbonden account (naam voor de bord-kiezer), ongeacht of
    // het ophalen van zijn borden hierna lukt — zo blijft de account-groep
    // zichtbaar in de UI ook wanneer dit account tijdelijk faalt (AC8).
    const accounts = rows.map((row) => ({ connectionId: row.id, label: row.label || '' }));
    const boardsById = new Map();
    const failedConnectionIds = [];
    let lastFailureStatus = null;

    for (const row of rows) {
      const { token, error } = await requireTrelloConnection(supabase, accountId, row.id);
      if (error) {
        failedConnectionIds.push(row.id);
        continue;
      }

      const params = new URLSearchParams({
        filter: 'open',
        fields: 'id,name,shortUrl',
        lists: 'none',
        key: process.env.TRELLO_API_KEY,
        token,
      });

      try {
        const boardsResponse = await fetch(`${TRELLO_API_BASE}/members/me/boards?${params.toString()}`);
        if (!boardsResponse.ok) {
          const errText = await boardsResponse.text().catch(() => '');
          console.warn('connections/trello/boards upstream failed', row.id, boardsResponse.status, errText);
          failedConnectionIds.push(row.id);
          lastFailureStatus = boardsResponse.status;
          continue;
        }

        const raw = await boardsResponse.json().catch(() => []);
        for (const board of (Array.isArray(raw) ? raw : [])) {
          // Dedupe op board-id: hetzelfde bord onder twee accounts mag nooit
          // twee keer in de kiezer/planner belanden (AC7). De eerste
          // connectie die het bord levert "wint".
          if (boardsById.has(board.id)) continue;
          boardsById.set(board.id, {
            id: board.id,
            name: board.name || '',
            url: board.shortUrl || '',
            connectionId: row.id,
          });
        }
      } catch (err) {
        console.warn('connections/trello/boards fetch failed', row.id, err);
        failedConnectionIds.push(row.id);
      }
    }

    if (failedConnectionIds.length === rows.length) {
      return res.status(502).json({ error: 'Kon Trello-borden niet ophalen', code: classifyTrelloStatus(lastFailureStatus) });
    }

    return res.status(200).json({ accounts, boards: Array.from(boardsById.values()), failedConnectionIds });
  } catch (err) {
    console.error('connections/trello/boards error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
