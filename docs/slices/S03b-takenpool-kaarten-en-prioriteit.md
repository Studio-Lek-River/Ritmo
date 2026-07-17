# S03b — Takenpool: kaarten, chips en prioriteit

**Status:** concept

## Doel

De takenpool is nooit ontworpen — hij is een bijproduct van S03 (week-UI), en is daarna alleen aangevuld door S04 (duur/dagdeel), S07c (koppelingen-blok) en S08 (Trello). S07d gaf het weekrooster wel dekkende kaartjes met kleurstrip, maar sloot de pool expliciet uit (`docs/slices/S07d-agenda-persistentie-en-kaartjes.md:51`). Het gevolg: een pool-rij is een platte regel met een vinkrondje, een titel, `30 min · dagdeel`, en twee inline formuliervelden (tijd + dag) die permanent ruimte innemen.

Deze slice geeft de pool de kaart-behandeling die het rooster al heeft, maakt de herkomst van een taak zichtbaar (project + subject + bron), en legt **prioriteit** als eerste-klas veld — het staat al in het genormaliseerde item-model (`docs/ROADMAP.md:33`, `src/utils/normalizedItems.js:75,94`) maar wordt nergens geschreven of getoond.

**Ontwerp-uitgangspunt:** de pool-kaart toont uitsluitend data die Ritmo al heeft. Geen vrij invulbaar `labels`-veld — dat is bewust een latere slice.

## Scope

**Wel in scope:**

- **Kaart-vormgeving** per pool-item: 4px gekleurde linkerstrip (modulekleur), dekkende kaart-body, vette titel op een eigen regel, en een metaregel met klok-icoon + duur.
- **Chips uit bestaande data**:
  - Projecttaak: een project-chip (kleurstip + `mod.name`) en een subject-chip (`subject.name`).
  - Prioriteit-chip (`Hoog` / `Laag`) op beide soorten taken, als er een prioriteit gezet is.
  - `Diepwerk`-chip als `deepWork` gezet is (hergebruikt de bestaande key `planner.deepWork.short`).
  - Bron-kenmerk: icoon + naam ("Trello") in plaats van alleen een icoon.
- **Prioriteit als schrijfbaar veld** — `priority` (`''` | `'laag'` | `'hoog'`), optioneel, op `customTasks` en project-subgoals. Invoer via een nieuwe `PrioritySelect` naast de bestaande duur/dagdeel-controls in `TaskListPanel` en `ProjectsView`. Weergave-only in deze slice: de indeler blijft ongemoeid (zie "Bewust niet").
- **"..."-menu per kaart**: de inline `TimeInput` en de dag-`<select>` verhuizen naar een overflow-menu. Slepen blijft de primaire actie; beide niet-sleep-affordances blijven bestaan, één klik dieper (uitgangspunt 2).
- **Paneelkop**: titel wordt "Te doen" met een telling-badge rechts. Groepskoppen worden meervoud ("Losse taken" / "Projecttaken") via nieuwe keys.
- **i18n** (nl + en, key-pariteit): 7 nieuwe keys + 1 gewijzigde waarde.

**Bewust niet in scope:**

- **Een vrij `labels`-veld** op taken. De chips komen uit bestaande relaties (project/subject/bron). Aparte slice als dit gewenst blijkt.
- **Prioriteit in de indeler.** `planDay.js` `sortCandidates` blijft ongewijzigd. Reden: die functie ís het plaatsings-contract, en prioriteit heeft daar geen neutrale default — zodra één taak `hoog` is, verschuift de volgorde voor bestaande gebruikers. Elke S05/S06-toevoeging was expliciet een no-op bij default; dit zou dat patroon breken zonder `planPrefs`-uitschakelaar (uitgangspunt 2). `buildPlanInputs` (`App.jsx:1556`) wordt niet aangeraakt.
- **Prioriteit op `recurringTasks`.** De virtuele-taak-builders kopiëren `duration`/`window`/`autoPlan`/`deepWork` van het sjabloon; zonder prioriteit op het sjabloon kopiëren ze niets — consistent, geen bug.
- **`taskBoard.js` / Kanban.** Let op: `projectLabel` daar is de *subject*-naam, niet de projectnaam. Verwarrend, maar niet harmoniseren in deze slice.
- **Migratie.** `priority` is optioneel en wordt weggelaten als het leeg is; ontbreken = huidig gedrag. `normalizedItems.js` doet al `?? null` en hoeft niet te wijzigen — die gaat vanzelf echte waarden doorgeven.

