// Pure helpers voor het bodymap-module-type.
// Prikken leven in settings.modules[i].log, niet in per-dag moduleData
// (mirror van het collection-opslagpatroon, zie collections.js/medication.js).

import { todayKey, parseDateKey, startOfWeek } from './dates';

// Instelbare heat-vensters voor de figuur. `days === null` = alle tijd.
// De id wordt op de module bewaard als `heatWindow`; default is '30d'.
// Intact voor toekomstige heat-feature (H12 zette de heat-vulling zelf uit).
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

// Welke prikken als klikbare stip op de figuur verschijnen. Repurpose van de
// sinds H12 dormante heat-window-plumbing: de id wordt op de module bewaard
// als `dotWindow`. Dit is een render-filter, `module.log` blijft ongemoeid.
export const DOT_WINDOWS = [
  { id: 'week', labelKey: 'bodymap.dotWindowWeek' },
  { id: 'all', labelKey: 'bodymap.dotWindowAll' },
];
export const DEFAULT_DOT_WINDOW = 'week';

// Filtert de (genormaliseerde) log tot de stippen die op de figuur zichtbaar
// mogen zijn. `'week'` toont alleen prikken vanaf het begin van de huidige
// kalenderweek (maandag); `'all'` toont de volledige log. Sluit aan bij het
// cutoff-patroon in zoneInjectionCount hierboven.
export function filterVisibleDots(log, windowId) {
  const events = log || [];
  if (windowId === 'all') return events;
  const cutoff = startOfWeek(new Date());
  return events.filter((e) => e.date && parseDateKey(e.date) >= cutoff);
}

// Geordende lijst van injectiezones. Volgorde bepaalt de deterministische
// tie-break in suggestNextZone en de weergavevolgorde in de bodymap.
export const INJECTION_ZONES = [
  { id: 'abdomenUpperL', labelKey: 'bodymap.zoneAbdomenUpperL' },
  { id: 'abdomenUpperM', labelKey: 'bodymap.zoneAbdomenUpperM' },
  { id: 'abdomenUpperR', labelKey: 'bodymap.zoneAbdomenUpperR' },
  { id: 'abdomenMidL', labelKey: 'bodymap.zoneAbdomenMidL' },
  { id: 'abdomenMidM', labelKey: 'bodymap.zoneAbdomenMidM' },
  { id: 'abdomenMidR', labelKey: 'bodymap.zoneAbdomenMidR' },
  { id: 'abdomenLowerL', labelKey: 'bodymap.zoneAbdomenLowerL' },
  { id: 'abdomenLowerM', labelKey: 'bodymap.zoneAbdomenLowerM' },
  { id: 'abdomenLowerR', labelKey: 'bodymap.zoneAbdomenLowerR' },
  { id: 'armL', labelKey: 'bodymap.zoneArmL' },
  { id: 'armR', labelKey: 'bodymap.zoneArmR' },
  { id: 'thighL', labelKey: 'bodymap.zoneThighL' },
  { id: 'thighR', labelKey: 'bodymap.zoneThighR' },
];

// H09 bracht de buik van 2 naar 6 zones; later uitgebreid naar 9 (boven/midden/
// onder x links/midden/rechts). Oude prikken op de enkele buikzone landen
// niet-destructief in de middenrij-links/rechts, gebruikt door migrate.js voor
// zowel het bodymap-log als injectionSchedule.
export const LEGACY_ZONE_ID_MAP = { abdomenL: 'abdomenMidL', abdomenR: 'abdomenMidR' };

// H12: viewBox-afmetingen van het silhouet, gedeeld tussen de view (rendering)
// en deze module (zone-afleiding uit een punt).
export const VIEW_W = 200;
export const VIEW_H = 320;

