// Formatters voor de Aandelen-grafiek en -lijsten. Los van React, los van
// storage — spiegelt de stijl van src/utils/investments.js.
import { getLocale } from '../../../i18n/useTranslation';

// Euro-formatter zonder decimalen voor de grafiek-as (kale getallen zouden
// niet als bedrag leesbaar zijn). Stats en meta gebruiken het volledige
// formatEuro uit utils/household.
export function euroAxis(v) {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(v || 0);
}

export function fmtDate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '';
  return new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(y, m - 1, d));
}

// Euro-formatter mét centen voor de koers-as (absolute schaal): koersen zijn
// vaak < €1.000 met relevante decimalen, anders zijn ze onleesbaar op de as.
export function euroPriceAxis(v) {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 2,
  }).format(v || 0);
}

// Kale-getal-formatter voor de geïndexeerde koers-as (eerste meting = 100).
export function indexAxis(v) {
  return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 0 }).format(v || 0);
}

// Aantal stuks via Intl (locale-decimaalteken), i.p.v. het getal rechtstreeks
// interpoleren — anders staat er in nl altijd een punt ("10.5") terwijl de
// koers ernaast wel via formatEuro/Intl loopt.
export function formatShares(n) {
  return new Intl.NumberFormat(getLocale()).format(n);
}