## Aanpak

**Geraakte bestanden:**

- `src/utils/dayTimeline.js` — `buildDayTimeline` verbreedt het item met `projectName`, `subjectName`, `deepWork`, `priority`, op **beide** takken (leeg op losse taken, zodat de shape uniform blijft — zelfde discipline als `window: goal.window || ''`). `mod` en `subject` zijn al in scope. Nieuwe constanten `PRIORITY_OPTIONS` en `PRIORITY_COLOR` naast `WINDOW_OPTIONS`, zelfde `{ id, labelKey }`-vorm en zelfde `''`-is-geen-waarde-conventie.
- `src/components/PrioritySelect.jsx` (nieuw) — vrijwel identieke kloon van `DagdeelSelect.jsx` (~24 regels), zelfde prop-shape `{ value, onChange, theme, disabled, className }`. Geen segmented control: de rij gebruikt al `<select>` voor `window`.
- `src/components/TaskPoolPanel.jsx` — de herbouw: kop + badge, meervoud-groepskoppen, kaart-markup, "..."-menu. De bestandskop-comment (regels 10-18) beschrijft de tijd- en dagvelden nu als inline; die moet mee.
- `src/App.jsx` — `addCustomTask` accepteert `priority`; nieuwe `setTaskPriority` (kloon van `setTaskDeepWork`); doorgeven aan `ProductivitySuiteView`.
- `src/views/ProductivitySuiteView.jsx` — `onSetTaskPriority` doorgeven aan `TaskListPanel`.
- `src/components/TaskListPanel.jsx` — `PrioritySelect` in de add-rij en per taak-rij.
- `src/views/ProjectsView.jsx` — `priority` in `addSubgoal`, `setSubgoalPriority`-handler (kloon van `setSubgoalDeepWork`), `PrioritySelect` in de add-form en de subgoal-rijen.
- `src/i18n/nl.js` + `src/i18n/en.js` — zie tabel hieronder.

**Hergebruik (niet opnieuw bouwen):**

- **Kleurstrip**: het inline `borderLeft: 4px solid getColorHex(item.color)`-patroon uit `WeekView.jsx:410`. **Niet** de `.r-block`-klasse erbij: die zet `background-color: var(--r-card)`, hetzelfde token als de pool-wrapper zelf — de kaart zou onzichtbaar worden. `theme.cardSecondary` (`--r-card-2`) blijft de body.
- **Chips**: `.r-chip` (`index.css:82`) + `getColorClasses().pillBg/pillText`, zoals `KanbanView.jsx:205`. De neutrale variant (border + muted) bestaat al bij de vrij-blok-chip in `ProjectsView.jsx:694`.
- **"..."-menu**: het `MoreHorizontal` + click-outside-patroon uit `ProjectsView.jsx:344-389`, met twee afwijkingen: (1) `Escape` sluit ook — dit menu bevat formuliervelden waar je in vast kunt lopen; (2) `aria-haspopup`/`aria-expanded` op de trigger, want het is een popover en geen enkele knop.
- **Bestaande keys**: `planner.deepWork.short` ('Diepwerk'), `connections.providers.trello` ('Trello'), `common.options` ('Opties'), `planner.pool.moveToDayAria`. Geen duplicaten aanmaken.
- `TimeInput`, `SOURCE_ICONS`, `useTranslation`, de S03-drag-handlers (`onMoveItem`) — alle ongewijzigd.

**Menu-state hoort in `TaskPoolPanel`, niet in `PoolItemRow`:** één `openMenuKey`-state levert gratis dat er nooit twee menu's open staan, één click-outside-effect in plaats van N, en geen `data-*`-botsing tussen rijen. Het `ProjectsView`-patroon per rij kopiëren zou wél botsen: `e.target.closest('[data-project-menu]')` matcht dan de *andere* rij en sluit de eerste niet.

