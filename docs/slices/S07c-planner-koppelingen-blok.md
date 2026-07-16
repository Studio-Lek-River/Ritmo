# S07c — Koppelingen-blok in de planner

Mockup: https://claude.ai/code/artifact/c264ebc9-00f5-4c5c-9ceb-8345b5563707
**Status:** goedgekeurd (Poort 1)

## Doel

Geef gekoppelde bronnen een visuele identiteit in de planner en één plek om ze te
beheren. Vandaag krijgt elk Outlook-blok in `WeekView.jsx` de class
`.r-block-agenda` (= `--r-card-2`); er is geen kleurlogica voor externe bronnen,
dus alle agenda-items zijn dezelfde neutrale grijstint. Kleur is in Ritmo alleen
per module instelbaar (Instellingen → Modules), en in de planner is nergens te
zien welke bronnen meedoen.

Deze slice voegt onder de takenpool één blokje toe met per bron: status, kleur en
meedoen-in-de-planner. Beheer, geen actielijst. Sluit aan op het
Outlook-koppelingswerk (S07) in docs/ROADMAP.md.

## Scope

**Wel in scope:**
- Nieuw `SourcesPanel` in de linkerkolom van de Planner → Dag-tab, met een rij per
  provider uit `CONNECTION_PROVIDERS`.
- Kleur en zichtbaarheid per bron, opgeslagen als lokale weergavevoorkeur in
  `settings`.
- Agendablokken in `WeekView.jsx` kleuren met de bronkleur.
- De oog-toggle doorwerken in de bezette tijd van de dag-indeler.

**Niet in scope (bewust):**
- Trello/GitHub echt koppelen (S08/S09). Hun rijen blijven grijs en tonen alleen
  een "Koppelen"-knop naar het Account-scherm.
- Gmail als provider. Die bestaat niet in `CONNECTION_PROVIDERS` en niet in de
  CHECK-constraint van `supabase/migrations/20260713120000_connections.sql`;
  toevoegen vraagt een migratie plus OAuth en is een eigen slice. Omdat het paneel
  de providerlijst dynamisch rendert, verschijnt hij daarna vanzelf zonder
  UI-werk.
- Items uit bronnen als sleepbare acties in het paneel (bewust "alleen beheer").
- De zinc-fallback in `getColorClasses` voor taken zonder module-kleur. Tweede,
  losse oorzaak van grijsheid; eigen fix.
- Kleur/zichtbaarheid syncen naar het account. Het zijn apparaatvoorkeuren; de
  `connections`-tabel is voor `authenticated` alleen leesbaar.

## Aanpak

### 1. `src/utils/sourcePrefs.js` (nieuw)

In lijn met `defaultModules.js`:
- `DEFAULT_SOURCE_PREFS` — per provider een `{ color, visible: true }`.
  Startkleuren uit `COLOR_OPTIONS` (`src/utils/colors.js`), niet hardcoded:
  outlook `blue`, github `indigo`, trello `teal`.
- `getSourcePref(sourcePrefs, provider)` — merge met de default, zodat een
  ontbrekende of onbekende key nooit `undefined` teruggeeft. Geen migratie nodig
  voor bestaande settings.
- `SOURCE_ICONS` — provider → lucide-component (`Calendar`, `Github`, `Trello`).
  Eén mapping, hergebruikt door paneel én rooster.

### 2. `src/App.jsx`

`sourcePrefs` naast `planPrefs`, exact hetzelfde patroon:
- `useState(DEFAULT_SOURCE_PREFS)` bij regel 157.
- Laden in de settings-load (regel 224).
- Meenemen in de `window.storage.set('settings', …)`-payload (regel 360) én in de
  dep-array (regel 372).
- `sourcePrefs` + `setSourcePrefs` doorgeven aan `ProductivitySuiteView` (regel
  2052), samen met `outlookConnectionState.connections` (regel 1342) zodat het
  paneel per provider de echte status kent.

