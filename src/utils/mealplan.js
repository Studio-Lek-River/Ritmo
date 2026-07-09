// Weekmenu-domein voor Huishouden > Weekmenu. Terugkerend per weekdag
// (geen datums): elke dag heeft zes maaltijdslots. Bevat ook een tolerante
// tekst-parser waarmee een geplakt weekmenu naar dagen/slots wordt omgezet.

export const MENU_DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

export const MENU_SLOTS = [
  { id: 'breakfast' },
  { id: 'snack1' },
  { id: 'lunch' },
  { id: 'snack2' },
  { id: 'dinner' },
  { id: 'snack3' },
];

// Alle dag x slot-combinaties, elk als lege string.
export function emptyWeekMenu() {
  const menu = {};
  for (const day of MENU_DAYS) {
    const dayMenu = {};
    for (const slot of MENU_SLOTS) dayMenu[slot.id] = '';
    menu[day] = dayMenu;
  }
  return menu;
}

// Bouwt altijd een verse, volledige weekmenu-shape en kopieert alléén
// herkende string-slotwaarden uit `raw`. Elke oude/onbekende shape (bv. een
// date-keyed per-persoon plan) levert dus gewoon een leeg weekmenu op, nooit
// een crash.
export function normalizeWeekMenu(raw) {
  const menu = emptyWeekMenu();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return menu;
  for (const day of MENU_DAYS) {
    const rawDay = raw[day];
    if (!rawDay || typeof rawDay !== 'object' || Array.isArray(rawDay)) continue;
    for (const slot of MENU_SLOTS) {
      const value = rawDay[slot.id];
      if (typeof value === 'string') menu[day][slot.id] = value;
    }
  }
  return menu;
}

// Aantal niet-lege (getrimde) slots, voor de sectie-meta.
export function filledSlotCount(menu) {
  if (!menu || typeof menu !== 'object') return 0;
  let count = 0;
  for (const day of MENU_DAYS) {
    const dayMenu = menu[day];
    if (!dayMenu || typeof dayMenu !== 'object') continue;
    for (const slot of MENU_SLOTS) {
      const value = dayMenu[slot.id];
      if (typeof value === 'string' && value.trim()) count += 1;
    }
  }
  return count;
}

// --- Tekst-parser -----------------------------------------------------------

// Default dag-herkenners: nl + en, case-insensitief. Elke entry mag meerdere
// woordvarianten hebben; volgorde/labels zijn configureerbaar via `opts`.
const DEFAULT_DAY_MATCHERS = [
  { day: 'mon', words: ['maandag', 'monday'] },
  { day: 'tue', words: ['dinsdag', 'tuesday'] },
  { day: 'wed', words: ['woensdag', 'wednesday'] },
  { day: 'thu', words: ['donderdag', 'thursday'] },
  { day: 'fri', words: ['vrijdag', 'friday'] },
  { day: 'sat', words: ['zaterdag', 'saturday'] },
  { day: 'sun', words: ['zondag', 'sunday'] },
];

// Default slot-herkenners. 'snack' dekt alle drie de snack-slots; welke van
// de drie (snack1/2/3) een match krijgt, hangt af van de volgorde binnen de
// dag (zie parseWeekMenuText).
const DEFAULT_SLOT_MATCHERS = [
  { kind: 'breakfast', words: ['ontbijt', 'breakfast'] },
  { kind: 'snack', words: ['snack', 'snacks'] },
  { kind: 'lunch', words: ['lunch'] },
  { kind: 'dinner', words: ['diner', 'dinner'] },
];

function escapeRegExp(word) {
  return word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Test of `line` begint met `word` (los van hoofdletters, optioneel meervoud
// -s, optioneel gevolgd door ':'/'-' en de rest van de regel). Geeft de
// resterende tekst terug (kan leeg zijn) of null bij geen match.
function matchLabelWord(line, word) {
  const re = new RegExp(`^${escapeRegExp(word)}s?\\b\\s*[:\\-]?\\s*(.*)$`, 'i');
  const m = line.match(re);
  return m ? m[1].trim() : null;
}

function matchDayLine(line, dayMatchers) {
  for (const entry of dayMatchers) {
    for (const word of entry.words) {
      const remainder = matchLabelWord(line, word);
      if (remainder !== null) return { day: entry.day, remainder };
    }
  }
  return null;
}

function matchSlotLine(line, slotMatchers) {
  for (const entry of slotMatchers) {
    for (const word of entry.words) {
      const remainder = matchLabelWord(line, word);
      if (remainder !== null) return { kind: entry.kind, remainder };
    }
  }
  return null;
}

// Regelgebaseerde, tolerante parser: herkent dag-headers en slot-labels
// (gevolgd door ':' op dezelfde regel, of op een eigen regel met de tekst
// erna/eronder). Binnen een dag worden opeenvolgende snacks op volgorde
// toegewezen (1e -> snack1, 2e -> snack2, 3e -> snack3; een 4e wordt
// genegeerd). Retourneert een genormaliseerde weekmenu + telling voor de
// preview. Crasht nooit, ook niet bij lege/rommelige input.
export function parseWeekMenuText(text, opts = {}) {
  const dayMatchers = opts.dayMatchers || DEFAULT_DAY_MATCHERS;
  const slotMatchers = opts.slotMatchers || DEFAULT_SLOT_MATCHERS;
  const menu = emptyWeekMenu();

  const lines = String(text ?? '').split(/\r?\n/);

  let currentDay = null;
  let currentSlot = null;
  let buffer = [];
  const snackCounts = {};

  const flush = () => {
    if (currentDay && currentSlot) {
      const value = buffer.join(' ').replace(/\s+/g, ' ').trim();
      if (value) {
        const existing = menu[currentDay][currentSlot];
        menu[currentDay][currentSlot] = existing ? `${existing} ${value}` : value;
      }
    }
    buffer = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();

    if (!line) {
      flush();
      currentSlot = null;
      continue;
    }

    const dayMatch = matchDayLine(line, dayMatchers);
    if (dayMatch) {
      flush();
      currentDay = dayMatch.day;
      currentSlot = null;
      snackCounts[currentDay] = 0;
      continue;
    }

    const slotMatch = matchSlotLine(line, slotMatchers);
    if (slotMatch && currentDay) {
      flush();
      let slotId = slotMatch.kind;
      if (slotMatch.kind === 'snack') {
        snackCounts[currentDay] = (snackCounts[currentDay] || 0) + 1;
        const n = snackCounts[currentDay];
        slotId = n <= 3 ? `snack${n}` : null;
      }
      currentSlot = slotId;
      if (slotMatch.remainder) {
        buffer = [slotMatch.remainder];
        flush();
        currentSlot = null;
      } else {
        buffer = [];
      }
      continue;
    }

    if (currentDay && currentSlot) {
      buffer.push(line);
    }
  }
  flush();

  return { menu, filledCount: filledSlotCount(menu) };
}
