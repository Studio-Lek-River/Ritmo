// Server-provider-seam (S11, Poort-0-besluit 3): stuurt dezelfde soort
// payload naar `api/plan.js` als de lokale provider aan Ollama vraagt, via de
// bestaande JWT-fetch-laag (`sync/connections.js`, `fetchServerPlan`). Zolang
// de AI-env op de server ontbreekt geeft dat endpoint altijd
// `501 { code: 'not_configured' }` terug; deze provider vertaalt dat (en elke
// andere fout) naar een `code`d fout zodat planProviders/index.js op de
// heuristiek terugvalt. De latere Ritmo AI hoeft alleen de body van
// `api/plan.js` in te vullen — dit contract blijft dan ongewijzigd.
import { fetchServerPlan } from '../../sync/connections';
import { validatePlanHint } from './applyHints';

function providerError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

export async function runServerProvider({ candidates, fixed, external, prefs }) {
  let data;
  try {
    data = await fetchServerPlan({ candidates, fixed, external, prefs });
  } catch (err) {
    throw providerError(err?.code === 'not_configured' ? 'not_configured' : (err?.code || 'network'), 'planner_server_request_failed');
  }

  const hint = validatePlanHint(data);
  if (!hint) throw providerError('invalid_response', 'planner_server_invalid_shape');
  return hint;
}
