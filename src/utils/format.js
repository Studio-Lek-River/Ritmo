import { t } from '../i18n/useTranslation';

export function formatAmount(value, unit) {
  if (value == null || isNaN(value)) return '0';
  if (unit === 'minutes') {
    const m = Math.round(value);
    const minLabel = t('common.minute_short');
    const hLabel = t('common.hour_short');
    if (m < 60) return `${m} ${minLabel}`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest === 0 ? `${h}${hLabel}` : `${h}${hLabel} ${rest}${minLabel}`;
  }
  if (unit === 'l') return `${(Math.round(value * 100) / 100)} l`;
  if (unit === 'glas') return `${Math.round(value)} ${t('modules.units.glas')}`;
  if (unit === 'ml') return `${Math.round(value)} ml`;
  return `${Math.round(value)} ${unit}`;
}

export function unitLabel(unit) {
  return unit === 'glas' ? t('modules.units.glas') : unit;
}

export function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes) || minutes <= 0) return '';
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  const minLabel = t('common.minute_short');
  const hLabel = t('common.hour_short');
  if (h === 0) return `${rest}${minLabel}`;
  return rest === 0 ? `${h}${hLabel}` : `${h}${hLabel} ${rest}${minLabel}`;
}
