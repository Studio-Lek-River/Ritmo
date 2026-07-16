// Toegewezen issues voor de aangevinkte repo's (S09). Eén call per repo
// (`GET /repos/{owner}/{repo}/issues?assignee=<login>&state=all&...`),
// sequentieel zoals trello/cards.js:92-126 (niet Promise.all, dat houdt de
// upstream-belasting voorspelbaar). Een repo die faalt gaat naar
// `failedRepoIds`; alleen als álle repo's falen geeft dit endpoint 502. Nooit
// de rauwe GitHub-payload doorgeven, altijd expliciet mappen.
//
// `repoIds` in de request body zijn `{ id, fullName }`-paren: `id` is de
// numerieke, hernoem-bestendige sleutel uit githubRepoPrefs.js (puur voor
// module-ids en cache-matching), `fullName` ("owner/repo") is wat de server
// nodig heeft om de GitHub-URL te bouwen en wordt daarom vóór gebruik tegen
// REPO_FULL_NAME_REGEX gevalideerd (het path-injectie-hek — clientinvoer, dus
// niet zomaar vertrouwd, ook al komt de waarde oorspronkelijk uit repos.js).
//
// Voortgang per repo is dus die van het gevolgde venster: de 100 recentst
// bijgewerkte toegewezen issues per repo (`per_page=100`, geen paginering in
// S09) — een bewuste grens, geen omissie (zie "Twee ontwerppunten die niet
// uit het S08-patroon volgen" in de slice-spec).
import {
  getBearerToken,
  getServiceClient,
  missingGithubEnv,
  requireGithubConnection,
  classifyGithubStatus,
  isGithubRateLimited,
  githubHeaders,
  REPO_FULL_NAME_REGEX,
  GITHUB_API_BASE,
} from './_shared.js';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;
// Zelfde soort veiligheidsgrens als trello/cards.js' MAX_BOARDS_PER_REQUEST:
// begrenst de upstream-belasting per aanvraag.
const MAX_REPOS_PER_REQUEST = 10;

async function fetchAssignedIssues(fullName, login, token) {
  const params = new URLSearchParams({
    assignee: login,
    state: 'all',
    sort: 'updated',
    direction: 'desc',
    per_page: '100',
  });
  const response = await fetch(`${GITHUB_API_BASE}/repos/${fullName}/issues?${params.toString()}`, {
    headers: githubHeaders(token),
  });
  if (!response.ok) {
    const err = new Error('github_repo_failed');
    err.status = response.status;
    err.headers = response.headers;
    throw err;
  }
  return response.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingGithubEnv();
  if (missingEnv.length) {
    console.error('connections/github/issues missing env:', missingEnv.join(', '));
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const rawRepoIds = Array.isArray(body.repoIds) ? body.repoIds : [];
  const repoIds = rawRepoIds
    .filter((entry) => entry
      && (typeof entry.id === 'string' || typeof entry.id === 'number') && String(entry.id).length > 0
      && typeof entry.fullName === 'string' && REPO_FULL_NAME_REGEX.test(entry.fullName))
    .slice(0, MAX_REPOS_PER_REQUEST);

  if (repoIds.length === 0) {
    return res.status(200).json({ repos: [], failedRepoIds: [] });
  }

  const supabase = getServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }
  const accountId = userData.user.id;

  if (isGithubRateLimited('issues', accountId, { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX })) {
    return res.status(429).json({ error: 'Te veel aanvragen. Probeer het straks opnieuw.', code: 'rate_limited' });
  }

  try {
    const { token, login, error } = await requireGithubConnection(supabase, accountId);
    if (error) {
      const status = error === 'not_connected' ? 409 : 500;
      return res.status(status).json({ error: 'GitHub is niet gekoppeld', code: error });
    }

    const repos = [];
    const failedRepoIds = [];
    let lastFailureStatus = null;
    let lastFailureHeaders = null;

    // Sequentieel, niet Promise.all: zelfde reden als trello/cards.js
    // (voorspelbare upstream-belasting).
    for (const entry of repoIds) {
      try {
        const raw = await fetchAssignedIssues(entry.fullName, login, token);
        const issues = (Array.isArray(raw) ? raw : [])
          // Valkuil 1: GET .../issues geeft ook pull requests terug (elke PR
          // ís een issue in GitHub's datamodel, geen bug). Zonder dit filter
          // staan eigen PR's als taken in de planner (AC7).
          .filter((issue) => !('pull_request' in issue))
          // Payload-minimalisatie: géén body, géén user, géén labels, géén
          // rauwe passthrough (Valkuil 2) — uitsluitend deze zes velden.
          .map((issue) => ({
            id: issue.id,
            number: issue.number,
            title: issue.title || '',
            url: issue.html_url || '',
            state: issue.state,
            dueOn: issue.milestone?.due_on ?? null,
          }));
        repos.push({
          id: entry.id,
          fullName: entry.fullName,
          url: `https://github.com/${entry.fullName}`,
          issues,
        });
      } catch (err) {
        console.warn('connections/github/issues repo failed', entry.fullName, err.status || err);
        failedRepoIds.push(entry.id);
        lastFailureStatus = err.status || lastFailureStatus;
        lastFailureHeaders = err.headers || lastFailureHeaders;
      }
    }

    if (repos.length === 0 && failedRepoIds.length > 0) {
      return res.status(502).json({
        error: 'Kon GitHub-issues niet ophalen',
        code: classifyGithubStatus(lastFailureStatus, lastFailureHeaders),
      });
    }

    return res.status(200).json({ repos, failedRepoIds });
  } catch (err) {
    console.error('connections/github/issues error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
