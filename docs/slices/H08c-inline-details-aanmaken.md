# H08c — Inline details bij aanmaken (prikschema + bodymap)

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/60 (deel van #59)
**Status:** concept

## Doel

Het laatste openstaande item van H08a afronden: bij het aanmaken van een `injectionSchedule`- (prikschema)
en `bodymap`-module kun je meteen het eerste detail invullen, net als bij medicatie. Nu tonen beide bij
aanmaken alleen een informatienote, wat de gebruiker dwingt eerst een lege module te maken en daarna naar
een andere tab te gaan (zie Epic H in `docs/ROADMAP.md`, item "details direct invullen bij aanmaken").

## Scope

**Wel in scope:**

- **Prikschema-inline.** In de `config`-stap van `ModuleEditor` (`src/App.jsx`) voor
  `editing.type === 'injectionSchedule'` een inline invoer, de medicatie-inline spiegelend
  (`src/App.jsx` ~3845): een lijst van `editing.entries` (medicijn + zone + frequentie, elk met
  verwijder-knop) en een "prik plannen"-knop die `ScheduleEntryFormModal` (mode `add`) opent; `onSave`
  pusht de entry in `editing.entries`. Nieuwe lokale state `addingEntryInline`.
- **Bodymap-inline.** Voor `editing.type === 'bodymap'` de note vervangen door de al geëxporteerde
  `BodymapModuleCard` (`src/views/BodymapView.jsx`) met `module={editing}`, `meds`, `iconOptions` en
  `onLogInjection`/`onRemoveInjection` gewired naar `setEditing` (schrijft in `editing.log`). Bij een lege
  meds-lijst (geen injecteerbaar medicijn) valt het terug op de bestaande `bodymapEditorNote`.
- **Meds-lookup in `ModuleEditor`.** `ModuleEditor` (`src/App.jsx` ~2811) krijgt de modules-lijst mee via
  een nieuwe prop op de render-site (`src/App.jsx` ~1392); binnen de editor `injectableMeds(modules)` uit
  `src/utils/bodymap.js`.
- **Export** `ScheduleEntryFormModal` uit `src/views/InjectionScheduleView.jsx` (nu lokaal).

**Niet in scope (bewust):**

- Geen wijziging aan de bestaande medicatie-inline, Weight Loss-bundel, `+preset`-verwijdering of
  suggesties-autohide (alle al gemerged via PR #62).
- Geen nieuw datamodel: `editing.entries` (injectionSchedule) en `editing.log` (bodymap) blijven de shapes.
- Geen gedragswijziging aan de losstaande `InjectionScheduleView` / `BodymapView` buiten het exporteren van
  het gedeelde form-component.

## Aanpak

- **Blauwdruk:** het medicatie-inline blok in `ModuleEditor` (`src/App.jsx` ~3845, `MedFormModal`).
- **Prikschema:** `ScheduleEntryFormModal` (`src/views/InjectionScheduleView.jsx` ~12) exporteren en met
  `{ open, mode:'add', meds, onClose, onSave, theme }` inline gebruiken.
- **Bodymap:** `BodymapModuleCard` (`src/views/BodymapView.jsx` ~109) hergebruiken; `onLogInjection`/
  `onRemoveInjection` naar `setEditing` schrijven.
- **Meds:** `injectableMeds(modules)` (`src/utils/bodymap.js` ~65) — filtert `medication`-modules op
  `injectable === true`.
- **i18n:** hergebruik bestaande keys (`injectionSchedule.newEntry`, `injectionSchedule.addEntry`,
  `bodymap.*`, `medication.myMeds`-analoog). Elke écht nieuwe UI-string krijgt een key in `src/i18n/nl.js`
  én `src/i18n/en.js`.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Bij het aanmaken van een `injectionSchedule`-module kun je in het aanmaak-scherm meteen de eerste
      geplande prik (medicijn + zone + frequentie) toevoegen; die entry zit in de module bij het opslaan.
- [ ] Bij het aanmaken van een `bodymap`-module toont het aanmaak-scherm de interactieve lichaamskaart en
      logt een zone-klik de eerste prik in de module; bij geen injecteerbaar medicijn valt het terug op de
      informatienote.
- [ ] De bestaande medicatie-inline, Weight Loss-bundel, `+preset`-verwijdering en suggesties-autohide zijn
      ongewijzigd; bestaande modules en gebruikersdata blijven ongemoeid.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt); geen em-dashes in user-facing tekst.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar/uitschakelbaar (principe 2); bestaande gebruikersdata blijft veilig.
- [ ] `npm run build` slaagt.
- [ ] **Lokale preview draait:** `npm run dev` staat als achtergrondproces op http://localhost:5173; Bas kan
      een Prikschema- en Bodymap-module aanmaken en het inline-invullen live testen.
