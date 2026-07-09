# SF — Weergavestijlen afwerken (dichtheid/hoeken + status-chips)

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/71
**Status:** concept

## Doel

Maak de drie weergavestijlen (skins) uit epic #67 volwaardig: naast kleur ook **hoekradius** en
**dichtheid** per skin, plus een lichte per-skin **statusweergave** op chips. Slice A/B leverden de
token-laag met uitsluitend kleur-variabelen (`--r-*` in `src/index.css`); Slice F voegt de vorm- en
dichtheid-dimensie toe zodat Strak Linear-achtig, Levendig Monday-achtig en Compact Salesforce-achtig
voelt. Laatste slice van epic #67 (branch `feat/desktop-system-layout`).

**Poort-0-beslissingen (met Bas vastgelegd):**
- **Migratie-scope: gecureerd.** Alleen de nieuwe Productivity Suite (Dag + Kanban), de canonieke
  `InsightCardShell` en `TagPill` migreren naar de tokens. Rest van de app blijft deze slice ongemoeid.
- **Statusweergave: licht meenemen.** Per-skin chip-varianten (gevuld/badge/minimaal) via CSS, geen
  nieuwe teksten, geen `uiStyle`-plumbing naar componenten.
- **Strak-kleuren ongewijzigd.** De Linear-verfijning komt deze slice **alleen** uit kleinere radii +
  rustige dichtheid; de bestaande Strak-kleurwaarden in `:root` blijven identiek (default-look
  verandert niet).

## Definities (nieuwe tokens)

Radius/dichtheid zijn skin-, niet thema-afhankelijk → dezelfde waarden in light én dark van elke skin.
Richtwaarden (implementer mag fijnstellen binnen de ranking):

| token | Strak | Levendig | Compact |
|---|---|---|---|
| `--r-radius-card` | 0.75rem | 1rem | 0.375rem |
| `--r-radius-control` | 0.5rem | 0.625rem | 0.25rem |
| `--r-radius-pill` | 9999px | 9999px | 0.25rem |
| `--r-pad-card` | 1.25rem | 1.5rem | 0.875rem |
| `--r-pad-row` | 0.75rem | 0.875rem | 0.5rem |

Ranking: Levendig ronder + ruimer, Compact scherper + dichter, Strak ertussen.

## Scope

**Wel in scope:**
- **Token-laag** `src/index.css`: bovenstaande radius/pad-variabelen toevoegen aan elk bestaand
  skin-blok (`:root`, `[data-style="levendig"]`, `[data-style="compact"]` + hun
  `[data-theme="dark"]`-varianten). Nieuwe helper-classes in `@layer components`:
  `.r-radius-card`, `.r-radius-control`, `.r-pad-card`, `.r-pad-row`, en een `.r-chip` helper die per
  `[data-style]` de chip-vorm/gewicht varieert (radius via `--r-radius-pill`, padding, evt. dunne rand).
- **`theme`-object** `src/App.jsx` (bij `1062-1073`): `radiusCard`, `radiusControl`, `padCard`, `padRow`
  toevoegen die naar de helper-classes wijzen.
- **Gecureerde migratie** — hardcoded `rounded-*`/`p-*` **vervangen** (niet toevoegen, anders wint de
  utility van de `@layer components`-helper) door de tokens op:
  - `src/components/insight/InsightCardShell.jsx` (canonieke kaart)
  - `src/views/ProductivitySuiteView.jsx`, `src/views/DagView.jsx`, `src/views/KanbanView.jsx`
  - `src/components/TagPill.jsx` (chip → `.r-chip`)
- **Lichte per-skin statusweergave**: `.r-chip` toepassen op `TagPill.jsx` en de status-chip in
  `KanbanView.jsx` + `ProjectsView.jsx`. Levendig → volle ronde pill; Strak → getinte, licht-afgeronde
  badge; Compact → minimaal, klein-hoekig label met dunne rand.

**Niet in scope (bewust):**
- Brede sweep van de overige ~65 files met hardcoded `rounded-*`/`p-*` (ProjectsView-kaarten, modules,
  HouseholdView, Measurements, Medication, enz.) — de tokens bestaan dan wel, maar worden daar nog niet
  toegepast. Latere opruim-slice.
- Kleur-re-tune van Strak (of andere skins).
- Nieuwe skins, nieuwe settings, of nieuwe i18n-strings.
- `uiStyle` als prop/JS naar componenten doorgeven — statusvariatie blijft puur CSS via `[data-style]`.

## Aanpak

- `src/index.css` — radius/pad-vars per skin-blok; helper-classes + `.r-chip` in `@layer components`.
- `src/App.jsx` — `theme`-object uitbreiden met de vier radius/pad-tokens.
- `src/components/insight/InsightCardShell.jsx`, `src/components/TagPill.jsx`,
  `src/views/ProductivitySuiteView.jsx`, `src/views/DagView.jsx`, `src/views/KanbanView.jsx`,
  `src/views/ProjectsView.jsx` (alleen de status-chip) — literals vervangen door tokens.

**Hergebruik:** het bestaande `--r-*` / `r-*` / `theme`-object-patroon uit Slice A/B (identieke stijl,
`@layer components` zodat utilities kunnen overschrijven), `getColorClasses`/`utils/colors.js` voor de
chip-kleuren (blijft ongewijzigd — alleen de vorm-laag komt erbij).

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] De drie stijlen verschillen duidelijk in **dichtheid en hoeken**, niet alleen kleur, op de
      gemigreerde oppervlakken (Productivity Suite, InsightCardShell, chips).
- [ ] Strak voelt Linear-achtig (kleinere radii, rustig), Levendig Monday-achtig (ronder, ruimer),
      Compact Salesforce-achtig (scherp, dicht).
- [ ] Status-chips (TagPill / Kanban / Projects) ogen per skin duidelijk anders (gevuld ⇄ badge ⇄
      minimaal), zonder nieuwe teksten.
- [ ] Radius/dichtheid komen uit tokens/helper-classes; geen nieuwe hardcoded `rounded-*`/`p-*` op de
      gemigreerde oppervlakken.
- [ ] Alles werkt in light **en** dark voor elke skin; geen regressie op mobiel (smalle viewport).
- [ ] `npm run build` en `npm run check:i18n` groen.
- [ ] Geen wijzigingen buiten de scope van deze slice (rest van de app ongemoeid).
- [ ] Nieuw gedrag is veilig (principe 2): de skin-keuze bestaat al, default Strak blijft werken,
      geen datamigratie, bestaande gebruikersdata blijft onaangetast.
