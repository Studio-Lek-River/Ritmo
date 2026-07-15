import { useCallback, useEffect, useState } from 'react';
import { isSyncEnabled } from '../sync/supabase';
import { listConnections, disconnectConnection, connectProvider } from '../sync/connections';

// Laadt en beheert de Koppelingen-rijen voor het ingelogde account. Metadata
// komt via een directe supabase-select onder RLS (zie sync/connections.js).
// Zonder account of zonder sync blijft `connections` leeg en doet de hook
// niets — bestaande lokale werking verandert niet (principe 2).
export default function useConnections(accountId) {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    if (!isSyncEnabled() || !accountId) {
      setConnections([]);
      return;
    }
    setLoading(true);
    const rows = await listConnections(accountId);
    setConnections(rows);
    setLoading(false);
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

  const connect = useCallback(async (provider) => {
    setBusyId(provider);
    setError(null);
    try {
      await connectProvider(provider);
      await refresh();
    } catch (err) {
      setError(err.code || 'unexpected');
    } finally {
      setBusyId(null);
    }
  }, [refresh]);

  return { connections, loading, busyId, error, disconnect, connect, refresh };
}
