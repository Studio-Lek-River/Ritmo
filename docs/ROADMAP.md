# Ritmo Verbonden, Roadmap

Het complete plan om Ritmo uit te bouwen van een lokale dag-app naar één toegangspunt waar je op al je apparaten je taken en afspraken uit alle bronnen ziet, met een planner die je dag indeelt en naar Outlook schrijft.

Dit is het **leidende, levende werkdocument** voor Ritmo Verbonden: de bron van waarheid voor het **wat**, de **volgorde** en de **actuele status**. De **werkwijze** (rollen, poorten, kwaliteitsregels) staat in `docs/PLAN.md`. Per slice maken we in Claude.ai eerst de spec (Poort 1), daarna voert Claude Code hem uit via de rol-cyclus.

---

## Het doel

Het einddoel is Ritmo als **integrale planner**: één geïntegreerd toegangspunt waar je inlogt en op al je apparaten ziet wat je kunt of moet doen, met voortgang per project of kaartje of vak. De bronnen (GitHub-issues, Trello-kaarten, Outlook-afspraken, huishoudtaken, schoolvakken) komen genormaliseerd samen in één lijst. Je kunt vragen "deel mijn dag in", waarna Ritmo je taken rond je Outlook-afspraken plant en die indeling terugschrijft naar de agenda's die jij kiest.

De integrale planner is bereikt wanneer Fase C staat: de Vandaag-feed (S10) brengt alle bronnen op één plek, "deel mijn dag in" (S11) plant je taken rond je afspraken, en de write-back (S12) legt die indeling vast in je agenda. De slices hieronder zijn de route naar dat einddoel; de fasering loopt van het fundament naar de volledige planner.

Het volgende einddoel na de Planner: Ritmo wordt je one-stop-shop voor productiviteit, waar Claude een kaartje niet alleen inplant maar ook uitvoert. Vanuit één plek pak je een GitHub-issue, een Trello-kaartje, een mod-wijziging of een afspraak op, en Claude doet het werk met zijn eigen gereedschap. Bereikt wanneer Fase D staat.

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
- **Outlook:** eigen Azure-app die persoonlijke Microsoft-accounts ondersteunt, OAuth-authority `consumers`, plus `offline_access`. In twee stappen: eerst lezen om omheen te plannen (S07, scope `Calendars.Read`), later schrijven naar een instelbare bestemming (S12, scope `Calendars.ReadWrite`; Ritmo-agenda en/of hoofdagenda, beide mag).
- **Planner:** de planner plant rond de Outlook-afspraken via een provider-pluggable AI-laag boven de deterministische heuristiek. Providers: een lokale AI (client-side, desktop-only, opt-in), een server-side provider voor desktop én mobiel (de latere Ritmo AI; de betaalde Claude-API met eigen key hooguit als interim), en de heuristiek als universele, kosteloze default en fallback. De write-back naar de agenda is deterministisch via directe Graph-calls, nooit via de LLM.
- **Claude als uitvoerder (MCP-first):** de koppeling tussen Ritmo en Claude loopt via een Ritmo-eigen MCP-server bovenop het genormaliseerde items-model (S02). Claude leest en muteert items via MCP; het echte werk (code en mods, issues, research) draait in Claude's eigen runtime, niet in de PWA. Write-back is deterministisch en standaard achter een bevestiging, zelfde filosofie als de agenda-write-back in S11/S12. Autonome of geplande uitvoering is een optionele laag (Claude Agent SDK) bovenop dezelfde MCP-surface, opt-in per bron. Een deep-link kan als lichte start-knop dienen, maar is niet de ruggengraat.

---

## De slices

### Bouwvolgorde (lineaire S-reeks)

De open slices lopen als één doorlopende reeks in bouwvolgorde. De volgende te bouwen slice is altijd de laagste open S-code. Tracking in GitHub: milestone **Ritmo Verbonden: bouwvolgorde** onder epic-issue #33.

