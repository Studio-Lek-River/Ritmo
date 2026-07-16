# S08b — Koppeling verbreken repareren (Trello + Outlook)

**Status:** uitgevoerd, wacht op Poort 2 (migration toepassen + test door Bas)

## Doel

Verbreken van een koppeling werkte voor geen enkele provider: klikken op "Verbreken" gaf een
foutmelding en de status bleef "Verbonden". Gevonden via een gebruikersmelding over Trello (het
verkeerde Trello-account gekoppeld, en niet meer los te krijgen). Sluit aan bij het
koppelingenwerk uit docs/ROADMAP.md (S02, S07, S08).

## Root cause

`connections_clear_secret` riep `vault.delete_secret(v_secret_id)` aan
(`supabase/migrations/20260713120000_connections.sql:214`). **Die functie bestaat niet.**
Supabase Vault levert alleen `vault.create_secret()` en `vault.update_secret()`; verwijderen
gaat via een gewone `DELETE FROM vault.secrets`. Dezelfde asymmetrie stond al in de S02-migration:
schrijven gebruikt de echte Vault-functies, lezen gebruikt de view `vault.decrypted_secrets`,
alleen verwijderen verzon een functie.

De RPC gooide daardoor `undefined_function` (42883) → `api/connections/disconnect.js` maakte er
een 500 `disconnect_failed` van → de rij bleef op `status = 'connected'`.

Dat verklaart ook waarom de gebruiker volledig vastzat: de "Verbinden"-knop verschijnt alleen bij
`status <> 'connected'` (`src/components/ConnectionsSection.jsx:127-145`, keuze uit S07b), dus een
falend verbreken blokkeert ook het opnieuw koppelen met een ander account.

De knop, de hook (`useConnections.js`) en het endpoint waren allemaal in orde; alleen de laatste
stap in de database faalde.

## Scope

**Wel in scope:**
- Nieuwe migration `supabase/migrations/20260716120000_connections_clear_secret_fix.sql`:
  `CREATE OR REPLACE` van `connections_clear_secret`, met `DELETE FROM vault.secrets WHERE id = v_secret_id`
  in plaats van de niet-bestaande `vault.delete_secret()`. Eigenaarscheck, `search_path`,
  status-update en de REVOKE/GRANT-regels blijven identiek.
- `api/connections/disconnect.js`: het Trello-token wordt nu ook bij Trello ingetrokken
  (`DELETE /1/tokens/{token}`) vóór het wissen van het Vault-secret. Tokens worden aangemaakt met
  `expiration: 'never'` (`trello/start.js:51`), dus zonder deze stap blijft Ritmo eeuwig
  geautoriseerd in het Trello-account. Best-effort: een mislukte revoke wordt gelogd en blokkeert
  het verbreken niet.

**Niet in scope (bewust):**
- De `status === 'connected'`-conditie in `ConnectionsSection.jsx`. Bewuste keuze uit S07b (#110)
  en niet de oorzaak.
- Een hint in `TrelloConnectDialog` over met welk Trello-account je bent ingelogd. Trello's
  autorisatiepagina gebruikt stilzwijgend je browsersessie, wat een reëel UX-gat is, maar het
  vraagt nieuwe i18n-strings en staat los van deze fix.
- Een revoke voor Outlook; die flow heeft een eigen token-lifecycle.

## Aanpak

De bestaande S02-migration blijft ongemoeid (is al toegepast op de live database); de fix is een
losse `CREATE OR REPLACE`-migration. In `disconnect.js` wordt `TRELLO_API_BASE` uit
`api/connections/trello/_shared.js` hergebruikt en het token gelezen via de bestaande RPC
`connections_get_secret`. De revoke staat na de eigenaarscheck (`connection.account_id !==
userData.user.id` → 404), zodat hij nooit op andermans rij kan draaien.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] "Verbreken" bij Trello zet de status op "Niet verbonden" zonder foutmelding.
- [ ] Het Vault-secret is fysiek verwijderd; de rij heeft `token_secret_id IS NULL` en
      `status = 'disconnected'` (geen orphan secret in `vault.secrets`).
- [ ] Het Trello-token is ingetrokken bij Trello: Ritmo staat niet meer in de applicatielijst van
      dat Trello-account.
- [ ] Een mislukte revoke bij Trello (bv. al ingetrokken token) blokkeert het verbreken niet.
- [ ] Na verbreken is opnieuw koppelen mogelijk, met het juiste account.
- [ ] Outlook verbinden/verbreken werkt (geen regressie; zelfde RPC, was even kapot).
- [ ] De Trello-projecten van het oude account zijn na verbreken weg uit Projecten
      (`clearTrelloCache()` + `clearTrelloBoardPrefs()`, `src/App.jsx:1484-1493`).
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt) — hier geen nieuwe strings.
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Bestaande gebruikersdata blijft veilig; de migration raakt alleen de functiedefinitie.

## Testen (Poort 2)

De `api/`-wijziging is niet lokaal te testen: secrets staan alleen in Vercel, dus testen via een
preview-deploy (`npx vercel`), niet met `vite dev`.

1. Bas past de migration toe op de live database (backup vooraf, S01b-workflow).
2. Preview-deploy via `npx vercel`, inloggen met het echte account.
3. Instellingen → Account → Koppelingen → Trello → "Verbreken".
4. In de browser uitloggen bij het verkeerde Trello-account, inloggen met het juiste, daarna in
   Ritmo opnieuw "Verbinden" → token plakken. Verwacht: toast met de juiste username.
