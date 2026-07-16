// Bouwt GitHub-repo's om tot afgeleide `projects`-modules (S09, spiegelt
// trelloModules.js). Puur en deterministisch: dezelfde `cache`+`prefs` geven
// altijd exact dezelfde modules terug, en dit bestand schrijft zelf NOOIT
// naar opslag (AC15) — het wordt bij elke render opnieuw afgeleid, dus er is
// geen merge en geen wees-data mogelijk. Repo -> module, aan de gebruiker
// toegewezen issues -> subgoals (Poort-0-beslissing 2), met deterministische
// ids zodat een bulk-import in één tick nooit botst (zie trelloModules.js).
//
// Alleen repo's die zowel in `prefs` zijn aangevinkt (`include: true`) als in
// `cache` aanwezig zijn leveren een module op: een aangevinkte maar nog niet
// opgehaalde repo (cache leeg/verouderd) levert simpelweg niets op totdat
// useGithubIssues hem heeft opgehaald — nooit een module met lege/rare data.
import { fmtDateKey } from './dates';
import { getRepoPref } from './githubRepoPrefs';

// GitHub's `milestone.due_on` is een volledige UTC-ISO-timestamp, net als
// Trello's `due` (en anders dan Microsoft Graph, dat via de `Prefer`-header
// al wall-clock levert) — zie Valkuil 3 in de slice-spec. Een issue die om
// 23:00 UTC vervalt hoort in Amsterdam op de volgende lokale dag, dus de
// `deadline` gaat via de LOKALE tijdzone, exact als dueToDeadline in
// trelloModules.js. Niet "fixen" naar UTC-only — dat zou de dag hier juist
// verkeerd maken.
function dueToDeadline(dueOn) {
  if (!dueOn) return null;
  const date = new Date(dueOn);
  if (Number.isNaN(date.getTime())) return null;
  return fmtDateKey(date);
}

function buildSubgoal(issue) {
  const isOpen = issue.state === 'open';
  return {
    id: `github:issue:${issue.id}`,
    label: `#${issue.number} ${issue.title}`,
    completed: !isOpen,
    // Ontwerppunt 2 in de slice-spec: alleen open issues zijn planbaar
    // (AC5: gesloten issues worden NOOIT ingepland). De planner-gate
    // (App.jsx) en de Vandaag-feed (dayTimeline.js) laten iets door zodra
    // `freeBlock` óf `deadline === vandaag` waar is en kijken zelf niet naar
    // `completed` — dus `deadline` mag hier net zo min als `freeBlock` op een
    // gesloten issue staan, anders komt een gesloten issue met een
    // milestone die vandaag vervalt tóch als kandidaat binnen. Beide velden
    // blijven daarom samen weg bij een gesloten issue.
    ...(isOpen ? { freeBlock: true, deadline: dueToDeadline(issue.dueOn) } : {}),
    autoPlan: true,
    grade: null,
    url: issue.url || null,
  };
}

function buildRepoModule(repo, { connectionId, color }) {
  return {
    id: `github:repo:${repo.id}`,
    type: 'projects',
    name: repo.fullName || '',
    icon: 'Github',
    color,
    enabled: true,
    source: { provider: 'github', connectionId: connectionId ?? null, url: repo.url || null },
    // Eén subject per repo dat `owner/repo` heet (niet de module-naam
    // hergebruiken als toeval): de progress-sleutel in normalizedItems.js
    // (`sourceProjectKey`) draait op de subject-naam, niet de module-naam —
    // zie "De progress-sleutel" in de slice-spec. `normalizedItems.js` zelf
    // blijft in S09 ongemoeid (dat activeren is de S10-vraag), maar de naam
    // ligt hier al goed.
    subjects: [{
      id: `github:repo:${repo.id}:issues`,
      name: repo.fullName || '',
      subgoals: (repo.issues || []).map(buildSubgoal),
    }],
  };
}

export function buildGithubModules(cache, prefs, { connectionId, color } = {}) {
  const repos = cache?.repos || [];
  return repos
    .map((repo) => {
      const repoPref = getRepoPref(prefs, repo.id);
      if (!repoPref.include) return null;
      return buildRepoModule(repo, { connectionId, color });
    })
    .filter(Boolean);
}
