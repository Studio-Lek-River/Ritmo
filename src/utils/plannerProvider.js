// Provider-keuze voor "Deel mijn dag in" (S11): device-lokale instelling,
// zelfde patroon als agendaSelection.js/trelloBoardPrefs.js. Bewust géén
// `settings:`/`day:`/`household:`-prefix, om dezelfde reden als die twee
// modules: `isUserSyncKey` (src/sync/userDataStorage.js) en
// src/utils/backup.js kijken alleen naar die drie prefixen, dus deze keuze
// blijft altijd op het apparaat en komt nooit in de cloud-sync of in een
// backup-bestand (AC7) — terecht, want alleen dít apparaat weet of er een
// Ollama op localhost draait.
const PROVIDER_KEY = 'planner:provider';
const PROVIDER_VERSION = 1;

const VALID_PROVIDER_IDS = ['heuristic', 'local', 'server'];

export const DEFAULT_PLANNER_PROVIDER = {
  version: PROVIDER_VERSION,
  providerId: 'heuristic',
  local: { baseUrl: 'http://localhost:11434', model: '' },
};

function normalize(parsed) {
  const providerId = VALID_PROVIDER_IDS.includes(parsed?.providerId) ? parsed.providerId : 'heuristic';
  return {
    version: PROVIDER_VERSION,
    providerId,
    local: {
      baseUrl: typeof parsed?.local?.baseUrl === 'string' ? parsed.local.baseUrl : DEFAULT_PLANNER_PROVIDER.local.baseUrl,
      model: typeof parsed?.local?.model === 'string' ? parsed.local.model : DEFAULT_PLANNER_PROVIDER.local.model,
    },
  };
}

// Veilige default (`heuristic`, identiek aan het gedrag van vóór deze slice)
// bij een ontbrekende, onleesbare of andere-`version` opslag — zelfde
// try/catch-vorm als agendaSelection.js.
export async function readPlannerProvider() {
  try {
    const result = await window.storage.get(PROVIDER_KEY);
    if (!result?.value) return { ...DEFAULT_PLANNER_PROVIDER };
    const parsed = JSON.parse(result.value);
    if (!parsed || parsed.version !== PROVIDER_VERSION) return { ...DEFAULT_PLANNER_PROVIDER };
    return normalize(parsed);
  } catch {
    return { ...DEFAULT_PLANNER_PROVIDER };
  }
}

export async function writePlannerProvider(next) {
  const payload = normalize(next);
  await window.storage.set(PROVIDER_KEY, JSON.stringify(payload));
  return payload;
}
