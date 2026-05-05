export async function requestPersistentStorage() {
  if (typeof navigator === 'undefined') return;
  if (!navigator.storage || typeof navigator.storage.persist !== 'function') return;

  try {
    const isPersisted = await navigator.storage.persisted();
    if (isPersisted) return;
    await navigator.storage.persist();
  } catch {
    // Best-effort, stil falen
  }
}
