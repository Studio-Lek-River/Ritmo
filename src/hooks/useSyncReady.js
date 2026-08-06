import { useSyncExternalStore } from 'react';
import { subscribe, getSnapshot } from '../sync/pullState';

// Of de eerste cloud-ophaal (of de val op de timeout) al is afgerond, en het
// revision-nummer dat na een gewijzigde ophaal omhoog gaat. Schrijfacties op
// gedeelde sync-keys wachten op `ready`; lezers zoals useStoredState herladen
// bij een gewijzigde `revision`.
export function useSyncReady() {
  const snap = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  return {
    ready: !snap.pending,
    revision: snap.revision,
  };
}
