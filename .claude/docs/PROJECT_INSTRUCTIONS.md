# 🎵 Ritmo — Project Instructies

Dit document bevat de fundamentele context, principes en werkwijze voor het Ritmo-project. Gebruik dit als basis voor alle conversaties over de app — zowel hier (Claude.ai voor ontwerp) als in Claude Code (voor implementatie).

---

## 📖 Wat is Ritmo?

Ritmo is een **modulaire dag-app** voor het beheren van persoonlijke routines, gewoontes, taken en reflectie. De naam betekent "ritme" en weerspiegelt het kerndoel: gebruikers helpen hun eigen ritme te vinden in hun dag.

**Tagline:** *Jouw dag, jouw ritme.*

**Niet:** een zoveelste todo-app of habit tracker met vaste features.
**Wel:** een toolbox waarmee elke gebruiker zelf bepaalt hoe de app er voor hen uitziet.

---

## 🌍 Tweetaligheid (NL/EN) — harde regel

Ritmo is **tweetalig**: alle UI moet zowel in het Nederlands als in het Engels werken. De standaardtaal volgt de browser (begint met `nl` → Nederlands, anders Engels); de gebruiker kan in instellingen overschrijven naar `nl`, `en` of `auto`.

**Verplicht voor elke UI-string:**

- Geen hardcoded Nederlandse (of Engelse) tekst in JSX, alert/confirm/prompt, placeholder, aria-label, title, of foutmelding. Hardcoded UI-tekst is een **bug**, geen stijlkwestie.
- Elke nieuwe key komt direct in **zowel** [src/i18n/nl.js](../../src/i18n/nl.js) als [src/i18n/en.js](../../src/i18n/en.js). Een ontbrekende key in één van beide bestanden is een bug.
- UI-strings worden opgehaald via `useTranslation()` (`t('group.key')`) in componenten, of via de standalone `t(key)`-helper in utils.
- Datum-formattering gaat via `Intl.DateTimeFormat` met de huidige locale (`nl-NL` of `en-GB`), niet via hardcoded maand/dagnamen.
- Door de gebruiker zelf ingevoerde tekst (eigen module-namen, items, taken, notities) wordt **niet** vertaald — dat is hun data.
- Standaard-presets en default-modules krijgen `nameKey` en worden bij instantiatie naar de huidige taal gerendered. Daarna zijn het user-data.

**Onbekende EN-vertaling?** Gebruik tijdelijk `[EN] originele Nederlandse tekst` in `en.js`. Het verschijnt zo zichtbaar in de UI dat het opvolging afdwingt — geen onzichtbare TODO-comments.

Deze regel geldt voor zowel Claude Code als web Claude. Web Claude ziet alleen dit document als context, dus deze regel staat hier prominent.

---

## 🎯 Twee fundamentele design-principes

Deze twee principes zijn **leidend** voor elke beslissing in het project. Bij twijfel: kies de optie die deze principes het beste dient.

### Principe 1: Maximale modulariteit in de code

> "Als ik dezelfde functionaliteit twee keer schrijf, doe ik iets fout."

Concreet betekent dit:

- **Hergebruik boven duplicatie**: een nieuwe feature die lijkt op een bestaande, gebruikt waar mogelijk dezelfde onderliggende componenten en logica
- **Generieke module-types**: liever 4 herbruikbare module-types (`checklist`, `choice`, `timer`, `tasks`) waarmee 50 use cases gedekt worden — uit te breiden alleen als een nieuwe use case fundamenteel niet in deze types past
- **Configuratie boven code**: nieuwe varianten van bestaande modules moeten via configuratie (icon, kleur, items, opties) kunnen, niet via nieuwe componenten
- **Componenten doen één ding goed**: een component dat een knop rendert, zou niet ook data moeten ophalen
- **Heldere abstraction layers**: UI-componenten weten niet hoe data wordt opgeslagen; storage-laag weet niets van UI
- **Gedeelde helpers en utilities**: streak-berekeningen, datum-formattering, completion-logic zit op één centrale plek

**Bij elke nieuwe feature stel je de vraag**: kunnen we dit oplossen door een bestaand module-type uit te breiden, of door een nieuwe parameter toe te voegen? Pas als het écht niet anders kan, voegen we een nieuw type toe.

### Principe 2: Maximale vrijheid voor de gebruiker

