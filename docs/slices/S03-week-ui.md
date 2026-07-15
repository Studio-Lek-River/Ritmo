# S03 — Week-UI (weekrooster + takenpool + legenda + cross-day)

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/96
**Status:** concept

## Doel

De dag-gerichte Planner omvormen naar een **weekrooster in Outlook-vorm** met een takenpool links en een legenda, inclusief **cross-day versleping** — volledig op bestaande data, zonder indeler, AI of nieuwe bronnen. Kanban blijft ongewijzigd. Eerste slice van de lokale offline planner (zie `docs/ROADMAP.md` §"Fase A, Planner lokaal", S03).

## Hoe de week eruitziet: gewoon een agenda

Het weekrooster toont per dagkolom **alles wat op die dag hoort**, precies als een Outlook/agenda-weekweergave:

- Items **met** een tijd staan als gekleurd blok op hun tijd in de juiste dagkolom.
- Items **zonder** tijd staan in de takenpool van de geselecteerde dag.
- Dagelijkse routines (uit `recurringTasks`) komen elke dag terug in die dag, dus je ziet ze in meerdere kolommen, zoals een herhalende agenda-afspraak. Eenmalige taken verdwijnen uit de pool zodra ze een tijd hebben.

Technische randvoorwaarde (geen zichtbaar gedrag): het tónen van een toekomstige dag mag geen bestaande opslag proactief overschrijven. De week leest de dagen af uit de al-in-geheugen `history`-map en toont routines per dag afgeleid; pas wanneer de gebruiker zelf een taak versleept of een tijd geeft, wordt dat in dat `day:<date>`-record vastgelegd. Zo blijft bestaande data veilig (principe 2), terwijl de weergave zich als een agenda gedraagt.

## Scope

**Wel in scope:**

- **`src/views/WeekView.jsx` (nieuw):** 7 dagkolommen (ma tot zo van de huidige week) plus uur-rijen (bijv. 07:00 tot 22:00). Blokken absoluut gepositioneerd per kolom op basis van `time` en een vaste default-hoogte (bijv. 30 min); `duration` alleen lezen als die al bestaat. Vandaag en de geselecteerde dag gemarkeerd. Interne Dag/Week-toggle (Dag toont één kolom). Horizontaal scrollbaar op smalle schermen.
- **Takenpool-paneel links** (nieuw `TaskPoolPanel`, of uitbreiding van `TaskListPanel`): items zonder `time` van de geselecteerde dag, gegroepeerd per bron, met kleur-accent, duur en dagdeel-hint. Sleepbaar.
- **Legenda:** Agenda (vast) / Ingepland / Voorstel. De agenda- en voorstel-stijlen mogen al als klasse bestaan, ook al zijn er in S03 nog geen externe of voorstel-blokken (haak voor de latere koppelingen en de indeler).
- **`src/views/ProductivitySuiteView.jsx`:** de Dag-tak rendert nu `WeekView` (met interne Dag/Week-toggle); de Kanban-tak blijft. Props doorgeven voor slepen, `time` zetten en dag verplaatsen.
- **Cross-day-handler in `src/App.jsx`:** verplaats een taak tussen `day:<date>`-records en zet `time`. Deterministisch en veilig voor bestaande data. Plus het laden van de zichtbare week (7 dagen) uit de `history`-map, met per dag afgeleide `recurringTasks`.
- **i18n** in nl en en (key-pariteit): nieuwe keys, voorstel `planner.week.*`, `planner.pool.*`, `planner.legend.{agenda,ingepland,voorstel}`. Hergebruik bestaande `productivity.*`- en `dates.*`-keys waar die passen.

**Niet in scope (bewust):**

- De indeler en "Deel mijn dag in" (S05), de drie standen, de afstem-voorkeuren (S06).
- Nieuwe velden zoals volledige `duration`, `window`, `autoPlan` (S04). S03 gebruikt alleen het bestaande `time` plus een default-hoogte.
- Nieuwe bronnen (eet-schema, household, Trello, Outlook). Alleen de bronnen die de Planner nu al toont: project-subgoals met deadline vandaag plus losse `customTasks`.
- Kanban-herbouw.

## Aanpak

**Geraakte bestanden:** `src/views/WeekView.jsx` (nieuw), takenpool-component (nieuw `TaskPoolPanel` of uitbreiding `src/components/TaskListPanel.jsx`), `src/views/ProductivitySuiteView.jsx`, `src/App.jsx` (cross-day-handler + week-load + prop-wiring), `src/i18n/nl.js`, `src/i18n/en.js`.

**Hergebruik (niet opnieuw bouwen):**

- `buildDayTimeline({ modules, customTasks, referenceDate, handlers })`, `dagdeelForTime`, `groupDayTimelineByHour` uit `src/utils/dayTimeline.js` — per kolom/dag aanroepen (`referenceDate` per dag). Item-shape: `{ key, kind, label, time, dagdeel, status, color, toggle, order }`.
- De `history`-map (keyed `YYYY-MM-DD` → `{ moduleData, customTasks }`) in `src/App.jsx` als bron voor de 7 zichtbare dagen; project-subgoals met `deadline === dayKey` per dag.
- Bestaande handlers `setTaskTime`, `toggleTask`, `toggleProjectSubgoal`, `addCustomTask`, `deleteTask` (App.jsx). Nieuw: één cross-day-handler.
- `getColorClasses` (Tailwind-classes, statische accenten) en `getColorHex` (alleen dynamische blok-vulling + linkerrand) uit `src/utils/colors.js`. `theme`/`r-*`-tokens voor oppervlakken; Monday-only look, light/dark via CSS `data-theme` (geen `darkMode`-ternary).
- Native HTML5 DnD-patroon uit `src/views/KanbanView.jsx` (`dataTransfer.setData('text/plain', key)` + `onDragOver preventDefault` + `onDrop` → lookup → handler). Geen DnD-library. Een toegankelijk alternatief naast slepen behouden (tijd-invoer / knop), conform principe 2.
- `TimeInput` uit `src/components/TimeInput.jsx`.
- `useTranslation` uit `src/i18n/useTranslation.js`.

**Stijlreferentie:** `RitmoPlannerPrototype.jsx` (definitief, extern aangeleverd door Bas). Vervang de inline hex uit het prototype door de repo-patronen hierboven.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] De Planner opent op een weekrooster (7 dagen, uren) met een werkende Dag/Week-toggle; Kanban werkt nog.
- [ ] Items met een `time` staan als gekleurd blok in de juiste dag en op de juiste tijd; items zonder `time` staan in de takenpool van de geselecteerde dag.
- [ ] Slepen uit de pool naar een cel zet `time`; terug naar de pool wist `time`; afvinken werkt via de bestaande handlers en schrijft correct naar `day:<date>`.
- [ ] Een taak uit de pool naar een andere dagkolom slepen verplaatst hem naar dat `day:<date>`-record en zet `time`; de bron-dag verliest het item.
- [ ] Een dagelijkse routine verschijnt op meerdere dagen in de pool; een eenmalige taak verdwijnt uit de pool zodra hij een tijd heeft.
- [ ] De legenda toont Agenda, Ingepland en Voorstel met de stijlen uit het prototype.
- [ ] Werkt in light plus dark (Monday); geen hardcoded oppervlakte-kleuren of tekst; dynamische kleuren via `getColorClasses`/`getColorHex`.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`; `npm run check:i18n` slaagt.
- [ ] `npm run build` groen. Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is optioneel en veilig voor bestaande gebruikersdata (principe 2); recurring wordt niet eager naar toekomstige dagrecords geschreven.
