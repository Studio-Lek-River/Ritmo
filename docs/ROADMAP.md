# Ritmo Verbonden, Roadmap

Het complete plan om Ritmo uit te bouwen van een lokale dag-app naar één toegangspunt waar je op al je apparaten je taken en afspraken uit alle bronnen ziet, met een planner die je dag indeelt en naar Outlook schrijft.

Dit is het **leidende, levende werkdocument** voor Ritmo Verbonden: de bron van waarheid voor het **wat**, de **volgorde** en de **actuele status**. De **werkwijze** (rollen, poorten, kwaliteitsregels) staat in `docs/PLAN.md`. Per slice maken we in Claude.ai eerst de spec (Poort 1), daarna voert Claude Code hem uit via de rol-cyclus.

---

## Het doel

Het einddoel is Ritmo als **integrale planner**: één geïntegreerd toegangspunt waar je inlogt en op al je apparaten ziet wat je kunt of moet doen, met voortgang per project of kaartje of vak. De bronnen (GitHub-issues, Trello-kaarten, Outlook-afspraken, huishoudtaken, schoolvakken) komen genormaliseerd samen in één lijst. Je kunt vragen "deel mijn dag in", waarna Ritmo je taken rond je Outlook-afspraken plant en die indeling terugschrijft naar de agenda's die jij kiest.

De integrale planner is bereikt wanneer Fase 3 staat: de Vandaag-feed (S06) brengt alle bronnen op één plek, "deel mijn dag in" (S07) plant je taken rond je afspraken, en de write-back (S08) legt die indeling vast in je agenda. De slices hieronder zijn de route naar dat einddoel; de fasering loopt van het fundament naar de volledige planner.

Het volgende einddoel na de Planner: Ritmo wordt je one-stop-shop voor productiviteit, waar Claude een kaartje niet alleen inplant maar ook uitvoert. Vanuit één plek pak je een GitHub-issue, een Trello-kaartje, een mod-wijziging of een afspraak op, en Claude doet het werk met zijn eigen gereedschap. Bereikt wanneer Fase 4 staat.

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
- **Claude als uitvoerder (MCP-first):** de koppeling tussen Ritmo en Claude loopt via een Ritmo-eigen MCP-server bovenop het genormaliseerde items-model (S02). Claude leest en muteert items via MCP; het echte werk (code en mods, issues, research) draait in Claude's eigen runtime, niet in de PWA. Write-back is deterministisch en standaard achter een bevestiging, zelfde filosofie als de agenda-write-back in S07/S08. Autonome of geplande uitvoering is een optionele laag (Claude Agent SDK) bovenop dezelfde MCP-surface, opt-in per bron. Een deep-link kan als lichte start-knop dienen, maar is niet de ruggengraat.

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

### Fase 4, Uitvoeren (Claude als uitvoerder)

Het sluitstuk van de one-stop-shop: Claude pakt items uit Ritmo op en voert ze uit. Bouwt voort op het items-model (S02) en de Vandaag-feed (S06).

#### S09, Ritmo MCP-server (lezen)
- **Doel:** Claude toegang geven tot je Ritmo-items vanuit elke Claude-surface (Code, desktop, claude.ai).
- **Oplevering:** een MCP-server die genormaliseerde items als resources of tools aanbiedt: lijst met filters (bron, status, due) en item-detail met context (gekoppeld project of repo of bord, url, notities). Read-only. Per-gebruiker token, alleen je eigen items (RLS).
- **Afhankelijk van:** S02 (items-model), S06 (feed-aggregatie).
- **Aandacht:** hergebruik het bestaande items-model, geen nieuw model (principe 1); token-scoping en dataveiligheid; docs voor het registreren in Claude Code of desktop.

#### S10, Uitvoer-context per bron
- **Doel:** elk item genoeg meegeven zodat Claude het werk echt kan doen.
- **Oplevering:** per bron een actionable context-blob: GitHub-issue naar repo plus body plus labels; Trello-kaart naar bord of lijst plus beschrijving plus checklists; mod-taak naar project- en mod-pad; afspraak naar agenda-doel. Mapping-laag bovenop de bron-connecties.
- **Afhankelijk van:** S03/S04/S05 (leesbronnen), S09.
- **Aandacht:** geen secrets in de context lekken; consistente normalisatie met S02.

#### S11, MCP write-back (status plus resultaat)
- **Doel:** de lus sluiten nadat Claude werk heeft gedaan.
- **Oplevering:** MCP-tools om een item te muteren: status zetten (bezig of klaar), resultaat koppelen (PR-url, agenda-event, notitie). Deterministisch, standaard achter bevestiging.
- **Afhankelijk van:** S09, S08 (agenda-write-back voor afspraken).
- **Aandacht:** write-back nooit via een LLM-gok maar via expliciete tool-calls; approval-gate; audit-spoor in Ritmo (principe 2).

#### S12, Autonome en geplande uitvoering (optioneel)
- **Doel:** Claude proactief items laten oppakken zonder dat je een sessie opent.
- **Oplevering:** een headless runner (Claude Agent SDK) die op schema of trigger draait ("pak nieuwe issues elke ochtend"), met dry-run of approval, scope-limieten en audit-log terug in Ritmo. Opt-in per gebruiker en per bron.
- **Afhankelijk van:** S09, S10, S11.
- **Aandacht:** guardrails en gebruikerskeuze (principe 2) wegen hier het zwaarst; kosten- en runtime-bewaking.