**Sleep-detail:** `draggable={!menuOpen}` op de kaart. Een native drag slokt anders de pointer-interactie met de `<input type="time">` en `<select>` in de popover op.

**i18n — nieuwe keys (identiek pad in nl.js én en.js):**

| Key | nl | en |
|---|---|---|
| `planner.pool.title` *(gewijzigde waarde)* | `Te doen` | `To do` |
| `planner.pool.countAria` | `{count} taken in de takenpool` | `{count} tasks in the task pool` |
| `planner.pool.groups.losseTaak` | `Losse taken` | `Loose tasks` |
| `planner.pool.groups.projecttaak` | `Projecttaken` | `Project tasks` |
| `planner.priority.label` | `Prioriteit` | `Priority` |
| `planner.priority.none` | `Geen prioriteit` | `No priority` |
| `planner.priority.laag` | `Laag` | `Low` |
| `planner.priority.hoog` | `Hoog` | `High` |

`productivity.types.{losseTaak,projecttaak}` blijft enkelvoud en ongewijzigd — `KanbanView.jsx:204` gebruikt het.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Elke pool-kaart heeft een 4px gekleurde linkerstrip in de modulekleur, een dekkende body, een vette titel op een eigen regel, en een metaregel met klok-icoon + duur (+ dagdeel als `window` gezet is).
- [ ] Een projecttaak toont een project-chip (kleurstip + projectnaam) en een subject-chip. Een losse taak toont die niet. Er is geen nieuw vrij `labels`-veld.
- [ ] `customTasks` en project-subgoals kunnen een optionele `priority` (`'laag'` / `'hoog'` / leeg) dragen; leeg wordt niet opgeslagen. Bestaande data zonder `priority` werkt onveranderd; geen migratie.
- [ ] De editors van losse taken (`TaskListPanel`) en project-subgoals (`ProjectsView`) tonen een prioriteit-keuze naast de bestaande duur/dagdeel-controls, in add-form én rij. Invoer is optioneel.
- [ ] Een taak met prioriteit toont een chip (`Hoog` rood-getint, `Laag` neutraal). Een taak met `deepWork` toont een `Diepwerk`-chip. Een taak van een gekoppelde bron toont icoon + bronnaam.
- [ ] `priority` wordt opgeslagen maar beïnvloedt de indeler niet: `planDay.js` en `buildPlanInputs` zijn ongewijzigd, en "Deel mijn dag in" plaatst taken exact zoals vóór deze slice.
- [ ] De tijd-invoer en dag-keuze staan niet meer inline op de kaart maar in een "..."-menu per kaart. Beide werken nog. Slepen naar een dagkolom werkt nog, en de pool is nog steeds drop-target voor een blok uit het rooster.
- [ ] Het "..."-menu sluit bij klik buiten en bij `Escape`; er kan nooit meer dan één menu tegelijk open staan.
- [ ] De paneelkop toont "Te doen" met een telling van het aantal pool-items; de groepskoppen zijn meervoud ("Losse taken" / "Projecttaken").
- [ ] Werkt in light + dark (Monday); geen hardcoded oppervlakte-kleuren of UI-tekst; dynamische kleuren via `getColorClasses` / `getColorHex`.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`; `npm run check:i18n` slaagt.
- [ ] `npm run build` groen. Geen wijzigingen buiten de scope van deze slice.

## Openstaande punten voor Bas (Poort 1)

1. **Twee niveaus of drie?** Het ontwerp toont alleen Hoog en Laag; het voorstel is twee niveaus. Een `normaal` erbij vraagt om een derde chip-kleur, anders is het niet te onderscheiden van `laag`.
2. **Trello-kaarten en het "..."-menu.** `moveItemToDay` is voor afgeleide module-ids een stille no-op (bestaand gedrag, zie de comment op `App.jsx:1566`). Het menu maakt die dode actie zichtbaarder. Voorstel: laten staan zoals het is, of het menu verbergen bij `item.source` — één regel.
3. **`planner.week.unschedule`** zegt "Terug naar takenpool" terwijl de kop straks "Te doen" heet. Voorstel: laten staan (het beschrijft het concept, niet de kop) — maar het is inconsistente copy.
