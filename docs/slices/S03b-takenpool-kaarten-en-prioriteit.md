# S03b — Takenpool: kaarten, chips en prioriteit

**Status:** concept

## Doel

De takenpool is nooit ontworpen — hij is een bijproduct van S03 (week-UI), en is daarna alleen aangevuld door S04 (duur/dagdeel), S07c (koppelingen-blok) en S08 (Trello). S07d gaf het weekrooster wel dekkende kaartjes met kleurstrip, maar sloot de pool expliciet uit (`docs/slices/S07d-agenda-persistentie-en-kaartjes.md:51`). Het gevolg: een pool-rij is een platte regel met een vinkrondje, een titel, `30 min · dagdeel`, en twee inline formuliervelden (tijd + dag) die permanent ruimte innemen.

Deze slice geeft de pool de kaart-behandeling die het rooster al heeft, maakt de herkomst van een taak zichtbaar (project + subject + bron), en legt **prioriteit** als eerste-klas veld — het staat al in het genormaliseerde item-model (`docs/ROADMAP.md:33`, `src/utils/normalizedItems.js:75,94`) maar wordt nergens geschreven of getoond.

**Ontwerp-uitgangspunt:** de pool-kaart toont uitsluitend data die Ritmo al heeft. Geen vrij invulbaar `labels`-veld — dat is bewust een latere slice.

**Poort-1-beslissingen (Bas):**

1. **Drie prioriteitsniveaus** — `hoog` / `normaal` / `laag`, waarbij `normaal` de default is: een taak zonder gekozen prioriteit toont een `Normaal`-chip.
2. **De chip-kleur per niveau is een gebruikersinstelling**, geen vaste keuze in de code (uitgangspunt: niets hardcoden).
3. **Trello-kaarten krijgen een eigen menu-actie** ("Openen in Trello") in plaats van de generieke tijd/dag-acties, die voor afgeleide module-ids toch stille no-ops zijn.
4. **De paneelkop blijft "Takenpool"** — niet hernoemen naar "Te doen".

## Scope

**Wel in scope:**

- **Kaart-vormgeving** per pool-item: 4px gekleurde linkerstrip (modulekleur), dekkende kaart-body, vette titel op een eigen regel, en een metaregel met klok-icoon + duur.
- **Chips uit bestaande data**:
  - Projecttaak: een project-chip (kleurstip + `mod.name`) en een subject-chip (`subject.name`).
  - Prioriteit-chip (`Hoog` / `Normaal` / `Laag`) op elke taak, in de door de gebruiker gekozen kleur.
  - `Diepwerk`-chip als `deepWork` gezet is (hergebruikt de bestaande key `planner.deepWork.short`).
  - Bron-kenmerk: icoon + bronnaam ("Trello") in plaats van alleen een icoon.
- **Prioriteit als schrijfbaar veld** — `priority` (`'hoog'` | `'normaal'` | `'laag'`), optioneel opgeslagen, op `customTasks` en project-subgoals. Invoer via een nieuwe `PrioritySelect` naast de bestaande duur/dagdeel-controls in `TaskListPanel` en `ProjectsView`. Weergave-only: de indeler blijft ongemoeid (zie "Bewust niet").
- **Instelbare prioriteitskleuren** — nieuwe `priorityPrefs` met een kleur per niveau, te kiezen via een swatch-rij in de Voorkeuren-tab van de Planner.
- **"..."-menu per kaart**: de inline `TimeInput` en de dag-`<select>` verhuizen naar een overflow-menu. Slepen blijft de primaire actie; beide niet-sleep-affordances blijven bestaan, één klik dieper (uitgangspunt 2). Voor een kaart van een gekoppelde bron bevat het menu in plaats daarvan één actie: "Openen in {bron}".
- **Paneelkop** houdt de titel "Takenpool" en krijgt een telling-badge rechts. Groepskoppen worden meervoud ("Losse taken" / "Projecttaken") via nieuwe keys.
- **i18n** (nl + en, key-pariteit): zie tabel onderaan "Aanpak".

**Bewust niet in scope:**

