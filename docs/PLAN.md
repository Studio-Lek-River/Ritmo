# PLAN — team-werkwijze voor Ritmo

Grote changes lopen niet in één keer, maar opgeknipt in kleine, afgeronde **slices**. Elke slice heeft een eigen spec in `docs/slices/SXX-*.md` (op basis van `docs/slices/SXX-template.md`) en doorloopt vijf rollen met twee menselijke poorten.

Dit document beschrijft de **werkwijze**. Het **wat**, de **volgorde** en de **actuele status** staan in `docs/ROADMAP.md` (leidend).

## Vijf rollen, twee poorten

1. **Toetsen (PO, in Claude.ai).** Slice-spec met acceptatiecriteria in `docs/slices/SXX-*.md`.
   **Poort 1:** Bas keurt de spec goed.
2. **Uitvoering (implementer-subagent).** Op de huidige branch, volgens de spec en `CLAUDE.md`.
3. **Controle uitvoering (reviewer-subagent, read-only).** Code, uitgangspunten, i18n-regel.
4. **Controle vereisten (verifier-subagent, read-only).** Resultaat tegen de acceptatiecriteria.
5. **Terug naar Bas.** PR plus Vercel-preview plus samenvatting per criterium.
   **Poort 2:** Bas test en keurt goed, dan merge.

De hoofdsessie orkestreert: roep implementer, dan reviewer, dan verifier, sequentieel. Subagents kunnen zelf geen subagents starten.

## Waartegen wordt getoetst

De volledige uitwerking van de Ritmo-uitgangspunten staat in `.claude/docs/PROJECT_INSTRUCTIONS.md`, met de concrete review-checklist in `.claude/skills/kwaliteitscheck/SKILL.md` (Dimensie 4). In het kort:

- **Tweetaligheid (afgedwongen via hook).** `src/i18n/nl.js` en `src/i18n/en.js` hebben exact dezelfde key-paden. `npm run check:i18n` faalt anders, en de pre-commit hook blokkeert de commit. Geen hardcoded UI-tekst. (Aparte harde regel, geen uitgangspunt.)
- **Veiligheid van data.** Geen dataverlies; veilige migraties; opslag via `window.storage`; privacy-by-default.
- **Ritmo werkt voor de gebruiker.** Niets wordt de gebruiker opgelegd; nieuw gedrag is configureerbaar of uitschakelbaar.
- **Hergebruik, minimale hardcoding.** Hergebruik bestaande componenten en helpers; geen duplicatie; geen onnodig nieuw module-type; config/tokens boven hardcoded waarden.
- **JavaScript best-practices.** Schone, klein-gescopete, leesbare code; geen dode code.
- **Desktop en Mobile UI gescheiden.** Platform-specifieke UI-lagen blijven gescheiden; gedeelde logica in `src/hooks/` en `src/utils/`; geen kruis-render.

De reviewer let daarnaast op scope-discipline (geen wijzigingen buiten de slice).
