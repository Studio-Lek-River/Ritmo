// Pure helpers voor het bodymap-module-type.
// Prikken leven in settings.modules[i].log, niet in per-dag moduleData
// (mirror van het collection-opslagpatroon, zie collections.js/medication.js).

import { todayKey, parseDateKey } from './dates';

// Instelbare heat-vensters voor de figuur. `days === null` = alle tijd.
// De id wordt op de module bewaard als `heatWindow`; default is '30d'.
export const HEAT_WINDOWS = [
  { id: '30d', days: 30, labelKey: 'bodymap.heatWindow30' },
  { id: '14d', days: 14, labelKey: 'bodymap.heatWindow14' },
  { id: 'all', days: null, labelKey: 'bodymap.heatWindowAll' },
];
export const DEFAULT_HEAT_WINDOW = '30d';

// Vertaalt een window-id naar het aantal dagen (of null voor alle tijd). Een
// onbekende id valt terug op de default.
export function windowDaysFor(windowId) {
  const match = HEAT_WINDOWS.find((w) => w.id === windowId);
  if (match) return match.days;
  return HEAT_WINDOWS.find((w) => w.id === DEFAULT_HEAT_WINDOW).days;
}

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

// Aantal prikken in een zone binnen het gekozen venster. `windowDays === null`
// telt alle tijd; anders alleen prikken vanaf (vandaag - windowDays), inclusief
// vandaag. Voedt de heat-kleur van de zone-stip.
export function zoneInjectionCount(log, zoneId, windowDays) {
  const events = (log || []).filter((e) => e.zoneId === zoneId);
  if (windowDays === null || windowDays === undefined) return events.length;
  const cutoff = new Date();
  cutoff.setHours(0, 0, 0, 0);
  cutoff.setDate(cutoff.getDate() - windowDays);
  return events.filter((e) => e.date && parseDateKey(e.date) >= cutoff).length;
}

// Discrete heat-schaal (0 = ongebruikt .. 3 = vaak), gedeeld door de figuur en
// de legenda zodat kleuren consistent zijn. Kleuren zelf leven in de view.
export function heatLevel(count) {
  if (!count) return 0;
  if (count === 1) return 1;
  if (count === 2) return 2;
  return 3;
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
