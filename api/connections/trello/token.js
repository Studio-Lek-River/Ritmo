// Slaat een geplakt Trello-token op (S08, key+token-flow, geen OAuth). Valideert
// eerst het formaat (32-128 alfanumeriek), dan tegen Trello zelf
// (GET /1/members/me) — die call bewijst dat het token bij TRELLO_API_KEY hoort
// en levert de member-id (om de juiste connections-rij te bepalen, #120) en de
// gebruikersnaam voor het `label` en de toast op. Faalt de validatie, dan raakt
// dit endpoint geen enkele rij aan: een verkeerde plak-poging mag een werkende
// koppeling nooit slopen. `connections_set_secret` zet zelf al status='connected'
// (S02-RPC, ongewijzigd).
//
// #120: bepaalt de rij zelf (`resolveTrelloConnectionRow`, zie trello/_shared.js)
// in plaats van de ene rij van `ensureTrelloConnectionRow` te hergebruiken —
// meerdere Trello-accounts naast elkaar betekent dat elk account zijn eigen
// rij krijgt, onderscheiden door de member-id.
import {
  getBearerToken,
  getServiceClient,
  missingTrelloEnv,
  resolveTrelloConnectionRow,
  classifyTrelloStatus,
  isTrelloRateLimited,
  TOKEN_FORMAT_REGEX,
  TRELLO_API_BASE,
} from './_shared.js';

// Eén geheim per aanvraag: een kleinere marge dan boards.js/cards.js omdat
// token.js een secret accepteert (zie de rate-limit-comment in _shared.js).
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 5;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingTrelloEnv();
  if (missingEnv.length) {
    console.error('connections/trello/token missing env:', missingEnv.join(', '));
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const token = typeof body.token === 'string' ? body.token.trim() : '';

  const supabase = getServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }
  const accountId = userData.user.id;

  if (isTrelloRateLimited('token', accountId, { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX })) {
    return res.status(429).json({ error: 'Te veel pogingen. Probeer het straks opnieuw.', code: 'rate_limited' });
  }

  if (!TOKEN_FORMAT_REGEX.test(token)) {
    return res.status(400).json({ error: 'Ongeldig tokenformaat', code: 'invalid_token_format' });
  }

  try {
    // Eerst valideren tegen Trello, dan pas de rij bepalen: `members/me`
    // levert de member-id op waarmee `resolveTrelloConnectionRow` de juiste
    // rij vindt of aanmaakt (#120). Faalt de validatie, dan raakt dit
    // endpoint géén rij aan (geen `ensure`/`resolve`-call vooraf meer nodig).
    const params = new URLSearchParams({
      fields: 'id,username,fullName',
      key: process.env.TRELLO_API_KEY,
      token,
    });
    const memberResponse = await fetch(`${TRELLO_API_BASE}/members/me?${params.toString()}`);

    if (!memberResponse.ok) {
      // Faalt de validatie: geen enkele rij wordt aangeraakt, zodat een
      // verkeerde plak-poging een bestaande koppeling nooit sloopt.
      const errText = await memberResponse.text().catch(() => '');
      console.warn('connections/trello/token member validation failed', memberResponse.status, errText);
      return res.status(502).json({ error: 'Kon het Trello-token niet valideren', code: classifyTrelloStatus(memberResponse.status) });
    }

    const member = await memberResponse.json().catch(() => ({}));
    const memberId = typeof member.id === 'string' ? member.id : '';
    const username = typeof member.username === 'string' ? member.username : '';
    const fullName = typeof member.fullName === 'string' ? member.fullName : '';

    if (!memberId) {
      console.error('connections/trello/token member response missing id', member);
      return res.status(502).json({ error: 'Kon het Trello-token niet valideren', code: 'trello_error' });
    }

    const { connection, error: resolveError } = await resolveTrelloConnectionRow(supabase, accountId, {
      memberId,
      username,
    });
    if (resolveError) {
      console.error('connections/trello/token resolve row failed', resolveError);
      return res.status(500).json({ error: 'Kon koppeling niet voorbereiden', code: 'unexpected' });
    }

    const { error: rpcError } = await supabase.rpc('connections_set_secret', {
      p_connection_id: connection.id,
      p_secret: JSON.stringify({ token, username, fullName }),
    });
    if (rpcError) {
      console.error('connections/trello/token rpc failed', rpcError);
      return res.status(500).json({ error: 'Opslaan van het token is mislukt', code: 'unexpected' });
    }

    const { error: labelError } = await supabase
      .from('connections')
      .update({ label: username || fullName || null })
      .eq('id', connection.id);
    if (labelError) {
      // Niet blokkerend: het token staat al veilig in de Vault en de status
      // is al 'connected'; een label-schrijffout is cosmetisch.
      console.error('connections/trello/token label update failed', labelError);
    }

    return res.status(200).json({ ok: true, account: { username, fullName } });
  } catch (err) {
    console.error('connections/trello/token error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
