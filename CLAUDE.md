# Ritmo — Claude Code instructies

Dit bestand bevat instructies voor Claude Code in deze repo. De projectinhoud (wat is Ritmo, design-principes, architectuur) leid je af uit de code zelf en uit `README.md` / `CONTRIBUTING.md` — geen apart instructiedocument.

## Werkwijze: research vrij, bij twijfel vragen

**Research is vrij.** Voor het maken van een plan of het voorbereiden van een wijziging mag ik altijd zonder check-in read-only acties doen: file reads, Grep/Glob, codebase-exploration, en web lookups. Geen tussentijdse "mag ik X lezen?"-pauzes.

**Bij twijfel: vragen.** Als er ambiguïteit is die tot verschillend correcte uitkomsten kan leiden (scope, locatie van een wijziging, naamgeving die elders gebruikt wordt, keuze tussen twee architectuur-opties), gebruik ik de `AskUserQuestion`-tool in plaats van te gokken. Bij keuzes die veilig te defaulten zijn → default kiezen en doorgaan, conform de bestaande "geen permissie-pauzes"-feedback.

## Auto-commit: bij elke wijziging; pushen op verzoek

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

**Pushen — op verzoek.**
- Committen blijft automatisch; pushen doe ik niet uit mezelf, maar wél zodra de gebruiker erom vraagt (`git push`, PR openen).
- Als de gebruiker vraagt te pushen of een PR te openen, mag dat direct, zonder extra permissie-pauze.
- Geen force-push (`git push --force`) tenzij de gebruiker daar expliciet om vraagt. Nooit rechtstreeks naar `main` pushen; werk via een branch en PR.

**Format:** Conventional Commits per type, zoals hieronder beschreven. Geen `Co-Authored-By: Claude`-trailer.

## Commits: strakke Conventional Commits per type

Ritmo gebruikt [semantic-release](.releaserc.json). Het format van elke commit op `main` bepaalt automatisch het versienummer en de release notes. Format-spec staat in [CONTRIBUTING.md](CONTRIBUTING.md).

**Regels die ik volg bij elke commit:**

1. **Altijd Conventional Commits-format** — `<type>(<scope>): <korte beschrijving>`. Geen vrije commit-messages.
2. **Eén type per commit, geen mengvormen.** Liever twee aparte commits dan één met een fout type. Een bug-fix én een nieuwe feature gaan in twee commits, niet in één gemengde `feat:`.
3. **Type kiezen op basis van wat er feitelijk verandert,** niet op basis van of een release gewenst is. Gedragsverandering = `feat:` of `fix:`; alleen interne refactor = `refactor:`; build/deps = `chore:`; documentatie = `docs:`.
4. **Bij twijfel tussen `feat:` en `fix:`** noem ik dat expliciet in mijn antwoord en laat ik de gebruiker kiezen.
5. **Geen `Co-Authored-By: Claude ...`-trailer** in commit messages.

**Merge-strategie:** squash merging is uitgeschakeld in de repo. PRs gebruiken merge commit of rebase, dus alle losse commits blijven intact op `main`. Elke individuele commit verschijnt als aparte regel in de gegenereerde changelog onder de juiste sectie ("Features", "Bug Fixes"). Het zwaarste type binnen een PR bepaalt de version bump.

## Changelog- en versie-toets

Elke commit bepaalt automatisch de version bump en een regel in CHANGELOG.md. Vóór elke commit doorloop ik deze toets:

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
Per slice gelden vijf rollen en twee poorten:

1. Toetsen (PO, in Claude.ai): slice-spec met acceptatiecriteria in docs/slices/SXX-*.md. Poort 1: Bas keurt de spec goed.
2. Uitvoering (implementer-subagent): op de huidige branch, volgens de spec en deze CLAUDE.md.
3. Controle uitvoering (reviewer-subagent, read-only): code, principes, i18n-regel.
4. Controle vereisten (verifier-subagent, read-only): resultaat tegen de acceptatiecriteria.
5. Terug naar Bas: PR plus Netlify-preview plus samenvatting per criterium. Poort 2: Bas test en keurt goed, dan merge.

De hoofdsessie orkestreert: roep implementer, dan reviewer, dan verifier, sequentieel.
Subagents kunnen zelf geen subagents starten.

Harde regel (afgedwongen via hook): nl.js en en.js hebben dezelfde keys.
De reviewer let daarnaast op: geen hardcoded UI-tekst, geen wijzigingen buiten de slice-scope,
en naleving van de twee design-principes.