- **Een vrij `labels`-veld** op taken. De chips komen uit bestaande relaties (project/subject/bron). Aparte slice als dit gewenst blijkt.
- **Prioriteit in de indeler.** `planDay.js` `sortCandidates` blijft ongewijzigd. Reden: die functie ís het plaatsings-contract, en prioriteit heeft daar geen neutrale default — zodra één taak `hoog` is, verschuift de volgorde voor bestaande gebruikers. Elke S05/S06-toevoeging was expliciet een no-op bij default; dit zou dat patroon breken zonder `planPrefs`-uitschakelaar (uitgangspunt 2). `buildPlanInputs` (`App.jsx:1556`) wordt niet aangeraakt.
- **Prioriteit op `recurringTasks`.** De virtuele-taak-builders kopiëren `duration`/`window`/`autoPlan`/`deepWork` van het sjabloon; zonder prioriteit op het sjabloon kopiëren ze niets, en valt een virtuele taak terug op `normaal` — consistent, geen bug.
- **Verversen per kaart.** Verversen bestaat al per bron in het Koppelingen-blok (`SourcesPanel`); een tweede plek voor dezelfde actie is dubbel.
- **`taskBoard.js` / Kanban.** Let op: `projectLabel` daar is de *subject*-naam, niet de projectnaam. Verwarrend, maar niet harmoniseren in deze slice.
- **Migratie.** Zie "Geen migratie" hieronder.

## Aanpak

### Prioriteit: waarden, default en opslag

`PRIORITY_LEVELS = ['hoog', 'normaal', 'laag']` en `DEFAULT_PRIORITY = 'normaal'`, in `dayTimeline.js` naast `WINDOW_OPTIONS`.

**Opslag:** `priority` is optioneel en wordt **weggelaten als hij `normaal` is** — precies de `''`-is-geen-waarde-conventie die `duration`/`window` al volgen (`docs/slices/S04-planning-metadata-vrije-blokken.md:37`). Schrijven: `priority: value === DEFAULT_PRIORITY ? undefined : value`. Lezen: `goal.priority || DEFAULT_PRIORITY`.

**Geen migratie.** Een bestaande taak zonder `priority` leest als `normaal` en toont de `Normaal`-chip — de default-chip die Bas wil, zonder één byte aan bestaande data te raken. `normalizedItems.js` doet al `?? null` en hoeft niet te wijzigen; het gaat vanzelf echte waarden doorgeven zodra ze gezet worden.

**Let op — de default-chip is nieuw zichtbaar gedrag:** élke bestaande taak krijgt er een chip bij. Dat is de bedoeling (Poort-1-beslissing 1), maar het is de enige verandering in deze slice die zichtbaar is zonder dat de gebruiker iets instelt.

### Instelbare prioriteitskleuren

**Nieuw bestand `src/utils/priorityPrefs.js`** — een één-op-één kloon van het `sourcePrefs.js`-patroon, inclusief de read-time-merge die migratie overbodig maakt:

```js
export const DEFAULT_PRIORITY_COLORS = { hoog: 'red', normaal: 'amber', laag: 'blue' };

export function getPriorityColor(priorityPrefs, level) {
  const stored = priorityPrefs?.[level];
  return COLOR_OPTIONS.includes(stored) ? stored : DEFAULT_PRIORITY_COLORS[level];
}
```

De `COLOR_OPTIONS.includes`-guard volgt het bestaande consumer-side-validatie-precedent uit `WeekView.jsx:96-108`: een onbekende opgeslagen kleur valt terug op de default in plaats van een kapotte klasse op te leveren. Defaults zijn maar een startpunt — de gebruiker overschrijft ze.

**Opslag:** eigen `priorityPrefs`-key in de bestaande `settings`-blob, naast `sourcePrefs`. State in `App.jsx` naast `sourcePrefs` (`:170`), laden bij `:244`, en toevoegen aan de bestaande `saveSettings`-effect (`:368-395`, key-lijst + deps). Bewust géén sub-key van `planPrefs`: `DEFAULT_PLAN_PREFS` staat gedupliceerd in `App.jsx:124` én `migrate.js:253`, en `migrateSettings` vult `planPrefs` alleen als het hele object ontbreekt — een nieuwe sub-key zou daar nooit landen. `sourcePrefs` heeft dat probleem niet en is het bewezen patroon.

**UI:** een nieuwe sectie "Prioriteit" in `src/components/PlanPreferencesPanel.jsx` (Planner → Voorkeuren-tab), met per niveau een rij `Hoog` / `Normaal` / `Laag` en daarachter de swatch-rij uit `SourcesPanel.jsx:112-129` — `COLOR_OPTIONS.map` met `getColorClasses(color).bar` als swatch-kleur (**niet** een geïnterpoleerde `bg-${c}-500`: `.bar` is safelist-veilig) en een `ring-2`-markering op de actieve keuze. Zelfde `title`+`hint`-opbouw als de bestaande secties; zelfde patch-merge-setter als `SourcesPanel.jsx:31-36`.

### Geraakte bestanden

