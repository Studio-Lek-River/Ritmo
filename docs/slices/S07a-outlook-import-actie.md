# S07a — Outlook-agenda: expliciete import-actie

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/111
**Status:** concept

## Doel

Vervolg op S07 (Outlook lezen, #108). In de Planner (`view === 'productivity'`) wordt de
Outlook-agenda nu **automatisch en onzichtbaar** opgehaald zodra Outlook verbonden is én de Planner
open staat — de gebruiker heeft geen zichtbaar aangrijpingspunt en zonder koppeling gebeurt er
stilte. Deze slice geeft de gebruiker één **expliciete, ontdekbare knop** om de agenda te
importeren/vernieuwen, met een duidelijke hint-staat wanneer er geen koppeling is. Past bij de
integrale planner uit `docs/ROADMAP.md` §"Fase B, Koppelingen (lezen)".

**Poort-0-beslissing (Bas):** **alleen een knop** "Outlook-agenda importeren / vernieuwen", géén
toggle. De Planner start bij openen **leeg**; klikken haalt de zichtbare week (opnieuw) op. Dit is
de meest expliciete lezing en sluit aan op uitgangspunt 2 (geen opgelegd gedrag, geen
achtergrondverkeer bij openen).

## Scope

**Wel in scope:**

- **Expliciete import-knop** in de header van de Planner-dag-tab, met drie staten:
  1. **Niet verbonden** → een muted hint-control "Koppel Outlook via Account → Koppelingen" die
     deep-linkt naar Settings → Account → Koppelingen. Geen stille no-op.
  2. **Verbonden, nog niet geïmporteerd** → knop "Outlook-agenda importeren"; klik zet de agenda
     "getoond" en haalt de zichtbare week op.
  3. **Verbonden, geïmporteerd** → knop "Outlook-agenda vernieuwen"; klik haalt de huidige week
     opnieuw op.
- **Niet-persistente "getoond"-state** (`agendaShown`, default `false`) in `src/App.jsx`, naast
  `view`. De fetch (`useOutlookEvents.enabled`) wordt gegate op
  `verbonden && Planner open && agendaShown` — dus **geen fetch bij Planner-open** tot de klik.
- **`refetch` + `error`** toevoegen aan `useOutlookEvents` (nu alleen `{ eventsByDate, loading }`),
  zodat "vernieuwen" de huidige range opnieuw kan ophalen en fouten zichtbaar worden.
- **Laadstaat** op de knop (disabled + spinner-icoon) via de hook-`loading`.
- **Fout-melding via toast** (`useToast`) i.p.v. het huidige stille `console.warn`-slikken.
- **i18n** (nl + en, key-pariteit): nieuwe keys onder `planner.outlook.*`.

**Niet in scope (bewust):**

- Wijzigingen aan de `WeekView`-rendering van `r-block-agenda`, aan `src/utils/outlookEvents.js`
  (normalisatie), of aan de OAuth-/events-endpoints — die blijven ongewijzigd.
- Een **persistente** "agenda tonen"-voorkeur — bewust niet: de knop-keuze wil een lege start per
  sessie.
- Wegschrijven naar Outlook (S12) en de persistente agenda-cache/feed (S10).
- Trello (#37) / GitHub (#38) leesbronnen.

## Aanpak

**Geraakte bestanden:**

- `src/hooks/useOutlookEvents.js` — `refetch` (herhaalt de fetch voor de huidige range) en `error`
  toevoegen aan de return. Ephemeer gedrag en de `cancelled`-guard blijven; de `enabled`-gate
  blijft (App.jsx breidt de conditie uit met `agendaShown`).
- `src/App.jsx` — nieuwe niet-persistente state `agendaShown`; `enabled` uitbreiden naar
  `!!outlookConnection && view === 'productivity' && agendaShown`; naar `ProductivitySuiteView`
  doorgeven: `outlookConnected` (bool), `agendaShown`, `agendaLoading` (hook-`loading`),
  `onImportOrRefreshAgenda` (zet `agendaShown` of roept `refetch` aan) en `onOpenConnections`
  (`setSettingsInitialTab('account'); setShowSettings(true)`). Hook-`error` → toast.
- `src/views/ProductivitySuiteView.jsx` — de nieuwe Outlook-control in de bestaande
  header-actiegroep renderen, **alleen wanneer `tab === 'dag'`**. Nieuwe props doorvoeren.
- `src/i18n/nl.js` + `src/i18n/en.js` — nieuwe keys onder `planner.outlook.*` (o.a. `import`,
  `refresh`, `loading`/aria, `notConnectedHint`, `fetchFailed`) met pariteit.

**Hergebruik (niet opnieuw bouwen):**

- Het actieknop-patroon en de `theme`-tokens uit `src/views/ProductivitySuiteView.jsx` (`:88-95`,
  geen rauwe kleuren); de muted-hint-idioom uit `src/components/TaskPoolPanel.jsx` (`.empty`).
- `lucide-react`-icoon (`w-4 h-4`), zoals `WandSparkles`.
- `useToast` / `src/hooks/useToast.jsx` voor de fout-/statusmelding.
- De bestaande deep-link via `settingsInitialTab` (`src/App.jsx`), niet een nieuwe navigatieroute.
- De ongewijzigde `WeekView`-rendering van `r-block-agenda` en `externalBlocksForDay`.
- `useTranslation` / `t()` voor alle teksten.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] **AC1** — In de dag-tab van de Planner staat een expliciete, ontdekbare knop om de
  Outlook-agenda te importeren/vernieuwen.
- [ ] **AC2** — Met een verbonden koppeling toont de knop na klik de afspraken van de zichtbare
  week als read-only `r-block-agenda`-blokken; opnieuw klikken vernieuwt de huidige week.
- [ ] **AC3** — Zonder koppeling toont de Planner een duidelijke hint met deep-link naar Account →
  Koppelingen (geen stille no-op).
- [ ] **AC4** — Geen fetch bij Planner-open zonder klik, en geen achtergrondverkeer zonder
  koppeling: `useOutlookEvents.enabled` is gegate op verbonden + Planner + `agendaShown`
  (principe 2 blijft).
- [ ] **AC5** — Agenda-inhoud blijft ephemeer (React-state, nooit opslag); alleen een
  niet-persistente "getoond"-state, geen persistente voorkeur.
- [ ] **AC6** — Een fetch-fout wordt zichtbaar gemeld (toast), niet stil geslikt; de app crasht niet.
- [ ] **AC7** — Elke nieuwe UI-string staat in `src/i18n/nl.js` én `src/i18n/en.js`
  (`npm run check:i18n` slaagt).
- [ ] **AC8** — `npm run build` groen; geen wijzigingen buiten de scope van deze slice.
- [ ] **AC9** — Blijft read-only (S07-scope: lezen, niet schrijven); bestaande gebruikersdata
  blijft veilig.

## Testchecklist

- `npm run check:i18n` + `npm run build` groen.
- **Zonder koppeling:** open de Planner (dag-tab) → hint zichtbaar; klik → Settings opent op
  Account → Koppelingen. Geen call naar `/api/connections/outlook/events`.
- **Met verbonden Outlook** (env + Azure-app, zie `docs/DEPLOY.md`): open de Planner → agenda leeg,
  knop "importeren"; klik → afspraken van de zichtbare week verschijnen, knop wordt "vernieuwen";
  week vooruit → nieuwe week laadt; klik "vernieuwen" → huidige week opnieuw opgehaald.
- **Foutpad:** simuleer een fetch-fout (bv. verbroken token) → toast, geen crash.
- `git status`: alleen de bedoelde bestanden; geen scope-lek, geen opslag van agenda-inhoud.
