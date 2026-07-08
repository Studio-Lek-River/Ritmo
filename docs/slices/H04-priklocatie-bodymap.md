# H04 — Priklocatie-bodymap (nieuw type `bodymap`) + prik-log

## Doel

Een `bodymap`-module maakt van injecteren een klikbare handeling: een 6-zone lichaamskaart (buik L/R,
bovenarm L/R, dij L/R) waarop de gebruiker een injectie ("prik") registreert voor een injecteerbaar
medicijn. Een prik wordt gelogd op de module en verlaagt de voorraad (`supply`) van dat medicijn met 1;
een prik verwijderen herstelt de voorraad met 1. De app suggereert automatisch de langst-geleden (of nog
nooit) gebruikte zone. Vierde slice van epic H (zie `docs/ROADMAP.md`); consumeert de `injectable`-vlag
die H03 opslaat maar nergens gebruikte. Afhankelijk van H03 (`medication`), dat gemerged is (PR #48).

Visuele keuze (bevestigd): *med-accent + geschiedenislijst*. De gebruiker kiest eerst een injecteerbaar
medicijn (zijn kleur = accent); alleen de gesuggereerde zone licht op in die kleur, overige zones blijven
neutraal met een kleine "laatst geprikt"-tekst; onder de bodymap staat een prik-log-lijst met datums.

## Scope

**Wel in scope:**
- **Nieuw type `bodymap`** geregistreerd in de type-picker (`getTypeOptions`,
  [src/App.jsx](../../src/App.jsx) rond regel 2457) met i18n `modules.types.bodymap(+Desc)`.
- **Datamodel per bodymap-module**, opgeslagen in het module-object (collection-patroon, niet per-dag
  `moduleData`): `{ type:'bodymap', log: [...], countInStreak:false }`. Een prik-log-event is
  `{ date, zoneId, medId, medModuleId, medName }` (newest-first geprepend), waarbij `medModuleId`/`medId`
  de bron-medicatie-module en het medicijn identificeren zodat undo de juiste voorraad herstelt.
- **Nieuwe helper [src/utils/bodymap.js](../../src/utils/bodymap.js)**, gemodelleerd op
  [src/utils/collections.js](../../src/utils/collections.js) / [src/utils/medication.js](../../src/utils/medication.js):
  - `INJECTION_ZONES` — geordende lijst van 6 zones `{ id, labelKey }` met ids
    `abdomenL, abdomenR, armL, armR, thighL, thighR`.
  - `logInjection(module, { zoneId, medId, medModuleId, medName })` en `removeInjection(module, index)`
    (mirror van `logEvent`/`removeEvent`, werkend op `module.log`).
  - `suggestNextZone(log)` — zone met de oudste laatste-prik (of nooit geprikt), deterministische
    tie-break op `INJECTION_ZONES`-volgorde.
  - `zoneLastUse(log, zoneId)` — laatste prikdatum per zone (voor "laatst geprikt").
  - `injectableMeds(modules)` — alle `med.injectable === true` uit `medication`-modules, verrijkt met
    `medModuleId` (+ modulenaam) zodat de kiezer en de voorraad-mutator de bron kennen.
- **Mutators in [src/App.jsx](../../src/App.jsx)** die het `updateCollectionModule`-patroon
  (rond regel 540-585) spiegelen:
  - `updateBodymapModule(moduleId, mutator)` (match op `type==='bodymap'`).
  - `logInjectionEvent(bodymapModuleId, { zoneId, medId, medModuleId, medName })` — één `setModules`-pass
    die atomair het event prepend én `supply -= 1` op het bronmedicijn zet (guard: niet onder 0).
    Retourneert het event voor undo.
  - `removeInjectionEvent(bodymapModuleId, index)` — verwijdert het event én `supply += 1` op het
    bronmedicijn (via de in het event opgeslagen `medModuleId`/`medId`).
  Doorgegeven als props aan de view.
- **Eigen view [src/views/BodymapView.jsx](../../src/views/BodymapView.jsx)**, gemodelleerd op
  [src/views/MedicationView.jsx](../../src/views/MedicationView.jsx): een kaart per bodymap-module met
  (a) een **medicijnkiezer** die uitsluitend injecteerbare medicijnen toont — met lege-state en
  uitgeschakeld prikken als er geen zijn; (b) een **klikbare 6-zone SVG-bodymap** waarvan de zone-kleuren
  via `getColorHex`/`glassFill` uit [src/utils/colors.js](../../src/utils/colors.js) als hex op
  `fill`/`stroke` worden gezet (nooit Tailwind-classes op de SVG, mirror
  [src/components/CounterDisplay.jsx](../../src/components/CounterDisplay.jsx)); de gesuggereerde zone
  licht op in de accentkleur van het gekozen medicijn, overige zones neutraal met "laatst geprikt"-tekst;
  (c) een **legenda** (accent = volgende zone); (d) een **prik-log-lijst** met datum, zone-label en
  medicijnnaam, per regel een verwijderen-actie (met bevestiging/undo-toast, voorraad +1) conform de
  medication/collection delete-flow.
- **View-routing:** nieuw `view === 'bodymap'`-blok in de view-switch
  ([src/App.jsx](../../src/App.jsx) rond regel 1146, naast medication), import van de view, en een tab in
  [src/components/TabBar.jsx](../../src/components/TabBar.jsx) (`nav.bodymap`).
- **Type-plumbing (mirror van medication):**
  `emptyDefaultsForType` ([src/utils/emptyModule.js](../../src/utils/emptyModule.js)) krijgt
  `case 'bodymap': return { log: [], countInStreak: false };`;
  `migrateModuleConfig` ([src/utils/migrate.js](../../src/utils/migrate.js)) krijgt een defensief
  `bodymap`-block dat `log` naar een array coerct (ontbrekend = leeg, nooit crash);
  `NON_TRACKABLE_TYPES` ([src/utils/dayProgress.js](../../src/utils/dayProgress.js) regel 83) krijgt
  `'bodymap'`; Today-daglijst-exclusie ([src/App.jsx](../../src/App.jsx) regel 866) sluit `bodymap` uit;
  settings-modulegroep ([src/App.jsx](../../src/App.jsx) rond regel 2031) krijgt een eigen groep
  `bodymap`; ModuleEditor-seeding (`selectType`/`openModuleEditor`) krijgt default `{ log: [] }` plus een
  standaard-icoon uit `ICON_OPTIONS`; module-summary/label
  ([src/App.jsx](../../src/App.jsx) rond 2077) krijgt `modules.summary.bodymap` (bv. "{count} prikken");
  editor-note ([src/App.jsx](../../src/App.jsx) rond 3666) krijgt `modules.bodymapEditorNote`;
  `InsightView` ([src/views/InsightView.jsx](../../src/views/InsightView.jsx) regel 31) sluit `bodymap` uit.
- **i18n:** nieuwe geneste `bodymap.*`-groep (zone-labels + view-strings) plus losse plumbing-keys
  (`nav.bodymap`, `modules.types.bodymap(+Desc)`, `modules.summary.bodymap`, `modules.bodymapEditorNote`,
  `settings.moduleGroups.bodymap(+Empty)`) in **zowel** `src/i18n/nl.js` als `src/i18n/en.js`.
  `npm run check:i18n` moet groen. Geen em-dashes in user-facing tekst.

**Niet in scope (bewust):**
- **Health-preset/onboarding-wiring (H02/H05):** H04 registreert alleen het type; er wordt geen
  bodymap-module automatisch aangemaakt bij eerste start.
- **Insight-/Trends-kaart voor bodymap (H06):** `InsightView` sluit `bodymap` uit (geen `CardForModule`),
  borgen dat het niet crasht.
- **Prikschema/herinneringen, meerdere naalddieptes, naald-hergebruik-teller.**
- **Wijzigen van het H03 medication-datamodel:** `injectable` blijft de bestaande vlag; H04 leest hem
  alleen.

## Aanpak

- **Reuse-anker:** het collection/medication-opslagpatroon is de blauwdruk. `updateBodymapModule` spiegelt
  `updateCollectionModule` (App.jsx rond 540); de view spiegelt `MedicationView`; de util spiegelt
  `collections.js`/`medication.js`. Geen nieuwe persistentie-machinerie: `log` leeft in
  `settings.modules[].log` en synct mee via `isUserSyncKey('settings')`.
- **Cross-module voorraad:** prikken/undo muteren twee modules (bodymap-log én bron-medication-`supply`)
  in één `setModules`-pass, zodat log en voorraad nooit uit de pas lopen. `supply` klemt op minimaal 0.
- **Derived, niet opgeslagen:** `suggestNextZone`/`zoneLastUse` worden puur afgeleid uit `log`.
- **SVG-kleur:** hex via `getColorHex`/`glassFill`; transparante zone-vlakken via de alpha-tint-truc
  (`` `${hex}1f` ``) zoals `CounterDisplay`, nooit Tailwind-classes op de SVG.
- **Dispatch:** er is geen type-naar-component registry; elk touchpoint hierboven wordt expliciet
  bijgewerkt (mirror van hoe `medication` overal is ingehaakt).
- **i18n:** genest, exact gespiegeld in nl.js/en.js.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Een module van type `bodymap` is aan te maken via de module-editor (type-picker toont de nieuwe
      optie) en krijgt een eigen tab plus full-screen view.
- [ ] De view toont een klikbare 6-zone SVG-bodymap (buik L/R, bovenarm L/R, dij L/R); zone-kleuren
      komen via `getColorHex`/`glassFill` (hex op `fill`/`stroke`), geen Tailwind-classes op de SVG.
- [ ] De medicijnkiezer toont uitsluitend injecteerbare medicijnen (`med.injectable === true`) uit
      `medication`-modules; zonder injecteerbare meds is prikken uitgeschakeld met een duidelijke uitleg.
- [ ] Een prik registreren op een zone logt de prik (datum + zone + medicijn) én verlaagt de `supply`
      van dat medicijn met 1; dit is zichtbaar in de medicatie-view.
- [ ] Een prik verwijderen (undo/verwijder-actie) herstelt de `supply` met 1 en verwijdert de logregel.
- [ ] De app suggereert automatisch de langst-geleden/nooit gebruikte zone; die zone is visueel
      gemarkeerd in de accentkleur van het gekozen medicijn, met legenda.
- [ ] De prik-log is langlevend (leeft in `settings.modules[].log`, niet in per-dag `moduleData`),
      overleeft herladen en telt niet mee in streaks/dagvoortgang; `bodymap` staat niet in de
      Vandaag-daglijst.
- [ ] Bestaande modules en data blijven intact (backward compatible: ontbrekende `log` leest als leeg,
      nooit als crash).
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar/uitschakelbaar (module is toevoegbaar, uitschakelbaar en
      verwijderbaar, principe 2); bestaande gebruikersdata blijft veilig.
