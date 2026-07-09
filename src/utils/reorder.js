// Pure reorder-helpers voor lijsten van objecten met een `id`-veld.
// Gedeeld tussen de modules-reorder-UI (SettingsModal in App.jsx) en de
// huishoud-secties-reorder-UI (HouseholdView.jsx). Muteert de input nooit.

// Verwissel het item met id `id` met zijn buurman in de richting `dir`
// (-1 = omhoog, +1 = omlaag). Geeft `list` ongewijzigd terug bij randgevallen
// (id niet gevonden, al eerste/laatste).
export function moveById(list, id, dir) {
  const i = list.findIndex(item => item.id === id);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= list.length) return list;
  const next = [...list];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

// Verplaats het item met id `fromId` naar de positie van het item met id
// `toId` (drag & drop). Geeft `list` ongewijzigd terug bij randgevallen.
export function reorderById(list, fromId, toId) {
  const from = list.findIndex(item => item.id === fromId);
  const to = list.findIndex(item => item.id === toId);
  if (from < 0 || to < 0 || from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}
