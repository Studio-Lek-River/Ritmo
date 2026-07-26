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
