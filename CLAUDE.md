# Ritmo — Claude Code instructies

Dit bestand bevat instructies voor Claude Code in deze repo. De projectinhoud (wat is Ritmo, design-principes, architectuur) staat in [.claude/docs/PROJECT_INSTRUCTIONS.md](.claude/docs/PROJECT_INSTRUCTIONS.md). Lees dat document als bron van waarheid voor het project zelf.

## Werkwijze: research vrij, bij twijfel vragen

**Research is vrij.** Voor het maken van een plan of het voorbereiden van een wijziging mag ik altijd zonder check-in read-only acties doen: file reads, Grep/Glob, codebase-exploration, en web lookups. Geen tussentijdse "mag ik X lezen?"-pauzes.

**Bij twijfel: vragen.** Als er ambiguïteit is die tot verschillend correcte uitkomsten kan leiden (scope, locatie van een wijziging, naamgeving die elders gebruikt wordt, keuze tussen twee architectuur-opties), gebruik ik de `AskUserQuestion`-tool in plaats van te gokken. Bij keuzes die veilig te defaulten zijn → default kiezen en doorgaan, conform de bestaande "geen permissie-pauzes"-feedback.

## Standaardregel: PROJECT_INSTRUCTIONS.md actueel houden

Na een **structurele wijziging** in deze repo loop ik [.claude/docs/PROJECT_INSTRUCTIONS.md](.claude/docs/PROJECT_INSTRUCTIONS.md) langs en meld ik aan het eind van mijn turn of het document een update nodig heeft.

### Wat telt als structureel

- Nieuw module-`type` of gewijzigde module-shape (velden binnen het module-object zoals beschreven in sectie "Module-systeem")
- Wijziging in storage-keys of in de `window.storage`-API
- Nieuwe afhankelijkheid in `package.json` (toegevoegd, verwijderd, of major-bump)
- Wijziging in tech stack: build tool, framework, hosting, PWA-config
- Nieuwe top-level directory in `src/`, of verplaatste kerncomponent
- Nieuw bestand in `src/views/`, `src/modules/` of `src/utils/` dat het overzicht in sectie "Codestructuur" raakt

### Wat NIET een check triggert

Typo-fixes, kleine bugfixes, styling-tweaks, refactors zonder shape-impact, localisation, en aanpassingen binnen bestaande modules zonder dat de shape verandert.

### Hoe ik de check rapporteer

Bij een positieve check meld ik aan het eind van mijn turn:
1. Welke sectie van PROJECT_INSTRUCTIONS.md achterloopt (bv. "Module-systeem", "Codestructuur").
2. Een concrete voorgestelde edit (oude tekst → nieuwe tekst).
3. Wachten op bevestiging — ik pas PROJECT_INSTRUCTIONS.md niet zelf aan zonder akkoord.

Bij een negatieve check (geen update nodig) zeg ik niets — geen ruis.

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
