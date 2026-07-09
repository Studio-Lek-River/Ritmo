# H02 — Onboarding health-profiel

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/52 (epic #51, Ritmo Health)
**Status:** concept

## Doel

Een startprofiel-keuze op de eerste onboarding-stap (`onboardingProfile: 'full' | 'health'`, default
`'full'`) die bepaalt welke modules bij eerste start aan staan. `'full'` houdt de bestaande wizard
ongewijzigd. `'health'` slaat de per-area module-selectie over, seedt de vaste Ritmo-Health-startpreset
en opent de app meteen in de Health-modus (`appMode='health'`). Backward compatible: een ontbrekend
veld valt terug op `'full'`, bestaande gebruikers merken niets. Sluit Epic H af (zie `docs/ROADMAP.md`,
sectie "Epic H", H02).

## Scope

**Wel in scope:**
- `src/components/onboarding/WelcomeStep.jsx`: profiel-keuze UI met twee opties ("Volledig Ritmo" /
  "Ritmo Health"). `onStart` geeft de gekozen profielwaarde (`'full'` | `'health'`) door aan de wizard.
- `src/views/OnboardingView.jsx`: profiel-state naast `areaState`. Bij `'health'` → sla de AREAS-stappen
  over en commit direct de vaste health-set; bij `'full'` → ongewijzigde flow. `handleFinish` geeft het
  gekozen profiel mee aan `onComplete`.
- `src/utils/onboardingCommit.js`: nieuwe helper `buildHealthProfileModules(t)` die de vaste
  health-module-set bouwt (alle `enabled: true`, `countInStreak: false`). Hergebruikt het bestaande
  bouwpad:
  - `moduleFromPreset` / `applyModulePreset` voor de reeds bestaande presets uit `getModulePresets(t)`:
    `beweging` (counter), `bijwerkingen` (checklist) en de `measurements`-health-preset.
  - `emptyDefaultsForType` (`src/utils/emptyModule.js`) voor de types zonder onboarding-preset:
    `medication`, `bodymap`, `injectionSchedule` — een minimale module met naam/icoon/kleur.
- `src/App.jsx`: `onboardingProfile`-state + persist, gespiegeld op de bestaande `appMode`-plumbing
  (declare, load, save in het settings-blob). `onComplete` uitbreiden zodat het health-profiel bij
  commit `appMode='health'` zet en `onboardingProfile` persisteert.
- `src/utils/migrate.js`: default `onboardingProfile='full'` naast `appMode` in `migrateSettings`,
  zodat oude opgeslagen settings backward-compatible zijn.
- i18n: `onboarding.profile.*`-keys (titel + korte omschrijving per profiel) in zowel `src/i18n/nl.js`
  als `src/i18n/en.js`. Geen em-dashes.

**Niet in scope (bewust):**
- Geen wijziging aan de H07 `appMode`-toggle, aan `isHealthModule`/`HEALTH_MODULE_TYPES`, of aan de
  per-area wizard-stappen zelf (voor `'full'` blijft alles exact zoals nu).
- Geen nieuwe module-types.
- Geen migratie of aanpassing voor bestaande gebruikers (`hasOnboarded === true`); het profiel geldt
  alleen bij de eerste start.
- Geen household-chores/groceries in het health-profiel (de household-stap wordt overgeslagen).

## Aanpak

- **Reuse-anker `appMode`.** De bestaande `appMode`-plumbing (state-declaratie + load + save in het
  settings-blob in `App.jsx`, plus de default in `migrateSettings`) is de exacte blauwdruk voor
  `onboardingProfile`. Volg hetzelfde patroon; geen apart opslagmechanisme.
- **Reuse-anker module-bouwpad.** `moduleFromPreset` → `applyModulePreset` en `emptyDefaultsForType`
  vormen samen het bestaande pad om modules te instantiëren. `buildHealthProfileModules(t)` combineert
  die twee; er komt geen nieuw enable/disable-mechanisme bij.
- **Reuse-anker health-set.** `isHealthModule` / `HEALTH_MODULE_TYPES` (`src/utils/healthModules.js`)
  bevestigt welke types de health-set vormen: `measurements`, `medication`, `bodymap`,
  `injectionSchedule`, plus de generieke types met `health: true` (beweging = counter, bijwerkingen =
  checklist).
- **Data-flow.** `WelcomeStep.onStart(profile)` → `OnboardingView` (profiel-state) → bij `'health'`
  direct naar de commit met `buildHealthProfileModules(t)`, bij `'full'` de bestaande wizard →
  `onComplete(modules, profile)` in `App.jsx` zet `modules`, `hasOnboarded`, en bij `'health'` ook
  `appMode='health'` + `onboardingProfile`.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Bij eerste start (`hasOnboarded` false) toont WelcomeStep een keuze tussen "Volledig Ritmo" en
      "Ritmo Health".
- [ ] "Volledig Ritmo" laat de bestaande wizard ongewijzigd doorlopen; `onboardingProfile` wordt `'full'`.
- [ ] "Ritmo Health" slaat de module-selectiestappen over, seedt de vaste health-startpreset
      (measurements-health, medication, bodymap, injectionSchedule, beweging, bijwerkingen — alle
      `enabled`) en zet `appMode='health'`; de app opent in Health-modus.
- [ ] `onboardingProfile` wordt persistent opgeslagen; een ontbrekend veld in oude settings valt terug
      op `'full'` (via `migrateSettings`). Bestaande gebruikers merken niets.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] `npm run build` slaagt.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar/uitschakelbaar (default `'full'`); bestaande gebruikersdata blijft
      veilig.
- [ ] Lokale preview: `npm run dev` draait op http://localhost:5173; beide profielen zijn live testbaar
      (verse start → profiel kiezen → juiste module-set + modus; herladen behoudt `onboardingProfile`).
