// Stub voor het starten van een echte provider-koppeling. De OAuth-handshake
// per provider landt pas in S03 (Outlook), S04 (Trello) en S05 (GitHub) — zie
// docs/slices/S02-connections-items-model.md. Dit endpoint bestaat al zodat de
// frontend-shell (verbind-knop) tegen een stabiel contract kan bouwen.
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed', code: 'method_not_allowed' });
  }

  return res.status(501).json({
    error: 'Deze koppeling is nog niet beschikbaar',
    code: 'not_implemented',
  });
}
