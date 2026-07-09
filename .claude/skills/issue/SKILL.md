---
name: issue
description: Neemt een GitHub-issue-nummer, haalt het issue op via de gh CLI, onderzoekt de inhoud tegen de codebase/ROADMAP/gelinkte issues, en schrijft een concept slice-spec in docs/slices/ (het Poort 1-artefact). Na goedkeuring biedt de skill aan de implementer->reviewer->verifier-pijplijn te draaien. Gebruik met /issue <nummer>.
user-invocable: true
allowed-tools:
  - Read
  - Grep
  - Glob
  - Bash
  - Write
  - Edit
  - AskUserQuestion
  - Agent
---

# /issue — GitHub-issue naar slice-plan

Neemt een GitHub-issue-nummer, onderzoekt de inhoud, en schrijft een concept slice-spec in `docs/slices/` — het Poort 1-artefact dat het team van subagents daarna uitvoert. Na jouw goedkeuring biedt de skill aan de implementer→reviewer→verifier-pijplijn te draaien.

Argument: `$ARGUMENTS` (het issue-nummer, bv. `43`).

## Harde regels

1. **Repo is `Studio-Lek-River/Ritmo`.** Gebruik altijd `gh ... --repo Studio-Lek-River/Ritmo`.
2. **Nooit rechtstreeks op `main` werken.** Maak eerst een branch `slice/SXX-<kebab>` (zie Stap 3). De slice bevat straks code-wijzigingen die via een PR en Poort 2 moeten.
3. **Deze skill implementeert geen code.** De skill levert het plan (de slice-spec). Uitvoering loopt via het team, en pas na expliciete goedkeuring (Poort 1).
4. **Bij ambiguïteit → `AskUserQuestion`, niet gokken.** Onduidelijke scope, meerdere geldige interpretaties, of onduidelijke S-nummer-mapping zijn keuzes voor Bas. Veilig te defaulten → default kiezen en doorgaan.
5. **Geen `Co-Authored-By: Claude`-trailer** in commits (conform `CLAUDE.md`).

## Workflow

### Stap 1 — Issue ophalen

- Geen nummer in `$ARGUMENTS` → vraag om een nummer, stop tot je het hebt.
- Haal het issue op:
  ```
  gh issue view <n> --repo Studio-Lek-River/Ritmo --json number,title,body,labels,state,comments,url
  ```
- Toon titel + een korte samenvatting van de body. Bij een gesloten issue: meld dat en vraag of doorgaan zin heeft.

### Stap 2 — Research (read-only, vrij)

Onderzoek gericht — geen tussentijdse permissie-pauzes:

- **S-nummer.** Detecteer een S-nummer in de titel (bv. "S12, ..."). Zo ja → lees de bijbehorende sectie in `docs/ROADMAP.md` en check of er al een `docs/slices/S12-*.md` bestaat. Bestaat die → **bijwerken, niet dupliceren**.
- **Gelinkte issues.** Volg referenties in de body (bv. parent `#33`) via `gh issue view <ref> --repo Studio-Lek-River/Ritmo --json title,body`.
- **Codebase.** Zoek naar herbruikbare patronen die het issue raakt, bv.:
  - GitHub-interactie → het `GITHUB_TOKEN`-patroon in `api/feedback.js`
  - UI-tekst → `src/i18n/nl.js` + `src/i18n/en.js` (key-pariteit verplicht)
  - Opslag → `window.storage` / `useStoredState` i.p.v. directe `localStorage`
  - Componenten/utils → bestaande in `src/components/` en `src/utils/`
  Toets tegen de twee principes; de volledige checklist staat in `.claude/skills/kwaliteitscheck/SKILL.md` (Dimensie 4).

### Stap 3 — Branch

- Bepaal `SXX` (uit de titel, of het volgende vrije nummer) en een kebab-titel.
- Maak/checkout de branch, nooit op `main`:
  ```
  git switch -c slice/SXX-<kebab>   # of: git switch slice/SXX-<kebab> als hij al bestaat
  ```