| Slice | Issue | Status | Wat |
|---|---|---|---|
| S01 | — | KLAAR | Schema plus RLS baseline |
| S01b | — | IN UITVOERING | RLS-fix invite-lek (B1) |
| S02 | — | IN UITVOERING | Connections-infra plus items-model |
| S03 | #96 | Todo | Week-UI (weekrooster + takenpool + legenda + cross-day) |
| S04 | #97 | Todo | Planning-metadata + vrije blokken (autoPlan) |
| S05 | #98 | Todo | Lokale dag-indeler + drie standen |
| S06 | #99 | Todo | Afstem-voorkeuren |
| S07 | #36 | Todo | Outlook lezen |
| S08 | #37 | KLAAR | Trello lezen |
| S09 | #38 | Todo | GitHub lezen |
| S10 | #39 | Todo | Vandaag-feed |
| S10b | #121 | Todo | Aggregatie-cache via een scheduled functie |
| S10c | #122 | Todo | Checklist-items planbaar in de dag |
| S11 | #40 | Todo | Deel mijn dag in |
| S12 | #41 | Todo | Outlook wegschrijven |
| S13 | #42 | Todo | Ritmo MCP-server (lezen) |
| S14 | #43 | Todo | Uitvoer-context per bron |
| S15 | #44 | Todo | MCP write-back (status + resultaat) |
| S16 | #45 | Todo | Autonome en geplande uitvoering (optioneel) |

### Fase 0, Fundament: KLAAR
Account plus login (magic link, wachtwoord, reset), persoonlijke sync (`settings`, `day:*`) achter `window.storage`, sync-status en Account-scherm.

### Fase 1, Delen: KLAAR
Deelbare huishoudens: `households`, `household_members` (admin/member), invite-tokens. Gedeeld oppervlak nu: de mealplan-module. Klein en optioneel open: household bulk-pull (nu komt gedeelde data alleen via realtime binnen).

### Fase 2, Hygiëne plus basis

#### S01, Schema plus RLS baseline. KLAAR (gemerged)
Het live schema (7 tabellen) en de RLS als versioned migrations in de repo, plus een verificatierapport. Bevinding: het invite-lek B1.

#### S01b, RLS-fix invite-lek (B1). IN UITVOERING
Een `redeem_invite`-RPC (`SECURITY DEFINER`) plus strakke policies, zodat invite-tokens niet meer leesbaar zijn en de isolatie tussen huishoudens hersteld is. Tegelijk gaan we migration-gedreven werken (`migration repair`, daarna `db push`).

#### S02, Connections-infra plus genormaliseerd items-model. IN UITVOERING
- **Doel:** de basis voor alle externe bronnen leggen.
- **Oplevering:** een `connections`-tabel (per account, provider, versleutelde tokens server-side, met RLS); het genormaliseerde items-model plus een normalisatie-laag; een verbind- en verbreek-UI met status. Tokens leven server-side via de `api/`-laag, nooit in de browser.
- **Afhankelijk van:** S01b (veilige RLS-basis).
- **Aandacht:** externe bron = bestaande module plus `source`-binding, geen nieuw module-type. Hergebruik het bestaande sync- en storage-patroon.
- **Openstaand:** de migration (`supabase/migrations/20260713120000_connections.sql`) is geschreven maar nog niet via `db push` toegepast op de live database; dat is een handmatige stap voor Bas (backup plus bevestigingspauze, S01b-workflow), net als het instellen van `SUPABASE_SERVICE_ROLE_KEY` als env-var op de deploy.

### Fase A, Planner lokaal (offline). S03–S06

Een lokale, offline versie van de planner die volledig op bestaande data draait, zodat er waarde is lang voordat de koppelingen (Outlook e.a.) klaar zijn. Hangt van niets externs af en kan nu starten. De heuristische indeler uit S05 wordt de deterministische ruggengraat waar de LLM-laag (S11) later op voortbouwt en op terugvalt.

