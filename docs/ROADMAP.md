# Ritmo Verbonden, Roadmap

Het complete plan om Ritmo uit te bouwen van een lokale dag-app naar één toegangspunt waar je op al je apparaten je taken en afspraken uit alle bronnen ziet, met een planner die je dag indeelt en naar Outlook schrijft.

Dit is het **leidende, levende werkdocument** voor Ritmo Verbonden: de bron van waarheid voor het **wat**, de **volgorde** en de **actuele status**. De **werkwijze** (rollen, poorten, kwaliteitsregels) staat in `docs/PLAN.md`. Per slice maken we in Claude.ai eerst de spec (Poort 1), daarna voert Claude Code hem uit via de rol-cyclus.

---

## Het doel

Het einddoel is Ritmo als **integrale planner**: één geïntegreerd toegangspunt waar je inlogt en op al je apparaten ziet wat je kunt of moet doen, met voortgang per project of kaartje of vak. De bronnen (GitHub-issues, Trello-kaarten, Outlook-afspraken, huishoudtaken, schoolvakken) komen genormaliseerd samen in één lijst. Je kunt vragen "deel mijn dag in", waarna Ritmo je taken rond je Outlook-afspraken plant en die indeling terugschrijft naar de agenda's die jij kiest.

De integrale planner is bereikt wanneer Fase 3 staat: de Vandaag-feed (S06) brengt alle bronnen op één plek, "deel mijn dag in" (S07) plant je taken rond je afspraken, en de write-back (S08) legt die indeling vast in je agenda. De slices hieronder zijn de route naar dat einddoel; de fasering loopt van het fundament naar de volledige planner.

## Waar we nu staan

- **Fundament en delen zijn klaar.** Account plus login, persoonlijke sync over apparaten, sync-status, en deelbare huishoudens met leden en invite-tokens werken.
- **Actieve sync:** `settings` en `day:*` syncen per gebruiker via `user_data`; gedeeld synct nu alleen de mealplan-module via `shared:*`. Alles opt-in.
- **S01 is gemerged:** het schema en de RLS staan als migrations in de repo, met een verificatierapport.
- **S01b is in uitvoering:** het invite-lek (B1) uit S01 wordt gedicht en we gaan migration-gedreven werken.
- **Nog te bouwen:** de koppelingen (Outlook, Trello, GitHub) en de planner. Daar zit het echte werk.

## Vastgelegde architectuurkeuzes

- **Frontend:** Ritmo uitbreiden als het enige toegangspunt.
- **Backend:** Supabase (Postgres, auth, RLS) plus de bestaande serverless `api/`-laag voor server-side tokens. Geen aparte backend.
- **Lagen:** lokaal (standaard, offline) naar account (opt-in sync) naar koppelingen (onder het account).
- **Huishoudens:** deelbaar, eigenaar plus leden, join via invite-token.
- **Sync:** last-write-wins op `updated_at`, achter de `window.storage`-abstractie. De UI verandert niet mee.
- **Externe bron is geen nieuw module-type:** een bestaande `tasks`- of `projects`-module plus een `source`-binding (`{ provider, connectionId, ... }`). Trouw aan principe 1.
- **Genormaliseerd item:** `source`, `account` of `household`, `project`, `title`, `status`, `due`, `priority`, `progress`, `url`. Alle bronnen mappen hierop; voortgang per project is een aggregatie over `(source, project)`.
- **Outlook:** eigen Azure-app die persoonlijke Microsoft-accounts ondersteunt, OAuth-authority `consumers`, plus `offline_access`. In twee stappen: eerst lezen om omheen te plannen (S03, scope `Calendars.Read`), later schrijven naar een instelbare bestemming (S08, scope `Calendars.ReadWrite`; Ritmo-agenda en/of hoofdagenda, beide mag).
- **Planner:** de LLM plant rond de Outlook-afspraken; de write-back naar de agenda is deterministisch via directe Graph-calls, niet via de LLM.

---

## De slices

### Fase 0, Fundament: KLAAR
Account plus login (magic link, wachtwoord, reset), persoonlijke sync (`settings`, `day:*`) achter `window.storage`, sync-status en Account-scherm.

### Fase 1, Delen: KLAAR
Deelbare huishoudens: `households`, `household_members` (admin/member), invite-tokens. Gedeeld oppervlak nu: de mealplan-module. Klein en optioneel open: household bulk-pull (nu komt gedeelde data alleen via realtime binnen).

### Fase 2, Hygiëne plus Koppelingen

