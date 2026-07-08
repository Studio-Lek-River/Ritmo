# S01b: RLS-gat op household_invites dichten (B1)

**Fase:** Fundament-hygiëne, vervolg op S01
**Status:** In uitvoering

## Doel

Het in S01 gevonden gat B1 dichten: de SELECT-policy op `household_invites` laat nu elke ingelogde
gebruiker alle invite-tokens van alle huishoudens lezen en inwisselen, waardoor iemand tot een
willekeurig huishouden kan toetreden. Dit herstelt de isolatie tussen huishoudens. Tegelijk gaan we
migration-gedreven werken, zodat databasewijzigingen voortaan reproduceerbaar via `db push` lopen.

Zie `docs/rls-verificatie.md`, bevinding B1, voor de volledige analyse.

## Scope

**Wel in scope:**
- Migration-history synchroniseren met `supabase migration repair` zodat de baseline als toegepast
  geldt en `db push` werkt.
- Een nieuwe migration met een `redeem_invite`-RPC (`SECURITY DEFINER`) en strakkere policies.
- `src/sync/households.js`: `redeemInvite` via de RPC laten lopen.
- De fix via `db push` toepassen op de live database (met backup en bevestigingspauze).
- `docs/rls-verificatie.md` bijwerken; `docs/PLAN.md` roadmap uitbreiden met S01b.

**Niet in scope (bewust):**
- Andere policies dan de invite/member-flow.
- Connections, items, UI-uitbreidingen. Alleen de code die nodig is voor de RPC-call verandert.

## Aanpak

1. Branch `slice/S01b-invite-rls-fix`.
2. `supabase migration list` om de pending-status te zien. `supabase migration repair --status applied
   <baseline-timestamp>` (de baseline is `supabase/migrations/20260708084246_baseline_schema.sql`;
   verifieer de timestamp). Dit raakt alleen de migration-boekhouding, niet het schema.
3. Nieuwe migration schrijven met:
   - Functie `redeem_invite(p_token text, p_display_name text) returns uuid`, `SECURITY DEFINER`,
     atomair: zoekt de invite op exact `p_token`; valideert met onderscheidbare fouten
     (`invite_not_found`, `invite_used`, `invite_expired`); markeert de invite als gebruikt
     (`used_by = auth.uid()`, `used_at = now()`); voegt de gebruiker toe aan `household_members`
     (rol `member`, `display_name = p_display_name`); retourneert `household_id`. Geef `EXECUTE`-recht
     aan `authenticated`.
   - `household_invites` SELECT-policy beperken tot `is_household_admin(household_id)`. De tak
     `OR (auth.uid() IS NOT NULL)` verwijderen.
   - De open UPDATE-inwissel-policy op `household_invites` verwijderen; inwisselen loopt voortaan
     uitsluitend via de RPC.
   - De self-join-tak op de `household_members` INSERT-policy (die op een ingewisselde invite leunde)
     verwijderen of versmallen; de admin-insert-tak blijft. De join-insert gebeurt nu binnen de RPC
     (als definer).
4. `src/sync/households.js`: `redeemInvite(token, displayName)` herschrijven naar
   `supabase.rpc('redeem_invite', { p_token, p_display_name })`. De bestaande foutcodes
   (`invite_not_found`, `invite_used`, `invite_expired`) behouden, zodat de mapping in
   `HouseholdSetupView.jsx` (`auth.inviteUsed`, `auth.inviteInvalid`) blijft werken. `createInvite`
   blijft ongewijzigd.
5. **Backup en bevestiging.** Maak een read-only backup: `supabase db dump --linked -f
   backup-pre-S01b.sql` (niet committen, staat data in; voeg de bestandsnaam toe aan `.gitignore`).
   Draai `supabase migration list` en verifieer dat alleen de nieuwe fix-migration pending is. Stop hier
   en vraag Bas expliciet om akkoord.
6. Na akkoord: `supabase db push` (past alleen de fix-migration toe).
7. Verifieer: haal de policies opnieuw op met `supabase db dump --linked --schema public` en controleer
   dat de invites-SELECT nu admin-only is en de RPC bestaat. Werk `docs/rls-verificatie.md` bij: B1 als
   opgelost markeren, de nieuwe policies en de RPC beschrijven.
8. Werk `docs/PLAN.md` bij: voeg onder Fase 2 een regel toe voor S01b (RLS-fix household_invites),
   vóór S02.
9. Reviewer, dan verifier.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] **AC1** — Er is een nieuwe migration met de `redeem_invite`-RPC (`SECURITY DEFINER`, atomair, met
  de drie onderscheidbare foutcodes en `EXECUTE` voor `authenticated`).
- [ ] **AC2** — De SELECT-policy op `household_invites` is beperkt tot `is_household_admin(household_id)`;
  de open OR-tak is weg. De open UPDATE-inwissel-policy is verwijderd. De self-join-tak op de
  `household_members` INSERT-policy is verwijderd of versmald; admin-insert blijft.
- [ ] **AC3** — `src/sync/households.js` `redeemInvite` gebruikt de RPC, geen directe tabel-toegang meer,
  en behoudt de bestaande foutcodes zodat de i18n-mapping in `HouseholdSetupView.jsx` blijft werken.
- [ ] **AC4** — De migration is via `db push` toegepast op de live database, na `migration repair` en na
  verificatie dat alleen de fix-migration pending was. Er is vooraf een backup gemaakt.
- [ ] **AC5** — Na de push: een ingelogde niet-admin kan de invites-tabel niet meer direct lezen; joinen
  met een geldig token werkt nog via de RPC; bestaande leden behouden toegang. `docs/rls-verificatie.md`
  is bijgewerkt (B1 opgelost).
- [ ] **AC6** — Bestaande huishoudens, leden en de gedeelde mealplan werken als voorheen. Geen dataverlies.
- [ ] **AC7** — `npm run check:i18n` slaagt. Geen nieuwe UI-strings nodig (foutcodes hergebruikt); komt er
  toch een key bij, dan in `nl.js` en `en.js` beide.
- [ ] **AC8** — `docs/PLAN.md` vermeldt S01b in de Fase 2-roadmap. Geen `src/`-wijzigingen buiten
  `households.js` (en eventueel i18n).

## Testchecklist

- Twee accounts of twee browsers: account A (admin) maakt een invite, account B joint met het token. Dit
  lukt.
- Account B (niet-admin) kan de invites-tabel niet direct uitlezen (een directe select geeft niets of
  wordt geweigerd).
- Onbekend token geeft `auth.inviteInvalid`; gebruikt token geeft `auth.inviteUsed`; verlopen token geeft
  `auth.inviteInvalid`.
- Een bestaand lid ziet nog steeds zijn huishouden en de gedeelde mealplan.
- `npm run check:i18n` slaagt.
- De backup `backup-pre-S01b.sql` bestaat en is niet gecommit.
- Rollback-plan op papier: de oude policies staan in de baseline-migration; een revert-migration kan ze
  herstellen indien joinen onverhoopt breekt.
