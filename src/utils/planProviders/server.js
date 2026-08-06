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

// `callApi` (sync/connections.js) kan `err.code` zetten op `server_config`
// (sync uitgeschakeld), `unauthenticated` (geen sessie of verlopen token), of
// een server-`code` van `api/plan.js` (`not_configured`, maar ook
// `unexpected`/`invalid_request`/`method_not_allowed` die hier niet verwacht
// worden). Alleen codes die de `planner.provider.reasons`-dictionary
// (nl.js/en.js) kent mogen als `fallbackReason` naar buiten — de rest wordt
// hier al `'unknown'`. `planWithProvider` (index.js) herhaalt deze whitelist
// als laatste garantie, zodat geen enkele provider (ook een toekomstige) ooit
// een onbekende code kan laten lekken.
const KNOWN_REASON_CODES = new Set(['not_configured', 'unauthenticated', 'server_config']);

function classifyError(err) {
  // Geen `code`: `fetch` zelf gooide (bv. offline), dus geen server-antwoord.
  if (!err?.code) return 'network';
  return KNOWN_REASON_CODES.has(err.code) ? err.code : 'unknown';
}

export async function runServerProvider({ candidates, fixed, external, prefs }) {
  let data;
  try {
    data = await fetchServerPlan({ candidates, fixed, external, prefs });
  } catch (err) {
    throw providerError(classifyError(err), 'planner_server_request_failed');
  }

  const hint = validatePlanHint(data);
  if (!hint) throw providerError('invalid_response', 'planner_server_invalid_shape');
  return hint;
}
