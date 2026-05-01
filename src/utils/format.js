export function formatAmount(value, unit) {
  if (value == null || isNaN(value)) return '0';
  if (unit === 'minutes') {
    const m = Math.round(value);
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const rest = m % 60;
    return rest === 0 ? `${h}u` : `${h}u ${rest}min`;
  }
  if (unit === 'l') return `${(Math.round(value * 100) / 100)} l`;
  if (unit === 'glas') return `${Math.round(value)} glas`;
  if (unit === 'ml') return `${Math.round(value)} ml`;
  return `${Math.round(value)} ${unit}`;
}

export function unitLabel(unit) {
  return unit === 'glas' ? 'glas' : unit;
}

export function formatDuration(minutes) {
  if (minutes == null || isNaN(minutes) || minutes <= 0) return '';
  const m = Math.round(minutes);
  const h = Math.floor(m / 60);
  const rest = m % 60;
  if (h === 0) return `${rest}min`;
  return rest === 0 ? `${h}u` : `${h}u ${rest}min`;
}