> "De app heeft geen mening over hoe jij je dag moet inrichten."

Concreet betekent dit:

- **Standaard leeg van inhoud**: de app komt met een set basis-modules (ochtendroutine, fysio, beweging, avondroutine, werk, taken) maar zonder voorgeschreven items binnen die modules — geen voorbeeld-oefeningen, geen suggesties wat een ochtendroutine inhoudt. De gebruiker vult elke module zelf
- **Alles uitschakelbaar**: elke module, elk onderdeel, elke notificatie moet verbergbaar of uitschakelbaar zijn
- **Geen verplichte features**: niets is "must-have", alles is een keuze die de gebruiker maakt
- **Gebruiker bepaalt structuur**: volgorde van modules, welke meetellen voor streaks, welke kleuren, welke iconen
- **Geen oordeel of dwang**: geen rode kruisjes voor gemiste dagen, geen schaam-mechaniek, geen "je hebt gefaald"-meldingen
- **Privacy by default**: alle data lokaal tenzij de gebruiker actief kiest voor cloud-sync (later toe te voegen)
- **Configureerbare gedragingen**: streak-criteria, doelen, herinneringen — alles instelbaar per gebruiker

**Bij elke nieuwe feature stel je de vraag**: leg ik hier iets op aan de gebruiker, of geef ik ze een nieuwe keuze? Dwang is bijna altijd verkeerd — bied configureerbaarheid.

---

## 🏗️ Technische architectuur

### Tech stack

- **Frontend**: React 18 + Vite 5
- **Styling**: Tailwind CSS 3 (met dynamische kleur-safelist)
- **Iconen**: lucide-react
- **PWA**: vite-plugin-pwa (manifest + service worker)
- **Storage**: IndexedDB via idb-keyval (met `window.storage`-compatible API)
- **Hosting**: Netlify (gratis tier, koppelt met GitHub-organisatie Studio-Lek-River)
- **Repo**: github.com/Studio-Lek-River/Ritmo
- **Licentie**: MIT

### Module-systeem (kern van de app)

Ritmo draait om **modules**. Elke module heeft:

```javascript
{
  id: string,              // unieke identifier
  name: string,            // gebruikersnaam, bijv. "Ochtendroutine"
  icon: string,            // sleutel uit ICON_OPTIONS (Lucide-iconen)
  color: string,           // sleutel uit COLOR_OPTIONS (Tailwind-kleuren)
  enabled: boolean,        // zichtbaar op "Vandaag"-tab
  countInStreak: boolean,  // telt mee voor streak-badges (max 4 actief)
  nameKey?: string,        // i18n-key voor default-naam; `name` overschrijft dit zodra gezet
  type: 'checklist' | 'choice' | 'tasks' | 'projects' | 'counter' | 'sleep' | 'collection',
  // type-specifieke velden:
  items?: [{                                                  // voor checklist
    id, label,
    description?,                                             // optionele instructie (toont info-knop)
    target?,                                                  // optioneel sets-doel (vervangt checkbox door plus/min)
  }],
  allowNotes?: boolean,                                       // checklist: toont per-dag notitie-veld per item
  allowDescriptions?: boolean,                                // checklist: toont description-veld in editor
  allowTargets?: boolean,                                     // checklist: toont target-veld in editor
  options?: [{id, label}],                                    // voor choice
  unit?: 'minutes' | 'ml' | 'glas' | 'l' | 'stappen',         // voor counter
  dailyGoal?: number,                                         // voor counter
  weeklyMax?: number,                                         // voor counter (optioneel)
  presets?: [{id, label, amount}],                            // voor counter (snelinvoer-knoppen)
  categoriesEnabled?: boolean,                                // voor counter
  categories?: [{id, label}],                                 // voor counter
  goals?: { monday: {bed, wake}, tuesday: {...}, ... },       // voor sleep (per weekdag)
  toleranceMinutes?: number,                                  // voor sleep (default 15)
  showMorningScore?: boolean,                                 // voor sleep (default true)
  trackingMode?: 'completion' | 'count' | 'amount' | 'flexible', // voor collection
  amountUnit?: string,                                        // voor collection (alleen bij amount/flexible)
  itemFields?: { rating: boolean, notes: boolean, tags: boolean }, // voor collection
  tags?: [{id, label, color}],                                // voor collection (module-scoped)
  items?: [{                                                  // voor collection (overschrijft checklist-items)
    id, name, tags: [tagId], rating: 0..5, notes,
    events: [{date: 'YYYY-MM-DD', amount?, note?}],           // nieuwste-eerst
    trackingMode?: 'completion' | 'count' | 'amount',         // alleen bij module-trackingMode 'flexible'
  }],
}
```

