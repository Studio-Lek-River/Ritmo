# H03 — Medicatie-register (nieuw type `medication`)

## Doel

Een medicijn wordt een centraal, langlevend object binnen een `medication`-module: naam, eenheid,
dosering, voorraad, frequentie (per week), injecteerbaar-vlag en kleur. De module toont per medicijn
de afgeleide `daysLeft` (voorraad gedeeld door verbruik), markeert een medicijn als "bijna op" onder
een vaste drempel, en biedt een "besteld"-actie die de voorraad verhoogt. Medicijnen worden beheerd
in een eigen full-screen view, analoog aan collections. Derde slice van epic H (zie `docs/ROADMAP.md`);
levert de `injectable`-data die H04 (bodymap) later consumeert. Zonder afhankelijkheden.

## Scope

**Wel in scope:**
- **Nieuw type `medication`** geregistreerd in de type-picker (`getTypeOptions`,
  [src/App.jsx](../../src/App.jsx) rond regel 2390) met i18n `modules.types.medication(+Desc)`.
- **Datamodel per medicijn**, opgeslagen in het module-object (collection-patroon, niet per-dag
  `moduleData`): `{ id, name, unit, dose, supply, perWeek, injectable, color }`. De module-config is
  `{ type:'medication', meds: [...], countInStreak:false }`.
- **Afgeleide waarden (niet opslaan):** `daysLeft = round(supply * 7 / perWeek)`; "bijna op" bij
  `daysLeft <= 10` (vaste drempel, constante in de util). Nieuwe helper
  [src/utils/medication.js](../../src/utils/medication.js) met `createMed(name)`, `medDaysLeft(med)`,
  `medIsLow(med)`, `LOW_THRESHOLD_DAYS = 10` en een `FREQUENCY_OPTIONS`-lijst
  (`daily`=7, `everyOther`=3.5, `weekly`=1, `biweekly`=0.5, `triweekly`=1/3 per week), gemodelleerd
  op de stijl van [src/utils/collections.js](../../src/utils/collections.js).
- **Mutators in [src/App.jsx](../../src/App.jsx)** die het `updateCollectionModule`-patroon
  (rond regel 537-583) spiegelen: `updateMedicationModule(moduleId, mutator)` (match op
  `type==='medication'`) plus wrappers `addMed`, `updateMed`, `deleteMed`, en `orderMed`
  (= "besteld": `supply += amount`). Doorgegeven als props aan de view.
- **Eigen view [src/views/MedicationView.jsx](../../src/views/MedicationView.jsx)**, gemodelleerd op
  [src/views/CollectionsView.jsx](../../src/views/CollectionsView.jsx): een kaart per medication-module,
  per medicijn een rij met kleur-swatch, naam, dosering plus eenheid, `daysLeft`, een **"bijna op"-badge**
  bij low, en een **"besteld"-knop**. Medicijn toevoegen/bewerken via een formulier-modal (naam, eenheid
  = vrij tekstveld, dosering = getal, voorraad = getal, frequentie = preset-picker die `perWeek` zet,
  injecteerbaar = toggle, kleur = kleurkiezer). Verwijderen met bevestiging plus undo-toast, conform de
  collection-flow.
- **View-routing:** nieuw `view === 'medication'`-blok in de view-switch
  ([src/App.jsx](../../src/App.jsx) rond regel 1085, naast measurements), import van de view, en een tab in
  [src/components/TabBar.jsx](../../src/components/TabBar.jsx) (`nav.medication`).
- **Type-plumbing (mirror van collection/measurements):**
  `emptyDefaultsForType` ([src/utils/emptyModule.js](../../src/utils/emptyModule.js)) krijgt `case 'medication'`;
  `migrateModuleConfig` ([src/utils/migrate.js](../../src/utils/migrate.js)) krijgt een defensief
  `meds`-block dat ontbrekende medicijn-velden backfilt (mirror measurements-block regel 100-113);
  `NON_TRACKABLE_TYPES` ([src/utils/dayProgress.js](../../src/utils/dayProgress.js) regel 83) krijgt
  `'medication'` (catalogus-type, telt niet mee in streaks); Today-daglijst-exclusie
  ([src/App.jsx](../../src/App.jsx) regel 817) sluit medication uit;
  settings-modulegroep ([src/App.jsx](../../src/App.jsx) rond regel 1966) krijgt een eigen groep
  `medication`; ModuleEditor-seeding (`selectType`/`openModuleEditor`) krijgt default `{ meds: [] }` plus
  een standaard-icoon (`Cross`, uit `ICON_OPTIONS`); module-summary/label
  ([src/App.jsx](../../src/App.jsx) rond 2007/2107) krijgt `modules.summary.medication`
  (bijv. "{count} medicijnen").
