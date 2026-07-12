# H10 — Medicijnplanner (dagrooster + inname-log op `medication`)

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/81
**Status:** concept

## Doel

Aan de hand van starttijd en interval een **dagrooster** per medicijn voorstellen: een medicijn moet elke
*X* uur na inname herhaald worden. De gebruiker stelt starttijd, interval en het aantal doses per dag in en
logt per dag wanneer een dosis is ingenomen, zodat direct zichtbaar wordt wanneer de volgende dosis die dag
moet. Tiende slice van epic H (Health, zie `docs/ROADMAP.md`): de ontbrekende kloktijd-laag bovenop het
medicatie-register uit H03. Bouwt voort op het bestaande `medication`-type; geen nieuw module-type
(principe 1: hergebruik).

## Scope

**Wel in scope:**

- **Roostervelden op het med-object** in [src/utils/medication.js](../../src/utils/medication.js),
  toegevoegd aan `createMed` als opt-in defaults (default uit, zodat bestaande meds ongewijzigd blijven):
  `scheduleEnabled: false`, `startTime: '08:00'` (`'HH:MM'`), `intervalHours: 0` (decimaal, bv. `2.5`),
  `dosesPerDay: 1`, en `intakeLog: []` met events `{ date: 'YYYY-MM-DD', time: 'HH:MM' }`. De inname-log
  spiegelt het `module.log`-patroon van [src/utils/bodymap.js](../../src/utils/bodymap.js) (`logInjection`),
  maar per medicijn.
- **Pure helpers** in hetzelfde bestand (met interne `timeToMinutes`/`minutesToTime`, gemodelleerd op
  [src/utils/dayTimeline.js](../../src/utils/dayTimeline.js)):
  - `medIntakesForDay(med, dateKey)` — gesorteerde `'HH:MM'`-lijst van die dag ingenomen doses.
  - `medScheduleForDay(med, dateKey)` — lijst slots `{ index, time, status }`, `status ∈ taken|next|upcoming`.
    **Dynamisch:** slot `i < aantalGenomen` = `taken` (werkelijke tijd); de eerstvolgende openstaande slot =
    `next` op `laatste inname + intervalHours` (of `startTime` als er nog niets is ingenomen); latere slots =
    `upcoming`, geprojecteerd vanaf `next` met `intervalHours`. Levert `dosesPerDay` slots.
  - `medNextDue(med, dateKey)` — `'HH:MM'` van de eerstvolgende openstaande dosis, of `null` als alles op is.
  - Guards: `intervalHours <= 0` of `dosesPerDay <= 1` → één dosis op `startTime`, geen projectie; ontbrekende
    velden lezen als de defaults (nooit een crash).
- **Handler `logMedIntake(moduleId, medId, time)`** in [src/App.jsx](../../src/App.jsx), via het bestaande
  `updateMedicationModule`-patroon (rond L711): voegt `{ date: todayKey(), time }` toe aan `med.intakeLog`.
  Undo verwijdert de laatste entry (toast met `common.undo`, zoals de bodymap-log). Doorgegeven via het
  bestaande `healthViewProps`-object.
- **MedFormModal-uitbreiding** ([src/views/MedicationView.jsx](../../src/views/MedicationView.jsx)): sectie
  "Dagrooster" met een `scheduleEnabled`-toggle; is die aan, dan `startTime` via
  [src/components/TimeInput.jsx](../../src/components/TimeInput.jsx), `intervalHours` (number, `step=0.5`,
  min 0) en `dosesPerDay` (number, min 1). Hergebruik het bestaande veld-/label-stijlpatroon uit de modal.
- **Nieuwe kaart `MedicationScheduleCard`** (in MedicationView.jsx): scant de enabled `medication`-modules op
  meds met `scheduleEnabled`, toont per medicijn de doses van vandaag (`medScheduleForDay`) met
  taken/next/upcoming-status, de eerstvolgende tijd, een teller "x/N ingenomen" en een **"Ingenomen"-knop**
  die `logMedIntake` met de huidige kloktijd aanroept. Overdue-markering als de `next`-tijd in het verleden
  ligt.
- **Vandaag-plaatsing:** de kaart bovenaan [src/views/TodayView.jsx](../../src/views/TodayView.jsx)
  (standard-modus) en in [src/views/HealthView.jsx](../../src/views/HealthView.jsx) (health-modus), alleen
  gerenderd als er minstens één med met `scheduleEnabled` bestaat. `medication` blijft NON_TRACKABLE en buiten
  de streak-daglijst; de kaart is een aparte surface.
- **Backward-compat:** het bestaande `meds`-backfill-blok in [src/utils/migrate.js](../../src/utils/migrate.js)
  krijgt defaults voor de nieuwe velden (`scheduleEnabled/startTime/intervalHours/dosesPerDay/intakeLog`).
- **i18n:** nieuwe keys onder de bestaande `medication.*`-groep (bv. `schedule`, `scheduleEnable`, `startTime`,
  `interval`, `dosesPerDay`, `nextDose`, `takeNow`, `takenCount`, `overdue`, `noScheduledMeds`) in **zowel**
  [src/i18n/nl.js](../../src/i18n/nl.js) als [src/i18n/en.js](../../src/i18n/en.js). Geen em-dashes.

**Niet in scope (bewust):**

- **Voorraad-verlaging bij inname:** `supply` blijft alleen via de "besteld"-flow muteren; inname logt tijd,
  niet voorraad.
- **Notificaties/reminders:** Ritmo heeft geen reminder-engine; de planner is puur visueel.
- **Per-weekdag- of meerdaags patroon:** het rooster is elke dag identiek op basis van de instellingen.
- **Wijziging aan `injectionSchedule` of de bodymap.**

## Aanpak

- **Reuse-ankers:** `TimeInput` voor de starttijd; het `updateMedicationModule`-mutatorpatroon en de
  undo-toast-flow van de injectie-/bodymap-log; het `meds`-backfill-blok in `migrate.js`; de nested-i18n-
  conventie. De schedule-berekening is puur en afgeleid (nooit opgeslagen behalve `intakeLog`).
- **Dynamisch model:** de enige opgeslagen dag-toestand is `intakeLog`; alle slots/next-due volgen daaruit +
  de config. Zo schuift het rooster mee als een dosis later wordt ingenomen, zonder extra opslag.
- **Dispatch:** er is geen type-naar-component-registry; elk touchpoint (MedFormModal, kaart, TodayView,
  HealthView, App-handler, migrate) wordt expliciet bijgewerkt, mirror van hoe H03/H04 zijn ingehaakt.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Een medicijn kan een dagrooster krijgen: `scheduleEnabled`-toggle plus starttijd, interval (uren,
      decimaal) en doses/dag; de instellingen blijven behouden bij het heropenen van het medicijn.
- [ ] `medScheduleForDay` levert de juiste doses: dynamisch schuivend op basis van werkelijke inname (volgende
      dosis = laatste inname plus interval), terugvallend op de starttijd als er die dag niets is ingenomen.
- [ ] Een Vandaag-kaart toont per rooster-medicijn de doses van vandaag, de eerstvolgende tijd en een teller;
      "Ingenomen" logt de huidige tijd, de kaart werkt bij, en de actie is te ondoen (undo).
- [ ] De kaart verschijnt alleen als er minstens één med met `scheduleEnabled` is; meds zonder rooster en
      bestaande modules blijven ongewijzigd (migratie backfilt ontbrekende velden, nooit een crash).
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is opt-in/uitschakelbaar (rooster default uit, principe 2); bestaande gebruikersdata
      blijft veilig.
