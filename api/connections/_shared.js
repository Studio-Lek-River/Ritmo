// Gedeelde helpers voor àlle `api/connections/**`-endpoints (S02, uitgetrokken
// in S08 zodat Trello niet dezelfde twee functies opnieuw hoeft te
// definiëren — zie docs/slices/S08-trello-lezen.md, "Twee opruimingen die
// deze slice zelf afdwingt"). Onderstreepte bestandsnaam: Vercel routeert
// geen bestanden die met `_` beginnen naar een eigen endpoint, dit bestand is
// dus alleen importeerbaar, geen eigen route.
import { createClient } from '@supabase/supabase-js';

// Haalt de Supabase-JWT uit de Authorization-header ("Bearer <token>") van de
// aanroepende gebruiker. `null` bij een ontbrekende of misvormde header.
export function getBearerToken(req) {
  const header = req.headers['authorization'] || req.headers['Authorization'];
  if (typeof header !== 'string') return null;
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

// Service-role Supabase-client (server-only, nooit in de browser-bundel).
// `null` wanneer de vereiste env-vars ontbreken; callers checken dat zelf
// vooraf via hun eigen missing-env-helper (bv. missingOutlookEnv/
// missingTrelloEnv), zodat ze een gerichte `server_config`-fout kunnen geven.
export function getServiceClient() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
