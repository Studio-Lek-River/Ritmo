# Ritmo — Claude Code instructies

Dit bestand bevat instructies voor Claude Code in deze repo. De projectinhoud (wat is Ritmo, architectuur) leid je af uit de code zelf en uit `README.md` / `CONTRIBUTING.md` — geen apart algemeen instructiedocument. De Ritmo-uitgangspunten staan wel expliciet in `.claude/docs/PROJECT_INSTRUCTIONS.md`.

## Werkwijze: research vrij, bij twijfel vragen

**Research is vrij.** Voor het maken van een plan of het voorbereiden van een wijziging mag ik altijd zonder check-in read-only acties doen: file reads, Grep/Glob, codebase-exploration, en web lookups. Geen tussentijdse "mag ik X lezen?"-pauzes.

**Bij twijfel: vragen.** Als er ambiguïteit is die tot verschillend correcte uitkomsten kan leiden (scope, locatie van een wijziging, naamgeving die elders gebruikt wordt, keuze tussen twee architectuur-opties), gebruik ik de `AskUserQuestion`-tool in plaats van te gokken. Bij keuzes die veilig te defaulten zijn → default kiezen en doorgaan, conform de bestaande "geen permissie-pauzes"-feedback.

## Auto-commit en push: direct op main

**Harde regel.** Elke wijziging die ik in deze repo maak commit ik zelf. Als ik een bestand bewerk, hoort de commit erbij — niet wachten tot de gebruiker het doet, niet bundelen tot een volgende sessie.

**Granulariteit:** één commit per logische stap. Een `feat:` en een `fix:` in dezelfde turn worden twee aparte commits, in de volgorde die het meest logisch reviewt. Eén feature die twee bestanden raakt is één commit. Bij twijfel: liever splitsen dan mengen — gemengde commits zijn nooit correct (zie Conventional Commits-regels hieronder).

