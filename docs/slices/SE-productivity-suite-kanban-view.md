# SE — Productivity Suite: Kanban-view

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/70
**Status:** concept

## Doel

Vervang de Kanban-placeholder uit Slice D (#69) door een echte **Kanban-view** binnen de Productivity
Suite (epic #67, Slice E, branch `feat/desktop-system-layout`): losse taken en projecttaken als
kaartjes in drie kolommen op status — **Te doen / Bezig / Klaar**.

**Kernprobleem:** het issue vraagt drie kolommen, maar de data is puur boolean (`customTasks.done`,
`subgoal.completed`) — er is nergens een "in progress"-status.

**Poort-0-beslissingen (met Bas vastgelegd):**
- **Optioneel `status`-veld** (`'todo' | 'bezig' | 'klaar'`) op losse taken en projecttaken. Het bord
  schrijft het bij verplaatsen; ontbrekend veld valt terug op `done`/`completed`. Optioneel, geen
  migratie (principe 2).
- **Bordinhoud:** alleen losse taken + projecttaken, **alle open items** (backlog-bord, geen dag-filter
  voor projecttaken). Losse taken zijn in Ritmo dag-gescoped → het bord toont de open losse taken van
  **vandaag**; projecttaken (globaal, module-config) gaan volledig op het bord ongeacht `deadline`.
- **Interactie:** **beide** — schuifknoppen (toegankelijke fallback) én native drag-and-drop.

## Definities (mapping op bestaande bronnen)

Geen nieuw "kind"-veld op data; het type wordt afgeleid uit de bron. Kolom = afgeleide status:

| Kaart-type      | Bron                                          | Statusbron                                 |
|-----------------|-----------------------------------------------|--------------------------------------------|
| **losse taak**  | `customTasks` (vandaag)                        | `done` wint → `klaar`; anders `status`     |
| **projecttaak** | project-subgoals (`type: 'projects'`), alle    | `completed` wint → `klaar`; anders `status`|

`deriveTaskStatus`: `done`/`completed` === true → `'klaar'`; anders `status === 'bezig' ? 'bezig' :
'todo'`. Verplaatsen naar `klaar` zet `done`/`completed` = true (blijft consistent met Today/Dag);
naar `todo`/`bezig` zet het weer op false plus `status`.

## Scope

**Wel in scope:**
- **Status-handlers** in `src/App.jsx`: `setTaskStatus(id, status)` (mirror `setTaskTime`) en
  `setSubgoalStatus(projectId, subjectId, goalId, status)` (mirror `toggleProjectSubgoal`), beide
  reconciliëren `done`/`completed`. Doorgegeven aan `ProductivitySuiteView`.
- **Pure helper** `src/utils/taskBoard.js`: `KANBAN_COLUMNS`, `deriveTaskStatus`, `buildTaskBoard`
  (genormaliseerde kaarten `{ key, kind, label, column, color, projectLabel?, setStatus }`, gegroepeerd
  per kolom). Schrijft zelf niets naar opslag.
- **`src/views/KanbanView.jsx`**: drie kolommen, kaarten met titel, categorie-kleur
  (`getColorClasses(item.color)`), type-label en bij projecttaken een projectlabel-pill. Verplaatsen
  via chevron-knoppen (aria-label) én native HTML5 drag-and-drop; lege kolom/bord via bestaande
  empty-state. Uitsluitend `theme`/`r-*`-tokens + `getColorClasses`.
- **`src/views/ProductivitySuiteView.jsx`**: Kanban-tak rendert `KanbanView`; nieuwe props
  `onSetTaskStatus`, `onSetSubgoalStatus` doorgeven.
- **i18n** (nl + en, key-pariteit): `productivity.kanbanColumns.{todo,bezig,klaar}`,
  `productivity.kanbanEmpty`, `productivity.moveLeft`, `productivity.moveRight`. Ongebruikte
  `kanbanPlaceholder` verwijderen.

**Niet in scope (bewust):**
- Cross-dag backlog voor losse taken (dag-gescoped; alleen vandaag). Alleen projecttaken zijn de
  cross-time backlog.
- Herordenen binnen een kolom, WIP-limieten, kolomconfiguratie.
- Toevoegen/bewerken/verwijderen van taken vanuit het bord (blijft in de bestaande editors).
- Skin-afwerking / extra stijlen → Slice F (#71).

## Aanpak

- `src/App.jsx` — `setTaskStatus`, `setSubgoalStatus`; props doorgeven in het
  `view === 'productivity'`-blok.
- Nieuw: `src/utils/taskBoard.js`, `src/views/KanbanView.jsx`.
- `src/views/ProductivitySuiteView.jsx` — Kanban-tak + props.
- `src/i18n/nl.js` + `src/i18n/en.js` — nieuwe keys.

**Hergebruik:** `getColorClasses`/`utils/colors.js`, `theme`-object, `useTranslation`, het
`useMemo`-aggregatiepatroon en de kaart-styling uit `DagView.jsx`, `lucide-react`-iconen (geen nieuwe
dependency), en de bestaande handler-vorm (`toggleTask`, `toggleProjectSubgoal`) als template.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Kanban-view toont losse taken (vandaag) + projecttaken (alle) als kaartjes in drie kolommen
      (Te doen / Bezig / Klaar), in de juiste kolom volgens afgeleide status.
- [ ] Een kaart verplaatsen kan via knoppen **en** via slepen; `status` persisteert; `klaar` ⇔
      `done`/`completed` blijft consistent met Today en de Dag-view.
- [ ] Projecttaken tonen een projectlabel; elke kaart toont de categorie-kleur via `getColorClasses`.
- [ ] Schakelen Dag ⇄ Kanban werkt vloeiend binnen de werkruimte.
- [ ] Werkt in light + dark en in alle drie de stijlen (Strak/Levendig/Compact); geen hardcoded
      oppervlakte-kleuren of tekst — alleen `theme`/`r-*` tokens en `getColorClasses`.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt).
- [ ] `npm run build` groen.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is optioneel/veilig (principe 2): `status` is optioneel, geen migratie, bestaande
      gebruikersdata blijft zichtbaar en onbeschadigd.
