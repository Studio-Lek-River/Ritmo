# H11 — Weekmenu upgrades

Bron: [issue #80](https://github.com/Studio-Lek-River/Ritmo/issues/80)
**Status:** concept

## Doel

Twee eet-gerelateerde upgrades: (1) per-slot afvinken op het terugkerende weekmenu in Huishouden, zodat per dag zichtbaar is wat gegeten/gedaan is; (2) een `Calorieën`-teller (kcal) die net als de drinkmeter werkt, plus het beschikbaar maken van Drinken én Calorieën in Health-modus (zie `docs/ROADMAP.md`, Epic H — Ritmo Health).

## Scope

**Wel in scope:**
- Per-slot afvinkbaarheid in het weekmenu: checkbox per gevuld slot, met een per-dag indicator ("x/y gedaan" of een vinkje als alle gevulde slots af zijn) en een "alles uitvinken"-actie.
- Nieuwe `counter`-preset `Calorieën` (`unit: 'kcal'`, dagdoel, presets, `health: true`) die in de module-toevoeglijst naast Drinken verschijnt en op Vandaag/Health identiek aan de drinkmeter rendert.
- `health: true` toevoegen aan de bestaande `drinking`-preset, zodat een nieuw toegevoegde drinkmeter in Health-modus verschijnt.
- ModuleEditor-toggle "Beschikbaar in Health-modus" voor generieke tellers/checklists, zodat een **bestaande** Drinken-/Calorieën-module ook in Health-modus getoond kan worden (dekt bestaande data en principe 2).

**Niet in scope (bewust):**
- Datum-gekoppelde afvink-opslag of automatische weekreset (bewuste keuze: terugkerend per weekdag).
- Wijzigen van de weekmenu-tekstopslag `household:mealplan:plan` of de paste-parser — die blijven byte-identiek.
- Combineren van calorie- en drink-invoer in één gecombineerde kaart of gekoppelde entries.
- Wijzigingen aan measurements/medicatie of andere health-modules.

## Aanpak

**Feature 1 — Afvinkbaar weekmenu**
- Nieuwe, aparte stored state naast het plan: `useStoredState('household:mealplan:checked', {})` in `src/views/HouseholdView.jsx`, shape `{ [day]: { [slotId]: true } }`. Het bestaande plan-object blijft ongewijzigd (geen migratie, geen risico voor bestaande data).
- Kleine helpers in `src/utils/mealplan.js`: `normalizeChecked(raw)`, `toggleSlotChecked(checked, day, slotId)`, en tellers `checkedCountForDay` / `filledCountForDay` voor de indicator.
- `src/views/household/MealPlanSection.jsx`: checkbox naast elk **gevuld** slot; dagknoppen tonen een subtiele "gedaan"-status; "alles uitvinken" per week. Alleen gevulde slots zijn afvinkbaar.

**Feature 2 — Calorieën-teller + Health-modus**
- `src/utils/presets.js`: nieuwe `counter`-preset `Calorieën` (`nameKey: 'presets.calories.name'`, `icon: 'UtensilsCrossed'`, `color: 'orange'`, `unit: 'kcal'`, `dailyGoal: 2000`, `presets: [100, 250, 500]`, `counterDisplay: 'ring'`, `health: true`). `health: true` toevoegen aan de `drinking`-preset.
- ModuleEditor in `src/App.jsx` (counter/checklist-blok): toggle die `module.health` zet, default = presetwaarde. `isHealthModule` in `src/utils/healthModules.js` leest deze vlag al — geen wijziging daar nodig.
- i18n: `presets.calories.name` (+ eventuele hint) en het toggle-label in zowel `src/i18n/nl.js` als `src/i18n/en.js`. Alle `counter*`- en `units.kcal`-keys bestaan al en worden hergebruikt. NL "Calorieën" / EN "Calories".

Hergebruik: `useStoredState` (`src/hooks/useStoredState.js`), de complete counter-engine (`updateModuleData`, `day:<datum>`-opslag, `moduleStatusForDay` in `src/utils/dayProgress.js`, `CounterInsightCard`), en `isHealthModule` (`src/utils/healthModules.js`). Geen nieuw module-type (principe 1).

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Elk **gevuld** weekmenu-slot heeft een werkende checkbox; de afvinkstatus overleeft herladen (opslag onder `household:mealplan:checked`).
- [ ] Per dag is zichtbaar of/hoeveel slots gedaan zijn; er is een "alles uitvinken"-actie.
- [ ] De weekmenu-tekstopslag `household:mealplan:plan` en de paste-parser zijn ongewijzigd (bestaande menu's blijven intact).
- [ ] Een nieuwe `Calorieën`-teller is toe te voegen, telt in `kcal` met een dagdoel, en gedraagt zich als de drinkmeter (invullen, per-dag reset, insights).
- [ ] In Health-modus zijn zowel een (nieuw toegevoegde) Drinken- als Calorieën-teller zichtbaar; via de ModuleEditor-toggle kan ook een bestaande teller in Health-modus getoond/verborgen worden.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js` (`npm run check:i18n` slaagt).
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar of uitschakelbaar (principe 2); bestaande gebruikersdata blijft veilig.
