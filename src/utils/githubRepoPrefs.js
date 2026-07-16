// Per-repo GitHub-voorkeuren: telt deze repo mee in de planner (`include`).
// Geen altijd-lijst-concept zoals Trello (GitHub-issues hebben geen lijsten);
// aanvinken is bij GitHub de enige opt-in (Poort-0-beslissing 3).
//
// Bewust géén `settings`/`day:`/`household:`-prefix (zelfde reden als
// trelloBoardPrefs.js/trelloCache.js): dit blijft altijd device-local.
//
// De opslagsleutel per repo is de numerieke GitHub-repo-id (stabiel bij
// hernoemen); `fullName` ("owner/repo") staat er los naast omdat de server
// die nodig heeft om de GitHub-URL te bouwen (zie
// api/connections/github/issues.js, REPO_FULL_NAME_REGEX) en omdat de naam
// na een hernoeming kan verouderen zonder de checkbox-status te verliezen.
const PREFS_KEY = 'github:repoPrefs';
const PREFS_VERSION = 1;

const EMPTY_PREF = { include: false, fullName: null };

// Leest de voorkeuren. `{ repos: {} }` bij een ontbrekende, onleesbare of
// andere-`version` cache — de veilige kant, want "niets aangevinkt" betekent
// gewoon dat er geen GitHub-projecten worden afgeleid. Een `connectionId`-
// mismatch wist de voorkeuren; een ontbrekende `connectionId` telt bewust
// niet als mismatch (zelfde reden als trelloBoardPrefs.js).
export async function readGithubRepoPrefs(connectionId) {
  let parsed;
  try {
    const result = await window.storage.get(PREFS_KEY);
    if (!result?.value) return { repos: {} };
    parsed = JSON.parse(result.value);
  } catch {
    return { repos: {} };
  }
  if (!parsed || parsed.version !== PREFS_VERSION) return { repos: {} };

  if (connectionId && parsed.connectionId && parsed.connectionId !== connectionId) {
    await clearGithubRepoPrefs();
    return { repos: {} };
  }

  return { repos: parsed.repos || {} };
}

export async function writeGithubRepoPrefs({ connectionId, repos }) {
  const payload = {
    version: PREFS_VERSION,
    connectionId: connectionId ?? null,
    repos: repos || {},
  };
  await window.storage.set(PREFS_KEY, JSON.stringify(payload));
  return payload;
}

export async function clearGithubRepoPrefs() {
  await window.storage.delete(PREFS_KEY);
}

// Merge met de default zodat een ontbrekende repo nooit `undefined`
// teruggeeft (zelfde patroon als getBoardPref/getSourcePref).
export function getRepoPref(repoPrefs, repoId) {
  return { ...EMPTY_PREF, ...(repoPrefs?.repos?.[repoId] || {}) };
}

// `{ id, fullName }`-paren van alle aangevinkte repo's (`include: true`) —
// de lijst die naar fetchGithubIssues/useGithubIssues gaat. `id` is de
// opslagsleutel, `fullName` de waarde die de server tegen
// REPO_FULL_NAME_REGEX valideert vóór hij hem in een GitHub-URL gebruikt.
export function includedRepoIds(repoPrefs) {
  const repos = repoPrefs?.repos || {};
  return Object.keys(repos)
    .filter((id) => repos[id]?.include)
    .map((id) => ({ id, fullName: repos[id].fullName || null }));
}