// H12: dezelfde 13 zone-coördinaten die eerder alleen in de view leefden
// (ZONE_DOTS), nu hier zodat zoneFor() en normalizeInjectionEvent() ze ook
// kunnen gebruiken. `front` is de enige aanzicht in deze slice; `back` volgt
// in H12b. De buik is een 3x3 raster (kolommen x 80/100/120, rijen y
// 82/112/142); de torso-rect in de view is verbreed/verlengd zodat alle negen
// punten erbinnen vallen.
export const ZONE_ANCHORS = {
  front: [
    { id: 'abdomenUpperL', x: 80, y: 82 },
    { id: 'abdomenUpperM', x: 100, y: 82 },
    { id: 'abdomenUpperR', x: 120, y: 82 },
    { id: 'abdomenMidL', x: 80, y: 112 },
    { id: 'abdomenMidM', x: 100, y: 112 },
    { id: 'abdomenMidR', x: 120, y: 112 },
    { id: 'abdomenLowerL', x: 80, y: 142 },
    { id: 'abdomenLowerM', x: 100, y: 142 },
    { id: 'abdomenLowerR', x: 120, y: 142 },
    { id: 'armL', x: 52, y: 92 },
    { id: 'armR', x: 148, y: 92 },
    { id: 'thighL', x: 86, y: 224 },
    { id: 'thighR', x: 114, y: 224 },
  ],
};

// Zone-afleiding uit een precies punt: dichtstbijzijnde zone-anker (Euclidisch).
// Onbekende aanzichten vallen terug op 'front'; retourneert altijd een geldige
// zone-id (mirror van suggestNextZone's "altijd geldig"-garantie).
export function zoneFor(x, y, view = 'front') {
  const anchors = ZONE_ANCHORS[view] || ZONE_ANCHORS.front;
  let best = anchors[0];
  let bestDist = Infinity;
  for (const anchor of anchors) {
    const dist = (anchor.x - x) ** 2 + (anchor.y - y) ** 2;
    if (dist < bestDist) {
      bestDist = dist;
      best = anchor;
    }
  }
  return best.id;
}

// Stabiele client-side id voor een nieuw geplaatste prik. Alleen gebruikt op
// het moment van loggen (runtime), dus Date.now()/Math.random() zijn hier ok.
export function makeInjectionId() {
  return `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// Kleine deterministische string-hash (geen crypto-doel, alleen jitter-seed).
function hashStr(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

// Lazy, niet-destructieve normalisatie van een logregel (mirror van
// normalizeChecklistItemData in dayProgress.js): puur, idempotent, leest
// alleen. Oude events zonder id/x/y/view krijgen die on-the-fly: een
// gesynthetiseerde id, view='front', en een positie op het zone-anker met
// deterministische jitter (±6) zodat gestapelde oude prikken in dezelfde zone
// niet exact overlappen. Bestaat het event al met x/y, dan blijft alles
// ongemoeid.
export function normalizeInjectionEvent(event, index) {
  if (!event) return event;
  const id = event.id || `${event.date}-${event.zoneId}-${index}`;
  const view = event.view || 'front';
  let { x, y } = event;
  if (x == null || y == null) {
    const anchors = ZONE_ANCHORS[view] || ZONE_ANCHORS.front;
    const anchor = anchors.find((a) => a.id === event.zoneId) || ZONE_ANCHORS.front[0];
    const h = hashStr(id);
    const jitterX = (h % 13) - 6;
    const jitterY = (Math.floor(h / 13) % 13) - 6;
    x = anchor.x + jitterX;
    y = anchor.y + jitterY;
  }
  return { ...event, id, view, x, y };
}

// Mirror van collections.js's logEvent: `date` mag door de caller worden
// meegegeven (bv. om een undo exact te herstellen), anders vandaag. H12:
// bewaart nu ook de precieze plaatsing (id/x/y/view) naast de afgeleide zone.
export function logInjection(module, event = {}) {
  const newEvent = {
    id: event.id || makeInjectionId(),
    date: event.date || todayKey(),
    zoneId: event.zoneId,
    x: event.x,
    y: event.y,
    view: event.view || 'front',
    medId: event.medId,
    medModuleId: event.medModuleId,
    medName: event.medName,
  };
  return { ...module, log: [newEvent, ...(module.log || [])] };
}

// H12: verplaatst een bestaande prik (verslepen). Raakt de voorraad niet.
export function updateInjectionPosition(module, id, { x, y, zoneId } = {}) {
  return {
    ...module,
    log: (module.log || []).map((e) =>
      e.id === id ? { ...e, x, y, ...(zoneId !== undefined ? { zoneId } : {}) } : e
    ),
  };
}

// H12: id-gebaseerde verwijdering.
export function removeInjectionById(module, id) {
  return { ...module, log: (module.log || []).filter((e) => e.id !== id) };
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