**Module-types en hun gedrag:**

- **Checklist** — lijst met items om af te vinken (ochtendroutine, oefeningen, ...). Per-dag itemdata-vorm: `{ checked?, progress?, note? }`. Oude boolean-vorm wordt lazy genormaliseerd bij lezen via `normalizeChecklistItemData` in `dayProgress.js`. Optionele module-toggles (`allowNotes`/`allowDescriptions`/`allowTargets`) breiden de UI uit met dagelijkse notities, instructie-uitklap en sets-teller (plus/min)
- **Choice** — kies een optie uit meerdere, dat markeert de module als voltooid (beweging buiten: wandelen/fietsen/etc.)
- **Tasks** — vrije takenlijst (toevoegen, afvinken, verwijderen)
- **Projects** — meerdere lopende projecten met een eigen voortgang per project
- **Counter** — generieke teller tegen een dagdoel, met instelbare unit (minutes/ml/glas/l/stappen), snelinvoer-presets en optionele categorieën. Dekt zowel de oude timer-use-cases (minuten bijhouden) als water/stappen/glazen
- **Sleep** — bedtijd, opstaan-tijd en optionele ochtendscore. Doel-tijden per weekdag, configureerbare tolerance. Telt niet automatisch mee voor streaks of dagcel-gradient (gebruiker zet `countInStreak` zelf aan voor week/maand-aggregaten)
- **Collection** — persoonlijke catalogus van items (boeken, bieren, films, restaurants) waarop events worden gelogd. Items en events leven in `settings.modules` (niet in dag-data) omdat ze meerdere dagen overspannen. Telt niet mee voor streaks of dag-completion. Eigen "Collecties"-tab verschijnt alleen als er een ingeschakelde collection-module bestaat; van daaruit zoeken, filteren op module/tag, sorteren, en items in detail bewerken

**Toekomstige module-types worden alleen toegevoegd als ze fundamenteel anders zijn**, niet voor cosmetische verschillen.

Het oude `timer`-type is gegeneraliseerd naar `counter` en gemerged in `main`. Bestaande timer-data wordt automatisch gemigreerd via `src/utils/migrate.js`.

### Data-architectuur

Alle data wordt lokaal opgeslagen via een storage-laag (`src/storage.js`) die de `window.storage`-API biedt. De onderliggende opslag is **IndexedDB** via idb-keyval. Keys worden zonder prefix opgeslagen:

- `settings` — gebruikersinstellingen: `{ modules, darkMode, reflectionQuestions, recurringTasks, streakSettings, soundEnabled, soundVolume, goldenBorderEnabled, showReflectionOnToday, hasUsedSwipe, hasOnboarded, language }`. `language` is `'auto' | 'nl' | 'en'` (default `'auto'` — volgt browser). `hasUsedSwipe` is een one-shot flag die de eerste swipe-gesture in lijsten registreert; zodra true, verdwijnt de "veeg om te verwijderen"-hint.
- `day:YYYY-MM-DD` — dagdata: `{ moduleData, customTasks, reflectionAnswers }`

In de UI roep je `window.storage.get('settings')` aan — geen prefix nodig. `storage.js` heeft een ingebouwde eenmalige migratie die bestaande `ritmo:`-prefixed localStorage-entries naar IndexedDB verplaatst.

De storage-laag is een **abstraction layer**: de UI praat met `window.storage`, niet direct met IndexedDB. Dit maakt latere migratie naar cloud-sync (Supabase/Firebase) eenvoudig zonder de UI aan te passen.

### Codestructuur (huidige staat)

