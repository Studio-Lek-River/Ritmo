# H01 — Bugfix gezondheidsmeting-instellingen + ErrorBoundary

## Doel

Het openen van de gezondheidsmeting-instellingen toont soms een leeg wit scherm door een niet-afgevangen render-crash in de measurements-editor. Deze slice dicht die crash én voegt een ErrorBoundary-vangnet toe, zodat een volgende render-crash zichtbaar wordt (rustige foutpagina) in plaats van onzichtbaar (wit scherm). Eerste slice van epic H (zie `docs/ROADMAP.md`), zonder afhankelijkheden.

## Scope

**Wel in scope:**
- **Bugfix:** in de `measurements`-tak van `ModuleEditor` ([src/App.jsx](../../src/App.jsx), rond regel 3388-3592) de `metrics.map(...)` beveiligen tegen `null`/partiële elementen. De array is al guarded (`editing.metrics || []`), maar per-element reads (`metric.icon`, `metric.name`, `metric.events`) zijn dat niet. Een gat in `metrics[]` uit ongemigreerde sync/import-data crasht de render. Filter holes weg en/of lees defensief, conform de veilige vorm die [src/utils/migrate.js](../../src/utils/migrate.js) (regel 100-113) al definieert.
- **Zelfde read in de detail-view** ([src/views/MeasurementsView.jsx](../../src/views/MeasurementsView.jsx), rond regel 72 en 282) meenemen met dezelfde guard, zodat een null-metric ook de detail-view niet velt.
- **ErrorBoundary:** nieuw class-component `src/components/ErrorBoundary.jsx` (`getDerivedStateFromError` + `componentDidCatch`). Rustige, niet-oordelende fallback met de geruststelling dat gegevens veilig zijn opgeslagen, uitklapbare technische details (error message + stack), en twee knoppen: **herladen** (`window.location.reload()`) en **terug naar Vandaag** (reset naar de today-view). NL/EN via i18n.
- **Plaatsing ErrorBoundary:** rond `<App />` in [src/main.jsx](../../src/main.jsx) (app-breed) én rond de view-switch in [src/App.jsx](../../src/App.jsx) (rond regel 998-1141). De inner boundary krijgt `key={view}` zodat hij bij tab-wissel reset (een crash in view A blokkeert niet permanent view B).
- **i18n:** een `errorBoundary.*`-groep in zowel `src/i18n/nl.js` als `src/i18n/en.js`.

**Niet in scope (bewust):**
- Geen van de nieuwe Health-features (bodymap, medicatie, trends, onboarding-profiel) — dat zijn latere slices.
- Geen data-migratie of wijziging aan `migrate.js` zelf; de fix is defensief lezen op het renderpunt.
- Geen herstructurering van de `App.jsx`-monoliet buiten de twee ErrorBoundary-wraps.
- Geen ErrorBoundary-styling die het bestaande thema-systeem herontwerpt; sluit aan bij bestaande theme-tokens/utility-classes.

## Aanpak

- **Bugfix:** in de measurements-tak `const metrics = (editing.metrics || []).filter(Boolean);` en waar nodig optional chaining op de per-metric reads. Kies de vorm die het dichtst bij de bestaande code ligt.
- **ErrorBoundary:** eerste class-component in een verder function-component codebase — dat is oké en de juiste tool (functionele componenten kunnen geen error boundary zijn). Gebruik `useTranslation`'s synchrone `t(key)` niet in de class; geef labels als props door vanuit een dunne functionele wrapper, óf lees via de geëxporteerde `t` uit `src/i18n/useTranslation.js`. De "terug naar Vandaag"-actie in de inner boundary krijgt een callback-prop (bv. `onReset={() => setView('today')}`) plus een boundary-reset; de app-brede boundary in main.jsx valt terug op `window.location.reload()`.
- **Kleuren/thema:** gebruik bestaande theme-tokens; geen Tailwind-classes in eventuele inline SVG (niet van toepassing hier, maar hex indien nodig).

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] De gezondheidsmeting-instellingen (measurements-editor) openen met een `null`/gat in `metrics[]` toont de editor normaal, geen wit scherm.
- [ ] De measurements-detail-view velt niet op een null-metric (zelfde guard toegepast).
- [ ] Een geforceerde render-crash in een view toont de ErrorBoundary-fallback in plaats van een leeg scherm.
- [ ] De fallback heeft werkende knoppen "herladen" en "terug naar Vandaag", en een uitklapbaar technisch-detail-blok.
- [ ] De ErrorBoundary omhult zowel de hele app (`src/main.jsx`) als de view-switch (`src/App.jsx`); de inner boundary reset bij tab-wissel (`key={view}`).
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js` (`npm run check:i18n` slaagt).
- [ ] Geen wijzigingen buiten de scope van deze slice; bestaande measurement-data blijft intact.
- [ ] Nieuw gedrag is een vangnet, geen gedragsverandering voor de happy path (principe 2); bestaande gebruikersdata blijft veilig.
