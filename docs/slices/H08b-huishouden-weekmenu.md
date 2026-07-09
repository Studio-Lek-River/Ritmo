# H08b — Huishouden: weekmenu + secties sorteren

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/61 (deel van #59)
**Status:** concept

## Doel

Huishouden overzichtelijker maken (zie Epic H in `docs/ROADMAP.md`): de huidige "Mealplanner" (in
werkelijkheid een per-persoon Mee-eten/aanwezigheids-tracker) vervangen door een echt **weekmenu**, tekst
kunnen plakken en laten parsen naar dagen/slots, en de huishoud-secties kunnen verbergen én sorteren. Zo
vallen issue-items 5 (secties sorteren/verbergen), 6 (meal module met dag-secties), 7 (tekst plakken/parsen)
en 8 (Mee-eten verwijderen) in één slice samen.

## Scope

**Wel in scope:**

- **Weekmenu vervangt Mee-eten.** De per-persoon aanwezigheids-tracker (`src/views/household/MealPlanSection.jsx`,
  `src/views/household/MealPlanSettings.jsx`, `src/utils/mealplan.js`) wordt een weekdag-gebaseerd weekmenu:
  per weekdag (ma–zo) zes maaltijdslots — ontbijt, snack, lunch, snack, diner, snack — elk met een menu-veld.
  Structuur: Huishouden > Mealplanner > `<dag>` > Menu. Terugkerend (geen datum), opgeslagen onder de bestaande
  `household:mealplan:plan` key met een nieuwe shape.
  - `src/utils/mealplan.js` herschrijven naar het weekmenu-domein: `MENU_DAYS`, `MENU_SLOTS`,
    `emptyWeekMenu()`, `normalizeWeekMenu(raw)`, `filledSlotCount(menu)`, `parseWeekMenuText(text, opts)`.
  - De per-persoon members/status/guests/deadline-logica en `MealPlanSettings.jsx` vervallen volledig.
- **Tekst plakken & parsen.** In de weekmenu-UI een "plak tekst"-flow: een textarea + knop die via
  `parseWeekMenuText` vrije tekst naar de juiste dagen/slots omzet, met een preview/bevestiging (hergebruik
  `src/components/ConfirmDialog.jsx`) voordat het menu wordt overschreven. Tolerante parser: herkent dag-headers
  (nl+en, case-insensitief) en slot-labels (`ontbijt/breakfast`, `snack`, `lunch`, `diner/dinner`); drie snacks
  per dag worden op volgorde gevuld (1e→snack1, 2e→snack2, 3e→snack3).
- **Secties verbergen + sorteren.** De zes huishoud-secties (`chores`, `groceries`, `menu`, `fixedCosts`,
  `investments`, `utilities`) in `src/views/HouseholdView.jsx` kunnen verborgen en gesorteerd worden.
  - Nieuwe stored slice `household:sections` (eigen `useStoredState`), shape `[{ id, enabled }]` met array-positie
    = volgorde, gespiegeld op het bestaande modules-patroon. Default = de huidige render-volgorde, alles
    `enabled: true`. Defensieve normalisatie bij load: onbekende ids weg, ontbrekende ids achteraan toevoegen
    (nooit een sectie kwijtraken).
  - De sectie-render wordt data-driven: een `sectionRenderers`-map (id → het bestaande `<Section>`-blok);
    itereren over de geordende, zichtbare lijst.
  - Een "secties beheren"-paneel met per sectie omhoog/omlaag + oog-toggle (tonen/verbergen), qua patroon gelijk
    aan de reorder-UI in de `SettingsModal` van `src/App.jsx`.
- **Gedeelde reorder-util (hergebruik, principe 2).** Nieuw `src/utils/reorder.js` met pure `moveById(list, id, dir)`
  en `reorderById(list, fromId, toId)`, geëxtraheerd uit de lokale closures `moveModule`/`reorderModules` in
  `SettingsModal` (`src/App.jsx` ~1988–2009). `App.jsx` en `HouseholdView.jsx` gebruiken beide deze helpers;
  het gedrag van de bestaande modules-reorder blijft identiek.
- **Data-cleanup (migratie).** `normalizeWeekMenu` maakt van elke oude of onbekende `household:mealplan:plan`-shape
  (o.a. de date-keyed per-persoon `{ "YYYY-MM-DD": { ... } }`) gewoon een leeg weekmenu — nooit een crash. De
  obsolete keys `household:mealplan:members` en `household:mealplan:config` worden in de bestaande eenmalige
  migratie-`useEffect` van `HouseholdView.jsx` opgeruimd via `window.storage.delete` (idempotent, in try/catch).
- **i18n opschonen.** Het dode top-level `meeeten`-blok (nl.js ~515 / en.js ~514) verwijderen. Het
  `household.mealPlan.*`-blok herschrijven: per-persoon keys (guests, deadline, status, members, `settings.*`)
  weg; nieuwe keys voor de weekmenu-UI (sectie-titel/-meta, slot-labels, dag-picker, plak-tekst-flow) en het
  "secties beheren"-paneel. `sectionTitle` wordt "Weekmenu" / "Weekly menu".

**Niet in scope (bewust):**

- Geen per-persoon aanwezigheid/gasten/deadline meer; die data verdwijnt bewust (zie "Let op").
- Geen gedeelde/cloud-sync van het weekmenu; het blijft lokaal onder `household:mealplan:plan`.
- Geen wijziging aan de andere huishoud-secties zelf (chores/groceries/budget/utilities/investments), enkel hun
  volgorde/zichtbaarheid.
- Geen datum-specifieke menu's; het weekmenu is terugkerend per weekdag.

## Aanpak

- **Reorder:** `moveById` / `reorderById` in `src/utils/reorder.js`; `moveModule`/`reorderModules` in
  `src/App.jsx` roepen deze aan binnen hun bestaande `setModules(prev => ...)`-wrapper.
- **Weekmenu-model:** `emptyWeekMenu()` levert `{ mon: { breakfast:'', snack1:'', lunch:'', snack2:'', dinner:'',
  snack3:'' }, ... }`; `normalizeWeekMenu(raw)` bouwt altijd een verse volledige weekmenu en kopieert alléén
  herkende string-slotwaarden; `filledSlotCount(menu)` telt niet-lege slots voor de sectie-meta.
- **Parser:** `parseWeekMenuText(text, { dayMatchers, slotMatchers })` — regelgebaseerd, tolerant; retourneert een
  (partieel gevuld) weekmenu + een telling voor de preview.
- **UI:** `MealPlanSection` vereenvoudigt naar props `{ theme, menu, setMenu }` (dag-kiezer + 6 slot-inputs +
  plak-flow). `HouseholdView` mount het via `household:mealplan:plan` door `normalizeWeekMenu`.
- **Locale-labels:** dag-labels via de bestaande `buildLocalizedNames`/`Intl`-aanpak in `HouseholdView.jsx` of via
  i18n-keys; slot-labels via i18n.
- **Fallback:** als de slice de PR te groot maakt, wordt het "secties sorteren/verbergen"-deel afgesplitst naar
  een aparte slice — dit expliciet aan Bas melden vóór het uitwaaiert.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Huishouden > Mealplanner toont een weekmenu met ma–zo × 6 slots (ontbijt, snack, lunch, snack, diner,
      snack), elk met een bewerkbaar menu-veld; de oude per-persoon Mee-eten-tracker en zijn instellingen-modal
      zijn weg (geen dubbele module).
- [ ] Vrije tekst kan geplakt worden en wordt geparseerd naar de juiste dagen/slots, met een preview/bevestiging
      voordat het bestaande menu wordt overschreven.
- [ ] De huishoud-secties kunnen verborgen en gesorteerd worden; die keuze blijft bewaard na herladen. Default =
      huidige volgorde, niets verborgen.
- [ ] Een bestaande (oude) `household:mealplan:plan`-shape veroorzaakt geen crash; de obsolete
      `household:mealplan:members` en `household:mealplan:config` keys worden opgeruimd. Overige huishoud-data
      (chores/groceries/budget/utilities/investments) blijft ongemoeid.
- [ ] Het dode `meeeten`-i18n-blok en de vervallen `household.mealPlan.*`-per-persoon-keys zijn verwijderd; er
      staan geen verwijzingen meer naar de verwijderde keys/exports.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] `npm run build` slaagt.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar (secties verbergen/sorteren = gebruikerskeuze, principe 1) en hergebruikt
      bestaande bouwstenen (`reorder`-util, `ConfirmDialog`, `Section`, principe 2); bestaande gebruikersdata
      blijft veilig.
- [ ] **Lokale preview draait:** `npm run dev` staat als achtergrondproces op http://localhost:5173; Bas kan het
      weekmenu, de plak-parse-flow en het sorteren/verbergen van secties live testen.
