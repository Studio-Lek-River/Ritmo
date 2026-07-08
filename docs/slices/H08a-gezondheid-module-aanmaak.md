# H08a — Gezondheid & module-aanmaak vriendelijker

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/60 (deel van #59)
**Status:** concept

## Doel

De gezondheids-onboarding en het aanmaken van modules vriendelijker maken (zie Epic H in
`docs/ROADMAP.md`): één "Weight Loss"-actie die de hele health-set in één klik opzet, minder ruis in het
aanmaak-scherm, en de mogelijkheid om module-details meteen bij het aanmaken in te vullen.

## Scope

**Wel in scope:**

- **Weight Loss preset-bundel.** Eén actie (in de module-aanmaak/Health-flow) die in één klik meerdere
  modules aanzet: measurements (Gewicht/Buik/Been/Arm in **cm**) + medication + bijwerkingen (checklist,
  `health: true`) + beweging (counter, `health: true`). Hergebruikt de bestaande presets in
  `src/utils/presets.js`; geen nieuw module-type voor de bundel zelf.
  - Nieuwe metric-preset "Weight Loss" in de `measurements`-array van `buildPresets` (naast `presets.health`):
    metrics Gewicht (kg), Buik (cm), Been (cm), Arm (cm).
  - `Been`/`Arm` bestaan nog niet in `src/utils/metricLibrary.js` → nieuwe library-entries
    (`metricLibrary.leg`, `metricLibrary.arm`, unit `cm`) + i18n-keys, plus `presets.weightLoss.*`-keys.
- **Prikschema-module (net-nieuw, het zwaarste onderdeel).** Nieuw module-type `injectionSchedule` waarmee je
  inplant wanneer je prikt, welk injecteerbaar medicijn (lookup via `injectableMeds(modules)` uit
  `src/utils/bodymap.js`) en welke zone (`INJECTION_ZONES`). Herbruikt het `recurrence`/`customDays`-patroon
  van de huishoud-presets en/of `FREQUENCY_OPTIONS` uit `src/utils/medication.js` voor de frequentie.
- **"+preset" uit de Health-weergave verwijderen.** De `t('modules.measurements.addPresetShort')`-knop weg in
  `src/views/HealthView.jsx` (regel ~175-181) en in de `ModuleDetail`-header van
  `src/views/MeasurementsView.jsx` (regel ~624-632). De instellingen-gear ernaast blijft.
- **Suggesties autohiden.** In `ModuleEditor` (`src/App.jsx`, `step === 'preset'`, regel ~2903): als
  `MODULE_PRESETS[editing.type]` leeg is, de suggesties-tab niet tonen en direct naar "Zelf maken" gaan,
  i.p.v. de `modules.noSuggestions`-fallbacktekst.
- **Inline details bij aanmaken.** In de `config`-stap van `ModuleEditor` voor de types die nu alleen een note
  tonen (`medication` regel ~3777, `bodymap` regel ~3783) een inline detail-invoer toevoegen — het
  `MedFormModal` / `MedicationModuleCard`-patroon uit `src/views/MedicationView.jsx` als blauwdruk, zodat je
  bv. het eerste medicijn meteen bij het aanmaken invult.

**Niet in scope (bewust):**

- Geen categorie-datamodel om modules te groeperen (bevestigd: Weight Loss is een preset-bundel).
- Geen H02-onboardingprofiel-schakelaar; Weight Loss is een handmatige actie, geen initiële `enabled`-set.
- Geen wijziging aan de bestaande measurements/medication/bodymap-dataopslag.

## Aanpak

- **Presets:** `buildPresets(t)` in `src/utils/presets.js`; toepassen via
  `applyModulePreset(prev, preset)` in `src/utils/applyModulePreset.js`.
- **Metrics:** `createMetric` / `instantiateMetric` (`src/utils/measurements.js`, `src/utils/metricLibrary.js`);
  `cm` zit al in `MEASUREMENT_UNITS`.
- **Nieuw type registreren** op de bekende sites (er is geen centrale registry): `getTypeOptions`
  (`src/App.jsx` ~2562), `emptyDefaultsForType` (`src/utils/emptyModule.js`), `selectType` / `openModuleEditor`
  (`src/App.jsx` ~2793 / ~722), de renderer/view-routing, en de settings-typebucket (`src/App.jsx` ~2120).
- **Injectie-bouwstenen:** `injectableMeds`, `INJECTION_ZONES`, `suggestNextZone` (`src/utils/bodymap.js`);
  frequentie via `FREQUENCY_OPTIONS` (`src/utils/medication.js`) + `recurrence`-patroon.
- **Fallback:** als de Prikschema-module de PR te groot maakt, wordt hij afgesplitst naar een aparte slice
  (H08c) — dit expliciet aan Bas melden vóór het uitwaaiert.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Er is een "Weight Loss"-actie die in één klik measurements (Gewicht/Buik/Been/Arm in cm) + medication +
      bijwerkingen + beweging aanzet; bestaande modules blijven ongemoeid.
- [ ] Een `measurements`-module gemaakt via Weight Loss toont metrics Gewicht (kg), Buik (cm), Been (cm),
      Arm (cm).
- [ ] Er is een Prikschema-module waarin je een injecteerbaar medicijn (uit de medicatie-registers) en een
      bodymap-zone kiest en een frequentie/schema instelt.
- [ ] In de Health-weergave is de "+preset"-knop weg; de instellingen-gear blijft bereikbaar.
- [ ] Bij een module-type zonder presets (`medication`, `bodymap`) wordt de suggesties-tab niet getoond; je
      gaat direct naar de invoer.
- [ ] Bij het aanmaken van een `medication`- (en `bodymap`-)module kun je in het aanmaak-scherm meteen het
      eerste detail invullen i.p.v. alleen een informatienote te zien.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] `npm run build` slaagt.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar/uitschakelbaar (principe 2); bestaande gebruikersdata blijft veilig.
- [ ] **Lokale preview draait:** `npm run dev` staat als achtergrondproces op http://localhost:5173; Bas kan de
      Weight Loss-actie en de Prikschema-module live testen.
