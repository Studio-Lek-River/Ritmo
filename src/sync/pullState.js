// Ophaal-poort: houdt bij of de eerste cloud-ophaal na het openen van de app
// nog moet gebeuren. Lokale schrijfacties (dagblob, instellingen,
// useStoredState) wachten hierop, zodat ze de cloudrij niet overschrijven
// vóórdat die ooit is opgehaald (zie issue #145). Zelfde observable-patroon
// als syncStatus.js: module-state + subscribe/getSnapshot.
let state = {
  pending: true,  // true zolang de eerste ophaal nog moet gebeuren
  revision: 0,    // omhoog na een ophaal die lokaal iets heeft gewijzigd
};

const listeners = new Set();

function emit() {
  for (const l of listeners) l();
}

export function getSnapshot() {
  return state;
}

export function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function set(patch) {
  state = { ...state, ...patch };
  emit();
}

// Zet de poort open: er is geen reden meer om op de eerste ophaal te wachten
// (geen gebruiker, sync uit, ophaal klaar — ook bij fout — of de timeout).
export function markPullReady() {
  if (!state.pending) return;
  set({ pending: false });
}

// Signaleert lezers dat een ophaal lokaal iets heeft gewijzigd, zodat ze
// (bv. useStoredState) hun waarde opnieuw kunnen inlezen.
export function bumpRevision() {
  set({ revision: state.revision + 1 });
}

// Valbeveiliging (AC10): blijft de eerste ophaal om wat voor reden dan ook
// uit — geen netwerk, een vergeten pad — dan mag de poort niet voorgoed dicht
// blijven en schrijfacties niet oneindig blokkeren.
if (typeof window !== 'undefined') {
  setTimeout(markPullReady, 10_000);
}
