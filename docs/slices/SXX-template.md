# SXX — <slice-titel>

## Doel

<Eén of twee zinnen: wat lost deze slice op, en waarom nu. Verwijs naar het bredere doel in docs/ROADMAP.md indien relevant.>

## Scope

**Wel in scope:**
- <concrete wijziging 1>
- <concrete wijziging 2>

**Niet in scope (bewust):**
- <wat expliciet buiten deze slice valt, zodat de implementer niet uitwaaiert>

## Aanpak (optioneel)

<Korte schets: welke bestanden/componenten worden geraakt, welke bestaande helpers hergebruikt. Geen volledige implementatie.>

## Acceptatiecriteria

De verifier toetst deze punt voor punt. Formuleer ze toetsbaar (waarneembaar gedrag of controleerbaar bestand), niet als taak.

- [ ] <criterium 1: waarneembaar resultaat>
- [ ] <criterium 2>
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js` (`npm run check:i18n` slaagt).
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar of uitschakelbaar (principe 2); bestaande gebruikersdata blijft veilig.
