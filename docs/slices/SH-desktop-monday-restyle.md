# SH — Desktop UI naar Monday (Board-look implementatie)

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/88
**Status:** geïmplementeerd — klaar voor Poort 2 (test + merge)

## Doel

Implementeer de door Bas gekozen ontwerprichting uit de SG-design-gate — **Board / Monday** — als de
desktop-look van Ritmo. De uitwerking loopt via het bestaande `--r-*` tokensysteem (`src/index.css`) plus
één nieuw **accent-kleur-token**, zodat de vibrant Monday-stijl app-breed doorwerkt zonder elk component te
herschrijven. Vervolg op slice SG (prototypes) en de desktop-herziening (epic #67).

**Poort-0-beslissingen (met Bas vastgelegd):**
- **Gekozen richting:** Board / Monday (uit de 4 SG-prototypes).
- **Monday wordt de enige look:** de skin-keuze Strak / Levendig / Compact vervalt; iedereen krijgt Monday.
  Dit is een **bewuste uitzondering op Principe 2** (gebruikerskeuze), expliciet door Bas gekozen. De
  **dark-mode-toggle blijft wél** configureerbaar.
- **Accent-sweep is gecureerd:** alleen de desktop-shell + Planner + de voormalige skin-picker gaan over op
  het accent-token. De ~30 overige bestanden met hardcoded `blue-500` blijven voor een latere opschoon-slice.

## Scope

**Wel in scope:**
- `src/index.css`: de basis-`:root` (light) + `:root[data-theme="dark"]` tokensets worden de Monday-look
  (warm-wit / licht-lila achtergrond, ronde `1rem` kaarten, ruimere padding — grotendeels de huidige
  Levendig-waarden). De aparte `data-style="strak|levendig|compact"`-blokken worden verwijderd, zodat de
  look niet meer per skin varieert. De `--r-*`-namen (incl. radius/pad) blijven ongewijzigd, dus componenten
  hoeven niet aangepast.
- Nieuw accent-token: `--r-accent`, `--r-accent-contrast`, `--r-accent-weak` (light + dark) met helper-classes
  `.r-accent-bg`, `.r-accent-text`, `.r-accent-ring`, `.r-accent-weak` in `@layer components`. Monday-accent
  ≈ `#2b76ef`, met een leesbare dark-variant.
- `src/App.jsx`: `theme`-object krijgt `accentBg / accentText / accentRing / accentWeak`. De uiStyle-sectie in
  `SettingsModal` wordt verwijderd; `uiStyle` wordt inert en backward-compatible (een opgeslagen
  strak/levendig/compact-waarde mag blijven bestaan maar verandert de look niet meer). De vervallen
  `settings.uiStyle*`-i18n-keys worden uit `nl.js` én `en.js` verwijderd.
- `src/components/DesktopShell.jsx`: `bg-blue-500` / `ring-blue-400` / `text-blue-500` vervangen door de
  accent-helpers; nav-active en de insight-active-state gebruiken het accent. Optioneel een Monday-gradient op
  logo/active.
- `src/views/ProductivitySuiteView.jsx` + `src/views/KanbanView.jsx`: de `bg-blue-500`-toggles/knoppen naar
  accent; Kanban-kolommen krijgen de vibrant Monday-persoonlijkheid (gekleurde kolomkoppen) — puur visueel.

**Niet in scope (bewust):**
- Volledige `blue-500`-sweep in de overige ~30 bestanden — latere opschoon-slice.
- Mobiele layout (`TabBar.jsx`-indeling) en de mobiele render in `App.jsx` — ongemoeid. De tokenwijziging werkt
  wel globaal door (mobiel krijgt dezelfde Monday-kleuren), maar zonder layoutwijziging.
- Planner-functionaliteit en de tasks↔planner-koppeling / dagdeel-herstructurering van `DagView` — dat is **slice SI**.
- Nieuwe onboarding, marketing of iconografie.

## Aanpak

Concreet, met bestaande ankerpunten (regelnummers indicatief):
- `src/index.css:16-127` — vervang de drie skin-blokken door één Monday-tokenset op `:root` (light) +
  `:root[data-theme="dark"]`; voeg de accent-tokens toe. `@layer components` (`:129-170`) krijgt de
  `.r-accent-*` helpers naast de bestaande `.r-*`. Behoud `--r-radius-card: 1rem` c.s. (Monday-waarden).
- `src/App.jsx:139-143` — `data-style` hoeft niet meer te variëren (laat als `'monday'` of verwijder de regel);
  `:1148-1163` — accent-keys aan `theme` toevoegen; `:2288-2306` — de uiStyle-sectie uit `SettingsModal` halen;
  `:95` — `uiStyle`-state backward-compatible houden (inert) of verwijderen.
- `src/components/DesktopShell.jsx:24-27, 67, 69` — accent-helpers i.p.v. `blue`.
- `src/views/ProductivitySuiteView.jsx:43` en `src/views/KanbanView.jsx` — accent + gekleurde kolommen.
- **Hergebruik:** het `theme`-prop-patroon, `.r-chip` (in Monday al een volle pill), `getColorClasses`
  (`src/utils/colors.js`, module-kleuren) en de bestaande `radiusCard / radiusControl / padRow`-tokens.

## Acceptatiecriteria

- [ ] De app toont app-breed de Monday-look (ronde kaarten, warm-wit / lila achtergrond, vibrant accent) in
  light én dark; er is geen skin-afhankelijke variatie meer.
- [ ] Er is één accent-token (`--r-accent` c.s.); de desktop-shell en de Planner-toggle gebruiken dat i.p.v.
  hardcoded `blue-500`. De ~30 overige `blue-500`-bestanden zijn bewust ongemoeid (gedocumenteerd als latere slice).
- [ ] De skin-picker is uit Instellingen verdwenen; een bestaande gebruiker met opgeslagen `uiStyle`
  (strak/levendig/compact) krijgt zonder fout de Monday-look; geen dataverlies. De dark-mode-toggle werkt nog.
- [ ] Kanban-kolommen tonen de vibrant Monday-persoonlijkheid (gekleurde koppen) zonder gedragswijziging aan taken/planner.
- [ ] Mobiele render en `TabBar.jsx`-indeling zijn qua layout ongewijzigd (alleen kleuren volgen de nieuwe tokens).
- [ ] Elke gewijzigde/nieuwe UI-string bestaat in zowel `src/i18n/nl.js` als `en.js`; vervallen
  `settings.uiStyle*`-keys zijn uit beide weg; `npm run check:i18n` en `npm run build` slagen.
- [ ] Geen wijzigingen buiten de slice-scope (geen tasks/planner-functionaliteit, geen volledige blue-sweep).
- [ ] De Principe-2-uitzondering (look-keuze vervalt) is bewust en met Bas vastgelegd; dark mode blijft
  configureerbaar en bestaande gebruikersdata blijft veilig.