- `src/utils/dayTimeline.js` — `buildDayTimeline` verbreedt het item met `projectName`, `subjectName`, `deepWork`, `priority`, `url`, op **beide** takken (leeg/null op losse taken, zodat de shape uniform blijft — zelfde discipline als `window: goal.window || ''`). `mod` en `subject` zijn al in scope. Plus `PRIORITY_LEVELS` / `DEFAULT_PRIORITY`.
- `src/utils/priorityPrefs.js` (nieuw) — zie hierboven.
- `src/components/PrioritySelect.jsx` (nieuw) — vrijwel identieke kloon van `DagdeelSelect.jsx` (~24 regels), zelfde prop-shape `{ value, onChange, theme, disabled, className }`. Geen segmented control: de rij gebruikt al `<select>` voor `window`.
- `src/components/PlanPreferencesPanel.jsx` — sectie "Prioriteit" met de kleurkiezers.
- `src/components/TaskPoolPanel.jsx` — de herbouw: kop + badge, meervoud-groepskoppen, kaart-markup, "..."-menu. De bestandskop-comment (regels 10-18) beschrijft de tijd- en dagvelden nu als inline; die moet mee.
- `src/App.jsx` — `priorityPrefs`-state/load/save; `addCustomTask` accepteert `priority`; nieuwe `setTaskPriority` (kloon van `setTaskDeepWork`); doorgeven aan `ProductivitySuiteView`.
- `src/views/ProductivitySuiteView.jsx` — `onSetTaskPriority` en `priorityPrefs` doorgeven aan `TaskListPanel`, `TaskPoolPanel` en `PlanPreferencesPanel`.
- `src/components/TaskListPanel.jsx` — `PrioritySelect` in de add-rij en per taak-rij.
- `src/views/ProjectsView.jsx` — `priority` in `addSubgoal`, `setSubgoalPriority`-handler (kloon van `setSubgoalDeepWork`), `PrioritySelect` in de add-form en de subgoal-rijen.
- `src/i18n/nl.js` + `src/i18n/en.js` — zie tabel hieronder.

### Hergebruik (niet opnieuw bouwen)

- **Kleurstrip**: het inline `borderLeft: 4px solid getColorHex(item.color)`-patroon uit `WeekView.jsx:410`. **Niet** de `.r-block`-klasse erbij: die zet `background-color: var(--r-card)`, hetzelfde token als de pool-wrapper zelf — de kaart zou onzichtbaar worden. `theme.cardSecondary` (`--r-card-2`) blijft de body.
- **Chips**: `.r-chip` (`index.css:82`) + `getColorClasses().pillBg/pillText`, zoals `KanbanView.jsx:205`. De neutrale variant (border + muted) bestaat al bij de vrij-blok-chip in `ProjectsView.jsx:694`.
- **Kleurkiezer**: `SourcesPanel.jsx:112-129` + de merge-setter op `:31-36`.
- **Prefs-patroon**: `sourcePrefs.js` (`DEFAULT_*` + read-time-merge-accessor).
- **"..."-menu**: het `MoreHorizontal` + click-outside-patroon uit `ProjectsView.jsx:344-389`, met twee afwijkingen: (1) `Escape` sluit ook — dit menu bevat formuliervelden waar je in vast kunt lopen; (2) `aria-haspopup`/`aria-expanded` op de trigger, want het is een popover en geen enkele knop.
- **Externe link**: `<a target="_blank" rel="noopener noreferrer">` + `ExternalLink`-icoon uit `ProjectsView.jsx:707-716`. Provider-agnostisch label (`{provider}` interpoleren), zoals `projectsView.openBoardAria` het al doet — niet "Trello" hardcoden.
- **Bestaande keys**: `planner.deepWork.short` ('Diepwerk'), `connections.providers.trello` ('Trello'), `common.options` ('Opties'), `planner.pool.moveToDayAria`, `colors.*` (alle 11 kleurnamen bestaan al). Geen duplicaten aanmaken.
- `TimeInput`, `SOURCE_ICONS`, `useTranslation`, de S03-drag-handlers (`onMoveItem`) — alle ongewijzigd.

### Twee implementatie-details die fout gaan als je ze mist

**Menu-state hoort in `TaskPoolPanel`, niet in `PoolItemRow`.** Eén `openMenuKey`-state levert gratis dat er nooit twee menu's open staan, één click-outside-effect in plaats van N, en geen `data-*`-botsing tussen rijen. Het `ProjectsView`-patroon per rij kopiëren zou wél botsen: `e.target.closest('[data-project-menu]')` matcht dan de *andere* rij en sluit de eerste niet.

**`draggable={!menuOpen}` op de kaart.** Een native drag slokt anders de pointer-interactie met de `<input type="time">` en `<select>` in de popover op.

