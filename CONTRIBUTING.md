# Bijdragen aan Ritmo

## Commit-conventies

Ritmo gebruikt [Conventional Commits](https://www.conventionalcommits.org/).
Het commit-format bepaalt automatisch het volgende versienummer en de release notes.

### Format

```
<type>(<scope>): <korte beschrijving>

[optionele body]

[optionele footer]
```

`scope` is optioneel (bijvoorbeeld `modules`, `streak`, `i18n`). Houd de korte beschrijving in de gebiedende wijs en onder de 72 tekens.

### Types die het versienummer bumpen

- `feat:` nieuwe feature, minor bump (0.1.0 → 0.2.0)
- `fix:` bugfix, patch bump (0.1.0 → 0.1.1)
- `BREAKING CHANGE:` in body, of `!` na het type, major bump (0.1.0 → 1.0.0)

### Types die geen release triggeren

- `chore:` onderhoud, build-config, dependencies
- `docs:` alleen documentatie
- `style:` formatting, geen code-wijziging
- `refactor:` code-herstructurering zonder gedragsverandering
- `perf:` performance-verbetering zonder API-wijziging
- `test:` tests toevoegen of aanpassen
- `ci:` CI-config

### Voorbeelden

```
feat(modules): voeg collection-module toe
fix(streak): corrigeer berekening bij maandwissel
chore(deps): bump vite naar 5.4
docs: update README met i18n-uitleg
feat!: vervang oude timer-module door counter

BREAKING CHANGE: timer-data wordt automatisch gemigreerd, oude API verdwijnt.
```

### Releases

Een push naar `main` met minstens één `feat:`- of `fix:`-commit triggert
automatisch een GitHub Release, een nieuwe tag, en een update van
`CHANGELOG.md`. Daarvoor is de workflow in `.github/workflows/release.yml`
verantwoordelijk; configuratie staat in `.releaserc.json`.
