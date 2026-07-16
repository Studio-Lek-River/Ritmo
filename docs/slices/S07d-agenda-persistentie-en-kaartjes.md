# S07d — Agenda blijft staan, vernieuwen in Koppelingen, kaartjes in het rooster

**Status:** goedgekeurd (Poort 1)

## Doel

Drie klachten uit de praktijk, alle drie in de Planner:

1. **De agenda verdwijnt.** `src/hooks/useOutlookEvents.js` is bewust ephemeer: de events leven
   alleen in React-state en `agendaShown` (`src/App.jsx:1345`) start elke sessie op `false`.
   Herladen betekent een lege planner tot je opnieuw op "importeren" klikt. Bij een mislukte fetch
   zet de hook de state zelfs leeg (regel 62), dus één netwerkfout wist het rooster.
2. **De vernieuw-knop staat op de verkeerde plek.** Hij zit in de balk boven het rooster
   (`src/views/ProductivitySuiteView.jsx:116-140`), terwijl kleur en zichtbaarheid van Outlook in
   het Koppelingen-blok staan (S07c). Twee plekken voor één bron.
3. **De blokken zien er doorzichtig uit.** `agendaBlockAppearance` (`src/views/WeekView.jsx:82-94`)
   en de taakblokken (`WeekView.jsx:312`) gebruiken `getColorClasses().iconBg` =
   `bg-blue-100 dark:bg-blue-900/30`. Die alpha-tint over de roosterachtergrond leest als vaag en
   gewassen, en wijkt af van het goedgekeurde artefact.

Uitkomst: de agenda staat er meteen bij het openen van de Planner (ook offline), Outlook wordt op
één plek beheerd, en elk blok is een rustig, dekkend kaartje met een gekleurde strip links.
Vervolg op S07/S07a/S07b/S07c.

## Poort-0-beslissingen (met Bas vastgelegd)

- Events worden **lokaal gecachet**, niet alleen de aan/uit-keuze. Dit is een bewuste herziening van
  het S07-uitgangspunt "resultaat leeft alleen in React-state, nooit in opslag" (AC5/AC6 van S07):
  de gebruiker wil zijn agenda terugzien zonder klik en zonder netwerk. De privacy-eis blijft
  overeind doordat de cache device-local is (zie Aanpak 1).
- **Geen uursync.** Ophalen gebeurt bij het openen van de Planner (bestaand effect-gedrag) en verder
  alleen via de vernieuw-knop. Een sync met de app dicht vraagt serverwerk; dat is een eigen slice.
- De Outlook-knop **verhuist volledig** naar het Koppelingen-blok; de balk boven het rooster verliest
  hem.

## Scope

**Wel in scope:**
- Nieuwe `src/utils/agendaCache.js` met een device-local cache van de opgehaalde agenda.
- `useOutlookEvents.js` cache-first maken; niet meer leegmaken bij een fout.
- `agendaShown` persistent in `settings`.
- Vernieuw-knop plus "bijgewerkt om"-regel in `SourcesPanel.jsx`, via een generieke
  `sourceActions`-prop.
- De Outlook-tak uit de knoppenbalk van `ProductivitySuiteView.jsx` verwijderen.
- `.r-block`-kaartstijl in `src/index.css` en de blokken in `WeekView.jsx` daarop over.

**Niet in scope (bewust):**
- Achtergrondsync met de app dicht (vraagt een server-side scheduler + push).
- Periodieke sync in de browser (Bas koos expliciet alleen de knop).
- Trello/GitHub echt koppelen (S08/S09). Hun rijen krijgen geen actieregel.
- Kanban- en Dag-view-styling; alleen het weekrooster gaat over op de kaartjes.
- De zinc-fallback in `getColorClasses` voor taken zonder module-kleur (bekend, eigen fix).

## Aanpak

### 1. `src/utils/agendaCache.js` (nieuw)

Lees-/schrijflaag rond `window.storage`, in lijn met `sourcePrefs.js`.

- Key `agenda:outlook`. Bewust géén `settings`/`day:`/`household:`-prefix: `isUserSyncKey`
  (`src/sync/userDataStorage.js:44`) laat alleen die drie naar het account syncen, en
  `src/utils/backup.js:23-37` exporteert alleen die drie. Agenda-inhoud blijft zo op het apparaat en
  komt niet in de cloud of in een backup-bestand.
