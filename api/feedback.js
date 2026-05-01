const REPO_OWNER = 'Studio-Lek-River';
const REPO_NAME = 'Ritmo';
const MAX_MESSAGE_LENGTH = 2000;
const MIN_MESSAGE_LENGTH = 10;
const RATE_LIMIT_PER_HOUR = 5;

const rateLimitStore = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000;
  const requests = (rateLimitStore.get(ip) || []).filter(t => now - t < windowMs);

  if (requests.length >= RATE_LIMIT_PER_HOUR) {
    return true;
  }

  requests.push(now);
  rateLimitStore.set(ip, requests);
  return false;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const forwarded = req.headers['x-forwarded-for'];
  const ip = (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : null) || 'unknown';
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Te veel feedback verstuurd. Probeer het later opnieuw.' });
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Ongeldige request body' });
  }

  const { type, message, honeypot } = body;

  if (honeypot && honeypot.length > 0) {
    return res.status(200).json({ ok: true });
  }

  if (type !== 'bug' && type !== 'feature') {
    return res.status(400).json({ error: 'Ongeldig type' });
  }

  if (typeof message !== 'string') {
    return res.status(400).json({ error: 'Bericht ontbreekt' });
  }

  const trimmed = message.trim();
  if (trimmed.length < MIN_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'Bericht is te kort' });
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return res.status(400).json({ error: 'Bericht is te lang' });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return res.status(500).json({ error: 'Server niet correct geconfigureerd' });
  }

  const prefix = type === 'bug' ? '[bug]' : '[feature]';
  const firstLine = trimmed.split('\n')[0].slice(0, 80);
  const title = `${prefix} ${firstLine}`;

  try {
    const ghResponse = await fetch(
      `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/issues`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
          'Content-Type': 'application/json',
          'User-Agent': 'Ritmo-feedback',
        },
        body: JSON.stringify({
          title,
          body: trimmed,
        }),
      }
    );

    if (!ghResponse.ok) {
      const errText = await ghResponse.text();
      console.error('GitHub API error:', ghResponse.status, errText);
      return res.status(502).json({ error: 'Kon issue niet aanmaken' });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('Feedback function error:', err);
    return res.status(500).json({ error: 'Onverwachte fout' });
  }
}
