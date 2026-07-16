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
2. **Werk op `main`.** Geen feature-branches, geen PR's in deze repo. De slice landt via gewone commits op `main`; Poort 2 is dat Bas lokaal test vóór de push.
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
  Toets tegen de Ritmo-uitgangspunten (`.claude/docs/PROJECT_INSTRUCTIONS.md`); de volledige checklist staat in `.claude/skills/kwaliteitscheck/SKILL.md` (Dimensie 4).

### Stap 3 — Slice-spec schrijven

Bepaal eerst `SXX` (uit de titel, of het volgende vrije nummer) en een kebab-titel; die vormen samen de bestandsnaam.

Schrijf `docs/slices/SXX-<kebab>.md` op basis van `docs/slices/SXX-template.md`. Vul:

- **Header:** issue-URL + `**Status:** concept`.
- **Doel:** één of twee zinnen, met verwijzing naar de relevante `docs/ROADMAP.md`-sectie.
- **Scope:** "Wel in scope" en "Niet in scope (bewust)".
- **Aanpak:** geraakte bestanden + herbruikte helpers uit Stap 2 (geen volledige implementatie).
- **Acceptatiecriteria:** toetsbaar geformuleerd, inclusief de vaste criteria:
  - [ ] i18n key-pariteit (`npm run check:i18n` slaagt) voor elke nieuwe UI-string.
  - [ ] Geen wijzigingen buiten de scope van deze slice.
  - [ ] Nieuw gedrag is configureerbaar of uitschakelbaar (uitgangspunt "werkt voor de gebruiker"); bestaande data blijft veilig.

Commit de spec (een `docs:`-commit triggert geen release, dus deze mag direct mee naar `main`):
```
git add docs/slices/SXX-<kebab>.md && git commit -m "docs(slices): SXX-<naam> concept-spec uit issue #<n>"
```

### Stap 4 — Poort 1

Toon een compacte samenvatting: Doel, de acceptatiecriteria, en de geraakte bestanden. **Stop en wacht.**

```
AskUserQuestion:
  "Bovenstaand de concept slice-spec voor issue #<n>. Hoe verder?"
  - Goedkeuren      → door naar Stap 5
  - Aanpassen       → verwerk feedback in het bestand, commit, leg opnieuw voor
  - Stoppen         → einde; de spec blijft als concept staan
```

### Stap 5 — Uitvoering aanbieden

Na goedkeuring:

```
AskUserQuestion:
  "Zal ik het team de slice laten uitvoeren?"
  - Ja, uitvoeren   → orkestreer het team (hieronder)
  - Nee, later      → einde; jij start zelf wanneer je wilt
```

Bij "Ja": orkestreer sequentieel vanuit deze hoofdsessie (subagents starten zelf geen subagents).

Leg éérst het startpunt vast — reviewer en verifier hebben het nodig als scope, en op `main` is er geen branch-diff om het uit af te leiden:
```
git rev-parse HEAD   # basis-SHA; geef deze mee aan reviewer en verifier
```

1. `Agent` **implementer** — geef de slice-spec-path mee; voert de wijzigingen uit op `main`.
2. `Agent` **reviewer** (read-only) — geef de basis-SHA mee; code, uitgangspunten, i18n-regel, scope-discipline.
3. `Agent` **verifier** (read-only) — geef de basis-SHA mee; resultaat punt voor punt tegen de acceptatiecriteria.

Vat elk resultaat kort samen. Bij bevindingen van reviewer/verifier: terug naar de implementer voor een fix, of terug naar Bas als het een scope-/ontwerpvraag is.

### Stap 6 — Poort 2 + samenvatting

De laatste commit van de slice krijgt `Closes #<n>` als footer op een eigen regel. GitHub sluit het issue automatisch zodra die commit op `main` staat — daar is geen PR voor nodig.

```
git commit -m "<type>(<scope>): <beschrijving>

Closes #<n>"
```

Sluit af met de samenvatting per acceptatiecriterium en draai de app via de `/verify`-skill, zodat Bas de slice lokaal kan testen. **Poort 2** blijft bij Bas: pas na zijn goedkeuring push je de slice naar `main`.

## AskUserQuestion-richtlijn

Gebruik `AskUserQuestion` alleen bij echte ambiguïteit die tot verschillend correcte uitkomsten leidt (scope, S-nummer-mapping, `feat:` vs `fix:` voor de commit-titel). Veilig te defaulten → default kiezen en doorgaan, geen ruis.
