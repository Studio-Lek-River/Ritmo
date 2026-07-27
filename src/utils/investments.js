// Pure helpers voor de Aandelen-sectie. Geen React, geen storage.
// Spiegelt de stijl van src/utils/household.js en src/utils/collections.js.

// Sorteer events oplopend op datum (oudste eerst).
export function sortedAsc(events) {
  return [...(events || [])].sort((a, b) => a.date.localeCompare(b.date));
}

// Forward-fill som over alle aandelen. Geeft [{ date, value }] oplopend.
// Op elke unieke datum: per aandeel de laatst bekende waarde tot en met die
// datum, opgeteld.
export function buildTotalSeries(holdings) {
  const allDates = new Set();
  (holdings || []).forEach(h => (h.events || []).forEach(e => allDates.add(e.date)));
  const dates = [...allDates].sort();
  return dates.map(date => {
    let value = 0;
    for (const h of holdings || []) {
      const evs = sortedAsc(h.events);
      let last = null;
      for (const e of evs) {
        if (e.date <= date) last = e; else break;
      }
      if (last) value += Number(last.amount) || 0;
    }
    return { date, value };
  });
}

// Geeft de actieve reeks [{ date, value }] op basis van de modus.
export function activeSeries(investments) {
  if (!investments) return [];
  if (investments.mode === 'holdings') return buildTotalSeries(investments.holdings);
  return sortedAsc(investments.total?.events).map(e => ({ date: e.date, value: e.amount }));
}

// Stats uit een oplopende reeks [{ date, value }].
export function seriesStats(points) {
  if (!points || points.length === 0) return null;
  const first = points[0];
  const last = points[points.length - 1];
  const prev = points.length > 1 ? points[points.length - 2] : null;
  const changeAll = last.value - first.value;
  const changePrev = prev ? last.value - prev.value : 0;
  return {
    current: last.value,
    changeAll,
    changeAllPct: first.value !== 0 ? changeAll / first.value : 0,
    changePrev,
    changePrevPct: prev && prev.value !== 0 ? changePrev / prev.value : 0,
    hasPrev: !!prev,
    points: points.length,
  };
}

export function newId() {
  return Math.random().toString(36).slice(2, 10);
}

// ── Aantal x koers per meting (#115) ────────────────────────────────────────
// `amount` blijft altijd de bron van waarde; shares/price zijn extra context.

// Invoerwijze van een aandeel: 'shares' (aantal x koers) of 'total'
// (totaalbedrag, huidig gedrag). Afwezigheid van `entry` betekent 'total'.
// Dit is de enige plek waar die default leeft — nergens anders
// `h.entry === 'shares'` inline testen.
export function holdingEntryMode(holding) {
  return holding?.entry === 'shares' ? 'shares' : 'total';
}

// shares x price afgerond op 2 decimalen, of null bij ontbrekende/ongeldige
// invoer.
export function computeAmount(shares, price) {
  if (!Number.isFinite(shares) || !Number.isFinite(price)) return null;
  return Math.round(shares * price * 100) / 100;
}

// Heeft dit event een bruikbare koers (voor de koersgrafiek)?
export function hasPrice(event) {
  return Number.isFinite(event?.price);
}

// Heeft dit event zowel een bruikbaar aantal als een bruikbare koers (nodig
// om een interval aan koersdeel/inlegdeel toe te wijzen)?
export function hasSharesAndPrice(event) {
  return Number.isFinite(event?.shares) && Number.isFinite(event?.price);
}

// Chronologisch laatste event van een aandeel, of null. Vervangt de eerdere
// lokale holdingCurrent() (twee gebruikers na de bestandsopsplitsing).
export function lastEvent(holding) {
  const evs = sortedAsc(holding?.events);
  return evs.length ? evs[evs.length - 1] : null;
}

// Koersreeks per aandeel, direct in het LineChart-formaat
// [{ id, name, color, events:[{id,date,value}] }]. Alleen metingen mét
// koers, geen forward-fill: een koerslijn is een reeks gemeten koersen, geen
// som (forward-fill is alleen nodig bij buildTotalSeries). Leeg -> aandeel
// valt stil weg. Absoluut: value = koers. Geïndexeerd: eerste koers = 100;
// is die koers niet > 0, dan valt het aandeel weg én telt `skipped` op.
//
// Gedreven door de event-data, niet door `entry`: zet je een aandeel terug
// op totaalbedrag, dan blijven eerder ingevoerde koersen zichtbaar.
export function buildPriceSeries(holdings, { indexed } = {}) {
  let skipped = 0;
  const series = [];
  for (const h of holdings || []) {
    const pts = sortedAsc(h.events).filter(hasPrice);
    if (pts.length === 0) continue;
    if (indexed) {
      const base = pts[0].price;
      if (!(base > 0)) { skipped += 1; continue; }
      series.push({
        id: h.id,
        name: h.name,
        color: h.color,
        events: pts.map(e => ({ id: e.id, date: e.date, value: (e.price / base) * 100 })),
      });
    } else {
      series.push({
        id: h.id,
        name: h.name,
        color: h.color,
        events: pts.map(e => ({ id: e.id, date: e.date, value: e.price })),
      });
    }
  }
  return { series, skipped };
}

