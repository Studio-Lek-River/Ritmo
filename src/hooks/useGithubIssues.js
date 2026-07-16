import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchGithubIssues } from '../sync/connections';
import { readGithubCache, writeGithubCache, mergeGithubRepos } from '../utils/githubCache';

// Cache-first GitHub-issuesfetch (S09), structureel gelijk aan
// useTrelloCards.js:
//
// - `active`: mag GitHub überhaupt meedoen (een koppeling die verbonden is
//   of nog laadt). Zodra dit uit gaat wordt `repos` leeggemaakt, zodat een
//   verbroken koppeling nooit wees-projecten kan achterlaten.
// - `enabled`: mag er nu ook echt gefetcht worden (`active` plus minstens
//   één aangevinkte repo, zie AC3 — geen issues-request vóór opt-in per
//   repo).
//
// Het resultaat leeft niet alleen in React-state: bij mount seedt deze hook
// zijn state uit `githubCache.js` (device-local), zodat repo's er al staan
// vóór de eerste fetch en ook zonder netwerk (AC16). Een geslaagde fetch
// merget zijn resultaat zowel naar de cache als naar state
// (`mergeGithubRepos`, puur en deterministisch — een repo die dít keer
// faalde houdt zijn vorige cache-versie); een mislukte fetch laat de state
// ONGEMOEID en zet alleen `error`, zodat een netwerkfout nooit het rooster of
// de projectenlijst leegveegt (AC10). `refetch` laat de aanroeper de huidige
// repo-selectie handmatig opnieuw ophalen ("vernieuwen").
//
// Een gedeelde `requestToken`-ref telt elke fetch-start; alleen de fetch met
// de nieuwste token mag nog state zetten wanneer hij resolvet (zelfde
// race-bescherming als useTrelloCards.js/useOutlookEvents.js).
export default function useGithubIssues({ active, enabled, repoIds, connectionId }) {
  const [repos, setRepos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const requestToken = useRef(0);
  // Spiegelt de laatst bekende (gecachete of gemergede) repos, zodat een
  // geslaagde fetch kan mergen zonder de cache opnieuw van schijf te lezen.
  const cacheReposRef = useRef([]);

  const repoIdsKey = (repoIds || [])
    .map((r) => (r && typeof r === 'object' ? r.id : r))
    .slice()
    .sort()
    .join(',');

  useEffect(() => {
    if (!active) {
      cacheReposRef.current = [];
      setRepos([]);
      setLastSyncedAt(null);
      return () => {};
    }
    let cancelled = false;
    readGithubCache(connectionId).then((cache) => {
      if (cancelled) return;
      const seeded = cache?.repos || [];
      cacheReposRef.current = seeded;
      setRepos(seeded);
      setLastSyncedAt(cache?.fetchedAt || null);
    });
    return () => { cancelled = true; };
  }, [active, connectionId]);

  const fetchIssues = useCallback(() => {
    if (!enabled || !repoIds || repoIds.length === 0) {
      requestToken.current += 1;
      return () => {};
    }

    const token = ++requestToken.current;
    setLoading(true);
    setError(null);

    fetchGithubIssues(repoIds)
      .then((data) => {
        if (requestToken.current !== token) return;
        const merged = mergeGithubRepos(
          cacheReposRef.current,
          repoIds,
          data?.repos || [],
          data?.failedRepoIds || [],
        );
        cacheReposRef.current = merged;
        const fetchedAt = new Date().toISOString();
        setRepos(merged);
        setLastSyncedAt(fetchedAt);
        writeGithubCache({ connectionId, fetchedAt, repos: merged });
      })
      .catch((err) => {
        console.warn('Ritmo github issues fetch failed', err);
        if (requestToken.current === token) {
          setError(err);
        }
      })
      .finally(() => {
        if (requestToken.current === token) setLoading(false);
      });

    return () => { requestToken.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, repoIdsKey, connectionId]);

  useEffect(() => fetchIssues(), [fetchIssues]);

  return { repos, loading, error, lastSyncedAt, refetch: fetchIssues };
}
