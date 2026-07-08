# H07 — App-modus-schakelaar (Health/Standaard)

## Doel

Een persistente, omkeerbare instelling `appMode: 'standard' | 'health'` (default `'standard'`)
die de zichtbare modules en de menubalk omschakelt tussen **Standaard** (alles zoals nu) en
**Health** (alleen de gezondheidszaken), zodat de app efficiënt op één gebruiksdoel te richten is.
Laatste bouw-slice van Epic H (zie `docs/ROADMAP.md`, #56). Health-modus is een
**niet-destructieve zichtbaarheids-/navigatie-overlay**: `enabled`-vlaggen worden nooit gemuteerd.

## Kernprobleem en gekozen oplossing

`HEALTH_TYPES` (`measurements/medication/bodymap`, [HealthView.jsx](../../src/views/HealthView.jsx))
is type-based. Maar **beweging** is type `counter` en **bijwerkingen** is type `checklist` — types
die ze delen met generieke modules. Een pure type-filter zou beweging + bijwerkingen juist verbergen
(botst met #56) óf alle counters/checklists de health-set intrekken.

**Beslissingen (bevestigd door Bas):**

- **(a) Health-lidmaatschap = hybride.** Helper `isHealthModule(m)` =
  `type ∈ {measurements,medication,bodymap}` **OF** `m.health === true`. De beweging- en
  bijwerkingen-presets krijgen `health: true`; `applyModulePreset` spreidt dat verbatim op de
  aangemaakte module (`{ ...prev, ...preset }`).
- **(b) Menubalk in Health-modus** = **Gezondheid, Vandaag, Week, Maand**, met **Gezondheid eerst**.
  Verberg Reflectie, Huishouden, Projecten, Collecties. De Trends-knop en de instellingen-gear zijn
  header-knoppen en blijven altijd bereikbaar.
- **(c) Modulefilter.** Vandaag/Week/Maand tonen in Health-modus alleen modules waarvoor
  `isHealthModule(m)` waar is (in de praktijk: beweging + bijwerkingen; measurements/medication/bodymap
  staan op de Gezondheid-tab).
- **(d) Relatie H02.** H07 introduceert alleen de persistente `appMode`-state + toggle. H02
  (onboarding) zet later de initiële `enabled`-vlaggen en mag `appMode` initieel zetten. Gescheiden
  houden; H07 doet geen onboarding.

## Scope

**Wel in scope:**

- Nieuwe helper [healthModules.js](../../src/utils/healthModules.js): `HEALTH_MODULE_TYPES` en
  `isHealthModule(m)`.
- Persistente setting `appMode` (default `'standard'`, backward-compatible) via de vier touch points
  in [App.jsx](../../src/App.jsx) + default in [migrate.js](../../src/utils/migrate.js) (patroon van
  `goldenBorderEnabled`).
- `health: true` op de beweging- en bijwerkingen-presets in [presets.js](../../src/utils/presets.js).
- [TabBar.jsx](../../src/components/TabBar.jsx): `appMode`-prop; in Health-modus één rij met de vier
  health-tabs in volgorde Gezondheid, Vandaag, Week, Maand.
- View-gating fallback: bij wisselen naar Health-modus terwijl `view` op een verborgen tab staat →
  terug naar `today`.
- Modulefilter: `enabledModules` (App.jsx) en de eigen filters van Week/MonthView filteren in
  Health-modus via `isHealthModule`.
- Toggle in `SettingsModal` (theme-tab): segmented control Standaard/Health (patroon van de
  licht/donker-knoppen, geen checkbox — string-union).
- i18n: `settings.appMode*`-keys in zowel `nl.js` als `en.js`.
- Lokale dev-preview (`npm run dev`, poort 5173) opgezet en URL gemeld.

**Niet in scope (bewust):**

- Geen nieuw module-type, geen wijziging aan module-opslag.
- Geen destructieve enable/disable bij het wisselen van modus.
- Geen H02-onboardingprofiel.
- Geen refactor van de bestaande `HEALTH_TYPES`-duplicaten (HealthView.jsx, App.jsx module-groep,
  dayProgress.js, InsightView.jsx). De nieuwe helper is de enige overlay-bron; bestaande sites blijven
  ongemoeid om scope-lek te vermijden.
- Geen migratie van vóór-H07 aangemaakte beweging/bijwerkingen-modules (die missen de `health`-vlag).
  Additief en niet-destructief; geaccepteerde beperking.

## Aanpak

- **Reuse-anker:** `goldenBorderEnabled` is de exacte blauwdruk voor de settings-opslag (vier touch
  points in App.jsx + default in migrate.js). De licht/donker-knoppen in de theme-tab zijn de
  blauwdruk voor de segmented control.
- **Eén overlay-bron:** [healthModules.js](../../src/utils/healthModules.js) exporteert
  `HEALTH_MODULE_TYPES` + `isHealthModule`; alle mode-filters lopen hierdoor.
- **Health-vlag:** alleen beweging (counter) en bijwerkingen (checklist) krijgen `health: true`;
  measurements/medication/bodymap zijn al type-based gedekt. `applyModulePreset` spreidt de vlag zonder
  extra plumbing.
- **Modulefilter op één punt:** `enabledModules` (App.jsx) splitst in `baseEnabledModules` +
  mode-filter zodat Today én streak-badges meelopen; Week/MonthView krijgen `appMode` als prop en
  breiden hun bestaande filter uit met `&& (appMode !== 'health' || isHealthModule(m))`.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Er bestaat een instelling `appMode` met default `'standard'`; ontbrekend veld in oude opgeslagen
      settings valt terug op `'standard'` (backward-compatible via `migrateSettings`).
- [ ] In Instellingen → Thema staat een Standaard/Health-schakelaar; wisselen werkt live zonder
      herladen.
- [ ] In Health-modus toont de menubalk exact: Gezondheid, Vandaag, Week, Maand (Gezondheid eerst).
      Reflectie, Huishouden, Projecten, Collecties zijn verborgen. In Standaard-modus is de menubalk
      ongewijzigd (twee rijen, alles).
- [ ] De Trends-knop en de instellingen-gear blijven in beide modi bereikbaar.
- [ ] In Health-modus tonen Vandaag/Week/Maand alleen health-modules (`isHealthModule` waar): beweging
      + bijwerkingen verschijnen, generieke counters/checklists niet. In Standaard-modus tonen ze alles
      zoals nu.
- [ ] Wisselen naar Health-modus terwijl je op een verborgen tab (bv. Projecten of Reflectie) staat,
      valt terug naar Vandaag.
- [ ] Wisselen tussen modi muteert geen `enabled`-vlaggen; terug naar Standaard toont exact dezelfde
      modules als vóór het wisselen (niet-destructief).
- [ ] `isHealthModule` is één gedeelde bron (`src/utils/healthModules.js`); de beweging- en
      bijwerkingen-presets dragen `health: true`.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] `npm run build` slaagt.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is uitschakelbaar (default Standaard) en configureerbaar (principe 2); bestaande
      gebruikersdata blijft veilig.
- [ ] **Lokale preview draait:** `npm run dev` staat als achtergrondproces op http://localhost:5173,
      de app laadt, en Bas kan live wisselen tussen Standaard en Health en het effect op de menubalk
      zien.
