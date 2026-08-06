// Pure helpers voor het parsen/formatteren van vrij ingetypte bedragen. Geen
// React, geen storage. Vervangt de twee losse parsers die Ritmo eerder had
// (parseAmount in utils/investments.js, parseEuroInput in utils/household.js)
// — die hadden allebei een eigen fout bij punt/komma-notatie (#114).
//
// De regel, toegepast op de gefilterde invoer (alles behalve cijfers, `.`,
// `,` en een leidend minteken wordt genegeerd):
//
// 1. Beide scheidingstekens aanwezig -> het láátst voorkomende is het
//    decimaalteken, het andere duizendtal. "1.234,56" -> 1234.56,
//    "1,234.56" -> 1234.56.
// 2. Alleen punten, meer dan één -> duizendtal. "1.234.567" -> 1234567.
// 3. Alleen komma's, meer dan één -> duizendtal. "1,234,567" -> 1234567.
// 4. Eén punt -> decimaal, tenzij er precies 3 cijfers achter staan; dan
//    duizendtal. "25.25" -> 25.25, "1.5" -> 1.5, "1.234" -> 1234.
// 5. Eén komma -> altijd decimaal, ongeacht het aantal cijfers erna.
//    "25,25" -> 25.25, "1,234" -> 1.234, ",5" -> 0.5. De 3-cijfer-uitzondering
//    (regel 4) geldt dus alleen voor de punt, niet voor de komma: Ritmo
//    seedt drafts altijd met komma-decimaal (formatDecimalInput), dus een
//    komma als decimaalteken is de enige lezing die de roundtrip
//    formatDecimalInput -> parseDecimalInput garandeert (anders zou
//    formatDecimalInput(1.234) -> "1,234" -> parseDecimalInput -> 1234
//    worden, 1000x te groot).
// 6. Geen scheidingsteken -> gewoon het hele getal. "2525" -> 2525. En geen
//    cijfer in de invoer -> null (ongeldig).
//
// Bekende, geaccepteerde ambiguïteit: wie "1.500" intypt en €1,50 bedoelt,
// krijgt €1500 (regel 4). Dat is de bewuste prijs voor het behouden van
// duizendtalnotatie. Zie issue #114 voor de volledige afweging.

// Vrije invoer (string of number) -> number, of null bij ongeldige/lege
// invoer. null i.p.v. 0 zodat de UI "leeg/ongeldig" kan onderscheiden van een
// echte 0 (bv. om een toevoegen-knop uit te schakelen).
export function parseDecimalInput(str) {
  if (typeof str === 'number') return Number.isFinite(str) ? str : null;

  const raw = String(str ?? '');
  const negative = /^\s*-/.test(raw);
  const filtered = raw.replace(/[^\d.,]/g, '');
  if (!/\d/.test(filtered)) return null;

  const dotCount = (filtered.match(/\./g) || []).length;
  const commaCount = (filtered.match(/,/g) || []).length;

  let decimalChar = null;
  if (dotCount > 0 && commaCount > 0) {
    // Beide aanwezig: het laatst voorkomende scheidingsteken is decimaal.
    decimalChar = filtered.lastIndexOf('.') > filtered.lastIndexOf(',') ? '.' : ',';
  } else if (dotCount === 1) {
    // Eén punt: decimaal, tenzij precies 3 cijfers erna (duizendtal).
    const after = filtered.slice(filtered.indexOf('.') + 1);
    if (after.length !== 3) decimalChar = '.';
  } else if (commaCount === 1) {
    // Eén komma: altijd decimaal (roundtrip-garantie met formatDecimalInput,
    // zie commentaarblok hierboven).
    decimalChar = ',';
  }
  // Overige gevallen (hetzelfde scheidingsteken meerdere keren, of één punt
  // met precies 3 cijfers erna) -> decimalChar blijft null (duizendtal).

  let normalized;
  if (decimalChar) {
    const otherChar = decimalChar === '.' ? ',' : '.';
    normalized = filtered.split(otherChar).join('').replace(decimalChar, '.');
  } else {
    normalized = filtered.replace(/[.,]/g, '');
  }

  const n = parseFloat((negative ? '-' : '') + normalized);
  return Number.isFinite(n) ? n : null;
}

// Number -> bewerkbare draft-string in NL/locale-decimaalnotatie (comma).
// Tegenhanger van parseDecimalInput: een draft die hiermee geseed is, geeft
// ongewijzigd teruggeparsed exact hetzelfde getal (1234.5 -> '1234,5' ->
// 1234.5). Een kale String(n) zou dat niet halen: die laat de punt staan, en
// een getal met precies 3 decimalen valt dan in de duizendtalregel
// (String(1.234) -> '1.234' -> 1234, regel 4 hierboven).
export function formatDecimalInput(n) {
  if (!Number.isFinite(n)) return '';
  return String(n).replace('.', ',');
}