#### S01, Schema plus RLS baseline. KLAAR (gemerged)
Het live schema (7 tabellen) en de RLS als versioned migrations in de repo, plus een verificatierapport. Bevinding: het invite-lek B1.

#### S01b, RLS-fix invite-lek (B1). IN UITVOERING
Een `redeem_invite`-RPC (`SECURITY DEFINER`) plus strakke policies, zodat invite-tokens niet meer leesbaar zijn en de isolatie tussen huishoudens hersteld is. Tegelijk gaan we migration-gedreven werken (`migration repair`, daarna `db push`).

#### S02, Connections-infra plus genormaliseerd items-model
- **Doel:** de basis voor alle externe bronnen leggen.
- **Oplevering:** een `connections`-tabel (per account, provider, versleutelde tokens server-side, met RLS); het genormaliseerde items-model plus een normalisatie-laag; een verbind- en verbreek-UI met status. Tokens leven server-side via de `api/`-laag, nooit in de browser.
- **Afhankelijk van:** S01b (veilige RLS-basis).
- **Aandacht:** externe bron = bestaande module plus `source`-binding, geen nieuw module-type. Hergebruik het bestaande sync- en storage-patroon.

#### S03, Outlook lezen
- **Doel:** je Outlook-afspraken ophalen, zodat de planner er later omheen kan plannen, en agenda-items als bron tonen.
- **Oplevering:** Microsoft Graph-integratie via een eigen Azure-app, OAuth-flow (`consumers`-authority, `Calendars.Read`), token-refresh server-side, afspraken genormaliseerd naar items.
- **Afhankelijk van:** S02.
- **Aandacht:** Azure-app-registratie is een eenmalige stap voor jou. Authority `consumers` is verplicht voor je persoonlijke account, anders sneuvelt de refresh-token na een uur.

#### S04, Trello lezen
- **Doel:** kaarten uit meerdere Trello-borden en accounts als items.
- **Oplevering:** Trello-koppeling voor meerdere accounts en borden, kaarten naar items, voortgang per bord of lijst.
- **Afhankelijk van:** S02.

#### S05, GitHub lezen
- **Doel:** issues en hun voortgang als items.
- **Oplevering:** GitHub-koppeling (issues naar items), voortgang per repo of project. De `api/`-laag heeft al een `GITHUB_TOKEN`-patroon voor feedback; hergebruik dat.
- **Afhankelijk van:** S02.

### Fase 3, Planner

#### S06, Vandaag-feed
- **Doel:** alle items uit alle bronnen op één plek, gegroepeerd per project, met voortgang.
- **Oplevering:** een aggregatie-cache (via een scheduled functie), een feed-view in Ritmo, filters per bron, voortgang per project. De prototype-UX uit Claude.ai is de referentie.
- **Afhankelijk van:** minstens één leesbron (S03, S04 of S05).

#### S07, Deel mijn dag in
- **Doel:** de planner die je taken rond je Outlook-afspraken indeelt.
- **Oplevering:** een plan-endpoint (Claude-API via de `api/`-laag) dat de dag-items plus de Outlook-afspraken neemt en een tijdgeblokte indeling teruggeeft, plus de planner-UI. Nog geen write-back.
- **Afhankelijk van:** S03 (Outlook lezen) en S06 (feed).

#### S08, Outlook wegschrijven
- **Doel:** de gegenereerde indeling naar Outlook schrijven.
- **Oplevering:** `Calendars.ReadWrite`, een aparte "Ritmo"-agenda die via Graph wordt aangemaakt, getagde en regenereerbare blokken, en een instelbare bestemming (Ritmo-agenda en/of hoofdagenda). De write is deterministisch via directe Graph-calls.
- **Afhankelijk van:** S07.

### Optioneel of later
- Household bulk-pull.
- Overige huishoud-modules (klusjes, boodschappen, budget) delen via de `shared:*`-sleutels, als je dat wilt.

---

## Hoe je de volgende stap zet

1. In Claude.ai (met de PO): vraag om de kickoff-bundel voor de eerstvolgende slice met status Todo. Dat is de spec plus de uitvoerinstructie in één. Dit is Poort 1.
2. Geef die bundel aan Claude Code. Claude Code schrijft de spec weg in `docs/slices/`, maakt een branch en draait de rol-cyclus (implementer, reviewer, verifier).
3. Poort 2: test de Netlify-preview, keur de PR goed en merge.
4. Werk de status van de slice in dit document bij.

De statussen hierboven zijn de bron van waarheid voor de voortgang. Houd ze actueel per afgeronde slice.
