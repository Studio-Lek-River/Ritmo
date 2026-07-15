# S04 — Planning-metadata + vrije blokken (autoPlan)

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/97
**Status:** concept

## Doel

De tweede slice van de lokale offline planner (`docs/ROADMAP.md` §"Fase A", na S03 week-UI, vóór de indeler S05). Deze slice legt de **planning-metadata** die de latere indeler nodig heeft — `duration`, `window` (dagdeel-voorkeur) en `autoPlan` — als optionele velden op de drie bestaande bronnen, en maakt **vrije blokken** (algemene tijd-reserveringen zoals *MD coderen*, *Five Kings*, *VVD*, *Ritmo bouwen*) mogelijk als reservering op de bestaande `projects`-module, **zonder nieuw module-type** (uitgangspunt 3). De indeler zelf en de standen zijn S05; `autoPlan` wordt hier alleen als veld gelegd, nog niet gebruikt om te plannen.

**Poort-1-beslissing (Bas):** vrije blokken moeten ook echt **opduiken** in de takenpool, niet alleen als latent veld bestaan. De slice bevat dus surfacing-logica, geen puur data-veld.

## Scope

**Wel in scope:**

- **Optionele velden** op de drie bronnen — nergens verplicht, ontbreken valt terug op huidig gedrag:
  - `duration` (minuten, integer) en `window` (`'ochtend'` / `'middag'` / `'avond'` / `''`) op `customTasks`, project-subgoals en `recurringTasks`.
  - `autoPlan` (boolean, **default `false`**) op dezelfde drie bronnen — alleen gelegd, nog niet gebruikt om te plannen.
- **Vrije blokken** als project-subgoal-reservering, geen nieuw type:
  - Een subgoal krijgt een expliciete opt-in `freeBlock` (boolean, default `false`). Een vrij blok is een subgoal met `freeBlock: true` en **geen deadline**.
  - Data-veilige reden voor de expliciete vlag: bestaande subgoals zónder deadline mogen **niet** ineens de pool overspoelen (uitgangspunt 2). Alleen expliciet gemarkeerde blokken verschijnen.
  - Surfacing (`src/utils/dayTimeline.js`): een `freeBlock`-subgoal verschijnt **elke dag**. Zonder `time` → in de takenpool (ongeplande reservering); mét `time` → als dagelijks terugkerend blok op die tijd. Slepen/tijd-geven hergebruikt de bestaande S03-handlers.
- **Editors uitgebreid** (hergebruik `TimeInput`-patroon):
  - Project-subgoal-editor (`src/views/ProjectsView.jsx` add-form + rijen): duur-invoer, dagdeel-dropdown, en een "vrij blok"-toggle (deadline optioneel).
  - Losse-taken-editor (`src/components/TaskListPanel.jsx`): duur-invoer + dagdeel-dropdown.
  - Recurring-editor (`RecurringSettings` in `src/App.jsx`): duur-invoer + dagdeel-dropdown.
  - Elk met een `autoPlan`-checkbox (compacte, uitschakelbare control).
- **`WeekView` gebruikt echte `duration`** voor blok-hoogtes i.p.v. `DEFAULT_BLOCK_MINUTES`; die constante blijft als fallback (ontbrekende duur) en als drag-snap-granulariteit.
- **`TaskPoolPanel`** toont de echte duur (i.p.v. de hardcoded `±30 min`) plus een dagdeel-hint als `window` gezet is.
- **i18n** (nl + en, key-pariteit): nieuwe editor-labels; dagdeel-labels **hergebruiken** `productivity.dagdelen.{ochtend,middag,avond}` (bestaan al).

**Niet in scope (bewust):**

- De indeler zelf (S05), "Deel mijn dag in", de drie standen, afstem-voorkeuren (S06). `autoPlan` wordt hier niet gebruikt om te plannen.
- Per-dag persistente plaatsing van een vrij blok op één specifieke dag (globale subgoals herhalen daglijks — verfijning is S05).
- Nieuwe bronnen (Outlook, Trello, GitHub), Kanban-herbouw.
- Migratie: geen. Alle velden optioneel; ontbreken = huidig gedrag (default-hoogte, geen dagdeel, `autoPlan`/`freeBlock` = `false`).

## Aanpak

**Geraakte bestanden:**