- Shape: `{ version: 1, connectionId, fetchedAt, eventsByDate }`.
- `readAgendaCache()` — `null` bij een ontbrekende, onleesbare of andere-`version`-cache.
- `writeAgendaCache({ connectionId, fetchedAt, eventsByDate })`.
- `clearAgendaCache()`.
- `mergeEventsByDate(cached, fresh, fetchedDateKeys, todayKey)` — pure functie, apart testbaar:
  de zojuist opgehaalde dagen vervangen hun cache-versie (**ook een dag die leeg terugkomt**, want
  dan is de afspraak geannuleerd), dagen buiten de opgehaalde week blijven staan. Snoeit dateKeys
  buiten [today − 30d, today + 90d] zodat de cache niet eeuwig groeit. `todayKey` als parameter, niet
  intern `new Date()`, zodat de functie deterministisch te testen is (zelfde lijn als
  `outlookEvents.js`).
- Een cache met een andere `connectionId` dan de huidige koppeling wordt genegeerd en gewist: na
  opnieuw koppelen of een ander account nooit andermans afspraken tonen.

### 2. `src/hooks/useOutlookEvents.js`

Cache-first; de `requestToken`-bescherming blijft ongewijzigd.

- Bij mount `readAgendaCache()` en de state seeden, zodat het rooster gevuld is vóór de eerste fetch.
- Bij een geslaagde fetch de merge naar cache én state schrijven.
- Bij een fout **niet** meer leegmaken (regel 62): cache blijft staan, alleen `error` gaat aan. De
  bestaande toast in `ProductivitySuiteView.jsx:70-75` blijft de melder.
- `lastSyncedAt` erbij in de return (uit de cache dan wel de laatste fetch).
- Fetchen blijft effect-gedreven op `enabled` + weekwissel. Geen interval, geen achtergrondverkeer.
- De hoofdcomment bovenaan beschrijft nu ephemeer-gedrag ("nooit in opslag", AC5/AC6) en moet mee
  veranderen; die is na deze slice feitelijk onjuist.

### 3. `src/App.jsx`

- `agendaShown` van `useState(false)` naar een waarde uit `settings`, exact het patroon van
  `planPrefs`/`sourcePrefs`: laden bij regel 226-227, meeschrijven in de payload rond regel 363 en in
  de dep-array op regel 376. Ontbrekende key valt terug op `false`, dus geen migratie.
- Bij Outlook-verbreken en bij een koppeling die niet meer `connected` is: `clearAgendaCache()` en
  `agendaShown` op `false`. Geen wees-afspraken van een verbroken koppeling.
- `lastSyncedAt` doorgeven aan `ProductivitySuiteView`, naast de bestaande agenda-props.

### 4. `src/components/SourcesPanel.jsx`

De Outlook-rij krijgt onder de statusregel een actieregel: vernieuw-knop plus "bijgewerkt om HH:MM".

Om de dynamische providerlijst te bewaren (AC uit S07c: geen hardcoded providers) komt er één
generieke prop `sourceActions`: een map provider → `{ onRefresh, loading, shown, lastSyncedAt }`. Een
provider zonder entry rendert geen actieregel, dus Trello/GitHub blijven ongemoeid en een latere
provider hoeft hier niets aan te passen. Knoplabel hergebruikt `planner.outlook.import` /
`planner.outlook.refresh`; de spinner hergebruikt het `Loader2`-patroon uit
`ProductivitySuiteView.jsx:125-129`.

### 5. `src/views/ProductivitySuiteView.jsx`

De hele Outlook-tak uit de knoppenbalk (regel 116-140) verdwijnt: zowel de import/vernieuw-knop als
de `notConnectedHint`-knop, want het Koppelingen-blok toont die status al met een "Koppelen"-knop. De
`agendaError`-toast (regel 70-75) blijft. `sourceActions` wordt hier samengesteld en aan
`SourcesPanel` doorgegeven.

### 6. `src/index.css` + `src/views/WeekView.jsx` — de kaartjes

Nieuwe klasse in `@layer components`, naast de bestaande `.r-block-agenda`:

```css
.r-block {
  background-color: var(--r-card);
  border: 1px solid var(--r-border);
  border-radius: var(--r-radius-control);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
```

Dekkend, dus geen doorzichtigheid meer; in dark mode volgt hij vanzelf de donkere kaartkleur. Het
rooster eronder is `--r-card-2`, dus de kaartjes komen in beide thema's los van de achtergrond.

Alle bloksoorten in `WeekView.jsx` gaan over op dit kaartje, met de kleur alleen als strip links:

- **Taakblok** (regel 305-340): `.r-block` in plaats van `${c.iconBg} ${c.iconText}`, titel in
  `theme.text`, en de bestaande `borderLeft: 3px solid getColorHex(item.color)` naar `4px` als de
  enige kleurdrager. `c.bar` op het afvink-rondje blijft.
