# SC — Desktop: zijmenu naar horizontale topbalk

Issue: https://github.com/Studio-Lek-River/Ritmo/issues/68
**Status:** concept

## Doel

Herstructureer de desktop-shell (`DesktopShell.jsx`) van een verticale sidebar naar een horizontale
topbalk bovenaan de view, als eerste bouwsteen van de desktop-herziening (epic #67, Slice C). Nav-gedrag
blijft identiek aan mobiel; alleen de plaatsing verandert.

## Scope

**Wel in scope:**
- `DesktopShell.jsx` omzetten van `<aside>` + `<main>` (horizontale flex) naar een verticale kolom:
  topbalk boven, content-area eronder.
- Topbalk-indeling: Ritmo-logo/merk links, nav-items (uit `getNavGroups`) in het midden, actie-iconen
  (thema-toggle, inzichten, instellingen) rechts.
- Content-area onder de balk, breed; bestaande `max-w-7xl mx-auto` behouden.
- Alle oppervlakte-kleuren via het `theme`-object / `r-*` tokens (al aanwezig in het component).

**Niet in scope (bewust):**
- Mobiele `TabBar.jsx` en de mobiele render in `App.jsx` — onaangeroerd.
- Productivity Suite / Dag- en Kanban-views (Slice D/E).
- Nieuwe skin-afwerking of extra weergavestijlen (Slice F).
- Nieuwe navigatietabs of wijziging aan `getNavGroups`-databron.

## Aanpak

- Bewerk alleen `src/components/DesktopShell.jsx`. Vervang de root `flex gap-6` + `<aside>` door een
  `flex flex-col`: bovenin een `<header>` topbalk (`theme.card`, rounded, shadow), eronder `<main>`.
- Nav horizontaal: render de `getNavGroups`-groepen als één rij knoppen; groep-scheiding via een subtiele
  divider (`theme.border`) i.p.v. de verticale `border-t`. Actief item behoudt de bestaande markering
  (`bg-blue-500 text-white shadow`).
- Merk links: `RitmoLogo` (bestaand component, `src/components/RitmoLogo.jsx`) + `t('app.title')`.
  De datum/tagline uit de sidebar mag vervallen of compact meegaan — geen nieuwe strings nodig.
- Actie-iconen rechts: hergebruik de bestaande `iconBtnClass`-knoppen (thema, inzichten met
  `t('insight.headerButtonAria')`, instellingen) 1-op-1.
- Geen nieuwe props nodig; `App.jsx` levert al `view/setView/theme/appMode/darkMode/setDarkMode/setShowSettings`.

## Acceptatiecriteria

- [ ] Op desktop verschijnt een horizontale topbalk i.p.v. de sidebar; nav werkt identiek (zelfde tabs/labels als mobiel).
- [ ] Actief tab-item is visueel gemarkeerd; thema-toggle, inzichten en instellingen werken zoals voorheen.
- [ ] Mobiele weergave (`TabBar`) is onveranderd (geen diff in `TabBar.jsx` of de mobiele render van `App.jsx`).
- [ ] Werkt in light + dark en in alle drie de weergavestijlen (Strak/Levendig/Compact) zonder hardcoded oppervlakte-kleuren — alleen `theme`/`r-*` tokens.
- [ ] `npm run build` en `npm run check:i18n` groen; geen nieuwe hardcoded UI-tekst (i18n-keys hergebruikt).
- [ ] Geen wijzigingen buiten de scope van deze slice.
- [ ] Nieuw gedrag is configureerbaar/uitschakelbaar (principe 2); bestaande gebruikersdata blijft veilig (layout-only, geen data-impact).