Bij regel 1442 wordt `externalBlocksForDay(...)` alleen gevoed met bronnen waarvan
`visible` aan staat, zodat het oog consistent doorwerkt in `planDay.js`.
`outlookEventsByDate` blijft ongewijzigd.

### 3. `src/components/SourcesPanel.jsx` (nieuw)

Rendert `CONNECTION_PROVIDERS`, dus een nieuwe provider verschijnt vanzelf. Per
rij: provider-icoon, naam, statusregel. Hergebruik de bestaande i18n-keys van
`ConnectionsSection.jsx` (`connections.providers.*`, `connections.status.*`) —
geen tweede kopie.

- **Gekoppeld** (`status === 'connected'`, zelfde conditie als S07b): icoon in de
  bronkleur, kleurenrij (`COLOR_OPTIONS`, zelfde swatch-patroon als de
  ModuleEditor in `App.jsx` ~3444) en een oog-toggle.
- **Niet gekoppeld:** rij gedimd, grijs icoon, geen kleurkiezer, en een
  "Koppelen"-knop die via de bestaande `onOpenConnections`-prop naar het
  Account-scherm springt.

De oog-toggle betekent "deze bron telt mee in de planner": uit = blokken niet
tonen én niet als bezette tijd meerekenen. Eén begrip, geen
verborgen-maar-toch-blokkerend gedrag.

### 4. `src/views/ProductivitySuiteView.jsx`

In de dag-tab wordt de linkerkolom een `space-y-4`-stack: `TaskPoolPanel` met
daaronder `SourcesPanel`. De grid-definitie op regel 163 blijft ongewijzigd.

### 5. `src/views/WeekView.jsx`

`sourcePrefs` als prop erbij. Timed- en all-day-agendablokken halen hun kleur via
`block.source.provider` (`outlookEvents.js` levert `source` al mee) en gebruiken
`getColorClasses` / `getColorHex`, net als de taakblokken op regel 267-307. Een
agendablok blijft herkenbaar extern: tint plus rand met het provider-icoontje,
geen gevulde behandeling zoals een eigen taak. Onbekende of niet-gekoppelde bron
valt terug op de huidige `.r-block-agenda`. De `Legend` (regel 433) krijgt
dezelfde behandeling voor zijn agenda-swatch.

### 6. `src/i18n/nl.js` + `en.js`

Nieuwe keys onder `planner.sources.*` (titel, hint, kleur-aria, oog-aria,
koppelen-knop). Beide bestanden dezelfde key-paden.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] De Planner → Dag-tab toont onder de takenpool een Koppelingen-blok met een
      rij per provider uit `CONNECTION_PROVIDERS` (geen hardcoded providerlijst).
- [ ] Een niet-gekoppelde bron toont alleen icoon + naam + status, grijs/gedimd,
      zonder kleurkiezer, met een "Koppelen"-knop naar het Account-scherm.
- [ ] Een gekoppelde bron (`status === 'connected'`) toont een kleurenrij uit
      `COLOR_OPTIONS` en een oog-toggle.
- [ ] Kleur wisselen kleurt de agendablokken van die bron direct in het rooster;
      de keuze overleeft een herlaad (opgeslagen in `settings` via
      `window.storage`).
- [ ] Agendablokken blijven visueel onderscheidbaar van eigen taakblokken (tint +
      rand + provider-merkje versus gevulde module-kleur).
- [ ] Oog uit: de blokken van die bron verdwijnen uit het rooster én "deel mijn
      dag in" plant over die tijdvakken heen. Oog aan: beide terug.
- [ ] Bestaande settings zonder `sourcePrefs` werken zonder migratie; ontbrekende
      of onbekende providerkeys vallen terug op de default.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als
      `src/i18n/en.js` (`npm run check:i18n` slaagt). Geen hardcoded UI-tekst.
- [ ] Kleuren komen uit `COLOR_OPTIONS`/`getColorClasses` en oppervlakken uit de
      `r-*`-tokens; geen losse `bg-blue-500`-achtige klassen.
- [ ] Licht en donker zijn beide leesbaar.
- [ ] Geen wijzigingen buiten de scope van deze slice.