- **Agendablok**: `agendaBlockAppearance` geeft `.r-block` plus dezelfde strip in de bronkleur, met
  het provider-icoontje in de bronkleur als merkje. Dit **vervangt bewust** de tint-plus-volledige-rand
  uit S07c: het onderscheid met een eigen taak zit nu in het icoontje, niet in een afwijkend
  oppervlak. De fallback voor een onbekende bron blijft `.r-block-agenda`.
- **Voorstel-/conceptblok** (regel 343-385): `.r-block-proposal` en `.r-block-draft` behouden hun
  gestreepte respectievelijk accent-behandeling — dat is een betekenisvol onderscheid ("nog niet
  vast") — maar krijgen dezelfde radius en strip links, zodat ze als familie lezen.
- **`Legend`** (regel 467): de swatches volgen dezelfde kaart-plus-strip-vorm.

### 7. `src/i18n/nl.js` + `en.js`

Nieuwe keys onder `planner.sources.*` voor de bijgewerkt-regel (`lastSynced` met een
`{time}`-parameter) en `neverSynced`. `planner.outlook.import` / `.refresh` / `.loading` /
`.fetchFailed` blijven bestaan en verhuizen mee naar het paneel.
`planner.outlook.notConnectedHint` vervalt en gaat uit beide bestanden. Beide bestanden dezelfde
key-paden (`npm run check:i18n`).

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Agenda geïmporteerd, pagina herladen, Planner open: de blokken staan er direct, vóór en zonder
      netwerk.
- [ ] Een mislukte fetch laat de bestaande blokken staan en toont alleen de foutmelding-toast (de
      hook maakt `eventsByDate` niet meer leeg bij een error).
- [ ] De vernieuw-knop staat in het Koppelingen-blok bij de Outlook-rij, met een leesbare
      "bijgewerkt om"-regel; de balk boven het rooster heeft geen Outlook-knop meer.
- [ ] Trello/GitHub-rijen tonen geen actieregel; de providerlijst blijft uit `CONNECTION_PROVIDERS`
      (geen hardcoded providerlijst in `SourcesPanel`).
- [ ] Outlook verbreken wist de cache: na verbreken toont de Planner geen afspraken meer, ook niet na
      een herlaad. Een cache van een andere `connectionId` wordt genegeerd.
- [ ] Agenda-inhoud staat niet in de account-sync (`isUserSyncKey` is `false` voor de cache-key) en
      niet in een geëxporteerde backup.
- [ ] Blokken in het rooster zijn dekkende kaartjes met de titel in normale tekstkleur en een strip
      links in de kleur van de module respectievelijk de bron. Geen doorzichtige tint
      (`iconBg`-alpha) meer op blokken.
- [ ] Agendablokken blijven onderscheidbaar van eigen taken (provider-icoontje).
- [ ] Licht en donker zijn beide leesbaar; oog-toggle en kleurkeuze uit S07c werken onveranderd, ook
      in de bezette tijd van "deel mijn dag in".
- [ ] Bestaande settings zonder `agendaShown` en een ontbrekende cache werken zonder migratie.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`;
      `npm run check:i18n` en `npm run build` slagen. Geen hardcoded UI-tekst.
- [ ] Geen wijzigingen buiten de scope van deze slice.

## Verificatie

1. `npm run dev`, Outlook koppelen, Planner → Dag, agenda importeren via het Koppelingen-blok.
2. Harde herlaad (Ctrl+Shift+R): blokken moeten er meteen staan. DevTools → Network op Offline en
   opnieuw herladen: nog steeds zichtbaar.
3. DevTools → Application → IndexedDB → `ritmo-db`: `agenda:outlook` bestaat, `settings` bevat géén
   agenda-inhoud. Backup exporteren via Instellingen en het JSON-bestand controleren op afwezigheid
   van afspraken.
4. Offline op "vernieuwen" klikken: toast verschijnt, blokken blijven staan.
5. Van week wisselen en terug: geen lege week, geen dubbele blokken.
6. Kleur wisselen in het Koppelingen-blok: de strip links kleurt mee. Oog uit: blokken weg én "deel
   mijn dag in" plant over die tijd heen (S07c-regressie).
7. Dark mode aan: kaartjes zijn dekkend en leesbaar.
8. Outlook verbreken in Instellingen → Account, dan herladen: geen afspraken meer.
9. `npm run check:i18n` en `npm run build`.
