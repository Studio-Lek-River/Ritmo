// Device-local cache van de opgehaalde GitHub-repo's + toegewezen issues
// (S09). Bewust géén `settings`/`day:`/`household:`-prefix op de cache-key:
// `isUserSyncKey` (src/sync/userDataStorage.js) laat alleen die drie naar het
// account syncen, en `src/utils/backup.js` exporteert alleen die drie.
// Repo-namen en issue-titels blijven zo altijd op het apparaat en komen nooit
// in de cloud of in een geëxporteerd backup-bestand (overgenomen redenering
// uit trelloCache.js:1-9, dat op zijn beurt agendaCache.js als blauwdruk
// gebruikte — niet sourcePrefs.js, waarvan de "nooit gesynchroniseerd"-comment
// feitelijk onjuist is).
const CACHE_KEY = 'github:issues';
const CACHE_VERSION = 1;

// Leest de cache. `null` bij een ontbrekende, onleesbare of andere-`version`
// cache. Geeft ook `null` (en wist de cache) wanneer `connectionId` is
// meegegeven en niet overeenkomt met de cache: na opnieuw koppelen nooit
// andermans repo's tonen. Een ontbrekende `connectionId` (nog onbekend, bv.
// tijdens het laden) telt bewust NIET als mismatch (AC16: repo's staan er
// direct, vóór en zonder netwerk).
export async function readGithubCache(connectionId) {
  let cache;
  try {
    const result = await window.storage.get(CACHE_KEY);
    if (!result?.value) return null;
    cache = JSON.parse(result.value);
  } catch {
    return null;
  }
  if (!cache || cache.version !== CACHE_VERSION) return null;

  if (connectionId && cache.connectionId && cache.connectionId !== connectionId) {
    await clearGithubCache();
    return null;
  }

  return cache;
}

export async function writeGithubCache({ connectionId, fetchedAt, repos }) {
  const payload = {
    version: CACHE_VERSION,
    connectionId: connectionId ?? null,
    fetchedAt: fetchedAt ?? null,
    repos: repos || [],
  };
  await window.storage.set(CACHE_KEY, JSON.stringify(payload));
  return payload;
}

export async function clearGithubCache() {
  await window.storage.delete(CACHE_KEY);
}

// Pure, deterministische merge (zelfde reden als mergeTrelloBoards): een repo
// die dít keer faalde houdt zijn vorige cache-versie in plaats van stil te
// verdwijnen (AC10) — het rooster wordt nooit leeggeveegd door één mislukte
// repo-fetch. `repoIds` bevat `{ id, fullName }`-paren (zie
// githubRepoPrefs.js); alleen `id` is nodig om te matchen, maar deze functie
// accepteert ook kale ids defensief.
export function mergeGithubRepos(previousRepos, repoIds, freshRepos, failedRepoIds) {
  const prevById = new Map((previousRepos || []).map((r) => [r.id, r]));
  const freshById = new Map((freshRepos || []).map((r) => [r.id, r]));
  const failedSet = new Set(failedRepoIds || []);
  const ids = (repoIds || []).map((entry) => (entry && typeof entry === 'object' ? entry.id : entry));

  return ids
    .map((id) => {
      if (freshById.has(id)) return freshById.get(id);
      if (failedSet.has(id) && prevById.has(id)) return prevById.get(id);
      return null;
    })
    .filter(Boolean);
}