```
src/
├── App.jsx                    # nog monolithisch (ruim 3000 regels), wordt iteratief opgesplitst
├── main.jsx                   # React entry point
├── index.css                  # Tailwind imports + globale stijlen
├── storage.js                 # IndexedDB wrapper via idb-keyval met window.storage API; eenmalige migratie van localStorage
├── i18n/                      # tweetaligheid (NL/EN)
│   ├── nl.js                  # Nederlandse strings (genest object)
│   ├── en.js                  # Engelse strings (gespiegelde structuur)
│   └── useTranslation.js      # hook + standalone t()-helper voor utils
├── modules/                   # geëxtraheerde module-componenten
│   ├── ProjectsModule.jsx
│   ├── SleepModule.jsx
│   ├── CounterModule.jsx
│   ├── ChecklistModule.jsx
│   └── CollectionModule.jsx
├── views/                     # geëxtraheerde hoofdschermen
│   ├── ProjectsView.jsx       # (Today/Week/Month/Reflection zitten nog in App.jsx)
│   ├── CollectionsView.jsx
│   └── HouseholdView.jsx      # Huishouden-tab (klusjes, boodschappen, budget, utilities)
├── hooks/                     # gedeelde React hooks
│   ├── useStoredState.js      # state ↔ window.storage sync (JSON, async load)
│   └── useToast.jsx           # ToastProvider + useToast() voor transient feedback met undo
├── components/                # herbruikbare UI-componenten
│   ├── ProgressBar.jsx
│   ├── ReminderBanner.jsx
│   ├── DayNavigator.jsx       # datumnavigatie (vorige/volgende dag bekijken)
│   ├── ReadOnlyBanner.jsx     # indicatie dat je een andere dag dan vandaag bekijkt
│   ├── StarRating.jsx         # herbruikbare 1-5 sterren-rating (color + labels props)
│   ├── TagPill.jsx            # gekleurde tag-pill (klikbaar of statisch)
│   ├── ItemDetail.jsx         # detailweergave van een collection-item
│   ├── ConfirmDialog.jsx      # generieke bevestigingsdialoog (variant: default | danger)
│   ├── Toast.jsx              # toast-render-component (gebruikt useToast onder de motorkap)
│   ├── SwipeRow.jsx           # swipe-to-delete primitive (touch + muis), reveal rode prullenbak
│   ├── EmptyState.jsx         # generieke lege-staat (icoon + titel + omschrijving + optionele CTA)
│   ├── RitmoLogo.jsx          # R-Loop merk-logo (variant + animation props)
│   ├── SplashScreen.jsx       # app-start scherm met geanimeerd logo + tagline
│   ├── BackupSection.jsx      # export/import-UI in de install-tab (download + file-picker + confirm)
│   └── TabBar.jsx             # tabbalk met overflow-menu ("Meer") en discoverable tabs
└── utils/                     # pure helper-functies
    ├── colors.js
    ├── icons.js               # ICON_OPTIONS dictionary (lucide-iconen voor module-config)
    ├── projects.js
    ├── collections.js         # helpers voor collection-module (event-log, stats, factories)
    ├── format.js              # unit-formatting voor counter-module
    ├── dates.js               # datum-helpers (sleutelvorm, dag-vergelijking, navigatie)
    ├── dayProgress.js         # completion-status logica per dag
    ├── sleep.js               # slaap-helpers (goalsForNight, isOnTarget, summarizeSleep)
    ├── presets.js             # module-presets / templates voor nieuwe modules
    ├── household.js           # helpers voor Huishouden (toMonthly, isOverdue, formatEuro)
    ├── migrate.js             # migraties van oude naar nieuwe data-vormen
    └── backup.js              # export/import helpers: exportData, downloadBackup, importData, readFileAsText
```

De choice- en tasks-modules zitten nog inline in `App.jsx`, evenals de meeste views, settings-modals en theme-logica. **Refactoring is een doorlopend proces** — bij elke nieuwe feature kijken we of er logica naar een aparte file kan. Geen vaste bestemmingsstructuur opleggen; opsplitsen gebeurt zodra er een tweede gebruiker van een stuk logica is.

---

## 👤 Gebruikerscontext (de eigenaar van het project)

- Locatie: Nederland
- **Communiceert in het Nederlands** — alle UI-teksten, code-comments en uitleg in het Nederlands
- Bekend met GitHub en VS Code
- Niet primair een developer; werkt iteratief en wil begrijpen wat er gebeurt
- Werkt met Claude.ai (claude.com) voor ontwerp + Claude Code (VS Code) voor implementatie
- GitHub-organisatie: `Studio-Lek-River`
- Persoonlijke context: heeft cat, doet HoI4 modding (Millennium Dawn), zit in cliëntenraad bij Futuris

---

## 🔄 Werkwijze: split tussen Claude.ai en Claude Code

