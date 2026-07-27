---
name: verify
description: Ritmo draaien en een wijziging echt zien werken in de browser. Gebruik bij het verifiëren van een change aan de UI (Planner, modules, views) voordat je naar main pusht.
---

# Ritmo verifiëren in de draaiende app

Ritmo is een Vite + React PWA. Er is **geen test- of lint-script** (`npm run` geeft
alleen `dev`, `build`, `preview`, `check:i18n`). Verifiëren = de app draaien en
de flow klikken.

## Handle

```bash
npm run dev            # http://localhost:5173
npm run build          # bewijst alleen dat het compileert, niet dat het werkt
npm run check:i18n     # nl.js/en.js pariteit (draait ook als pre-commit hook)
```

Er zit **geen browserautomatisering** in dit project: geen Playwright, geen
Puppeteer, geen e2e-runner — niet in `package.json`, niet in `node_modules`, niet
globaal. Probeer dat dus niet te importeren; verifiëren doe je met de dev-server
plus je eigen ogen en de DevTools-console.

## Binnenkomen: geen login, wel onboarding

Er is **geen auth-muur** — zonder Supabase-account werkt de app lokaal door
(`useConnections` geeft dan gewoon een lege lijst). Elk vers browserprofiel
(of incognitovenster) begint wel bij de onboarding-wizard. Kortste weg naar
binnen:

1. Open `http://localhost:5173/` en wacht de splash uit (~2s).
2. Kies **Volledig Ritmo**.
3. Klik **Aan de slag**.
4. Klik **Onboarding overslaan**.
5. Klik **Start Ritmo**.
6. Ga naar **Planner** in de navigatie.

Gotchas:
- De splash ("Jouw dag, jouw ritme.") staat er ~2s; daarvoor is het scherm leeg.
  Niet concluderen dat de app stuk is.
- "Overslaan" komt twee keer voor: als wizard-optie én als knop
  `Onboarding overslaan`. Je wilt die laatste.
- Wil je de onboarding opnieuw zien, gebruik een incognitovenster of leeg de
  site-data — anders slaat de app hem over.

## Externe koppelingen (Outlook-agenda) stubben

De Planner toont pas agendablokken als er een **verbonden Outlook-koppeling** in
Supabase staat (`agendaActive = agendaShown && !!outlookConnection`). Dat is
zonder account niet te halen, dus voor UI-verificatie van het rooster: patch
tijdelijk `App.jsx` zodat `agendaByDate`/`includedAgendaIds` achter een
`?e2e=1`-vlag fixture-blokken krijgen, in de vorm die `mapOutlookEventToBlocks`
(`src/utils/outlookEvents.js`) oplevert:

```js
{ id, dateKey, start: '09:00', end: '09:30', title, allDay: false,
  source: { provider: 'outlook', connectionId: 'e2e' } }
```

Open daarna `http://localhost:5173/?e2e=1` en klik het rooster zelf na — filters,
blockStyle, all-day-rij en checkbox draaien dan echt.
**Revert de patch daarna** (`git checkout -- src/App.jsx`) — hij hoort nooit in
een commit. Wat je zo NIET verifieert: `useOutlookEvents`, `agendaCache.js` en de
Graph-fetch; die paden vragen een echte koppeling.

## Meten in plaats van turen

Uitlijning en positionering zijn betrouwbaarder te meten dan af te lezen. Het
rooster is een flex-rij met een tijdbalk van 48px (`shrink-0 w-12`) en daarna
kolommen (`flex-1 min-w-[140px]`); de dagknoppenrij deelt die opbouw. Drift
tussen knop en kolom check je door dit in de **DevTools-console** te plakken:

```js
const btns = [...document.querySelectorAll('button[aria-pressed]')]
  .filter(b => /^(Ma|Di|Wo|Do|Vr|Za|Zo)\s\d+/.test(b.innerText.trim()));
const cols = [...document.querySelectorAll('div[class*="min-w-\\[140px\\]"]')];
// vergelijk getBoundingClientRect().left + width/2 per index
```

Agendablokken zijn `absolute` binnen een kolomcontainer van
`16 uur * 64px = 1024px` (07:00-22:59). Een blok hoort altijd binnen
`[0, 1024]` te vallen: `top < 0` of `top + height > 1024` betekent dat het blok
uit het rooster loopt.
