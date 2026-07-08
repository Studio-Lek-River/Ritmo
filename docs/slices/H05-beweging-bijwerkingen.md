# H05 — Beweging + bijwerkingen (dag-logs)

## Doel

Voeg de laatste twee dag-log-modules van de Ritmo Health-startpreset toe: **Beweging**
(dagelijkse minuten met activiteitscategorieën) en **Bijwerkingen** (per dag aanvinken welke
bijwerking optrad). Vijfde slice van epic H (zie `docs/ROADMAP.md`). Geen nieuwbouw maar
**configuratie van bestaande module-types + preset-wiring**, zó opgeslagen dat H06 er straks een
staafdiagram (beweging) en een vakjes-over-de-tijd-overzicht (bijwerkingen) op kan bouwen.

## Scope

**Wel in scope:**

- **Beweging-preset** in de `counter`-array van [presets.js](../../src/utils/presets.js)
  (ná `steps`), gemodelleerd op de bestaande `drinking`-entry (die ook `categories: t(...)`
  gebruikt): `unit:'minutes'`, `dailyGoal:30`, `presets:[10,20,30]`, `categoriesEnabled:true`,
  `categories: t('presets.beweging.categories')`, `icon:'Activity'`, `color:'green'`.
  `categoriesEnabled:true` schakelt de counter-card automatisch naar entries-mode; er is geen
  counter-code nodig.
- **Bijwerkingen-preset** in de `checklist`-array van [presets.js](../../src/utils/presets.js),
  gemodelleerd op `morningRoutine` (nameKey + `items: t(...)`): `items: t('presets.bijwerkingen.items')`,
  `icon:'HeartPulse'`, `color:'rose'` (valideer tegen de kleurpalet-keys; anders `'red'`). Geen
  `allowNotes` (geen dagnotitie). `countInStreak` defaultt op `false` via `selectType`, net als de
  andere checklist-presets — expliciet niet in de streak-set.
- **i18n** in **zowel** [nl.js](../../src/i18n/nl.js) als [en.js](../../src/i18n/en.js), in het
  bestaande `presets`-blok:
  - `presets.beweging.name` — nl `"Beweging"` / en `"Movement"`
  - `presets.beweging.categories` — array; nl `["Wandelen","Fietsen","Kracht","Zwemmen"]` /
    en `["Walking","Cycling","Strength","Swimming"]`
  - `presets.bijwerkingen.name` — nl `"Bijwerkingen"` / en `"Side effects"`
  - `presets.bijwerkingen.items` — array; nl
    `["Hoofdpijn","Misselijkheid","Vermoeidheid","Duizeligheid","Slapeloosheid","Verminderde eetlust"]`
    / en de equivalenten
- **Iconen valideren** tegen `ICON_OPTIONS` in [icons.js](../../src/utils/icons.js)
  (`Activity`, `HeartPulse`, `Footprints` bestaan).

**Niet in scope (bewust):**

- **Geen nieuw module-type**, geen wijziging aan de counter-/checklist-machinerie.
- **Geen H06-visualisaties** (beweging-staafdiagram, bijwerkingen-dot-matrix). H05 borgt alleen
  dat de data per dag terugleesbaar is.
- **Geen H02-onboardingprofiel** en geen benoemde/geëxporteerde health-module-set.
- **Geen aanpassing aan WeekView/MonthView of `dayProgress.js`.** De day-cell-grid filtert op
  *type* (`canCountInStreak(m.type)`), niet op de module-`countInStreak`-vlag; dat is bestaand
  gedrag (ook `morning`/`physio`-defaults kleuren de grid). Een bijwerkingen-checklist wordt in de
  praktijk zelden 'full' (alle bijwerkingen tegelijk), dus grid-vervuiling is verwaarloosbaar; de
  type-filter aanpassen zou bestaand gedrag breken — bewust niet doen.
- **Geen toevoeging aan `HEALTH_TYPES`** (Gezondheid-tab): dat is een type-filter; counter/checklist
  daarin opnemen zou álle counters/checklists de health-tab intrekken. Beide nieuwe modules horen in
  de Vandaag-flow.

## Aanpak

- **Reuse-anker:** `drinking` (counter met `categories: t(...)`) en `morningRoutine` (checklist met
  `items: t(...)`) zijn de exacte blauwdrukken. `applyModulePreset`
  ([applyModulePreset.js](../../src/utils/applyModulePreset.js)) materialiseert `preset.items` naar
  `{id,label}`-objecten voor checklist en spreadt counter-`categories` verbatim — geen speciale
  plumbing.
- **Automatische UI-dekking:** een nieuwe `counter`- en `checklist`-preset verschijnt vanzelf in de
  ModuleEditor-suggesties (`MODULE_PRESETS[type]`) én in de onboarding Modules-stap
  (`MODULES_TYPES` bevat beide types) — geen extra UI-code.
- **H06-borging:** Beweging bewaart per dag per categorie (`entries[].category/amount/time` in
  `moduleData`); Bijwerkingen bewaart per dag per item (`moduleData[modId][itemId].checked`). Beide
  leesbaar via `history[date]`, hetzelfde pad dat de bestaande grid gebruikt.
- **Commits:** twee `feat(presets):`-commits (Beweging, Bijwerkingen), i18n meegenomen per commit.
  Géén `Co-Authored-By: Claude`-trailer. `feat` → minor bump.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] In de module-editor "suggesties" (type = counter) staat een **Beweging**-preset; aanmaken
      levert een minuten-teller met `dailyGoal:30`, `categoriesEnabled:true` en de categorieën
      Wandelen/Fietsen/Kracht/Zwemmen; de Vandaag-card toont categorie-pills en logt per entry een
      `{category, amount, time}` in de dag-data.
- [ ] In de module-editor "suggesties" (type = checklist) staat een **Bijwerkingen**-preset;
      aanmaken levert een checklist met de standaard-bijwerkingen als items, zonder dagnotitie, niet
      in de streak-set.
- [ ] Beide presets verschijnen ook in de onboarding Modules-stap zonder extra code.
- [ ] Gelogde data is per dag terugleesbaar via `history`: Beweging per categorie/minuten,
      Bijwerkingen per item (`checked`) — zodat H06 erop kan bouwen. Geen nieuw module-type.
- [ ] Elke nieuwe string/array heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] Geen wijzigingen buiten `src/utils/presets.js` + de twee i18n-bestanden (en deze spec-doc).
- [ ] Nieuw gedrag is configureerbaar/uitschakelbaar (de modules zijn toevoegbaar, bewerkbaar en
      verwijderbaar, principe 2); bestaande gebruikersdata blijft intact (puur additief).