- **Kleur via app-conventie:** medicijn-`color` is een kleur-token (zoals tag-kleuren), gerenderd als
  swatch via [src/utils/colors.js](../../src/utils/colors.js) (`getColorHex`). Bewuste afwijking van de
  letterlijke `color:hex` uit het overdrachtsdocument, ten gunste van hergebruik van het bestaande
  kleursysteem; H04 zet dit met `getColorHex`/`glassFill` om naar hex voor de SVG-bodymap.
- **i18n:** nieuwe `medication.*`-groep plus losse keys (`nav.medication`,
  `modules.types.medication(+Desc)`, `modules.summary.medication`,
  `settings.moduleGroups.medication(+Empty)`) in **zowel** `src/i18n/nl.js` als `src/i18n/en.js`.
  Keys uit het overdrachtsdocument: `myMeds, newMed, medName, medDose, medUnit, medSupply, injectable,
  addMed, freqDaily, freqEveryOther, freq1w, freq2w, freq3w, daysLeft, low, order`.
  `npm run check:i18n` moet groen. Geen em-dashes in user-facing tekst.

**Niet in scope (bewust):**
- **Priklocatie-bodymap plus prik-log (H04):** de `injectable`-vlag wordt opgeslagen maar nog nergens
  geconsumeerd; geen SVG-bodymap, geen prik-log, geen voorraad-verlaging-door-prikken.
- **Per-medicijn configureerbare "bijna op"-drempel:** vast op 10 dagen (constante).
- **Trends/insight-kaart voor medicatie (H06):** `InsightView` `CardForModule` valt via `default:null`
  terug, dus geen medicatie-insightkaart; alleen borgen dat medication `InsightView` niet laat crashen.
- **Health-preset/onboarding-wiring (H02/H05):** H03 registreert alleen het type; er wordt geen
  medication-module automatisch aangemaakt bij eerste start.
- **Prikschema/beweging/bijwerkingen** (andere Health-slices).

## Aanpak

- **Reuse-anker:** het collection-opslagpatroon is de blauwdruk. `updateMedicationModule` spiegelt
  `updateCollectionModule` (App.jsx rond 537); de view spiegelt `CollectionsView`; de util spiegelt
  `collections.js`. Geen nieuwe persistentie-machinerie: `meds` leeft in `settings.modules[].meds`
  en wordt via `setModules` gemuteerd.
- **Derived, niet opgeslagen:** `daysLeft`/`isLow` zijn puur afgeleid in `medication.js`; guard
  `perWeek <= 0` (dan geen daysLeft/geen low-badge). "besteld" is de enige weg om `supply` te verhogen
  in H03.
- **Frequentie:** preset-picker (`FREQUENCY_OPTIONS`) die `perWeek` zet, zodat de i18n-keys
  `freqDaily/freqEveryOther/freq1w/freq2w/freq3w` een-op-een matchen; `perWeek` blijft het opgeslagen veld.
- **Dispatch:** er is geen type-naar-component registry; elk touchpoint hierboven wordt expliciet
  bijgewerkt (mirror van hoe `collection`/`measurements` overal zijn ingehaakt).
- **i18n:** genest, exact gespiegeld in nl.js/en.js; onbekende EN-vertaling tijdelijk `[EN] <NL>`.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Een module van type `medication` is aan te maken via de module-editor (type-picker toont
      "Medicatie") en krijgt een eigen tab plus full-screen view.
- [ ] In de view kan een medicijn worden toegevoegd met naam, eenheid, dosering, voorraad, frequentie
      (preset), injecteerbaar-toggle en kleur; bewerken en verwijderen (met bevestiging) werkt.
- [ ] Per medicijn toont de view `daysLeft` afgeleid als `round(supply * 7 / perWeek)`; bij
      `daysLeft <= 10` verschijnt een "bijna op"-markering.
- [ ] De "besteld"-actie verhoogt de voorraad van dat medicijn, waarna `daysLeft` navenant stijgt en
      de "bijna op"-markering verdwijnt zodra boven de drempel.
- [ ] De `injectable`-vlag wordt correct opgeslagen (zichtbaar bij heropenen van het medicijn), ook al
      wordt hij in H03 nog niet elders gebruikt.
- [ ] `medication` telt niet mee in streaks/dagvoortgang en verschijnt niet in de Vandaag-daglijst;
      bestaande modules en data blijven intact (backward compatible: ontbrekende `meds` leest als leeg,
      nooit als crash).
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar/uitschakelbaar (module is toevoegbaar, uitschakelbaar en
      verwijderbaar, principe 2); bestaande gebruikersdata blijft veilig.