**Ordening-notitie:** deze lokale planner komt bewust **vóór** de Outlook-keten (S07/S12). Fase A levert direct waarde op bestaande data; de LLM-laag (S11) bouwt straks op de lokale indeler (S05) voort in plaats van vanaf nul te beginnen.

#### S03, Week-UI (weekrooster + takenpool + legenda + cross-day). #96
- **Doel:** de dag-gerichte Planner omvormen naar een weekrooster in Outlook-vorm met een takenpool links en een legenda, inclusief cross-day versleping.
- **Oplevering:** `src/views/WeekView.jsx` (7 dagkolommen + uur-rijen, blokken op `time`), takenpool per geselecteerde dag, legenda (Agenda vast / Ingepland / Voorstel), een handler om een taak tussen `day:<date>`-records te verplaatsen, en het laden van de zichtbare week. Stijl exact volgens `RitmoPlannerPrototype.jsx`, met repo-patronen (`theme`/`r-*`, `getColorClasses`/`getColorHex`).
- **Afhankelijk van:** niets (bestaande data).

#### S04, Planning-metadata + vrije blokken (autoPlan). #97
- **Doel:** optioneel `duration`, `window` en `autoPlan` op de bronnen, plus vrije blokken als tijd-reservering op de bestaande `projects`-module (geen nieuw type).
- **Afhankelijk van:** S03.

#### S05, Lokale dag-indeler + drie standen. #98
- **Doel:** een heuristische "deel mijn dag in" (`src/utils/planDay.js`): ankers, dagdeel-vensters, gaten, ontwijkt agenda-blokken. Drie standen als instelling (alleen voorstellen / concept / direct) met ongedaan-maken. Deterministische ruggengraat en fallback voor S11.
- **Afhankelijk van:** S04.

#### S06, Afstem-voorkeuren. #99
- **Doel:** een klein voorkeuren-stuk in settings (energie per dagdeel, diepwerk-vensters, hoeveel rust) dat de indeler leest. Legt de basis voor de afstem-vragen die S11 later kan stellen.
- **Afhankelijk van:** S05.

### Fase B, Koppelingen (lezen). S07–S09

#### S07, Outlook lezen. #36
- **Doel:** je Outlook-afspraken ophalen, zodat de planner er later omheen kan plannen, en agenda-items als bron tonen.
- **Oplevering:** Microsoft Graph-integratie via een eigen Azure-app, OAuth-flow (`consumers`-authority, `Calendars.Read`), token-refresh server-side, afspraken genormaliseerd naar items.
- **Afhankelijk van:** S02.
- **Aandacht:** Azure-app-registratie is een eenmalige stap voor jou. Authority `consumers` is verplicht voor je persoonlijke account, anders sneuvelt de refresh-token na een uur.

#### S08, Trello lezen. #37
- **Doel:** kaarten uit meerdere Trello-borden en accounts als items.
- **Oplevering:** Trello-koppeling voor meerdere accounts en borden, kaarten naar items, voortgang per bord of lijst.
- **Afhankelijk van:** S02.

#### S09, GitHub lezen. #38
- **Doel:** issues en hun voortgang als items.
- **Oplevering:** GitHub-koppeling (issues naar items), voortgang per repo of project. De `api/`-laag heeft al een `GITHUB_TOKEN`-patroon voor feedback; hergebruik dat.
- **Afhankelijk van:** S02.

### Fase C, Integrale planner. S10–S12

