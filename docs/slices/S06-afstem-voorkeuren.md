# S06 — Afstem-voorkeuren

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/99
**Status:** concept

## Doel

Een klein voorkeuren-stuk waarmee de gebruiker de lokale dag-indeler (S05, `src/utils/planDay.js`) op zichzelf afstemt: **energie per dagdeel**, **gewenste diepwerk-vensters**, en **hoeveel rust**. De indeler leest deze voorkeuren bij het plaatsen; zonder ingevulde voorkeuren gedraagt hij zich exact als in S05. Dit hoort bij `docs/ROADMAP.md` §"Fase A, Planner lokaal" en legt de basis voor de afstem-vragen die de latere AI-laag (S11, #40) actief kan uitvragen.

`planDay` is al een pure, deterministische functie die dagdelen (ochtend/middag/avond) kent via `windowRangeMinutes`/`findSlot`, maar nog geen notie heeft van energie, diepwerk of rust — dat is de schone uitbreidingshaak. Conform uitgangspunt 2 ("werkt voor de gebruiker": geen verplichte features zonder toggle) is de neutrale default gelijk aan S05-gedrag.

**Poort-0-beslissingen (Bas):**
- **Rijker model:** naast globale voorkeuren komt er een **per-taak diepwerk-tag** (uitbreiding van de S04-metadata `duration`/`window`/`autoPlan`), zodat diepwerk-vensters echt per taak matchen.
- **Eigen menu-balk:** de voorkeuren komen als extra **"Voorkeuren"**-tab in de bestaande tab-strip van de Productivity Suite (naast Dag/Kanban), niet in `SettingsModal`.

## Scope

**Wel in scope:**

- **Globale voorkeuren** als optioneel object in de bestaande `settings`-blob, default = neutraal (= S05):
  ```js
  planPrefs: {
    energy: { ochtend: 'neutral', middag: 'neutral', avond: 'neutral' }, // 'high' | 'neutral' | 'low'
    deepWorkWindows: [],   // subset van ['ochtend','middag','avond']
    rest: 'none',          // 'none' | 'light' | 'ample'  -> buffer 0 / 15 / 30 min
  }
  ```
  Default-backfill in `migrateSettings`; persist via de bestaande settings-save-effect.
- **Per-taak diepwerk-tag** `deepWork: true` (optioneel boolean, weggelaten als false) op de drie S04-bronnen: losse taken (`customTasks`), project-subgoals en recurring tasks. Rijdt mee op de bestaande save-effects; geen nieuwe opslag, geen migratie.
- **Indeler-uitbreiding** (`src/utils/planDay.js`): nieuwe optionele parameter `prefs = { energy, deepWorkWindows, rest }`, puur en deterministisch. Bij default/afwezige prefs én geen `deepWork`-tags is de output **identiek aan S05**.
  1. **Diepwerk-matching** — een kandidaat met `deepWork === true` en geen expliciet `window` krijgt zijn plaatsingsbereik beperkt tot de dagdelen in `deepWorkWindows` (indien gezet). Expliciete per-taak `window` wint altijd. Lege `deepWorkWindows` → tag heeft geen effect.
  2. **Energie-ordening** — kandidaten zónder `window` worden geplaatst door de dagdelen af te lopen in aflopende energie-volgorde (high → neutral → low, tie-break op tijdvolgorde), i.p.v. puur vroegste-slot-eerst. Alles `neutral` → tijdvolgorde = S05.
  3. **Rustbuffer** — minimale tussenruimte tussen auto-geplaatste kandidaten, door de door kandidaten toegevoegde busy-intervallen met `rest` minuten te verbreden bij de overlap-check. `none` → S05. Vaste `fixed`/agenda-blokken worden niet verschoven.
- **"Voorkeuren"-tab** in `src/views/ProductivitySuiteView.jsx` (`'voorkeuren'` in `TABS`), die de twee-koloms grid vervangt door een nieuw paneel.
- **Nieuw paneel** `src/components/PlanPreferencesPanel.jsx`: energie per dagdeel (3 segmented controls), diepwerk-vensters (dagdeel-multiselect), rust (segmented none/light/ample), plus een korte uitleg dat "leeg/neutraal" = S05-gedrag (de uitschakelbare stand).
- **Per-taak diepwerk-toggle** in `src/components/TaskListPanel.jsx` (rij + add-form), de subgoal-editor (`src/views/ProjectsView.jsx`) en `RecurringSettings` in `App.jsx`, gespiegeld op de bestaande `autoPlan`-checkbox.

**Niet in scope (bewust):**

- De AI-laag die de afstem-vragen actief uitvraagt (S11, #40).
- Vrije HH:MM-diepwerk-vensters (alleen dagdeel-granulariteit in deze slice).
- Migratie: voorkeuren zijn optioneel; ontbreken valt terug op S05-gedrag.
- Wijzigingen aan Outlook/externe agenda's of nieuwe bronnen (S07+).

## Aanpak

**Geraakte bestanden:**
- `src/utils/planDay.js` — `prefs`-param + energie/diepwerk/rust-logica; blijft puur en side-effect-vrij.
- `src/utils/migrate.js` — `migrateSettings` (L241-251) default-backfill voor `planPrefs`.
- `src/App.jsx` — `planPrefs` state/default (~L142), load-guard (~L208), save-payload + deps (~L343/L355); `setTaskDeepWork` (spiegel van `setTaskAutoPlan`, ~L1153) + subgoal/recurring-varianten; `buildPlanInputs` (~L1341) stuurt `deepWork` op `candidates`; `handleShareDay` (~L1376) geeft `planPrefs` als `prefs` aan `planDay`; `RecurringSettings` diepwerk-checkbox.
- `src/views/ProductivitySuiteView.jsx` — Voorkeuren-tab + prop-bekabeling (`planPrefs`/setter, `onSetTaskDeepWork`).
- `src/components/PlanPreferencesPanel.jsx` — **nieuw**.
- `src/components/TaskListPanel.jsx` — per-taak diepwerk-checkbox (rij L102-113 + add-form L28-41).
- `src/views/ProjectsView.jsx` — subgoal diepwerk-toggle.
- `src/i18n/nl.js` + `src/i18n/en.js` — `productivity.voorkeuren`, `planner.deepWork.{label,short}`, `planPrefs.*` (energie/diepwerk/rust labels + hints).

**Hergebruik (niet opnieuw bouwen):**
- Segmented-control-patroon `PLAN_MODE_OPTIONS` (`App.jsx:95-102`, render L2731-2747) voor de energie/rust-keuzes.
- `DagdeelSelect` / `WINDOW_OPTIONS` / `DAGDEEL_THRESHOLDS` / `dagdeelForTime` (`src/utils/dayTimeline.js`) voor dagdeel-logica en de diepwerk-vensterkeuze.
- `autoPlan`-toggle-patroon (`TaskListPanel.jsx:102-113`) en `setTaskAutoPlan` (`App.jsx:1153`) als exacte mal voor de diepwerk-tag.
- `migrateSettings` (`src/utils/migrate.js:241-251`) voor de default-backfill.

## Acceptatiecriteria

De verifier toetst deze punt voor punt. Formuleer ze toetsbaar (waarneembaar gedrag of controleerbaar bestand), niet als taak.

- [ ] `src/utils/planDay.js` blijft puur/deterministisch en schrijft nooit naar storage; met default `planPrefs` én zonder `deepWork`-tags is de output **identiek aan S05**.
- [ ] Energie: een kandidaat zónder `window` landt in het vrije dagdeel met de hoogste energie-instelling (bij alles-`neutral` ongewijzigd t.o.v. S05).
- [ ] Diepwerk: een taak met `deepWork` en gezette `deepWorkWindows` landt binnen een diepwerk-dagdeel wanneer daar een slot vrij is; lege `deepWorkWindows` → geen effect; expliciete per-taak `window` wint.
- [ ] Rust: met `rest='ample'` krijgen opeenvolgende auto-geplaatste taken de ingestelde buffer ertussen; `rest='none'` → geen buffer.
- [ ] Nieuwe **"Voorkeuren"**-tab in de suite-menubalk; schakelen Dag ⇄ Kanban ⇄ Voorkeuren werkt; wijzigingen in het paneel overleven een herlaad.
- [ ] Per-taak diepwerk-toggle op taken-, subgoal- en recurring-editors; opgeslagen als optioneel veld, standaard afwezig.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js` (`npm run check:i18n` slaagt); `npm run build` groen.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Voorkeuren zijn configureerbaar of uitschakelbaar (neutrale default = S05, principe 2); bestaande gebruikersdata blijft veilig; geen migratie.
