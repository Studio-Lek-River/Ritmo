---
name: kwaliteitscheck
description: Review Ritmo-code op simpelheid, configureerbaarheid (geen hardcoding), dataveiligheid, dood materiaal (bestanden/code die weg kunnen), en aansluiting bij de Ritmo-uitgangspunten (veiligheid, werkt-voor-de-gebruiker, hergebruik, JS best-practices, desktop/mobile gescheiden). Default scant `src/`; optioneel pad/glob als argument. Toont eerst een compleet verbeterplan met alle findings; pas daarna iteratief per item vragen of het gefixt moet worden. Gebruik bij review na grote wijzigingen, vóór een commit, of periodiek als sanity-check.
user-invocable: true
allowed-tools:
  - Read
  - Glob
  - Grep
  - Edit
---

# /kwaliteitscheck — Ritmo code review

Reviewt Ritmo-code op vijf dimensies, presenteert eerst een volledig verbeterplan, en handelt dan per finding af op aanwijzing van de gebruiker.

Argumenten: `$ARGUMENTS` (optioneel: pad of glob, bv. `src/views/` of `src/modules/SleepModule.jsx`).

## Harde regels

1. **Geen git-commando's.** Beoordeel alleen wat fysiek in de werkdirectory staat.
2. **Geen enkele Edit voor stap 4 voltooid is.** Het volledige verbeterplan moet eerst op tafel.
3. **De keuze ligt altijd bij de gebruiker.** Per finding vragen, niet aannemen.
4. **Filter aggressief op confidence ≥ 70.** Liever drie sterke findings dan dertig zwakke.

## Workflow

### Stap 1 — Bepaal scope

- Geen argument → `src/**/*.{js,jsx}` via Glob
- Argument is pad of glob → gebruik dat
- Lijst de bestanden hardop voor de gebruiker zodat duidelijk is wat gereviewd wordt

### Stap 2 — Verzamel context

- Lees `.claude/docs/PROJECT_INSTRUCTIONS.md` voor de actuele Ritmo-uitgangspunten, module-shape en storage-API
- Voor dimensie 5 (dood materiaal): bouw een lijst van alle exports en bestanden in scope. Grep elke identifier door de hele repo (exclusief het definitiebestand) om gebruik te detecteren.

### Stap 3 — Review per dimensie (alleen verzamelen)

Loop alle vijf dimensies langs. Score elke finding 0-100, filter < 70 weg. **Geen edits.**

#### Dimensie 1: Simpler zonder functieverlies

- Diepe nesting (>3 niveaus) die met early return platgeslagen kan
- Geneste ternaries (slecht leesbaar — vervang door if/else of switch)
- Duplicatie van logica binnen één bestand of tussen bestanden in `src/modules/` en `src/views/`
- Lange functies (>80 regels) die in pure helpers gesplitst kunnen
- Onnodige abstracties (wrappers die maar één functie aanroepen)
- Comments die WAT beschrijven in plaats van WAAROM (default = geen comment)

#### Dimensie 2: Hardcoding → configureerbaar

- Magic strings/numbers die in `src/utils/` als constante horen
- Iconen, kleuren, units die niet uit `ICON_OPTIONS` / `COLOR_OPTIONS` / preset-utils komen
- Hardcoded NL-tekst die naar een centrale localisation-laag zou moeten — alleen flaggen, niet forceren (Ritmo heeft nu nog geen i18n)
- Storage-keys die niet via `window.storage` lopen of de `ritmo:`-prefix omzeilen
- Module-specifieke logica in `App.jsx` die in `src/modules/<Type>Module.jsx` hoort
- Datums, tijden of intervallen als losse getallen in plaats van via `src/utils/dates.js`

#### Dimensie 3: Dataveiligheid