#### S10, Vandaag-feed. #39
- **Doel:** alle items uit alle bronnen op één plek, gegroepeerd per project, met voortgang.
- **Oplevering:** een feed-tab in de Planner, filters per bron, voortgang per project, en het activeren van `src/utils/normalizedItems.js` (dat sinds S02 op deze slice wacht). De prototype-UX uit Claude.ai is de referentie.
- **Afhankelijk van:** minstens één leesbron (S07, S08 of S09).
- **Correctie op de oorspronkelijke tekst:** hier stond "een aggregatie-cache (via een scheduled functie)". Die is niet te bouwen zoals beloofd: een cron draait zonder gebruiker-JWT en kent de opt-in-keuzes niet, want `trello:boardPrefs`, `github:repoPrefs` en de agendaselectie zijn bewust device-lokaal. De feed komt daarom client-side; de servercache is afgesplitst naar S10b (#121), inclusief de privacy-afweging die eraan vastzit.

#### S10b, Aggregatie-cache via een scheduled functie. #121
- **Doel:** de feed op elk apparaat vullen zonder recente fetch, via een cron die per account aggregeert.
- **Eerst beslissen:** dit vraagt dat de opt-in-keuzes én de bron-titels naar Supabase gaan, wat de S08/S09-privacylijn omkeert (zie de PRIVACY-comment in `src/utils/sourceItemPrefs.js`). Geen spec voordat die knoop door is.
- **Afhankelijk van:** S10.

#### S10c, Checklist-items planbaar in de dag. #122
- **Doel:** fysio-oefeningen en de avondroutine meenemen in de dagplanning, via een opt-in per item of per module.
- **De crux:** `buildDayTimeline` leest alleen `tasks` en `projects`, en een checklist-item keert elke dag terug (status per dag in het `day:`-record) in plaats van één keer af te ronden.
- **Afhankelijk van:** S10.

#### S11, Deel mijn dag in. #40
- **Doel:** de planner die je taken rond je Outlook-afspraken indeelt, met een provider-pluggable AI-laag boven de deterministische heuristiek.
- **Oplevering:** een planner-provider-abstractie met één contract, met daarachter: (a) de heuristiek uit S05 als default en universele fallback; (b) een lokale AI (bv. Ollama), client-side, desktop-only, opt-in; (c) een gedefinieerde server-provider-seam (patroon van `api/connections/outlook/events.js`) die de latere Ritmo AI invult voor desktop én mobiel, met de betaalde Claude-API met eigen key hooguit als interim. Plus de provider-keuze als device-lokale instelling met een duidelijke fallback-melding, en de planner-UI (indeling, uitleg, gebruikte provider). Nog geen write-back.
- **Feitelijke correctie:** een claude.ai-abonnement dekt de Anthropic-API niet, dus geen gratis-via-abonnement; daarom local-first met de heuristiek als kosteloze default, en Ritmo AI (server-side, desktop+mobiel) als einddoel.
- **Lokale voorloper:** de heuristische indeler uit S05 (`src/utils/planDay.js`) is de deterministische ruggengraat en fallback; S11 is de AI-laag daarbovenop. De planner-UI komt uit S03.
- **Afhankelijk van:** S07 (Outlook lezen) en S10 (feed); bouwt voort op Fase A (S03–S06).

#### S12, Outlook wegschrijven. #41
- **Doel:** de gegenereerde indeling naar Outlook schrijven.
- **Oplevering:** `Calendars.ReadWrite`, een aparte "Ritmo"-agenda die via Graph wordt aangemaakt, getagde en regenereerbare blokken, en een instelbare bestemming (Ritmo-agenda en/of hoofdagenda). De write is deterministisch via directe Graph-calls.
- **Afhankelijk van:** S11.

### Fase D, Uitvoeren (Claude als uitvoerder). S13–S16

Het sluitstuk van de one-stop-shop: Claude pakt items uit Ritmo op en voert ze uit. Bouwt voort op het items-model (S02) en de Vandaag-feed (S10).

#### S13, Ritmo MCP-server (lezen). #42
- **Doel:** Claude toegang geven tot je Ritmo-items vanuit elke Claude-surface (Code, desktop, claude.ai).
- **Oplevering:** een MCP-server die genormaliseerde items als resources of tools aanbiedt: lijst met filters (bron, status, due) en item-detail met context (gekoppeld project of repo of bord, url, notities). Read-only. Per-gebruiker token, alleen je eigen items (RLS).
- **Afhankelijk van:** S02 (items-model), S10 (feed-aggregatie).
- **Aandacht:** hergebruik het bestaande items-model, geen nieuw model (principe 1); token-scoping en dataveiligheid; docs voor het registreren in Claude Code of desktop.

#### S14, Uitvoer-context per bron. #43
- **Doel:** elk item genoeg meegeven zodat Claude het werk echt kan doen.
- **Oplevering:** per bron een actionable context-blob: GitHub-issue naar repo plus body plus labels; Trello-kaart naar bord of lijst plus beschrijving plus checklists; mod-taak naar project- en mod-pad; afspraak naar agenda-doel. Mapping-laag bovenop de bron-connecties.
- **Afhankelijk van:** S07/S08/S09 (leesbronnen), S13.
- **Aandacht:** geen secrets in de context lekken; consistente normalisatie met S02.

#### S15, MCP write-back (status plus resultaat). #44
- **Doel:** de lus sluiten nadat Claude werk heeft gedaan.
- **Oplevering:** MCP-tools om een item te muteren: status zetten (bezig of klaar), resultaat koppelen (PR-url, agenda-event, notitie). Deterministisch, standaard achter bevestiging.
- **Afhankelijk van:** S13, S12 (agenda-write-back voor afspraken).
- **Aandacht:** write-back nooit via een LLM-gok maar via expliciete tool-calls; approval-gate; audit-spoor in Ritmo (principe 2).

#### S16, Autonome en geplande uitvoering (optioneel). #45
- **Doel:** Claude proactief items laten oppakken zonder dat je een sessie opent.
- **Oplevering:** een headless runner (Claude Agent SDK) die op schema of trigger draait ("pak nieuwe issues elke ochtend"), met dry-run of approval, scope-limieten en audit-log terug in Ritmo. Opt-in per gebruiker en per bron.
- **Afhankelijk van:** S13, S14, S15.
- **Aandacht:** guardrails en gebruikerskeuze (principe 2) wegen hier het zwaarst; kosten- en runtime-bewaking.

### Optioneel of later
- Household bulk-pull.
- ~~Overige huishoud-modules (klusjes, boodschappen, budget) delen via de `shared:*`-sleutels, als je dat wilt.~~ **Gedaan (S02b):** de huishoud-modules (klusjes, boodschappen, budget, weekmenu, vaste lasten, beleggingen, nutsvoorzieningen, sectie-layout) syncen nu per gebruiker via `user_data` (`household:*`-sleutels), niet gedeeld.

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

#### H07, App-modus-schakelaar (Health/Standaard). IN REVIEW (#56)
- **Doel:** een instelling die de zichtbare modules en de menubalk omschakelt tussen Standaard (alles) en Health (alleen de gezondheidsmodules), zodat de app efficiënt op één gebruiksdoel te richten is.
- **Afhankelijk van:** de module-set uit H03/H05; verwant aan H02 (onboarding-profiel).

> Gewicht en omvang krijgen geen eigen slice: dat is de bestaande `measurements`-module, meegenomen in de health-preset van H02/H05.

---

## Hoe je de volgende stap zet

1. In Claude.ai (met de PO): vraag om de kickoff-bundel voor de eerstvolgende slice met status Todo. Dat is de spec plus de uitvoerinstructie in één. Dit is Poort 1.
2. Geef die bundel aan Claude Code. Claude Code schrijft de spec weg in `docs/slices/` en draait de rol-cyclus (implementer, reviewer, verifier) op `main`.
3. Poort 2: test de slice lokaal via de `/verify`-skill en keur hem goed; daarna gaat hij naar `main`.
4. Werk de status van de slice in dit document bij.

De statussen hierboven zijn de bron van waarheid voor de voortgang. Houd ze actueel per afgeronde slice.
