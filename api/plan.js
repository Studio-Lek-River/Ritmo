// Server-provider-seam voor de planner-AI (S11, Poort-0-besluit 3). Volgt het
// patroon van `api/connections/outlook/events.js`: POST-only, een
// presence-check op de vereiste env vóór alles, JWT via
// `getBearerToken`/`getServiceClient` uit `api/connections/_shared.js`
// (hergebruik, geen kopie). Zolang de AI-env ontbreekt geeft dit endpoint
// altijd `501 { code: 'not_configured' }` terug en valt de client (via
// `src/utils/planProviders/server.js`) terug op de heuristiek — dat is het
// enige gedrag dat deze slice hier vastlegt. Het daadwerkelijk aanroepen van
// Ritmo AI komt in een vervolgslice; dan vult die alleen de body hieronder in
// zonder dit contract (request/response-vorm, foutcodes) te wijzigen.
import { getBearerToken, getServiceClient } from './connections/_shared.js';

// Nog geen echte backend: deze namen zijn gereserveerd voor de latere Ritmo
// AI-service en staan hier alleen zodat `missingPlannerEnv()` iets heeft om
// op te controleren. Ontbreken vandaag altijd, dus dit endpoint blijft tot
// die vervolgslice permanent op `not_configured` staan.
const REQUIRED_PLANNER_ENV = ['RITMO_AI_API_URL', 'RITMO_AI_API_KEY'];

function missingPlannerEnv() {
  return REQUIRED_PLANNER_ENV.filter((name) => !process.env[name]);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingPlannerEnv();
  if (missingEnv.length) {
    console.error('plan missing env:', missingEnv.join(', '));
    return res.status(501).json({ error: 'Ritmo AI is nog niet beschikbaar', code: 'not_configured' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  if (!Array.isArray(body.candidates)) {
    return res.status(400).json({ error: 'Ongeldige aanvraag', code: 'invalid_request' });
  }

  try {
    const supabase = getServiceClient();
    const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
    if (userError || !userData?.user) {
      return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
    }

    // Onbereikbaar zolang REQUIRED_PLANNER_ENV hierboven ontbreekt (altijd
    // vandaag): het echte Ritmo AI-verzoek komt in een vervolgslice.
    return res.status(501).json({ error: 'Ritmo AI is nog niet beschikbaar', code: 'not_configured' });
  } catch (err) {
    console.error('plan error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