- `src/utils/dayTimeline.js` — `buildDayTimeline` leest `duration`/`window` uit `goal`/`task` en zet ze op het item; emit `freeBlock`-subgoals elke dag (los van `deadline`). Item-shape breidt uit met `duration`, `window` (`dagdeel` blijft de van-`time`-afgeleide waarde; `window` is de opgeslagen voorkeur).
- `src/views/WeekView.jsx` — `blockStyle(time)` → `blockStyle(time, duration)`; hoogte = `(duration ?? DEFAULT_BLOCK_MINUTES)/60 * ROW_HEIGHT`. Call-site geeft `item.duration` mee. `DEFAULT_BLOCK_MINUTES` blijft fallback + snap.
- `src/components/TaskPoolPanel.jsx` — echte duur tonen; dagdeel-hint bij `window`. `planner.pool.durationHint` vervangen/aanvullen door een `{min} min`-key.
- `src/views/ProjectsView.jsx` — add-form + `SubgoalList`-rijen: duur, dagdeel, vrij-blok-toggle, autoPlan.
- `src/components/TaskListPanel.jsx` — add-form + rijen: duur, dagdeel, autoPlan.
- `src/App.jsx` — creators uitbreiden met de nieuwe optionele velden (weglaten indien leeg, conform de bestaande `time`-conventie): `addCustomTask`, quick-add `addProjectSubgoal`, `addRecurring` + de `RecurringSettings`-editor. `addSubgoal` in `ProjectsView.jsx`.
- `src/i18n/nl.js` + `src/i18n/en.js` — nieuwe keys onder `planner.*` / `productivity.*`.

**Hergebruik (niet opnieuw bouwen):**

- `TimeInput.jsx`-prop-shape (`{ value, onChange, theme, disabled, className }`) als model voor kleine atomic inputs. Voor duur: het bestaande `type="number"`-patroon uit de module-editor (App.jsx). Voor dagdeel: het `<select>` + `{id,labelKey}`-constant-patroon uit `InjectionScheduleView.jsx` — desgewenst een `DurationInput`/`DagdeelSelect` onder `src/components/` extraheren (drie call-sites rechtvaardigen extractie, uitgangspunt 3).
- Dagdeel-labels: `productivity.dagdelen.*` (bestaan al) — geen nieuwe labels. Extra optie "geen voorkeur" (`window = ''`) krijgt één nieuwe key.
- `useTranslation` / `t('ns.key', vars)`; `getColorClasses` / `getColorHex`; `window.storage` via de bestaande save-effects (subgoals/recurring in `settings`, customTasks in `day:*`) — geen nieuwe storage-sync.
- S03-drag/handlers (`onMoveItem`, `setTaskTime`, cross-day) blijven ongewijzigd voor het geven van een tijd aan een (vrij) blok.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] `customTasks`, project-subgoals en `recurringTasks` kunnen elk een optionele `duration` (min), `window` (ochtend/middag/avond of leeg) en `autoPlan` (default `false`) dragen; ontbreken valt terug op het huidige gedrag.
- [ ] De editors van alle drie de bronnen tonen een duur-invoer en een dagdeel-keuze; project-subgoals tonen daarnaast een "vrij blok"-toggle. Alle nieuwe velden zijn optioneel (geen verplichte invoer).
- [ ] Een subgoal met `freeBlock: true` zonder deadline verschijnt **elke dag** in de takenpool; met een tijd verschijnt hij als blok op die tijd. Een bestaand subgoal zonder deadline en zonder `freeBlock` verschijnt **niet** in de pool (geen overspoeling).
- [ ] `WeekView` gebruikt de echte `duration` voor de blok-hoogte; een blok zonder `duration` valt terug op de default-hoogte. `TaskPoolPanel` toont de echte duur (niet meer de hardcoded `±30 min`) en een dagdeel-hint als `window` gezet is.
- [ ] `autoPlan` wordt opgeslagen maar nergens gebruikt om automatisch te plannen (indeler is S05).
- [ ] Werkt in light + dark (Monday); geen hardcoded oppervlakte-kleuren of UI-tekst; dynamische kleuren via `getColorClasses` / `getColorHex`.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`; `npm run check:i18n` slaagt. Dagdeel-labels hergebruiken `productivity.dagdelen.*`.
- [ ] `npm run build` groen. Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is optioneel/uitschakelbaar en veilig voor bestaande gebruikersdata (uitgangspunt 1 & 2); geen migratie nodig.
