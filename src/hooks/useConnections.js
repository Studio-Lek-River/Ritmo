import { useCallback, useEffect, useState } from 'react';
import { isSyncEnabled } from '../sync/supabase';
import { listConnections, disconnectConnection } from '../sync/connections';

// Laadt en beheert de Koppelingen-rijen voor het ingelogde account. Metadata
// komt via een directe supabase-select onder RLS (zie sync/connections.js).
// Zonder account of zonder sync blijft `connections` leeg en doet de hook
// niets — bestaande lokale werking verandert niet (principe 2).
//
// `refresh` geeft de verse rijen ook terug (niet alleen via state): OAuthReturn
// (S09) heeft ze direct nodig om het `label` van een net gekoppelde provider
// in een toast te tonen, zonder te moeten wachten op een React-re-render.
export default function useConnections(accountId) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isSyncEnabled() || !accountId) {
      setConnections([]);
      return [];
    }
    setLoading(true);
    const rows = await listConnections(accountId);
    setConnections(rows);
    setLoading(false);
    return rows;
  }, [accountId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const disconnect = useCallback(async (connectionId) => {
    setBusyId(connectionId);
    setError(null);
    try {
      await disconnectConnection(connectionId);
      await refresh();
    } catch (err) {
      setError(err.code || 'unexpected');
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  return { connections, loading, busyId, error, disconnect, refresh };
}
