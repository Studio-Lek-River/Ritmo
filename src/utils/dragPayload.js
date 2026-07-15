// Sleep-payload helpers voor de Planner (WeekView + TaskPoolPanel). Eén
// "text/plain"-string draagt zowel de brondag als de item-key mee, zodat een
// drop-target altijd weet uit welk day:<date>-record een versleept item komt
// — ook als het item uit een ander component komt (TaskPoolPanel -> WeekView
// of andersom). Format: "<dateKey>|<itemKey>".
export function encodeDragPayload(sourceDateKey, itemKey) {
  return `${sourceDateKey}|${itemKey}`;
}

export function decodeDragPayload(raw) {
  const sepIdx = (raw || '').indexOf('|');
  if (sepIdx <= 0) return { key: null, sourceDateKey: null };
  return { sourceDateKey: raw.slice(0, sepIdx), key: raw.slice(sepIdx + 1) };
}
