# Ritmo — projectinstructies en uitgangspunten

Dit is de **canonieke bron** voor de Ritmo-uitgangspunten, de module-shape en de storage-API.
Instructiebestanden (`CLAUDE.md`, `docs/PLAN.md`, de agents en skills) verwijzen hiernaartoe;
schrijf de uitgangspunten niet elders opnieuw uit.

## De Ritmo-uitgangspunten

Ritmo wordt niet getoetst aan een gesloten set van twee principes, maar aan de volgende vijf
uitgangspunten. Ze zijn de meetlat voor de reviewer, de kwaliteitscheck en elke nieuwe slice.

### 1. Veiligheid van data

De data van de gebruiker gaat nooit verloren en lekt nooit.

- Migraties zijn veilig voor bestaande data — geen overschrijven zonder backup (zie `src/utils/migrate.js`).
- Opslag loopt via de `window.storage`-abstractie, nooit rechtstreeks via `localStorage.setItem`/`getItem`.
- Persoonsdata (sleep-scores, reflecties, collection-events) blijft binnen `ritmo:day:*` of `ritmo:settings`.
- Privacy-by-default: geen ongevraagde externe network-calls (`fetch`, `XMLHttpRequest`, third-party SDK's),
  geen logging van persoonsdata naar console in productiepaden.
- `JSON.parse` op user-data altijd met try/catch — corrupt opgeslagen JSON mag de app niet laten crashen.
- Supabase-JWT blijft HS256; een ES256/ECC signing key breekt alle authenticated DB-toegang (`auth.uid()` NULL, RLS 42501).

### 2. Ritmo werkt voor de gebruiker

De app dient de gebruiker en legt niets op. (Dit behoudt het oude principe 2 — gebruikerskeuze.)

- Geen hardcoded "voorbeeld"-content of default items die de app als mening neerzet.
- Geen verplichte features zonder toggle in settings.
- Modules zijn uit te zetten via `enabled: false`.
- Streak/badge-mechanieken staan niet zonder opt-in aan (`countInStreak` mag niet impliciet true zijn).
- Notificaties en reminders staan niet default aan.
- Geen UI-flows die de gebruiker dwingen iets in te vullen (geen verplichte velden zonder noodzaak).

### 3. Hergebruik, minimale hardcoding

Bouw voort op wat er is; maak configureerbaar wat nu vastzit. (Dit behoudt het oude principe 1.)

- Geen component die functioneel overlapt met een bestaande in `src/components/`
  (geen eigen progress-bar naast `ProgressBar.jsx`, geen eigen rating-widget naast `StarRating.jsx`).
- Geen utility die overlapt met een bestaande in `src/utils/`.
- Geen nieuw module-type als een bestaand type met configuratie volstaat.
- Geen handmatige storage-sync waar `useStoredState` hetzelfde dekt.
- Config/tokens boven losse waarden: iconen, kleuren en units komen uit `ICON_OPTIONS` /
  `COLOR_OPTIONS` / preset-utils en de theme-tokens (bv. de `r-accent-*`-tokens uit `index.css`),
  niet uit hardcoded klassen als `bg-blue-500`.
- Datums, tijden en intervallen via `src/utils/dates.js`, niet als losse getallen.
- Module-specifieke logica hoort in `src/modules/<Type>Module.jsx`, niet in `App.jsx`.

### 4. JavaScript best-practices

Moderne, schone, leesbare JavaScript.

- Klein-gescopete functies; splits lange functies (>80 regels) in pure helpers.
- Vermijd diepe nesting (>3 niveaus) — gebruik early return. Geen geneste ternaries.
- ES-modules en React-hooks correct gebruikt (juiste dependency-arrays, geen listener-lekken).
- Geen dode code: geen ongebruikte exports, imports, componenten of bestanden; geen
  uitgecommentarieerde code die blijft hangen.
- Comments beschrijven het WAAROM, niet het WAT (default = geen comment).
- (ESLint als vangnet is een toekomstige slice — nog niet ingericht.)

### 5. Desktop en Mobile UI gescheiden

De twee platforms hebben eigen UI-lagen.

- De mobiele shell (header + `TabBar`) en de desktop-shell (`DesktopShell`) blijven gescheiden;
  vooruit krijgen views eigen platform-varianten waar dat zin heeft.
- Gedeelde logica hoort in `src/hooks/` en `src/utils/`, niet gedupliceerd in de views.
- Geen kruis-render: desktop-UI verschijnt niet in de mobiele boom en omgekeerd.
  Platformdetectie loopt via `src/utils/platform.js` / `useIsDesktop`.

## Naast de uitgangspunten: de tweetaligheidsregel

Een aparte, technisch afgedwongen harde regel (geen uitgangspunt):
`src/i18n/nl.js` en `src/i18n/en.js` hebben exact dezelfde key-paden. `npm run check:i18n` faalt
anders en de `.husky/pre-commit`-hook blokkeert de commit. Geen hardcoded UI-tekst; elke nieuwe
UI-string krijgt een key in beide bestanden. Datum-formattering via Intl / de bestaande `getLocale()`,
niet via een hardcoded locale-ternary.