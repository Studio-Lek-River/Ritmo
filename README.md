# Ritmo# 🎵 Ritmo

**Jouw dag, jouw ritme.** Een persoonlijke, modulaire dag-app voor het beheren van routines, oefeningen, taken en reflectie.

## ✨ Features

- **Modulair**: kies en bouw je eigen routines, oefeningen en trackers
- **Streaks**: hou bij hoeveel dagen op rij je je doelen haalt
- **Week- en maandoverzicht**: zie patronen in je gewoontes
- **Reflectie**: dagelijkse vragen om over je dag na te denken
- **Huishouden**: klusjes, boodschappen, budget en verbruik op één plek
- **Donker thema**: automatisch of handmatig
- **Privacy-first**: alle data blijft lokaal op je apparaat
- **PWA**: installeerbaar op iOS en Android, werkt offline

## Multi-user sync (optioneel)

Ritmo werkt volledig lokaal zonder account. Voor huishouden-sync (mee-eten delen met huisgenoten) heb je een Supabase-project nodig.

Maak een `.env.local` aan in de repo-root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

Zie `.env.local.example` voor het format. Zonder deze variabelen werkt de app volledig lokaal, precies als voorheen.

### Hoe de sync-laag werkt

De opslag is een abstractielaag: de UI praat met `window.storage` (get/set/delete/list), niet direct met de onderliggende opslag. Lokaal is dat IndexedDB; cloud-sync via Supabase zit achter diezelfde abstractie en is **opt-in, geïmplementeerd**. Zonder login draait de app volledig lokaal (privacy by default); zodra de gebruiker inlogt, wordt sync actief.

Writes gaan lokaal-eerst en daarna via een offline-queue (bewaard in IndexedDB) naar Supabase; de queue wordt geflusht bij het `online`-event en periodiek, met begrensde retries. Reads zijn lokaal, met een aparte pull bij login. De sleutel bepaalt de bestemming:

- `settings` en `day:*` gaan naar tabel `user_data` (persoonlijke data, per gebruiker geïsoleerd).
- `shared:*` gaat naar tabel `household_module_data` (gedeelde huishoud-data). Huishoudens, leden en uitnodigingen leven in `households`, `household_members` en `household_invites`.
- Alle overige sleutels blijven lokaal en worden nooit gesynchroniseerd.

Conflicten worden opgelost met last-write-wins op `updated_at`; bij een ambigu geval (een lokale waarde zonder sync-metadata) volgt een prompt aan de gebruiker. Het databaseschema en de RLS-policies staan als migrations in `supabase/migrations/`; een verificatie van de RLS staat in [`docs/rls-verificatie.md`](docs/rls-verificatie.md).