import { useEffect, useRef, useState } from 'react';

// Async-aware state hook that mirrors React state to window.storage.
// On mount: loads stored value (JSON). Until loaded, the default is used.
// On set: updates state immediately, persists asynchronously (JSON-encoded).
export default function useStoredState(key, defaultValue) {
  const [value, setValue] = useState(defaultValue);
  const loadedRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const result = await window.storage.get(key);
        if (cancelled) return;
        if (result?.value) {
          try {
            setValue(JSON.parse(result.value));
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
  }, [key]);

  useEffect(() => {
    if (!loadedRef.current) return;
    (async () => {
      try {
        await window.storage.set(key, JSON.stringify(value));
      } catch (e) {
        console.error('useStoredState save failed', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return [value, setValue];
}
