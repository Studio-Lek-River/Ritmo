// Pure helpers voor de Aandelen-sectie. Geen React, geen storage.
// Spiegelt de stijl van src/utils/household.js en src/utils/collections.js.

// Sorteer events oplopend op datum (oudste eerst).
export function sortedAsc(events) {
  return [...(events || [])].sort((a, b) => a.date.localeCompare(b.date));
}

// NL/locale-decimaal naar number. "1.234,56" of "1234,5" -> number, of null.
// Eigen parser i.p.v. parseEuroInput: die geeft 0 terug op ongeldige invoer en
// kan "leeg/ongeldig" niet onderscheiden van een echte 0. Hier is null nodig
// zodat de UI weet wanneer een meting niet toegevoegd mag worden.
export function parseAmount(str) {
  if (typeof str === 'number') return Number.isFinite(str) ? str : null;
  const cleaned = String(str || '')
    .replace(/\./g, '')
    .replace(',', '.')
    .replace(/[^\d.-]/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
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