- Direct gebruik van `localStorage.setItem` / `localStorage.getItem` in plaats van `window.storage` (omzeilt de abstractielaag)
- Persoonsdata (sleep-scores, reflecties, collection-events) opgeslagen buiten `ritmo:day:*` of `ritmo:settings`
- Externe network-calls (`fetch`, `XMLHttpRequest`, third-party SDK's) — schendt privacy-by-default
- Logging van persoonsdata naar console in productiepaden
- `JSON.parse` zonder try/catch op user-data — crash bij corrupt opgeslagen JSON
- Migratie-paden die data overschrijven zonder backup (zie `src/utils/migrate.js`)

#### Dimensie 4: Ritmo-uitgangspunten

De vijf uitgangspunten staan volledig in `.claude/docs/PROJECT_INSTRUCTIONS.md`. Dataveiligheid
(uitgangspunt 1) en hardcoding (deel van uitgangspunt 3) zijn hierboven al Dimensie 3 en 2;
JS best-practices (uitgangspunt 4) valt onder Dimensie 1 en 5. Deze dimensie dekt de resterende
drie invalshoeken:

**Werkt voor de gebruiker (uitgangspunt 2):**
- Hardcoded "voorbeeld"-content of default items die de app als mening neerzet
- Verplichte features zonder toggle in settings
- Modules die niet uit te zetten zijn via `enabled: false`
- Streak/badge-mechanieken die zonder opt-in actief zijn (`countInStreak` mag niet impliciet true zijn)
- Notificaties of reminders die default aan staan
- UI-flows die de gebruiker dwingen iets in te vullen (verplichte velden zonder noodzaak)

**Hergebruik (uitgangspunt 3):**
- Nieuwe component die functioneel overlapt met bestaande in `src/components/` (eigen progress-bar in plaats van `ProgressBar.jsx`, eigen rating-widget in plaats van `StarRating.jsx`, etc.)
- Nieuwe utility die overlapt met bestaande in `src/utils/`
- Module-specifieke variant die als generieke optie op een bestaand module-type kon
- Componenten die handmatig storage-sync doen terwijl `useStoredState` hetzelfde dekt

**Desktop en Mobile UI gescheiden (uitgangspunt 5):**
- Desktop-only UI die in de mobiele boom terechtkomt of omgekeerd (kruis-render)
- Gedeelde logica gedupliceerd in de views in plaats van in `src/hooks/` of `src/utils/`
- Platformkeuze buiten `src/utils/platform.js` / `useIsDesktop` om

#### Dimensie 5: Dood materiaal — bestanden en code die weg kunnen

- **Hele bestanden** in `src/` die nergens geïmporteerd worden (Grep op de bestandsnaam zonder extensie door de hele repo — geen import-hits = vlaggen)
- **Geëxporteerde functies/constanten** zonder consumenten elders
- **React-componenten** in `src/components/` of `src/modules/` die niet meer gerenderd worden
- **Lokale variabelen, imports en helper-functies** binnen een bestand die ongebruikt zijn
- **Dead branches**: `if`-takken waarvan de conditie nooit waar kan zijn, of `else`-takken na een early `return`
- **Uitgecommentarieerde code** die blijft hangen
- **Migratie-code** in `src/utils/migrate.js` voor versies die niemand meer kan hebben — alleen vlaggen, beslissing ligt bij de gebruiker (stale data kan nog opduiken)
- **Assets/utility-files** die alleen door reeds-dode code gebruikt worden (transitief dood)

Aanpak: Grep eerst voor de identifier door de hele scope, exclusief het bestand zelf. Geen treffers + geen dynamische verwijzing (template-string, `eval`) → voorstel om te verwijderen. Bij twijfel: lagere confidence, niet automatisch fixen.

### Stap 4 — Presenteer het volledige verbeterplan

Toon **alle** findings in één rapport. Format:

```
# Verbeterplan — kwaliteitscheck

## Dimensie 1: Simpler (n findings)
[D1-001] Kritiek (95) — src/App.jsx:1240
  Geneste ternary van 3 niveaus diep
  Fix: vervang door switch op `module.type`

[D1-002] Belangrijk (82) — src/modules/SleepModule.jsx:88
  Functie `renderGoals` is 110 regels
  Fix: splits `renderGoalRow` als pure helper uit

## Dimensie 2: Hardcoding (n findings)
...

## Dimensie 3: Dataveiligheid (n findings)
...

## Dimensie 4: Uitgangspunten (n findings)
...

## Dimensie 5: Dood materiaal (n findings)
...

---
Totaal: X findings (Y kritiek, Z belangrijk)
```

**Stop hier en wacht.** Vraag de gebruiker iets in de trant van: *"Bovenstaand het volledige verbeterplan. Zal ik de findings één voor één doorlopen?"* Geen `AskUserQuestion` met fix-opties vóór dit moment.

### Stap 5 — Iteratief afhandelen

Pas nadat het plan zichtbaar is en de gebruiker bevestigd heeft door te gaan:

Voor elke finding (volgorde: kritiek vóór belangrijk, binnen severity op bestand):

```
AskUserQuestion:
  "[D1-001] src/App.jsx:1240 — Geneste ternary. Wat te doen?"
  - Fix nu          → Edit toepassen, daarna doorgaan
  - Sla over        → markeren als overgeslagen, doorgaan
  - Stop hier       → samenvatting + einde
```

Bij "Fix nu": pas exact de in het plan voorgestelde Edit toe. Wijk niet stilletjes af. Als de fix bij nadere inspectie complexer is dan het plan suggereerde, meld dat en vraag opnieuw.

### Stap 6 — Eindrapport

Sluit af met een korte samenvatting:

```
Klaar. Van X findings: Y opgelost, Z overgeslagen, W resterend.
```

## Confidence-richtlijnen

| Score | Betekenis | Voorbeeld |
|---|---|---|
| 90-100 | Kritiek/zeker | Direct `localStorage.setItem` in productiecode |
| 80-89 | Belangrijk | Hardcoded NL-tekst in nieuwe component |
| 70-79 | Waarschijnlijk verbetering | Functie van 100 regels die te splitsen valt |
| < 70 | Stilhouden | Stilistische voorkeur zonder regel |

Als je niet boven 70 komt: niet rapporteren. Liever drie sterke findings dan dertig zwakke.
