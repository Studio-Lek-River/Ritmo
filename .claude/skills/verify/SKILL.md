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

Playwright + Chromium zitten al in `node_modules` (geen `npm i` nodig). Vanuit
een script buiten de repo resolvet `playwright` niet; gebruik:

```js
import { createRequire } from 'node:module';
const require = createRequire('d:/Ritmo/');
const { chromium } = require('playwright');
```

## Binnenkomen: geen login, wel onboarding

Er is **geen auth-muur** — zonder Supabase-account werkt de app lokaal door
(`useConnections` geeft dan gewoon een lege lijst). Elk verse browserprofiel
begint wel bij de onboarding-wizard. Kortste weg naar binnen:

```js
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(2500);                       // splash
if (await page.getByText('Welkom bij Ritmo').count() > 0) {
  await page.getByText('Volledig Ritmo', { exact: false }).first().click();
  await page.getByRole('button', { name: /Aan de slag/i }).click();
  await page.getByRole('button', { name: 'Onboarding overslaan', exact: true }).click();
  await page.getByRole('button', { name: /Start Ritmo/i }).click();
}
await page.getByText('Planner', { exact: true }).first().click();
```

Gotchas:
- De splash ("Jouw dag, jouw ritme.") staat er ~2s; zonder wachten time-out je op
  een lege DOM.
- Navigatie-items zijn geen `role=button` met exacte naam — `getByText('Planner',
  { exact: true })` werkt, `getByRole('button', { name: 'Planner' })` niet.
- "Overslaan" komt twee keer voor: de wizard-optie en `Onboarding overslaan`.
  Gebruik `exact: true`.

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

Zo draait heel `WeekView` echt (filters, blockStyle, all-day-rij, checkbox).
**Revert de patch daarna** (`git checkout -- src/App.jsx`) — hij hoort nooit in
een commit. Wat je zo NIET verifieert: `useOutlookEvents`, `agendaCache.js` en de
Graph-fetch; die paden vragen een echte koppeling.

## Meten in plaats van turen

Uitlijning en positionering zijn betrouwbaarder te meten dan af te lezen. Het
rooster is een flex-rij met een tijdbalk van 48px (`shrink-0 w-12`) en daarna
kolommen (`flex-1 min-w-[140px]`); de dagknoppenrij deelt die opbouw. Drift
tussen knop en kolom check je zo:

```js
await page.evaluate(() => {
  const btns = [...document.querySelectorAll('button[aria-pressed]')]
    .filter(b => /^(Ma|Di|Wo|Do|Vr|Za|Zo)\s\d+/.test(b.innerText.trim()));
  const cols = [...document.querySelectorAll('div[class*="min-w-\\[140px\\]"]')];
  // vergelijk getBoundingClientRect().left + width/2 per index
});
```

Agendablokken zijn `absolute` binnen een kolomcontainer van
`16 uur * 64px = 1024px` (07:00-22:59). Een blok hoort altijd binnen
`[0, 1024]` te vallen: `top < 0` of `top + height > 1024` betekent dat het blok
uit het rooster loopt.
