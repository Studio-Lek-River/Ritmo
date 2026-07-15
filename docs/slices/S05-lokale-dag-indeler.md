# S05 — Lokale dag-indeler + drie standen

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/98
**Status:** concept

## Doel

De derde slice van de lokale, offline Planner (`docs/ROADMAP.md` §"Fase A", ná S04). Deze slice bouwt de **deterministische ruggengraat** van de planner: een heuristische "deel mijn dag in" (`src/utils/planDay.js`) die pooled taken rond ankers (opstaan-tijd, vaste tijden) en al ingeplande blokken plaatst, volledig offline en zonder backend. Dit is de laag waar de latere LLM-planner (S11, #40) op voortbouwt en op terugvalt. De uitkomst is bedienbaar via **drie standen als instelling** (uitgangspunt 2 — configureerbaar, geen vaste keuze): Alleen voorstellen / Concept / Direct inplannen.

S04 legde de metadata (`duration`, `window`, `autoPlan`) en de vrije blokken (`freeBlock`-subgoals); die velden worden hier voor het eerst gebruikt om te plannen.

**Poort-0-beslissingen (Bas):**
- **Dag-anker:** herbruikbaar voor beide situaties. De indeler leest de wake-tijd uit een actieve slaap-module (`goalsForNight`) als dag-start; is er geen slaap-module, dan een nette fallback (08:00). `planDay` neemt `dayStart` als **parameter**, zodat een latere expliciete anker-instelling dezelfde motor kan voeden.
- **Default-stand:** `propose` ("Alleen voorstellen") — minst ingrijpend, niets vast zonder bevestiging.
- **Wat plannen:** strikt `autoPlan === true`. Items zonder `autoPlan` blijven in de pool (conform issue-tekst).

## Scope

**Wel in scope:**

- **Pure motor `src/utils/planDay.js`** (nieuw), deterministisch en storage-vrij (zelfde conventie als `dayTimeline.js`):
  ```
  planDay({ candidates, fixed, external, dayStart, dayEnd, slotStep }) →
    { assignments: [{ key, time, duration }], unplaceable: [key] }
  ```
  - `candidates` — pooled items met `autoPlan === true` en zonder `time` (`{ key, duration, window, order }`).
  - `fixed` — items die al een `time` hebben (bezette sloten/ankers): `{ time, duration }`.
  - `external` — agenda-blokken `[{ start, end }]`. Nu **leeg** (agenda-data komt in S07); de parameter en ontwijk-logica staan future-proof klaar.
  - `dayStart` / `dayEnd` — "HH:MM". `dayStart` uit slaap-wake of fallback 08:00; `dayEnd` default uit `HOUR_END` (22:00).
  - `slotStep` — snap-granulariteit, hergebruikt `DEFAULT_BLOCK_MINUTES` (30).
  - **Heuristiek:** (1) bezette intervallen uit `fixed` + `external`, geklemd op `[dayStart, dayEnd]`; (2) candidates sorteren — eerst met `window` in hun dagdeel-bereik (`DAGDEEL_THRESHOLDS` = 12:00/18:00), dan zonder `window`, binnen een groep stabiel op `order`; (3) per candidate het vroegste vrije, op `slotStep` gesnapte gat kiezen dat de `duration` (fallback `DEFAULT_BLOCK_MINUTES`) past, binnen het `window`-bereik indien gezet, anders vanaf `dayStart`; interval markeren als bezet; (4) past niets → `unplaceable` (blijft in de pool). Volledig deterministisch, geen randomness.
- **Instelling `planMode`** (`'propose' | 'concept' | 'direct'`, default `'propose'`) in settings, volgens het bestaande `appMode`-patroon (state/load/save in `src/App.jsx`). UI: segmented control in `SettingsModal` (theme-tab, naast `appMode`).
- **"Deel mijn dag in"-knop** in de suite-header (`src/views/ProductivitySuiteView.jsx`). Handler verzamelt candidates + fixed voor de geselecteerde dag, berekent `dayStart` uit de slaap-wake/fallback, roept `planDay` aan, en vertakt op `planMode`:
  - **propose** — `assignments` in een ephemere `pendingPlan`-state (niet gepersisteerd). Ghost-blokken (`.r-block-proposal`, gestreepte rand) in de dag/week-grid, elk met een **vinkje** (overnemen) en een **kruisje** (weggooien), plus een bulk-knop "alles overnemen".
  - **concept** — zelfde `pendingPlan`, gestyled als concept (`.r-block-draft`) en **aanpasbaar**: de bestaande S03-drag/`setTaskTime`-handlers werken op de concept-blokken vóór vastzetten. Acties "vastzetten" (persisteert) en "weggooien".
  - **direct** — snapshot de huidige tijden van de geraakte items, pas alle `assignments` meteen toe, en toon een toast met ongedaan-maken (`useToast`, `common.undo`) die de snapshot terugzet.
- **Rendering** van pending-blokken in `src/views/WeekView.jsx` + `src/views/DagView.jsx` met de bestaande `blockStyle(time, duration)`; per-blok acties + bulk-knop. De legenda-`voorstel`-swatch bestaat al.
- **Styling** `src/index.css`: `.r-block-draft` (concept) toevoegen in dezelfde `var(--r-*)`-tokenstijl als `.r-block-proposal`, plus kleine accept/checkmark-styling. Auto-adaptief light/dark.
- **i18n** (nl + en, key-pariteit): `settings.planMode` + `Hint` + drie stand-labels; `planner.actions.{shareDay,acceptAll,accept,discard,confirm}`; een toast-key voor direct-undo. Dagdeel-labels **hergebruiken** `productivity.dagdelen.*`; `common.undo` bestaat al.

**Niet in scope (bewust):**

- De LLM-laag (S11, #40) — deze slice is puur heuristisch/deterministisch.
- Week-plannen over 7 dagen (latere koppelingen-fase: dezelfde motor met horizon 7). De indeler werkt op de **geselecteerde dag**.
- Afstem-voorkeuren (S06) — de indeler leest ze zodra S06 er is; nu nog niet.
- Echte agenda/`external`-blokken (Outlook, S07). De `external`-parameter staat future-proof klaar maar wordt met een lege lijst aangeroepen.
- Nieuwe bronnen (Trello, GitHub), Kanban-herbouw. Geen migratie: `planMode` is optioneel met een default; ontbreken = default `propose`.

## Aanpak

**Geraakte bestanden:**

- `src/utils/planDay.js` — **nieuw**. Pure heuristische motor; hergebruikt `DAGDEEL_THRESHOLDS`, `DEFAULT_BLOCK_MINUTES`, `dagdeelForTime` uit `dayTimeline.js` en `parseHHMM` uit `sleep.js`. Geen nieuwe tijd-parsing, geen storage-toegang.
- `src/App.jsx` — `planMode`-setting (state ~106-124, load 172-191, save 306-331, exact `appMode`-patroon) + segmented control in `SettingsModal`; `pendingPlan`-state; deel-mijn-dag-handler; `dayStart` afleiden uit de slaap-module (`goalsForNight`) met fallback; accept/discard/vastzetten via bestaande `moveItemToDay`/`setTaskTime`; direct-undo via `useToast`; props threaden.
- `src/views/ProductivitySuiteView.jsx` — "Deel mijn dag in"-knop in de bestaande `flex justify-between`-header; `planMode` + handlers doorgeven.
- `src/views/WeekView.jsx`, `src/views/DagView.jsx` — pending ghost/concept-blokken renderen (`blockStyle`), per-blok vinkje/kruisje + bulk-knop.
- `src/index.css` — `.r-block-draft` + accept-styling (token-based).
- `src/i18n/nl.js` + `src/i18n/en.js` — nieuwe `planner.*` / `settings.*` keys (pariteit).

**Hergebruik (niet opnieuw bouwen):**

- Toepassen van `planDay`-uitkomst via de bestaande `moveItemToDay` / `setTaskTime` / `writeTasksForDay` (App.jsx) — de planner zelf blijft puur.
- Undo via `useToast` (`src/hooks/useToast.jsx`) — snapshot → mutate → toast met `common.undo`, patroon uit `src/views/ProjectsView.jsx` (~237).
- `DAGDEEL_THRESHOLDS`, `DEFAULT_BLOCK_MINUTES`, `dagdeelForTime` uit `src/utils/dayTimeline.js`; `goalsForNight` / `parseHHMM` uit `src/utils/sleep.js`; `blockStyle` + grid-geometrie uit `src/views/WeekView.jsx`.
- Setting-UI: het `appMode`-segmented-control-patroon in `SettingsModal`. Theming via het `theme`-object + `var(--r-*)`-tokens; dynamische kleuren via `getColorClasses` / `getColorHex`.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] `src/utils/planDay.js` is een pure, deterministische functie: dezelfde input geeft dezelfde toewijzingen en schrijft nooit naar storage.
- [ ] Alleen items met `autoPlan === true` en zonder tijd worden voorgesteld; de rest blijft in de pool. `window` stuurt het dagdeel-bereik; `duration` bepaalt de bloklengte (fallback `DEFAULT_BLOCK_MINUTES`).
- [ ] De indeler ontwijkt al ingeplande (getimede) blokken en overschrijft ze niet; de `external`-parameter voor agenda staat future-proof klaar (nu met lege lijst aangeroepen).
- [ ] Dag-start komt uit de slaap-module-wake als die er is, anders een nette fallback (08:00); werkt in beide situaties zonder nieuwe verplichte invoer.
- [ ] Drie standen als **instelling** (`planMode`, default `propose`): "Alleen voorstellen" (ghost, per stuk én in bulk overnemen), "Concept" (aanpasbaar, vastzetten of weggooien), "Direct inplannen" (meteen vast + ongedaan-maken via toast).
- [ ] Voorstel- en concept-blokken zijn ephemeer (React-state) en worden pas bij expliciete acceptatie of in de direct-stand weggeschreven; bestaande gebruikersdata blijft veilig.
- [ ] Voorstel-/concept-blokken gebruiken de prototype-stijl (gestreepte rand via `.r-block-proposal` / `.r-block-draft`, vinkje); werkt in light + dark (Monday), geen hardcoded oppervlakte-kleuren of UI-tekst; dynamische kleuren via `getColorClasses` / `getColorHex`.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`; `npm run check:i18n` slaagt. Dagdeel-labels hergebruiken `productivity.dagdelen.*`.
- [ ] `npm run build` groen. Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar/uitschakelbaar (de stand kiest de mate van ingrijpen; er gebeurt niets automatisch zonder de knop) en veilig voor bestaande data; geen migratie nodig.
