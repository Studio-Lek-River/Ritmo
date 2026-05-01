# Ritmo — Claude Code instructies

Dit bestand bevat instructies voor Claude Code in deze repo. De projectinhoud (wat is Ritmo, design-principes, architectuur) staat in [.claude/docs/PROJECT_INSTRUCTIONS.md](.claude/docs/PROJECT_INSTRUCTIONS.md). Lees dat document als bron van waarheid voor het project zelf.

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
