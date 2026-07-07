# S01 — DB-schema en RLS vastleggen in version control

**Fase:** Fundament-hygiëne (herijkt na de nulmeting)
**Status:** In uitvoering

## Afwijkingen t.o.v. de oorspronkelijke kickoff (bevestigd met Bas)

De kickoff ging uit van repo-inhoud die niet bestaat. Twee criteria zijn daarop aangepast:

1. **AC6 → README.md i.p.v. CLAUDE.md.** CLAUDE.md heeft geen sectie "Data-architectuur"
   en geen "Principe 2 (later toe te voegen)"-tekst; die strings bestaan nergens in de
   repo. CLAUDE.md regel 3 schrijft bovendien voor dat architectuur in
   README.md/CONTRIBUTING.md hoort. De sync-laag-documentatie gaat daarom in de
   bestaande `## Multi-user sync (optioneel)`-sectie van `README.md`.
2. **AC7 → nieuwe sectie in PLAN.md.** `docs/PLAN.md` is een team-werkwijze-doc zonder
   fase/slice-roadmap. De Fase 0–3 lijst komt als nieuwe sectie onderaan; de bestaande
   werkwijze-inhoud blijft staan.

De overige criteria (1–5, 8) zijn ongewijzigd overgenomen uit de kickoff.

## Doel

Het volledige live Supabase-schema en de RLS-policies uit de database halen en als
versioned migration in de repo vastleggen, zodat de databasestructuur reproduceerbaar
en reviewbaar wordt. Daarnaast verifiëren of de RLS de multi-account isolatie voor
gedeelde huishoudens correct afdwingt, en de verouderde storage-documentatie rechtzetten.

Aanleiding: de nulmeting toonde dat schema en RLS nergens in de repo staan, alleen in de
Supabase-console, en dat de RLS daardoor niet te verifiëren was. Dit is de basis waar
alle latere tabellen (connections, items) op komen.

## Scope

**Wel in scope:**
- Het live `public`-schema en de RLS-policies binnenhalen als baseline-migration (`supabase db pull`).
- `supabase/config.toml` toevoegen en `.gitignore` uitbreiden voor Supabase-secrets/temp.
- RLS-verificatierapport `docs/rls-verificatie.md` per tabel.
- Sync-laag-documentatie in `README.md` rechtzetten; Fase 0–3 roadmap in `docs/PLAN.md`.

**Niet in scope (bewust):**
- Alleen schema **binnenhalen**. **Geen `supabase db push`**, geen migraties toepassen; de live database wordt niet gewijzigd.
- Geen wijzigingen in `src/`. Deze slice raakt geen app-code en geen app-gedrag.
- RLS-gaten worden **gerapporteerd, niet gedicht**. Een lek (tabel zonder RLS, of een policy die iedereen toegang geeft) wordt genoteerd en als aparte vervolgslice gepland. Corrigeren binnen deze slice is buiten scope.

## Aanpak

1. Supabase CLI installeren, `supabase login`, `supabase link --project-ref <ref>`. Bas doet de interactieve stappen; database-password wordt nergens opgeslagen.
2. `supabase db pull --schema public` om ruis uit Supabase's eigen schema's (auth, storage) te vermijden. Dit genereert de baseline-migration.
3. Gegenereerde SQL reviewen: controleren of alle vijf tabellen plus hun RLS-policies zijn meegekomen. Mist de CLI policies die wel in het dashboard staan, melden zodat Bas ze handmatig kan exporteren.
4. `supabase/config.toml` toevoegen; `.gitignore` bijwerken (`supabase/.temp/`, `supabase/.branches/`; `.env` staat er al in).
5. RLS-policies lezen en `docs/rls-verificatie.md` schrijven. Specifiek letten op: RLS uitgeschakeld, `using (true)`/`with check (true)`, en of toegang tot `households`/`household_members`/`household_module_data` gebonden is aan lidmaatschap via een check op `household_members` waar `auth.uid()` lid is.
6. Docs bijwerken (README.md sync-laag, docs/PLAN.md roadmap).
7. Alles committen op de branch. Geen `src/`-wijzigingen in de diff.

## Acceptatiecriteria

De verifier toetst deze punt voor punt.

- [ ] **AC1** — Er is een `supabase/migrations/`-map met een baseline-migration die het huidige `public`-schema bevat: de tabellen `user_data`, `households`, `household_members`, `household_invites` en `household_module_data`, inclusief kolommen, constraints en indexen.
- [ ] **AC2** — De RLS-policies voor deze tabellen staan in de migration(s).
- [ ] **AC3** — Na de baseline levert een nieuwe `supabase db pull` geen verschil op: het schema in de repo komt overeen met de live database.
- [ ] **AC4** — Er is een rapport `docs/rls-verificatie.md` dat per tabel benoemt: welke policies bestaan, of de toegang correct aan `auth.uid()` en aan huishoud-lidmaatschap gebonden is, en welke gaten of risico's er zijn.
- [ ] **AC5** — De app werkt ongewijzigd: geen wijzigingen in `src/`, geen gedragsverandering.
- [ ] **AC6** — `README.md` (sectie Multi-user sync): de werkelijke sync-laag is beschreven (abstractie via `window.storage`, opt-in na login, lokaal-eerst + offline-queue, key→tabel-mapping, last-write-wins, verwijzing naar `supabase/migrations/`); cloud-sync staat als "opt-in, geïmplementeerd".
- [ ] **AC7** — `docs/PLAN.md` heeft een herijkte Fase 0–3 sectie (fundament en delen als KLAAR gemarkeerd, de herijkte slice-lijst S01–S08 overgenomen).
- [ ] **AC8** — Geen secrets in de repo: database-password en access token staan niet in gecommitte bestanden.
- [ ] `npm run check:i18n` slaagt (geen nieuwe UI-strings; check draait onveranderd).
- [ ] Geen wijzigingen buiten de scope van deze slice (geen `src/`-diff).

## Testchecklist

- `supabase db pull` toont geen verschil na de baseline (schema in repo gelijk aan live).
- `npm run dev`: login, sync en huishoud-sharing werken als voorheen, geen gedragsverandering.
- `npm run check:i18n` slaagt (geen nieuwe keys).
- `git status`: alleen de bedoelde nieuwe en gewijzigde bestanden, geen secrets, geen `src/`-wijzigingen.
- `docs/rls-verificatie.md` benoemt per tabel de policies plus eventuele gaten.
- De live database is niet gewijzigd (geen `db push` uitgevoerd).
