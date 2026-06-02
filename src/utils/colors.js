// Maps a color key (string from COLOR_OPTIONS) to a set of Tailwind
// utility classes used by modules. Tailwind's safelist (tailwind.config.js)
// guarantees these dynamic classes survive the JIT purge.
//
// Returns a stable shape so callers can destructure freely:
//   { bar, iconBg, iconText, pillBg, pillText, ringBorder }
//
// Pass `undefined`/unknown key for a neutral zinc fallback.

// Kleuren die de gebruiker kan kiezen voor modules (volgorde = UI-volgorde).
export const COLOR_OPTIONS = [
  'red', 'orange', 'amber', 'yellow', 'green', 'teal', 'cyan',
  'blue', 'indigo', 'purple', 'pink',
];

// Alle kleuren die we klassen voor genereren — superset van COLOR_OPTIONS,
// inclusief legacy/intern gebruikte tinten zoals 'rose'.
const KNOWN_COLORS = new Set([...COLOR_OPTIONS, 'rose']);

// Tailwind 500-stop hex values, matched to the `bg-${key}-500` choice in
// getColorClasses. Used for inline-style backgrounds (gradients) where
// dynamic Tailwind classes can't be applied.
const COLOR_HEX = {
  red: '#ef4444',
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  green: '#22c55e',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#a855f7',
  pink: '#ec4899',
  rose: '#f43f5e',
};

// Tailwind 300-stop hex values, een lichtere tint per kleur. Gebruikt voor de
// achterste golflaag van de glas-weergave (LiquidGlass), waar een tweede,
// lichtere vloeistofkleur nodig is naast de basis (500-stop) kleur.
const COLOR_HEX_LIGHT = {
  red: '#fca5a5',
  orange: '#fdba74',
  amber: '#fcd34d',
  yellow: '#fde047',
  green: '#86efac',
  teal: '#5eead4',
  cyan: '#67e8f9',
  blue: '#93c5fd',
  indigo: '#a5b4fc',
  purple: '#d8b4fe',
  pink: '#f9a8d4',
  rose: '#fda4af',
};

export function getColorHex(colorKey) {
  return COLOR_HEX[colorKey] || '#71717a';
}

// Geeft de basis- en lichte vloeistofkleur voor de glas-weergave. Beide vallen
// terug op een neutrale zinc-tint bij een onbekende sleutel.
export function glassFill(colorKey) {
  return {
    base: getColorHex(colorKey),
    light: COLOR_HEX_LIGHT[colorKey] || '#a1a1aa',
  };
}

export function getColorClasses(colorKey) {
  if (!colorKey || !KNOWN_COLORS.has(colorKey)) {
    return {
      bar: 'bg-zinc-500',
      iconBg: 'bg-zinc-100 dark:bg-zinc-800',
      iconText: 'text-zinc-500',
      pillBg: 'bg-zinc-100 dark:bg-zinc-800',
      pillText: 'text-zinc-700 dark:text-zinc-300',
      ringBorder: 'ring-zinc-400 border-zinc-400',
    };
  }
  return {
    bar: `bg-${colorKey}-500`,
    iconBg: `bg-${colorKey}-100 dark:bg-${colorKey}-900/30`,
    iconText: `text-${colorKey}-500`,
    pillBg: `bg-${colorKey}-100 dark:bg-${colorKey}-900/30`,
    pillText: `text-${colorKey}-700 dark:text-${colorKey}-300`,
    ringBorder: `ring-${colorKey}-500 border-${colorKey}-500`,
  };
}