### Optioneel of later
- Household bulk-pull.
- Overige huishoud-modules (klusjes, boodschappen, budget) delen via de `shared:*`-sleutels, als je dat wilt.

---

## Epic H, Ritmo Health

Een gezondheids-startpreset (prikschema, priklocatie, medicatie, gewicht, omvang, bijwerkingen, beweging), plus een concrete bugfix en een ErrorBoundary-vangnet. Health is een **startpreset, geen gesloten aparte app**: alle modules blijven toevoegbaar, uitschakelbaar en verwijderbaar (principe 2).

**Stap 0-bevinding (leidend):** de "gezondheidsmeting" bestaat al als module-type `measurements` (preset `presets.health` = gewicht/spier/vet/omvang). Grote delen zijn dus configuratie van bestaande types, geen nieuwbouw. Echt nieuw: de priklocatie-bodymap, het medicatie-register + prik-log, en twee Trends-visualisaties.

Volgorde: **H01 → H03 → H04 → H05 → H06 → H07 → H02**; **H02** en **H07** inpasbaar zodra H03/H05 de te-activeren module-set definiëren.

**Tracking:** epic-issue #51, met sub-issues #52 (H02), #53 (H05), #54 (H06) en #56 (H07) voor het resterende werk.

#### H01, Bugfix + ErrorBoundary. KLAAR (gemerged, PR #47)
- **Doel:** het wit-schermdefect bij het openen van de gezondheidsmeting-instellingen dichten (null-metric read zonder guard in de measurements-editor), plus een app-brede en view-brede ErrorBoundary zodat een volgende crash zichtbaar wordt i.p.v. onzichtbaar.
- **Afhankelijk van:** niets. Gaat eerst.

#### H02, Onboarding health-profiel. TODO (#52)
- **Doel:** een startprofiel-keuze (`onboardingProfile: 'full' | 'health'`, default `'full'`) die uitsluitend bepaalt welke modules bij eerste start aan staan. Backward compatible: ontbrekend veld valt terug op `'full'`.
- **Afhankelijk van:** de module-set uit H03/H05 (welke modules "health" aanzet).

#### H03, Medicatie-register (`medication`). KLAAR (gemerged, PR #48)
- **Doel:** een medicijn als centraal object: naam, dosering, eenheid, voorraad, frequentie, injecteerbaar-vlag, kleur. Afgeleide `daysLeft`, "bijna op", "besteld". Nieuw type; hergebruikt het collection-opslagpatroon (langlevende data in `settings.modules`).
- **Afhankelijk van:** niets.

#### H04, Priklocatie-bodymap (`bodymap`) + prik-log. KLAAR (gemerged, PR #49)
- **Doel:** een klikbare 6-zone bodymap (SVG met hex-kleuren) met medicijnkiezer voor injecteerbare medicijnen. Prikken logt en verlaagt de voorraad; undo/verwijderen herstelt de voorraad. Auto-suggestie voor de volgende zone (minst/langst-geleden gebruikt) plus legenda.
- **Afhankelijk van:** H03.

#### H05, Beweging + bijwerkingen (dag-logs). KLAAR (gemerged, PR #55)
- **Doel:** beweging via `counter` (minuten, categorieën, dagdoel 30) en bijwerkingen via `checklist`/`collection` met notitie, per dag terugleesbaar zodat de Trends erop kunnen bouwen. Plus health-preset wiring.
- **Afhankelijk van:** niets.

#### H06, Trends-visualisaties. IN REVIEW (#54)
- **Doel:** een bijwerkingen-heatmap (dot-matrix, gekoppeld aan de periode-selector, horizontaal scrollbaar) en een beweging-staafdiagram (minuten per dag met referentielijn op het dagdoel). Generieke verbeteringen van de counter- en checklist-insight-kaarten; leest bestaande history-data.
- **Afhankelijk van:** H05.

#### H07, App-modus-schakelaar (Health/Standaard). TODO (#56)
- **Doel:** een instelling die de zichtbare modules en de menubalk omschakelt tussen Standaard (alles) en Health (alleen de gezondheidsmodules), zodat de app efficiënt op één gebruiksdoel te richten is.
- **Afhankelijk van:** de module-set uit H03/H05; verwant aan H02 (onboarding-profiel).

> Gewicht en omvang krijgen geen eigen slice: dat is de bestaande `measurements`-module, meegenomen in de health-preset van H02/H05.

---

## Hoe je de volgende stap zet

1. In Claude.ai (met de PO): vraag om de kickoff-bundel voor de eerstvolgende slice met status Todo. Dat is de spec plus de uitvoerinstructie in één. Dit is Poort 1.
2. Geef die bundel aan Claude Code. Claude Code schrijft de spec weg in `docs/slices/`, maakt een branch en draait de rol-cyclus (implementer, reviewer, verifier).
3. Poort 2: test de Netlify-preview, keur de PR goed en merge.
4. Werk de status van de slice in dit document bij.

De statussen hierboven zijn de bron van waarheid voor de voortgang. Houd ze actueel per afgeronde slice.
