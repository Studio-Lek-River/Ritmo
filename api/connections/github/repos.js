// Lijst van repo's voor de repo-kiezer (S09, GithubRepoPicker). Vult alleen
// de checkbox-lijst; issues komen pas via issues.js zodra een repo is
// aangevinkt (opt-in, zie AC3). Nooit de rauwe GitHub-payload doorgeven,
// altijd expliciet mappen.
import {
  getBearerToken,
  getServiceClient,
  missingGithubEnv,
  requireGithubConnection,
  classifyGithubStatus,
  isGithubRateLimited,
  githubHeaders,
  GITHUB_API_BASE,
} from './_shared.js';

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 20;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  const missingEnv = missingGithubEnv();
  if (missingEnv.length) {
    console.error('connections/github/repos missing env:', missingEnv.join(', '));
    return res.status(500).json({ error: 'Server niet correct geconfigureerd', code: 'server_config' });
  }

  const jwt = getBearerToken(req);
  if (!jwt) {
    return res.status(401).json({ error: 'Niet geauthenticeerd', code: 'unauthenticated' });
  }

  const supabase = getServiceClient();
  const { data: userData, error: userError } = await supabase.auth.getUser(jwt);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: 'Ongeldige sessie', code: 'unauthenticated' });
  }
  const accountId = userData.user.id;

  if (isGithubRateLimited('repos', accountId, { windowMs: RATE_LIMIT_WINDOW_MS, max: RATE_LIMIT_MAX })) {
    return res.status(429).json({ error: 'Te veel aanvragen. Probeer het straks opnieuw.', code: 'rate_limited' });
  }

  try {
    const { token, error } = await requireGithubConnection(supabase, accountId);
    if (error) {
      const status = error === 'not_connected' ? 409 : 500;
      return res.status(status).json({ error: 'GitHub is niet gekoppeld', code: error });
    }

    const params = new URLSearchParams({
      affiliation: 'owner,collaborator,organization_member',
      per_page: '100',
      sort: 'updated',
    });
    const reposResponse = await fetch(`${GITHUB_API_BASE}/user/repos?${params.toString()}`, {
      headers: githubHeaders(token),
    });

    if (!reposResponse.ok) {
      const errText = await reposResponse.text().catch(() => '');
      console.error('connections/github/repos upstream failed', reposResponse.status, errText);
      return res.status(502).json({
        error: 'Kon GitHub-repo\'s niet ophalen',
        code: classifyGithubStatus(reposResponse.status, reposResponse.headers),
      });
    }

    const raw = await reposResponse.json().catch(() => []);
    const repos = (Array.isArray(raw) ? raw : []).map((repo) => ({
      id: repo.id,
      fullName: repo.full_name || '',
      url: repo.html_url || '',
    }));

    return res.status(200).json({ repos });
  } catch (err) {
    console.error('connections/github/repos error', err);
    return res.status(500).json({ error: 'Onverwachte fout', code: 'unexpected' });
  }
}
