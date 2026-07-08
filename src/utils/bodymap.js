// Pure helpers voor het bodymap-module-type.
// Prikken leven in settings.modules[i].log, niet in per-dag moduleData
// (mirror van het collection-opslagpatroon, zie collections.js/medication.js).

import { todayKey } from './dates';

// Geordende lijst van injectiezones. Volgorde bepaalt de deterministische
// tie-break in suggestNextZone en de weergavevolgorde in de bodymap.
export const INJECTION_ZONES = [
  { id: 'abdomenL', labelKey: 'bodymap.zoneAbdomenL' },
  { id: 'abdomenR', labelKey: 'bodymap.zoneAbdomenR' },
  { id: 'armL', labelKey: 'bodymap.zoneArmL' },
  { id: 'armR', labelKey: 'bodymap.zoneArmR' },
  { id: 'thighL', labelKey: 'bodymap.zoneThighL' },
  { id: 'thighR', labelKey: 'bodymap.zoneThighR' },
];

// Mirror van collections.js's logEvent: `date` mag door de caller worden
// meegegeven (bv. om een undo exact te herstellen), anders vandaag.
export function logInjection(module, event = {}) {
  const newEvent = {
    date: event.date || todayKey(),
    zoneId: event.zoneId,
    medId: event.medId,
    medModuleId: event.medModuleId,
    medName: event.medName,
  };
  return { ...module, log: [newEvent, ...(module.log || [])] };
}

export function removeInjection(module, index) {
  return {
    ...module,
    log: (module.log || []).filter((_, i) => i !== index),
  };
}

// Zone met de oudste laatste-prik (nooit geprikt telt als oudst). Bij een
// gelijke stand wint de eerste zone in INJECTION_ZONES-volgorde. Retourneert
// altijd een geldige zone-id, ook bij een lege log.
export function suggestNextZone(log) {
  const events = log || [];
  let best = INJECTION_ZONES[0].id;
  let bestLastUse = zoneLastUse(events, best);
  for (let i = 1; i < INJECTION_ZONES.length; i++) {
    if (bestLastUse === null) break; // "nooit geprikt" kan niet meer verslagen worden
    const zone = INJECTION_ZONES[i];
    const lastUse = zoneLastUse(events, zone.id);
    if (lastUse === null || lastUse < bestLastUse) {
      best = zone.id;
      bestLastUse = lastUse;
    }
  }
  return best;
}

export function zoneLastUse(log, zoneId) {
  const events = (log || []).filter((e) => e.zoneId === zoneId);
  if (events.length === 0) return null;
  return events.reduce((latest, e) => (e.date > latest ? e.date : latest), events[0].date);
}

// Alle injecteerbare medicijnen uit ingeschakelde medication-modules, verrijkt
// met de bron-module zodat de kiezer en de voorraad-mutator die kennen.
export function injectableMeds(modules) {
  return (modules || [])
    .filter((m) => m.type === 'medication' && m.enabled)
    .flatMap((m) =>
      (m.meds || [])
        .filter((med) => med.injectable === true)
        .map((med) => ({ ...med, medModuleId: m.id, medModuleName: m.name }))
    );
}
