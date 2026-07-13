# V01 — Versienummer in splash en help

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/86
**Status:** concept

## Doel

Maak het app-versienummer zichtbaar op de laadanimatie (splash) en in de Help. De versie
staat nu alleen in `package.json` (`0.42.0`, beheerd door semantic-release) en is niet
beschikbaar in de frontend. Door de versie op deze twee plekken te tonen ziet een gebruiker
(en wijzelf, bij feedback- en bugmeldingen) in één oogopslag welke build draait. Losse
UI-verbetering buiten de ROADMAP-fasering; start van de V-serie voor kleine UI-slices.

## Scope

**Wel in scope:**
- Versie één keer aan runtime blootstellen: `define: { __APP_VERSION__ }` in `vite.config.js`
  (gelezen uit `package.json`) plus een herbruikbare constante `src/utils/appVersion.js`.
- Splash (`SplashScreen.jsx`): versieregel onder de tagline.
- Help (`HelpOverlay.jsx`): statische, niet-klikbare versie-voettekst onderaan de lijst.
- i18n-keys `splash.version` en `help.version` in `nl.js` én `en.js`.

**Niet in scope (bewust):**
- Geen apart "Over Ritmo"-scherm of klikbare help-rij; alleen een statisch label.
- Geen changelog, build-hash, of commit-info; puur het semver-versienummer.
- Geen instelling om de versie te verbergen (statisch informatief label).

## Aanpak

- **`vite.config.js`** — bovenaan `package.json` inlezen en een `define` toevoegen:
  ```js
  import { readFileSync } from 'node:fs';
  const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url)));
  // in defineConfig({...}):
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  ```
  Robuuster dan `process.env.npm_package_version`.
- **`src/utils/appVersion.js`** (nieuw) — één bron (principe 2):
  ```js
  export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '';
  ```
- **`src/components/SplashScreen.jsx`** — onder de tagline-`<p>` een tweede, subtiel `<p>`
  met `t('splash.version', { version: APP_VERSION })`; alleen renderen als `APP_VERSION` truthy.
- **`src/components/help/HelpOverlay.jsx`** — onder de `helpItems`-lijst een kleine,
  gecentreerde, niet-klikbare muted regel `t('help.version', { version: APP_VERSION })`;
  alleen renderen als `APP_VERSION` truthy. Geen nieuwe subview.
- **i18n** — interpolatie werkt al (`t(key, { param })`, zie `tour.progress`). Toevoegen in
  beide talen: `splash.version: 'v{version}'`, `help.version: 'Ritmo v{version}'`.

## Acceptatiecriteria

- [ ] De versie (bv. `v0.42.0`) verschijnt op de splash onder de tagline.
- [ ] De versie (`Ritmo v0.42.0`) verschijnt als statische regel onderaan de Help-lijst.
- [ ] De versie komt uit één bron (`package.json` via `__APP_VERSION__` → `APP_VERSION`),
      niet hardcoded; bij een release-bump veranderen beide plekken mee.
- [ ] `npm run build` slaagt en `__APP_VERSION__` wordt vervangen door de package-versie.
- [ ] Elke nieuwe UI-string heeft een key in zowel `src/i18n/nl.js` als `src/i18n/en.js`
      (`npm run check:i18n` slaagt).
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Puur additief informatief label: geen opgeslagen data of bestaand gedrag geraakt,
      bestaande gebruikersdata blijft veilig (principe 2 — geen toggle nodig).
