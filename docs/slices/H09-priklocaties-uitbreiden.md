# H09 — Priklocaties uitbreiden (buik → 6 zones)

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/82
**Status:** concept

## Doel

De priklocatie-module (bodymap, oorspronkelijk H04) maakt de buik fijnmaziger: in plaats van één "Buik links / Buik rechts" krijgt de buik **boven-, midden- en onderbuik**, elk links en rechts. Dat geeft een betere injectie-rotatie. Bestaande prik-historie blijft geldig via een niet-destructieve migratie.

## Scope

**Wel in scope:**
- De buikzones worden een 3×2-raster: bovenbuik/middenbuik/onderbuik × links/rechts = **6 buikzones**. Arm- en dijzones blijven ongewijzigd; de figuur gaat van 6 → **10 zones**.
- Nieuwe zone-ids + i18n-labels (nl/en) voor de zes buikzones.
- Nieuwe stip-coördinaten op het silhouet voor de drie buikrijen.
- Niet-destructieve, idempotente migratie van oude `abdomenL`/`abdomenR`-prikken naar de middenrij (`abdomenMidL`/`abdomenMidR`), zowel in het bodymap-log als in injectionSchedule-entries.

**Niet in scope (bewust):**
- Geen wijziging aan arm-/dijzones, heat-vensters, `suggestNextZone`-logica of het opslagformaat van een prik-event (alleen de `zoneId`-waarde migreert).
- Geen hernoemen van de veld-inconsistentie `entry.zone` (injectionSchedule) vs `log.zoneId` (bodymap) — aparte opruiming.
- Geen nieuw data-gedreven/anatomisch silhouet; de handgetekende SVG blijft, alleen de stip-coördinaten wijzigen.

## Nieuwe zone-indeling

| id (nieuw) | nl-label | en-label |
|---|---|---|
| `abdomenUpperL` | Bovenbuik links | Upper abdomen left |
| `abdomenUpperR` | Bovenbuik rechts | Upper abdomen right |
| `abdomenMidL` | Middenbuik links | Mid abdomen left |
| `abdomenMidR` | Middenbuik rechts | Mid abdomen right |
| `abdomenLowerL` | Onderbuik links | Lower abdomen left |
| `abdomenLowerR` | Onderbuik rechts | Lower abdomen right |

Migratie-mapping (oud → nieuw): `abdomenL → abdomenMidL`, `abdomenR → abdomenMidR`. De middenrij is de neutrale keuze: de oude enkele "buik"-stip stond op de mid-torso (`cy 112`), dus historische prikken landen anatomisch logisch in het midden en behouden hun links/rechts.

## Aanpak

- **`src/utils/bodymap.js`** — vervang de twee abdomen-entries in `INJECTION_ZONES` door de zes nieuwe (volgorde boven→midden→onder, L vóór R), gevolgd door de bestaande arm/dij-entries. Exporteer `LEGACY_ZONE_ID_MAP = { abdomenL: 'abdomenMidL', abdomenR: 'abdomenMidR' }` zodat de zone-kennis op één plek blijft. `logInjection`, `suggestNextZone`, `zoneLastUse`, `zoneInjectionCount` en `heatLevel` werken generiek op zone-ids en blijven ongewijzigd.
- **`src/views/BodymapView.jsx`** — vervang de twee abdomen-entries in `ZONE_DOTS` door zes stippen (behoud `cx` 88 links / 112 rechts; drie rijen binnen de torso-rect `y 54–150`, richtwaarden `cy` 90 / 112 / 134). Stel rij-afstand en/of stip-radius zo af dat de zones duidelijk klikbaar en leesbaar blijven. De rest van `BodyMapSvg` rendert data-gedreven via `INJECTION_ZONES.map(...)` en blijft ongewijzigd.
- **`src/i18n/nl.js` + `src/i18n/en.js`** — in het `bodymap:`-blok `zoneAbdomenL`/`zoneAbdomenR` verwijderen en de zes nieuwe `zone…`-keys toevoegen met de labels uit de tabel. Key-pariteit is verplicht.
- **`src/utils/migrate.js`** — importeer `LEGACY_ZONE_ID_MAP`; map in het `bodymap`-blok elk `log[].zoneId` en in het `injectionSchedule`-blok elk `entries[].zone` via de mapping (onbekende/nieuwe ids ongemoeid). Migratie draait al bij elke settings-load via `migrateModuleConfig`; geen extra bedrading nodig.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] De buik toont zes zones (bovenbuik/middenbuik/onderbuik × links/rechts); arm en dij ongewijzigd; 10 zones totaal.
- [ ] Elke nieuwe zone is klikbaar, krijgt de juiste heat-kleur en telt mee in de "volgende zone"-suggestie (`suggestNextZone`).
- [ ] Bestaande `abdomenL`/`abdomenR`-prikken migreren naar de middenrij (`abdomenMidL`/`abdomenMidR`), zowel in het bodymap-log als in injectionSchedule-entries; historie, heat-kleur en "laatste prik" blijven kloppen.
- [ ] De migratie is idempotent (tweede load is een no-op) en niet-destructief; onbekende/nieuwe zone-ids blijven ongemoeid.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js` (`npm run check:i18n` slaagt).
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag laat bestaande gebruikersdata veilig (principe 2): geen dataverlies, migratie niet-destructief.
