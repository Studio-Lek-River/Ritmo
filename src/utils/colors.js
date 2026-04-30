// Maps a color key (string from COLOR_OPTIONS in App.jsx) to a set of Tailwind
// utility classes used by modules. Tailwind's safelist (tailwind.config.js)
// guarantees these dynamic classes survive the JIT purge.
//
// Returns a stable shape so callers can destructure freely:
//   { bar, iconBg, iconText, pillBg, pillText, ringBorder }
//
// Pass `undefined`/unknown key for a neutral zinc fallback.

const KNOWN_COLORS = new Set([
  'amber', 'cyan', 'purple', 'green', 'indigo',
  'pink', 'blue', 'orange', 'rose', 'teal',
]);

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