### Stap 4 — Slice-spec schrijven

Schrijf `docs/slices/SXX-<kebab>.md` op basis van `docs/slices/SXX-template.md`. Vul:

- **Header:** issue-URL + `**Status:** concept`.
- **Doel:** één of twee zinnen, met verwijzing naar de relevante `docs/ROADMAP.md`-sectie.
- **Scope:** "Wel in scope" en "Niet in scope (bewust)".
- **Aanpak:** geraakte bestanden + herbruikte helpers uit Stap 2 (geen volledige implementatie).
- **Acceptatiecriteria:** toetsbaar geformuleerd, inclusief de vaste criteria:
  - [ ] i18n key-pariteit (`npm run check:i18n` slaagt) voor elke nieuwe UI-string.
  - [ ] Geen wijzigingen buiten de scope van deze slice.
  - [ ] Nieuw gedrag is configureerbaar of uitschakelbaar (principe 2); bestaande data blijft veilig.

Commit op de branch:
```
git add docs/slices/SXX-<kebab>.md && git commit -m "docs(slices): SXX-<naam> concept-spec uit issue #<n>"
```

### Stap 5 — Poort 1

Toon een compacte samenvatting: Doel, de acceptatiecriteria, en de geraakte bestanden. **Stop en wacht.**

```
AskUserQuestion:
  "Bovenstaand de concept slice-spec voor issue #<n>. Hoe verder?"
  - Goedkeuren      → door naar Stap 6
  - Aanpassen       → verwerk feedback in het bestand, commit, leg opnieuw voor
  - Stoppen         → einde; spec blijft als concept op de branch staan
```

### Stap 6 — Uitvoering aanbieden

Na goedkeuring:

```
AskUserQuestion:
  "Zal ik het team de slice laten uitvoeren?"
  - Ja, uitvoeren   → orkestreer het team (hieronder)
  - Nee, later      → einde; jij start zelf wanneer je wilt
```

Bij "Ja": orkestreer sequentieel vanuit deze hoofdsessie (subagents starten zelf geen subagents):

1. `Agent` **implementer** — geef de slice-spec-path mee; voert de wijzigingen uit op de branch.
2. `Agent` **reviewer** (read-only) — code, principes, i18n-regel, scope-discipline.
3. `Agent` **verifier** (read-only) — resultaat punt voor punt tegen de acceptatiecriteria.

Vat elk resultaat kort samen. Bij bevindingen van reviewer/verifier: terug naar de implementer voor een fix, of terug naar Bas als het een scope-/ontwerpvraag is.

### Stap 7 — PR + samenvatting

Open **altijd** een PR (branch → `main`) als die er nog niet is. Check eerst of er al een open PR voor de branch bestaat; zo ja, maak geen tweede aan maar werk de body bij zodat die de `Closes #<n>`-regel bevat.

```
# bestaat er al een PR voor deze branch?
gh pr view --repo Studio-Lek-River/Ritmo --head slice/SXX-<kebab> --json number,body

# nog geen PR → aanmaken
gh pr create --repo Studio-Lek-River/Ritmo --base main --head slice/SXX-<kebab> \
  --title "<type>(<scope>): <beschrijving>" \
  --body "<samenvatting per acceptatiecriterium — benoemt wat er is veranderd>

Closes #<n>"
```

De PR-body benoemt de wijzigingen (samenvatting per acceptatiecriterium) en bevat `Closes #<n>` op een eigen regel, zodat GitHub de issue automatisch sluit wanneer de PR naar `main` gemerged wordt. Sluit af met de samenvatting per acceptatiecriterium en de Netlify-preview-verwijzing. **Poort 2** (Bas test en merge) blijft bij Bas.

## AskUserQuestion-richtlijn

Gebruik `AskUserQuestion` alleen bij echte ambiguïteit die tot verschillend correcte uitkomsten leidt (scope, S-nummer-mapping, `feat:` vs `fix:` voor de PR-titel). Veilig te defaulten → default kiezen en doorgaan, geen ruis.