// Rond af op hele centen, op precies dezelfde manier als formatEuro
// (src/utils/household.js): via toFixed(2), niet via Math.round(n*100)/100.
// Die twee regels verschillen op halve-cent-grenzen door hoe floats intern
// worden gerepresenteerd — bv. 95.005 rondt met toFixed(2) naar "95.00",
// maar Math.round(95.005*100)/100 geeft 95.01. changeBreakdown moet dezelfde
// regel gebruiken als de UI die het totaal toont, anders klopt de splitsing
// niet met "Sinds eerste meting" zoals de gebruiker die leest (AC5). Verander
// dit dus niet terug naar Math.round(n*100)/100.
function round2(n) {
  return Number((Number(n) || 0).toFixed(2));
}

// Decompositie van de waardeverandering in koersdeel, inlegdeel en
// niet-toewijsbaar deel, zonder restterm.
//
// Invariant: formatEuro(priceGain + contribution + unattributed) ===
// formatEuro(seriesStats(buildTotalSeries(holdings)).changeAll) — d.w.z. de
// splitsing telt op tot het *getoonde* totaal, niet noodzakelijk tot het
// ruwe float-getal (die twee kunnen op halve-cent-grenzen verschillen; zie
// round2 hierboven). Daarom rondt deze functie met dezelfde regel als
// formatEuro af.
//
// Twee andere details dwingen de invariant verder af: `baseIdx` gebruikt
// `<= firstDate` (niet `===`), zodat bij twee metingen op dezelfde eerste
// datum dezelfde basislijn wordt gekozen als in buildTotalSeries; en de
// eerste meting van een aandeel dat láter start is volledig inleg — precies
// hoe buildTotalSeries het ook ziet. Het inlegdeel wordt per interval als
// *rest* berekend (waardeverandering min koersdeel), niet rechtstreeks uit
// de aantallen, zodat de optelling altijd klopt met `amount`.
export function changeBreakdown(holdings) {
  const list = holdings || [];

  let firstDate = null;
  for (const h of list) {
    for (const e of h.events || []) {
      if (firstDate === null || e.date < firstDate) firstDate = e.date;
    }
  }
  if (firstDate === null) return null;

  let priceGain = 0;
  let contribution = 0;
  let unattributed = 0;
  let attributedSteps = 0;

  for (const h of list) {
    const evs = sortedAsc(h.events);
    let baseIdx = -1;
    for (let i = 0; i < evs.length; i += 1) {
      if (evs[i].date <= firstDate) baseIdx = i; else break;
    }
    let prev = baseIdx >= 0 ? evs[baseIdx] : null;
    for (let i = baseIdx + 1; i < evs.length; i += 1) {
      const e = evs[i];
      if (prev === null) {
        if (hasSharesAndPrice(e)) {
          contribution += e.amount;
          attributedSteps += 1;
        } else {
          unattributed += e.amount;
        }
      } else if (hasSharesAndPrice(e) && hasSharesAndPrice(prev)) {
        const pg = prev.shares * (e.price - prev.price);
        priceGain += pg;
        contribution += (e.amount - prev.amount) - pg;
        attributedSteps += 1;
      } else {
        unattributed += e.amount - prev.amount;
      }
      prev = e;
    }
  }

  const changeAll = seriesStats(buildTotalSeries(list))?.changeAll ?? 0;
  // Rond priceGain en unattributed onafhankelijk af, en bereken contribution
  // pas ná die afronding als sluitpost. Onafhankelijk alle drie afronden kan
  // de optelling met changeAll breken (twee componenten die allebei op een
  // halve-cent-grens omhoog afronden); dit garandeert de invariant per
  // constructie, ook bij fractionele aantallen/koersen.
  const priceGainR = round2(priceGain);
  const unattributedR = round2(unattributed);
  const contributionR = round2(changeAll) - priceGainR - unattributedR;
  return {
    priceGain: priceGainR,
    contribution: contributionR,
    unattributed: unattributedR,
    changeAll,
    hasSplit: attributedSteps > 0,
  };
}
