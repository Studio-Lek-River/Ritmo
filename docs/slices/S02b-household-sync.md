# S02b — Actieve sync voor de Huishouden-modules

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/76
**Status:** concept

## Doel

De Huishouden-modules meenemen in de bestaande per-gebruiker sync, zodat huishouddata (klusjes, boodschappen, weekmenu, vaste lasten, beleggingen, nutsvoorzieningen, sectie-layout) over de eigen apparaten van één gebruiker synct in plaats van puur lokaal te blijven. Dit is **personal sync** via `user_data`, geen gedeeld huishouden. Hoort bij `docs/ROADMAP.md` onder "Optioneel of later: overige huishoud-modules" en sluit aan op het bestaande sync-fundament (Fase 0).

## Scope

**Wel in scope:**
- `household:*`-keys whitelisten in de personal sync, zodat writes naar Supabase gepusht en bij login gepulld worden — met exact hetzelfde last-write-wins-gedrag als `settings` en `day:*`.
- Statusregel in `docs/ROADMAP.md` bijwerken: household-modules syncen nu per gebruiker.

**Niet in scope (bewust):**
- Gedeeld huishouden / sync tussen meerdere gebruikers (verwijderd in de personal-only pivot).
- Realtime updates of granulaire merge binnen een key (last-write-wins per key blijft, net als bij `settings`).
- Een remount-on-pull-refinement voor `useStoredState` (zie Aanpak → bekende beperking).
- Wijzigingen aan de UI van de Huishouden-tab of de sync-status-UI.

## Aanpak

De sync-infrastructuur is al volledig key-agnostisch; downstream (offline queue, flush, status, conflict-dialog, pull-on-login) filtert alles op `isUserSyncKey`. **Geen Supabase-migratie nodig** — household-rijen worden extra `user_data`-rijen onder de bestaande RLS.

**Kernwijziging (de enige productiewijziging):** in `src/sync/userDataStorage.js`, functie `isUserSyncKey`, een regel toevoegen:

```js
if (key.startsWith('household:')) return true;
```

Dit routeert automatisch alle household-keys door de bestaande machinerie:
- **Write/push:** `storage.set` → `setUserData` → enqueue + flush (`src/storage.js`, `src/sync/userDataStorage.js`).
- **Pull-on-login:** `pullUserData` filtert cloud-rijen op `isUserSyncKey` en pusht lokale-only keys omhoog; al aangeroepen in `src/App.jsx` (userId-effect).
- **Offline queue / flush / status / conflict-dialog:** generiek, dragen hun eigen `table`/`onConflict`.

**Welke keys:** alle `household:*`-keys, in lijn met de local-backup-set in `src/utils/backup.js`: `household:chores`, `household:groceries`, `household:budget`, `household:utilities`, `household:config`, `household:mealplan:plan`, `household:investments`, `household:sections`. `household:sections` (sectie-volgorde/zichtbaarheid) synct mee zodat de tab-layout consistent is over apparaten.

**Consumers ongewijzigd:** `src/views/HouseholdView.jsx` en `src/views/household/*` gebruiken `useStoredState` via `window.storage`; zodra de key gewhitelist is synct de write transparant.

**Bekende beperking (bewust buiten scope):** `useStoredState` leest de key één keer bij mount en reageert niet op een externe pull-write. In de gangbare flow (app-start → pull draait vroeg → later naar Huishouden navigeren) leest `HouseholdView` bij mount de al-gepullde waarde. Edge-case: staat de gebruiker precies op de Huishouden-tab als de eerste pull binnenkomt, dan is de data stale tot remount (navigeren of reload) — identiek aan elke andere `useStoredState`-module.

## Acceptatiecriteria

- [ ] `isUserSyncKey('household:chores')` (en de overige `household:`-keys) retourneert `true`; `settings` en `day:*` blijven `true`, niet-synckeys blijven `false`.
- [ ] Met Supabase-env geconfigureerd en ingelogd: een wijziging in een household-module schrijft een `user_data`-rij met de bijbehorende `household:`-key naar Supabase.
- [ ] Op een tweede apparaat (of na wissen van lokale IndexedDB + reload) haalt de pull-on-login de household-data op en toont de Huishouden-tab die data.
- [ ] Met sync uitgeschakeld (geen env / niet ingelogd) blijft de Huishouden-tab volledig lokaal werken; geen regressie.
- [ ] Bestaande lokale household-data blijft veilig: bij eerste login pusht `pullUserData` lokale-only keys omhoog i.p.v. ze te wissen; geen dataverlies.
- [ ] `npm run check:i18n` slaagt (deze slice voegt geen nieuwe UI-strings toe).
- [ ] Geen wijzigingen buiten de scope van deze slice (afgezien van de ROADMAP-statusregel).
- [ ] Nieuw gedrag is opt-in (principe 2): sync werkt alleen met account + geconfigureerde env; zonder blijft alles lokaal.
