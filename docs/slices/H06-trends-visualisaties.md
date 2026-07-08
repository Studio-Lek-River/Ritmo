# H06 — Trends-visualisaties (beweging-staafdiagram + bijwerkingen-heatmap)

## Doel

Bouw de twee beloofde Trends-visualisaties op de dag-logs uit H05: een **staafdiagram** voor de
beweging-counter (minuten per dag met een referentielijn op het dagdoel) en een **dot-matrix
heatmap** voor de bijwerkingen-checklist (per bijwerking een rij, per dag een gekleurd vakje als die
dag was aangevinkt). Zesde slice van epic H (zie `docs/ROADMAP.md`, #54). Geen nieuwbouw van
module-types of opslag, maar **visualisatie van bestaande history-data** in de Trends-tab.
Afhankelijk van H05 (gemerged, PR #55).

## Scope

**Wel in scope:**

- **Beweging-staafdiagram** in [CounterInsightCard.jsx](../../src/components/insight/CounterInsightCard.jsx):
  de bestaande SVG-lijngrafiek (`<polyline>` + `<circle>`) wordt **vervangen** door `<rect>`-staven,
  één per dag uit `aggregateCounter(mod, days).series`. De gestreepte doellijn op `mod.dailyGoal`, de
  `maxValue`-schaal en het `goalLabel`-onderschrift blijven. Staafkleur via `getColorHex(mod.color)`
  (inline hex, geen Tailwind-klasse op de SVG); nul-dagen krijgen een muted tint. Generiek: elke
  counter krijgt de staafgrafiek.
- **Dot-matrix helper** in [insights.js](../../src/utils/insights.js): een pure helper
  `checklistDayMatrix(mod, days)` naast `aggregateChecklist`, die per item een rij
  `{ id, label, cells: [{ key, date, complete }] }` bouwt via het bestaande
  `isChecklistItemComplete(item, md[item.id])` op `dayData?.moduleData?.[mod.id]`.
- **Bijwerkingen-heatmap** in [ChecklistInsightCard.jsx](../../src/components/insight/ChecklistInsightCard.jsx):
  de bestaande per-item %-balken blijven; **daaronder** komt een dot-matrix (één rij per item, één cel
  per dag), gemodelleerd op de gekleurde day-cells van WeekView (inline `style={{ background }}`).
  Complete cel → `getColorHex(mod.color)`, anders neutrale track. Horizontaal scrollbaar
  (`overflow-x-auto`) bij 30/90 dagen; geen horizontale overflow van de pagina. Cel-toegankelijkheid
  via `title`/`aria-label`. Generiek: elke checklist krijgt de dot-matrix.
- **Periode-koppeling:** beide visualisaties gebruiken de bestaande `days`-prop
  (`buildDays(history, rangeForPeriod(period))`) en volgen dus de periode-selector (7/30/90/all).
- **i18n** in **zowel** [nl.js](../../src/i18n/nl.js) als [en.js](../../src/i18n/en.js), onder
  `insight.checklist`:
  - `insight.checklist.matrixHeading` — nl `"Per dag"` / en `"By day"`
  - `insight.checklist.dayChecked` — nl `"{item} op {date}: aangevinkt"` / en
    `"{item} on {date}: checked"`
  - `insight.checklist.dayUnchecked` — nl `"{item} op {date}: niet aangevinkt"` / en
    `"{item} on {date}: not checked"`

**Niet in scope (bewust):**

- **Geen nieuw module-type en geen wijziging aan de opslag** (H05-datamodel blijft: counter
  `entries[]`/`total`, checklist `moduleData[modId][itemId].checked`). H06 leest alleen.
- **Geen per-categorie split** in het staafdiagram; alleen dag-totalen + doellijn, conform ROADMAP.
- **Geen wijziging aan** `InsightView.jsx` (dispatch blijft per `mod.type`), `dayProgress.js`,
  `presets.js`, of `App.jsx`.
- **Geen preset-specifieke branching** (geen Beweging/Bijwerkingen-hack); de verbeteringen zijn
  generiek per type (principe 2, hergebruik).
- **Geen H02-onboardingprofiel (#52) en geen H07-Health-modus (#56).** Dat zijn aparte vervolg-slices.

## Aanpak

- **Reuse-anker (staafgrafiek):** de bestaande SVG-opzet in `CounterInsightCard` (viewBox `0 0 300 80`,
  `preserveAspectRatio="none"`, `padX/padY`, `xFor/yFor`, `goalY`, `maxValue`) blijft het raamwerk;
  alleen de marker-laag (`polyline`+`circle`) wordt vervangen door `<rect>`-staven. `aggregateCounter`
  ([insights.js:39](../../src/utils/insights.js)) blijft ongewijzigd — het levert al `series`.
- **Reuse-anker (heatmap):** de gekleurde day-cells van WeekView
  ([App.jsx rond regel 1547](../../src/App.jsx)) zijn de blauwdruk: een grid van `<div>`'s met inline
  `style={{ background: getColorHex(...) }}`. `checklistDayMatrix` hergebruikt `isChecklistItemComplete`
  uit [dayProgress.js](../../src/utils/dayProgress.js), zelfde leesroute als `aggregateChecklist`.
- **Shell:** beide kaarten blijven in `InsightCardShell` (icon + titel + summary + children); de nieuwe
  visualisaties slotten in `children`, net als nu.
- **Commits:** één `feat(insight):` voor de staafgrafiek, één `feat(insight):` voor helper +
  dot-matrix + i18n. Géén `Co-Authored-By: Claude`-trailer. `feat` → minor bump.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] De Trends-kaart van een counter (bv. Beweging) toont een **staafdiagram**: één staaf per dag in
      de gekozen periode, hoogte evenredig met de dag-waarde, met een gestreepte referentielijn op het
      dagdoel (`mod.dailyGoal`) wanneer er een doel is. De lijngrafiek (`polyline`) is weg.
- [ ] Dagen zonder waarde tonen geen of een afwijkend-gekleurde (muted) staaf; de staafkleur volgt
      `mod.color` via `getColorHex` (inline hex in de SVG, geen Tailwind-kleurklasse op de staven).
- [ ] De Trends-kaart van een checklist (bv. Bijwerkingen) behoudt de per-item %-balken én toont
      daaronder een **dot-matrix**: één rij per item, één cel per dag; een cel is gekleurd wanneer dat
      item die dag als voltooid geldt (`isChecklistItemComplete`).
- [ ] De matrix volgt de periode-selector (7/30/90/all) en is horizontaal scrollbaar wanneer de
      periode niet in de breedte past; de pagina zelf krijgt geen horizontale overflow.
- [ ] Beide visualisaties zijn generiek: elke counter krijgt de staafgrafiek, elke checklist de
      dot-matrix — geen preset-specifieke branching.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] Geen nieuw module-type en geen wijziging aan hoe data wordt opgeslagen (H05-datamodel intact);
      H06 leest alleen bestaande history-data. Geen wijzigingen buiten `CounterInsightCard.jsx`,
      `ChecklistInsightCard.jsx`, `insights.js`, de twee i18n-bestanden en deze spec-doc.
- [ ] Nieuw gedrag is configureerbaar/uitschakelbaar (de onderliggende modules blijven toevoegbaar,
      bewerkbaar en verwijderbaar, principe 2); bestaande gebruikersdata blijft veilig en lege/
      ontbrekende data valt terug op de bestaande empty-state (`insight.empty.moduleNoData`).
