# H12 — Priklocatie: precieze (vrije) plaatsing op het silhouet

**Status:** goedgekeurd (plan) · **Bouwt op:** H04 (bodymap, gemerged) · **Raakt:** H09 (buik-zones)

> Nummering: oorspronkelijk als "H10" opgesteld, maar H10 is al bezet door de medicijnplanner
> (`H10-medicijnplanner.md`) en H11 door weekmenu-upgrades. Deze slice krijgt daarom H12.

## Bevestigde uitvoeringskeuzes

1. **Geen bestaande prototype-file.** `PreciesPrikkenPrototype.jsx` bestaat nergens in de repo en er
   is geen pointer-event-code aanwezig. De pointer/drag-interactie wordt from scratch gecodeerd
   volgens de beschrijving in deze spec.
2. **Heat-fill uit (spec-default).** De per-zone heat-vulling en de count-labels vervallen; de losse
   stippen tonen voortaan de dichtheid. Alleen de `suggestNextZone`-highlight (gestippelde ring) blijft
   als subtiele gids. De onderliggende heat-*logica* verandert niet.

## Doel

De `bodymap`-module laat een prik nu op een hele *zone* loggen. Deze slice voegt een *exact punt*
toe: de gebruiker tikt de precieze plek op het silhouet aan en schuift hem bij. Elke prik wordt als
losse stip gerenderd, gekleurd op ouderdom (vers → oud). De **zone blijft bestaan**: die wordt bij het
loggen afgeleid uit het punt, zodat `suggestNextZone`, `zoneLastUse`, `zoneInjectionCount` en `heatLevel`
ongewijzigd blijven werken. Dit is dus een additieve uitbreiding, geen herbouw.

## Scope

**Wel in scope (voorkant):**
- Prik-event krijgt `x`, `y` (viewBox-coördinaten), `view` en een stabiel `id`.
- Plaatsen door tikken op het silhouet; direct verslepen om bij te stellen (plaatsen-en-slepen, één
  gesture). Een geplaatste stip is selecteerbaar, verplaatsbaar en verwijderbaar.
- Rendering: elke prik als losse stip, kleur op ouderdom (`0–30 / 30–90 / 90+` dagen).
- Zone-afleiding uit het punt via nearest-anchor (`zoneFor(x, y, view)`), opgeslagen als `zoneId` bij
  het event. Bestaande zone-logica ongewijzigd.
- Mobiel-eerst: pointer events + pointer capture, `touch-action: none` op de SVG, ruime raakzone per
  stip (~16px), knoppen ≥ 44px hoog.
- Voorraad-koppeling ongewijzigd: plaatsen doet `supply -= 1`, verwijderen `supply += 1`, verslepen
  raakt de voorraad niet.

**Niet in scope (bewust):**
- Achteraanzicht (`back`). Aparte vervolgslice (H12b), identieke mechaniek.
- Geen nieuw module-type; `bodymap` wordt uitgebreid.
- Geen wijziging aan `suggestNextZone`/heat-berekening zelf.
- Geen per-medicijn kleurfilter op de stippen (stippen kleuren op ouderdom; medicijnnaam bij selectie).

## Datamodel

```js
{ id, date, zoneId, x, y, view, medId, medModuleId, medName }
// id/x/y/view NIEUW; zoneId nu afgeleid uit (x,y) via zoneFor(); rest ongewijzigd.
```

Backward compat (lazy, niet-destructief, patroon van `normalizeChecklistItemData` in `dayProgress.js`):
oude events zonder `x/y/view` blijven geldig; bij lezen krijgen ze `view='front'`, een positie op het
zone-anker met deterministische jitter, en een gesynthetiseerd `id`. Geen dataherschrijving die jitter
bakt; migratie vult alleen eenmalig `id`/`view`.

## Acceptatiecriteria

- [ ] Op de voorkant kun je een prik op een exact punt plaatsen door te tikken en te schuiven; loslaten
      legt de plek vast.
- [ ] Een geplaatste stip is te selecteren, te verslepen (positie bijstellen) en te verwijderen.
- [ ] Elke prik toont als losse stip, correct gekleurd op ouderdom (0–30 / 30–90 / 90+ dagen).
- [ ] Bij elk event wordt een geldige `zoneId` afgeleid en opgeslagen; `suggestNextZone`, `zoneLastUse`
      en heat blijven kloppen en zijn ongewijzigd in gedrag.
- [ ] Plaatsen doet `supply -= 1`, verwijderen `supply += 1`, verslepen raakt de voorraad niet.
- [ ] Bestaande (zone-only) prikken uit vóór deze slice renderen zonder crash op hun zone-anker (met
      lichte jitter), tellen mee in historie/heat, en behouden datum en zone.
- [ ] Mobiel: slepen scrollt de pagina niet; raakzones zijn vingervriendelijk; knoppen ≥ 44px.
- [ ] SVG gebruikt hex op `fill`/`stroke`, geen Tailwind-classes op de SVG.
- [ ] Elke nieuwe UI-string staat in zowel `nl.js` als `en.js`; `npm run check:i18n` slaagt; geen
      em-dashes in user-facing tekst.
- [ ] Geen wijzigingen buiten de scope van deze slice; bestaande gebruikersdata blijft veilig
      (niet-destructief).

## Test-checklist (handmatig, na build, op telefoon én desktop)

1. Nieuwe bodymap-module met één injecteerbaar medicijn; plaats 3 prikken op verschillende punten in
   de buik. Stippen staan waar je tikte, voorraad daalde met 3.
2. Sleep één stip naar een dij; voorraad blijft gelijk; zone-label verandert mee bij selectie.
3. Verwijder een stip; voorraad stijgt met 1; stip weg; undo herstelt.
4. Herlaad de app; alle stippen staan op hun exacte plek terug.
5. Pre-H12 log zonder `x/y`: stippen verschijnen op de zone-ankers zonder crash, historie intact.
6. Op de telefoon: plaatsen-en-slepen voelt vloeiend, pagina scrollt niet tijdens slepen.

## Vervolg (aparte slice, aanbevolen)

H12b — Achteraanzicht: back-silhouet + `ZONE_ANCHORS.back`, front/back-toggle. Zelfde event-vorm
(`view: 'back'`) en interactie; alleen nieuwe geometrie en zone-labels (nl/en).