### i18n — nieuwe keys (identiek pad in nl.js én en.js)

| Key | nl | en |
|---|---|---|
| `planner.pool.countAria` | `{count} taken in de takenpool` | `{count} tasks in the task pool` |
| `planner.pool.groups.losseTaak` | `Losse taken` | `Loose tasks` |
| `planner.pool.groups.projecttaak` | `Projecttaken` | `Project tasks` |
| `planner.pool.openInSource` | `Openen in {provider}` | `Open in {provider}` |
| `planner.priority.label` | `Prioriteit` | `Priority` |
| `planner.priority.hoog` | `Hoog` | `High` |
| `planner.priority.normaal` | `Normaal` | `Normal` |
| `planner.priority.laag` | `Laag` | `Low` |
| `planPrefs.priority.title` | `Prioriteit` | `Priority` |
| `planPrefs.priority.hint` | `Kies een kleur per prioriteit. Deze kleuren gebruikt de takenpool voor de prioriteit-chips.` | `Pick a colour per priority. The task pool uses these colours for the priority chips.` |
| `planPrefs.priority.colorAria` | `Kleur {color} voor {priority}` | `Colour {color} for {priority}` |

`planner.pool.title` blijft `Takenpool` / `Task pool` — ongewijzigd, dus `planner.week.unschedule` ("Terug naar takenpool") blijft kloppen. `productivity.types.{losseTaak,projecttaak}` blijft enkelvoud en ongewijzigd — `KanbanView.jsx:204` gebruikt het.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Elke pool-kaart heeft een 4px gekleurde linkerstrip in de modulekleur, een dekkende body, een vette titel op een eigen regel, en een metaregel met klok-icoon + duur (+ dagdeel als `window` gezet is).
- [ ] Een projecttaak toont een project-chip (kleurstip + projectnaam) en een subject-chip. Een losse taak toont die niet. Er is geen nieuw vrij `labels`-veld.
- [ ] `customTasks` en project-subgoals kunnen een optionele `priority` (`'hoog'` / `'normaal'` / `'laag'`) dragen. `normaal` wordt niet opgeslagen; een taak zonder `priority` leest als `normaal`. Bestaande data werkt onveranderd; geen migratie.
- [ ] De editors van losse taken (`TaskListPanel`) en project-subgoals (`ProjectsView`) tonen een prioriteit-keuze naast de bestaande duur/dagdeel-controls, in add-form én rij.
- [ ] Elke taak toont een prioriteit-chip; een taak zonder gekozen prioriteit toont `Normaal`. Een taak met `deepWork` toont een `Diepwerk`-chip. Een taak van een gekoppelde bron toont icoon + bronnaam.
- [ ] De Voorkeuren-tab van de Planner heeft een sectie "Prioriteit" waar per niveau (Hoog/Normaal/Laag) een kleur gekozen wordt uit `COLOR_OPTIONS`. De keuze is meteen zichtbaar op de chips in de takenpool en blijft bewaard na herladen.
- [ ] Een gebruiker zonder opgeslagen `priorityPrefs` krijgt de defaults te zien zonder migratie; een onbekende/ongeldige opgeslagen kleur valt terug op de default in plaats van te breken.
- [ ] `priority` wordt opgeslagen maar beïnvloedt de indeler niet: `planDay.js` en `buildPlanInputs` zijn ongewijzigd, en "Deel mijn dag in" plaatst taken exact zoals vóór deze slice.
- [ ] De tijd-invoer en dag-keuze staan niet meer inline op de kaart maar in een "..."-menu per kaart. Beide werken nog. Slepen naar een dagkolom werkt nog, en de pool is nog steeds drop-target voor een blok uit het rooster.
- [ ] Het "..."-menu van een kaart van een gekoppelde bron toont uitsluitend "Openen in {bron}", die de kaart-URL in een nieuw tabblad opent (`rel="noopener noreferrer"`). Geen tijd/dag-acties die stil niets doen.
- [ ] Het "..."-menu sluit bij klik buiten en bij `Escape`; er kan nooit meer dan één menu tegelijk open staan.
- [ ] De paneelkop toont "Takenpool" met een telling van het aantal pool-items; de groepskoppen zijn meervoud ("Losse taken" / "Projecttaken").
- [ ] Werkt in light + dark (Monday); geen hardcoded oppervlakte-kleuren, chip-kleuren of UI-tekst; dynamische kleuren via `getColorClasses` / `getColorHex`.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`; `npm run check:i18n` slaagt.
- [ ] `npm run build` groen. Geen wijzigingen buiten de scope van deze slice.