### In Claude.ai (deze chat-omgeving) — voor ontwerp

Hier doen we:
- **Brainstormen** over nieuwe features en modules
- **Prototyping** in artifacts om concepten visueel uit te proberen
- **UX-keuzes** afwegen voordat we tijd verspillen aan implementatie
- **Strategie** rondom architectuurkeuzes, design-principes, prioriteiten
- **Documentatie** schrijven (READMEs, gebruikershandleidingen, gespreksaantekeningen)
- **Handover-instructies** schrijven die de gebruiker in Claude Code kan plakken

Output is altijd: **een werkend prototype + een handover-document**.

### In Claude Code (VS Code) — voor implementatie

Daar gebeurt:
- **Echte code wijzigingen** in de Ritmo-codebase
- **Debugging** van runtime-errors met live terminal-output
- **Refactoring** naar de gewenste code-structuur
- **Git-operaties**: commits, branches, push naar GitHub
- **Build & deploy** via Netlify-integratie

### Vuistregels voor Claude.ai

1. **Niet meteen in implementatiedetails duiken** — eerst het concept goed neerzetten
2. **Prototypes in artifacts** zodat de gebruiker ze kan uitproberen voordat ze "echt" worden
3. **Handover-instructies** moeten concreet zijn: welke bestanden, welke wijzigingen, welk gedrag
4. **Behoud bestaande gebruikersdata** — migraties moeten safe zijn voor wie de app al gebruikt
5. **Stel kritische vragen** voordat je bouwt: past dit bij de design-principes? Is er een eenvoudiger pad?

---

## ✨ Wenselijke ontwikkelingsmindset

- **Klein beginnen, dan uitbreiden** — een minimum versie die werkt is beter dan een grote die niet af komt
- **Iteratief werken** — elke chat-sessie levert idealiter één afgeronde verbetering op
- **Gebruiker test, dan deployen** — geen feature gaat live zonder dat de gebruiker hem heeft uitgeprobeerd in een prototype
- **Documenteren naast bouwen** — als we iets toevoegen, zorgen we dat de README en deze projectinstructies bij blijven
- **Vragen stellen voor we aannames maken** — bij ambiguïteit liever even checken dan iets bouwen wat de gebruiker niet wilde

---

## 📝 Communicatieafspraken

**Tone & stijl:**
- Beknopt, direct, vriendelijk
- Geen overdreven enthousiasme of marketing-taal
- Concrete uitleg in plaats van vage beschrijvingen
- Code-fragmenten waar nuttig, geen onnodige walls of code

**Bij ontwerp-discussies:**
- Begin met een korte samenvatting van wat de gebruiker wilt
- Geef 2-3 opties met voor- en nadelen wanneer relevant
- Maak een aanbeveling, maar laat de keuze open
- Verduidelijk niet-triviale design-keuzes

**Bij prototyping:**
- Bouw eerst een werkend voorbeeld
- Leg achteraf kort uit wat is toegevoegd en waarom
- Vraag om feedback voordat je doorgaat

**Bij handover-documenten:**
- Schrijf alsof Claude Code deze koud zonder context leest
- Wees specifiek: welke bestanden, welke regels, welke wijzigingen
- Voeg migratie-instructies toe voor bestaande gebruikers
- Sluit af met een test-checklist

---

## 📌 Bron van waarheid bij twijfel

Dit document beschrijft Ritmo op hoofdlijnen. Concrete details (exacte file-lijsten, regelaantallen, branch-status, exacte unit-waardes) verouderen sneller dan dit document wordt bijgewerkt. Wanneer de gebruiker met code werkt of vraagt naar de huidige staat, vraag liever naar de actuele situatie of laat dit door Claude Code verifiëren in plaats van blind te vertrouwen op getallen of file-paden in dit document. De code is altijd leidend boven deze tekst.

---

## ❓ Bij twijfel — terugvalmechanisme

Als er een vraag is waar je geen duidelijk antwoord op hebt, val je terug op:

1. **Eerst:** wat zeggen de twee design-principes?
2. **Dan:** wat is de eenvoudigste oplossing die werkt?
3. **Dan:** wat hergebruikt het meeste bestaande code?
4. **Tot slot:** vraag de gebruiker

Vraag liever één keer extra dan iets bouwen wat herbouwd moet worden.

---

_Laatst bijgewerkt: 2026-05-05_
