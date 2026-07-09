# SD — Productivity Suite: nav-entry + werkruimte + Dag-view

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/69
**Status:** concept

## Doel

Voeg een top-level entry **Productivity Suite** toe (epic #67, Slice D, branch
`feat/desktop-system-layout`) die een werkruimte opent met een **Dag | Kanban**-schakelaar. Deze
slice levert de werkruimte plus de **Dag-view**: de dag in tijdvolgorde, gegroepeerd per dagdeel,
met routines, activiteiten, losse taken en projecttaken. Kanban is in deze slice een placeholder
(volgt in Slice E, #70).

**Poort-0-beslissingen (met Bas vastgelegd):**
- **Echte kloktijden** in het datamodel. Geen enkele taak/routine/projecttaak had een tijd- of
  dagdeel-veld (alleen counter-logs en het Slaap-module gebruiken HH:MM). Er komt een **optioneel**
  `time`-veld ("HH:MM" of leeg) op de relevante bronnen; ontbrekende tijd = "Ongepland". Geen migratie.
- **Afvinken toestaan**: boolean-afronbare items (losse taak, checklist-routine, choice-routine,
  projecttaak) kunnen vanuit de Dag-view worden afgevinkt via de bestaande handlers.

## Definities (mapping op bestaande bronnen)

Geen nieuw "kind"-veld op data; het type wordt afgeleid uit de bron:

| Timeline-type   | Bron                                                            | Status-signaal          |
|-----------------|----------------------------------------------------------------|-------------------------|
| **routine**     | `checklist`-items (opstaan, tandenpoetsen…) + `choice`-modules | `checked` / `completed` |
| **activiteit**  | `counter`-modules (wandelen, lezen…)                           | `total ≥ dailyGoal`     |
| **losse taak**  | `customTasks` (incl. recurring-spawned)                        | `done`                  |
| **projecttaak** | project-subgoals (`type: 'projects'`) met deadline = vandaag    | `completed`             |

## Dagdeel-indeling (kloktijd → dagdeel)

Vaste drempels in code (constante in `dayTimeline.js`, geen verspreide magic numbers):
- **Ochtend** `< 12:00`
- **Middag** `12:00 – 17:59`
- **Avond** `≥ 18:00`
- **Ongepland** — items zonder `time`, onderaan getoond. Houdt bestaande data veilig en zichtbaar
  tot de gebruiker een tijd zet.

## Scope

**Wel in scope:**
- **Nav + routing**: entry `{ id: 'productivity', label: t('nav.productivity') }` in `getNavGroups`
  (standard mode); nieuw `view === 'productivity'`-blok in `App.jsx` `viewContent` + import. Verschijnt
  automatisch in zowel de desktop-topbalk als de mobiele `TabBar`.
- **Werkruimte** `src/views/ProductivitySuiteView.jsx`: kop + gesegmenteerde **Dag | Kanban**-toggle
  (`theme`-tokens). Dag rendert de Dag-view; Kanban rendert een placeholder ("Binnenkort", i18n-key).
- **Dag-view** (`src/views/DagView.jsx` of inline): geaggregeerde timeline, gegroepeerd per dagdeel,
  per regel: tijd (of "—" bij Ongepland), categorie/kleur (`getColorClasses(mod.color)`), type-label
  en status. Binnen een dagdeel gesorteerd op tijd, daarna op bronvolgorde.
- **Aggregatie-helper** `src/utils/dayTimeline.js` (pure, herbruikbaar): neemt `modules`,
  `moduleData`, `customTasks` + dagcontext; retourneert genormaliseerde items
  `{ key, kind, label, time, dagdeel, status, color, toggle }` + groepeer-helper. Bevat
  `dagdeelForTime(time)`.
- **Optioneel `time`-veld** + een klein herbruikbaar tijd-invoercomponent (patroon `<input
  type="time">` uit `SleepModule.jsx:203`) op:
  - `customTasks` — Vandaag-takenlijst-editor.
  - `recurringTasks` — `RecurringSettings`; `time` wordt meegekopieerd naar de gespawnde customTask
    (`App.jsx:326-336`).
  - `checklist`-items — checklist-item-editor (`App.jsx:2760-2811`).
  - `choice`- en `counter`-modules — optionele module-tijd in de module-editor.
  - project-subgoals — optionele tijd in de subgoal-editor (`ProjectsView.jsx:124-129`); `deadline`
    (datum) blijft de "vandaag"-filter.
- **Afvinken** vanuit de Dag-view via bestaande handlers, doorgegeven uit `App.jsx`:
  losse taak → `toggleTask` (`App.jsx:905`); checklist-item → `onChecklistToggle`; choice →
  `onChoiceOptionSet` (`App.jsx:1477`); projecttaak → bestaande subgoal-toggle in `ProjectsView`.
  Counter (activiteit) is niet afvinkbaar → regel navigeert naar Vandaag.
- **i18n**: nieuwe keys in **beide** `nl.js` en `en.js` (`nav.productivity`, `productivity.*`).
- **Theming**: uitsluitend `theme`/`r-*`-tokens voor oppervlakken; `getColorClasses(mod.color)` voor
  accenten. Werkt in light+dark en Strak/Levendig/Compact.

**Niet in scope (bewust):**
- **Kanban-view** zelf (alleen placeholder) → Slice E (#70).
- Skin-afwerking / extra stijlen → Slice F (#71).
- Mobiele-specifieke herindeling van de werkruimte (nav verschijnt automatisch in `TabBar`).
- Slepen/herordenen van timeline-items; notificaties/reminders op tijd.
- Configureerbare dagdeel-drempels via UI (vaste constante volstaat).

## Aanpak

- `src/components/navItems.js` — nav-entry toevoegen (standard-mode groep).
- `src/App.jsx` — import + `view === 'productivity'`-blok; props doorgeven (`modules`, `setModules`,
  `moduleData`, `customTasks`, `toggleTask`, checklist/choice-handlers, project-subgoal-toggle,
  `theme`, `darkMode`, `setView`); `time` meekopiëren in de recurring-spawn; tijd-invoer in de
  betrokken editors.
- Nieuw: `src/views/ProductivitySuiteView.jsx`, `src/views/DagView.jsx` (of inline),
  `src/utils/dayTimeline.js`.
- `src/i18n/nl.js` + `src/i18n/en.js` — nieuwe keys (key-pariteit verplicht).
- Editors met tijd-invoer: checklist-item-editor, module-editor (choice/counter), `RecurringSettings`,
  `ProjectsView` subgoal-editor, Vandaag-takenlijst.

**Hergebruik:** `getNavGroups`, `theme`-object, `getColorClasses`/`utils/colors.js`, `useTranslation`,
`<input type="time">`-patroon uit `SleepModule.jsx`, bestaande toggle-handlers, `utils/projects.js`
(`isOverdue`/`formatDeadline`) voor de "deadline = vandaag"-filter.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Nav-entry **Productivity Suite** (nl/en) opent de werkruimte met een werkende **Dag/Kanban**-toggle
      (Kanban = placeholder).
- [ ] Dag-view toont echte Ritmo-data, gegroepeerd per dagdeel (Ochtend/Middag/Avond + Ongepland), met
      onderscheid in type (routine/activiteit/losse taak/projecttaak) én status.
- [ ] Items met een kloktijd landen in het juiste dagdeel; items zonder tijd in Ongepland. Tijd is
      instelbaar op losse taken, checklist-routines, choice/counter-modules, recurring-taken en
      projecttaken. Bestaande data zonder tijd blijft zichtbaar en onbeschadigd.
- [ ] Afvinken vanuit de Dag-view werkt voor losse taak, checklist-routine, choice-routine en
      projecttaak via de bestaande handlers; schrijft correct naar `day:<date>` / module-config.
- [ ] Werkt in light + dark en in alle drie de stijlen (Strak/Levendig/Compact); geen hardcoded
      oppervlakte-kleuren of tekst — alleen `theme`/`r-*` tokens en `getColorClasses`.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt).
- [ ] `npm run build` groen.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is optioneel/uitschakelbaar (principe 2): `time` is optioneel, geen migratie,
      bestaande gebruikersdata blijft veilig.