**Wanneer wel:**
- Bij elke daadwerkelijke wijziging aan code, config, instructies of documentatie in deze repo.
- Direct na het afronden van de logische stap, niet aan het eind van de turn als een afsluitactie.
- Ook bij kleine wijzigingen (typo's, comment-fixes) — geen drempel.

**Wanneer niet:**
- Research, exploratie, of plan-mode zonder wijzigingen.
- Wijzigingen aan bestanden buiten de Ritmo-repo (bv. `~/.claude/plans/...` of memory-bestanden).
- Als de gebruiker expliciet zegt "alleen wijzigen, niet committen" voor deze actie.
- Bij een failing build/lint-hook: niet committen tot het werkt; fix eerst, dan commit (geen `--no-verify`).

**Pushen — direct naar `main`.**
- Er zijn geen feature-branches en geen PR's in deze repo. Al het werk gebeurt op `main`, en na de commit push ik direct, zonder te vragen.
- Elke `feat:`- of `fix:`-commit die ik push gaat daarmee meteen live: semantic-release maakt een release en de deploy volgt. Dat is de bedoeling; het is geen reden om te wachten.
- Uitzondering: bij slice-werk (zie "Werkwijze: team en poorten") wacht ik met pushen tot Bas het lokaal heeft getest en goedgekeurd — dat is Poort 2.
- Geen force-push (`git push --force`) tenzij de gebruiker daar expliciet om vraagt. De GitHub-ruleset op `main` blokkeert force-push en het verwijderen van de branch; die regel blijft staan.

**Format:** Conventional Commits per type, zoals hieronder beschreven. Geen `Co-Authored-By: Claude`-trailer.

## Commits: strakke Conventional Commits per type

Ritmo gebruikt [semantic-release](.releaserc.json). Het format van elke commit op `main` bepaalt automatisch het versienummer en de release notes. Format-spec staat in [CONTRIBUTING.md](CONTRIBUTING.md).

**Regels die ik volg bij elke commit:**

1. **Altijd Conventional Commits-format** — `<type>(<scope>): <korte beschrijving>`. Geen vrije commit-messages.
2. **Eén type per commit, geen mengvormen.** Liever twee aparte commits dan één met een fout type. Een bug-fix én een nieuwe feature gaan in twee commits, niet in één gemengde `feat:`.
3. **Type kiezen op basis van wat er feitelijk verandert,** niet op basis van of een release gewenst is. Gedragsverandering = `feat:` of `fix:`; alleen interne refactor = `refactor:`; build/deps = `chore:`; documentatie = `docs:`.
4. **Bij twijfel tussen `feat:` en `fix:`** noem ik dat expliciet in mijn antwoord en laat ik de gebruiker kiezen.
5. **Geen `Co-Authored-By: Claude ...`-trailer** in commit messages.

## Changelog- en versie-toets

Elke commit landt rechtstreeks op `main` en verschijnt als aparte regel in de gegenereerde changelog, onder de juiste sectie ("Features", "Bug Fixes"). Elke commit bepaalt dus zijn eigen version bump; bij meerdere commits achter elkaar bepaalt het zwaarste type de bump van de release. Vóór elke commit doorloop ik deze toets:

### Wat ik check

1. **Type klopt met de feitelijke wijziging** — een gedragsverandering zichtbaar voor de gebruiker is altijd `feat:` of `fix:`, ook als die klein voelt. Een interne refactor zonder zichtbaar effect is `refactor:`.
2. **Beschrijving is changelog-waardig** — de eerste commit-regel verschijnt letterlijk in CHANGELOG.md. Ik schrijf hem zodat een gebruiker begrijpt wat er veranderd is zonder de code te zien.
3. **BREAKING CHANGE-vlag** — als een wijziging bestaande data, API's of verwacht gedrag incompatibel verandert, voeg ik `!` toe na het type (`feat!:`) of een `BREAKING CHANGE:`-footer. Ik wijs hier altijd actief op, ook als de gebruiker het niet noemt.
4. **Version bump expliciet benoemen** — als het niet voor de hand ligt, benoem ik de verwachte bump (`feat:` → minor, `fix:` → patch, `feat!:` → major).

### Wanneer ik dit meld

- Type is onduidelijk: ik noem beide kandidaten + consequentie (wél/geen release, welke bump) en laat de gebruiker kiezen.
- `BREAKING CHANGE` is van toepassing: altijd actief melden.
- Type en beschrijving zijn duidelijk: geen extra toelichting — commit direct, geen ruis.

## Werkwijze: team en poorten

Grote changes lopen via de werkwijze in docs/PLAN.md, opgeknipt in kleine slices. Het wat, de volgorde en de status staan in docs/ROADMAP.md (leidend).

**Elke slice is een GitHub-issue.** Het issue is de spec en de bron van waarheid, niet een bestand in de repo. Een nieuwe slice krijgt dus een issue in `Studio-Lek-River/Ritmo` (of, als het issue er al is, wordt de spec de body ervan) — er komen geen nieuwe bestanden in `docs/slices/`. Die map blijft staan als historie van de slices die vóór deze afspraak zijn geschreven; ernaar verwijzen mag, eraan toevoegen niet.

Per slice gelden vijf rollen en twee poorten:

1. Toetsen (PO): slice-spec met acceptatiecriteria in het GitHub-issue. Poort 1: Bas keurt de spec goed.
2. Uitvoering (implementer-subagent): op `main`, volgens de spec en deze CLAUDE.md.
3. Controle uitvoering (reviewer-subagent, read-only): code, uitgangspunten, i18n-regel.
4. Controle vereisten (verifier-subagent, read-only): resultaat tegen de acceptatiecriteria.
5. Terug naar Bas: samenvatting per criterium plus een draaiende app via de `/verify`-skill. Poort 2: Bas test lokaal en keurt goed, daarna push ik naar `main`.

De hoofdsessie orkestreert: roep implementer, dan reviewer, dan verifier, sequentieel.
Subagents kunnen zelf geen subagents starten.

Omdat al het werk op `main` gebeurt, kunnen reviewer en verifier hun scope niet meer afleiden uit een branch-diff. De hoofdsessie legt daarom vóór de implementer het startpunt vast (`git rev-parse HEAD`) en geeft die basis-SHA mee in de prompt aan reviewer en verifier. Zij beoordelen dan alleen de bestanden uit `git diff --name-only <basis>..HEAD` plus `git status --short`. "Read-only" = geen code-edits: beide mogen wél niet-muterende commando's draaien (`git diff`/`git status`, en de reviewer `npm run check:i18n`).

Harde regel (afgedwongen via hook): nl.js en en.js hebben dezelfde keys.
De reviewer let daarnaast op: geen hardcoded UI-tekst, geen wijzigingen buiten de slice-scope,
en naleving van de Ritmo-uitgangspunten.
