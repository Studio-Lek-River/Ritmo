import { useEffect, useRef, useState } from 'react';
import { isUserSyncKey } from '../sync/userDataStorage';
import { useSyncReady } from './useSyncReady';

// Async-aware state hook that mirrors React state to window.storage.
// On mount: loads stored value (JSON). Until loaded, the default is used.
// On set: updates state immediately, persists asynchronously (JSON-encoded).
//
// Voor sleutels die met het account meesyncen (household:*, nutrition:*) geldt
// bovendien (issue #145): niet schrijven vóór de eerste cloud-ophaal, geen
// echo-schrijfactie van een net geladen waarde — die zette anders bij elke
// start een verse sync-stempel waardoor de cloud nooit meer won — en opnieuw
// inlezen zodra een ophaal lokaal iets heeft gewijzigd.
export default function useStoredState(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const loadedRef = useRef(false);
  // Laatste serialisatie die in de opslag staat: basislijn om echo-schrijf-
  // acties te herkennen.
  const lastSavedRef = useRef(null);
  const synced = isUserSyncKey(key);
  const { ready: syncReady, revision } = useSyncReady();
  // Alleen meesyncende sleutels hoeven op een ophaal te reageren; lokale
  // sleutels veranderen nooit buiten dit apparaat om.
  const reloadToken = synced ? revision : 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(key);
        if (cancelled) return;
        if (result?.value) {
          try {
            setValue(JSON.parse(result.value));
            lastSavedRef.current = result.value;
          } catch {
            setValue(defaultValue);
          }
        }
      } catch {
        // Ignore — keep default.
      } finally {
        if (!cancelled) loadedRef.current = true;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, reloadToken]);

  useEffect(() => {
    if (!loadedRef.current) return;
    if (synced && !syncReady) return;
    const json = JSON.stringify(value);
    // Ongewijzigd t.o.v. wat er al staat: niet schrijven.
    if (json === lastSavedRef.current) return;
    (async () => {
      try {
        await window.storage.set(key, json);
        lastSavedRef.current = json;
      } catch (e) {
        console.error('useStoredState save failed', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, syncReady]);

  return [value, setValue];
}
