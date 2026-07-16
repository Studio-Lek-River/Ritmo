# S09a — Item-keys met externe ids rond-trip-veilig

## Doel

Een item-key voor een projecttaak wordt samengesteld als `subgoal:<moduleId>:<subjectId>:<goalId>`, maar in `App.jsx` weer uit elkaar gehaald met een positionele `split(':')`. Zodra één van die ids zelf een dubbele punt bevat — wat bij elke Trello-id het geval is (`trello:board:<id>`, `trello:card:<id>`) — levert dat de verkeerde delen op en doet `moveItemToDay` stil niets.

Deze slice maakt het samenstellen en ontleden van item-keys één gedeelde, omkeerbare operatie. Het is de voorwaarde voor S10 (externe kaarten inplanbaar), maar het is op zichzelf een bug: de key rondt nu niet correct.

## De bug, concreet

`src/utils/dayTimeline.js:89` bouwt voor een Trello-kaart:

```
subgoal:trello:board:B:trello:list:L:trello:card:C
```

`src/App.jsx:1256` ontleedt die als:

```js
const [, projectId, subjectId, goalIdRaw] = itemKey.split(':');
// => projectId = 'trello', subjectId = 'board', goalIdRaw = 'B'
```

`setModules` zoekt vervolgens een module met id `'trello'`, vindt niets, en de `.map()` valt ongewijzigd door. Geen error, geen effect — een stille no-op.

## Scope

**Wel in scope:**
- Nieuw `src/utils/itemKeys.js` met het samenstellen én ontleden van item-keys op één plek, zodat elk id-segment een dubbele punt mag bevatten.
- Aanroepers laten hergebruiken: `src/utils/dayTimeline.js` (:89), `src/utils/taskBoard.js` (:49), `src/App.jsx` (:1256 `moveItemToDay`, :1574 `buildPlanInputs`).
- De bestaande `task:`- en `task:virtual:`-keys gaan door dezelfde helper, zodat er één plek is die weet hoe een key eruitziet.

**Niet in scope (bewust):**
- Trello-kaarten daadwerkelijk inplanbaar maken — dat is S10. Deze slice maakt alleen de key correct; het `localModules`-filter in `ProductivitySuiteView.jsx:271` blijft staan, dus zichtbaar gedrag verandert niet.
- Enige wijziging aan opslag, datamodel of UI.

## Aanpak

Item-keys zijn **afgeleid** — ze worden nergens opgeslagen (alleen als React-key en als dragPayload binnen één sleepactie). Er is dus geen migratie nodig en geen compatibiliteit met oude keys.

`src/utils/itemKeys.js` krijgt minimaal:
- `subgoalKey(moduleId, subjectId, goalId)` en `taskKey(taskId)` — samenstellen.
- `parseItemKey(key)` — ontleden naar iets als `{ kind: 'subgoal'|'task', moduleId, subjectId, goalId }` / `{ kind: 'task', taskId }`, met een herkenbare uitkomst voor een onbekende key.

De segmenten worden per stuk gecodeerd (bv. `encodeURIComponent`) zodat een `:` in een id de scheiding niet meer breekt, en bij het ontleden weer gedecodeerd. `parseItemKey` moet voor elke geldige input van `subgoalKey`/`taskKey` exact de oorspronkelijke ids teruggeven.

Let op de bestaande vergelijkingen op `String(g.id)` / `String(t.id)` in `App.jsx`: ids zijn deels getallen (`Date.now()`) en deels strings. Het ontleden levert altijd een string op; de bestaande `String(...)`-vergelijking blijft dus nodig.

`WeekView.jsx:159` en `ProductivitySuiteView.jsx:145` doen `item.key.startsWith('task:virtual:')`. Die mogen blijven of via de helper lopen, zolang het gedrag identiek blijft.

## Acceptatiecriteria

- [ ] Er is één module (`src/utils/itemKeys.js`) die item-keys samenstelt én ontleedt; `dayTimeline.js`, `taskBoard.js` en `App.jsx` bouwen of ontleden geen key meer met een eigen template-string of `split(':')`.
- [ ] Voor een projecttaak waarvan module-, subject- én goal-id elk een dubbele punt bevatten (zoals `trello:board:B` / `trello:list:L` / `trello:card:C`) geeft ontleden exact die drie oorspronkelijke ids terug.
- [ ] Voor een gewone projecttaak met numerieke/eenvoudige ids blijft ontleden dezelfde ids opleveren als voorheen.
- [ ] Een key die niet als item-key herkend wordt, leidt niet tot een crash; `moveItemToDay` doet er niets mee (zoals nu).
- [ ] Zichtbaar gedrag is ongewijzigd: een losse taak en een lokale projecttaak zijn nog steeds naar een dag/tijd te slepen, afvinken werkt, en een virtuele recurring-taak wordt bij verplaatsen nog steeds gematerialiseerd.
- [ ] Trello-kaarten verschijnen nog steeds niet in het rooster (dat blijft S10) — deze slice verandert daar bewust niets aan.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js` (`npm run check:i18n` slaagt). Deze slice voegt naar verwachting geen UI-string toe.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar of uitschakelbaar (principe 2); bestaande gebruikersdata blijft veilig. Deze slice raakt geen opslag: item-keys zijn afgeleid en worden nooit bewaard.
