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