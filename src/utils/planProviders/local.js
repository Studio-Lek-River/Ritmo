// Lokale AI-provider (S11, Poort-0-besluit 2): praat rechtstreeks vanuit de
// browser met een lokaal draaiende Ollama (`POST {baseUrl}/api/chat`),
// desktop-only en opt-in (zie App.jsx/plannerProvider.js — de UI toont deze
// keuze alleen als `isDesktopPlatform()` waar is, en planProviders/index.js
// herhaalt die check als veiligheidsklep). Vraagt de AI nooit om kloktijden,
// alleen om een volgorde plus optionele dagdeel-hints (`applyHints.js` doet
// de plaatsing) — dat maakt een aparte tijd-validatielaag overbodig.
//
// Bekende randvoorwaarde (zie de slice-spec): een https-pagina die
// http://localhost aanroept vereist dat Ollama de origin toestaat
// (`OLLAMA_ORIGINS`), en Chrome's Private Network Access kan een preflight
// eisen. Faalt dat, dan gooit `fetch` gewoon een netwerkfout en valt de
// aanroeper terug op de heuristiek — geen crash.
import { validatePlanHint } from './applyHints';

const REQUEST_TIMEOUT_MS = 15000;

function providerError(code, message) {
  const err = new Error(message || code);
  err.code = code;
  return err;
}

function formatCandidateLine(c) {
  const parts = [`key=${c.key}`, `label="${c.label || c.key}"`, `duur=${c.duration || '?'}min`];
  if (c.window) parts.push(`dagdeel=${c.window}`);
  if (c.deepWork) parts.push('diepwerk');
  return `- ${parts.join(' ')}`;
}

function formatBusyLine(block) {
  if (block.start || block.end) return `- ${block.start || '?'}-${block.end || '?'}: ${block.label || 'agenda'}`;
  return `- ${block.time || '?'} (${block.duration || '?'} min)${block.label ? `: ${block.label}` : ''}`;
}

// Bouwt de prompt uit taaklabels, duur, dagdeel-voorkeur, de al bezette
// tijdvakken (fixed + external) en de S06-afstem-voorkeuren. Vraagt
// uitdrukkelijk om alléén JSON terug te geven (Ollama's `format: 'json'`
// dwingt geldige JSON af, maar niet de vorm daarbinnen — die controleert
// `validatePlanHint`).
export function buildPlannerPrompt({ candidates, fixed, external, prefs }) {
  const tasks = (candidates || []).map(formatCandidateLine).join('\n') || '(geen taken)';
  const busy = [...(fixed || []), ...(external || [])].map(formatBusyLine).join('\n') || '(niets bezet)';
  const prefsText = JSON.stringify(prefs || {});

  return [
    'Je bent de planner-assistent van Ritmo. Bepaal de beste VOLGORDE om de',
    'onderstaande taken in te plannen en geef optioneel per taak een',
    'dagdeel-voorkeur (ochtend, middag of avond). Geef zelf NOOIT kloktijden',
    'terug — een deterministische heuristiek plaatst de taken op basis van',
    'jouw volgorde en hints.',
    '',
    'Antwoord uitsluitend met JSON in exact deze vorm:',
    '{"order": ["<key>", ...], "windowHints": {"<key>": "ochtend|middag|avond"}, "explanation": "<korte toelichting>"}',
    '',
    'Taken:',
    tasks,
    '',
    'Al bezette tijd vandaag:',
    busy,
    '',
    `Voorkeuren: ${prefsText}`,
  ].join('\n');
}

export async function runLocalProvider({ candidates, fixed, external, prefs, config }) {
  const baseUrl = (config?.baseUrl || '').trim();
  const model = (config?.model || '').trim();
  if (!baseUrl || !model) throw providerError('not_configured', 'planner_local_not_configured');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response;
  try {
    response = await fetch(`${baseUrl.replace(/\/+$/, '')}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        stream: false,
        format: 'json',
        messages: [{ role: 'user', content: buildPlannerPrompt({ candidates, fixed, external, prefs }) }],
      }),
    });
  } catch (err) {
    throw providerError(err?.name === 'AbortError' ? 'timeout' : 'network', 'planner_local_request_failed');
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) throw providerError('network', 'planner_local_http_failed');

  const data = await response.json().catch(() => null);
  const content = data?.message?.content;
  let parsed;
  try {
    parsed = typeof content === 'string' ? JSON.parse(content) : content;
  } catch {
    throw providerError('invalid_response', 'planner_local_invalid_json');
  }

  const hint = validatePlanHint(parsed);
  if (!hint) throw providerError('invalid_response', 'planner_local_invalid_shape');
  return hint;
}
