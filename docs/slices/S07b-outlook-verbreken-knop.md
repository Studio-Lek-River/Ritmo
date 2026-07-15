# S07b — Outlook: "Verbreken"-knop bij niet-verbonden staat

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/110
**Status:** concept

## Doel

Fix de tegenstrijdige staat in Koppelingen → Outlook na een afgebroken of
mislukte connect: statuslabel "Niet verbonden" met daarnaast een "Verbreken"-knop
(zie #110, getriggerd door #109). Sluit aan bij het Outlook-koppelingswerk uit
docs/ROADMAP.md (S07).

## Scope

**Wel in scope:**
- In `src/components/ConnectionsSection.jsx` de verbind/verbreek-knop baseren op
  `status === 'connected'` i.p.v. op het bestaan van de connection-rij. Alleen een
  verbonden koppeling toont "Verbreken"; elke andere staat (`disconnected`,
  `error`) toont "Verbinden".

**Niet in scope (bewust):**
- Server-side de dangling `disconnected` rij opruimen of pas bij succes
  committen (issue-optie 2). Ingrijpender en niet nodig: de rij is onschadelijk
  en wordt bij een nieuwe connect hergebruikt via `.maybeSingle()` in
  `api/connections/outlook/start.js`.
- Wijzigingen aan de OAuth-flow, de migratie of de disconnect-API.

## Aanpak

Eén wijziging in [src/components/ConnectionsSection.jsx](../../src/components/ConnectionsSection.jsx):
de render-conditie op regel 100 (`{connection ? Verbreken : Verbinden}`) vervangen
door een conditie op de status. Introduceer `const isConnected = status === 'connected';`
en render de "Verbreken"-tak alleen wanneer `isConnected` (met de bestaande
`connection`-lookup voor `connection.id`), anders de "Verbinden"-tak.

De `connection`-lookup en de busy-check (regels 79-81) blijven ongewijzigd; de
disconnect-handler `disconnect(connection.id)` verandert niet en is alleen
bereikbaar wanneer verbonden.

Waarom dit volstaat en veilig is:
- Een `disconnected` rij heeft nooit een orphan Vault-secret: `token_secret_id`
  wordt alleen gezet door `connections_set_secret`, dat tegelijk
  `status='connected'` zet. De "Verbreken"-knop weglaten bij niet-verbonden
  rijen laat dus niets ongeschoond achter.
- Geen nieuwe UI-strings: `connections.connect`, `connections.disconnect` en
  `connections.status.*` bestaan al in `src/i18n/nl.js` + `en.js`.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] Na een afgebroken/mislukte connect toont Outlook een consistente staat:
      "Niet verbonden" + **"Verbinden"** (geen "Verbreken" bij niet-verbonden).
- [ ] Opnieuw "Verbinden" na een eerdere afgebroken poging werkt zonder dubbele
      rijen of restanten (bestaande `.maybeSingle()`-hergebruik in start.js).
- [ ] Een succesvolle koppeling toont "Verbonden" + "Verbreken".
- [ ] Geen regressie in de disconnect-flow (Vault-secret gewist, status
      `disconnected`) — `disconnect(connection.id)` ongewijzigd.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als
      `src/i18n/en.js` (`npm run check:i18n` slaagt) — hier geen nieuwe strings.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag verandert bestaande gebruikersdata niet; geen migratie nodig.
