// Centrale registry van celebratie-animaties (Lottie). UI-code praat alleen
// via deze registry, niet rechtstreeks met JSON-imports — dat houdt het
// uitbreiden naar nieuwe animaties beperkt tot dit bestand.

import cowDrinkMilk from '../assets/animations/cow-drink-milk.json';

export const CELEBRATION_ANIMATIONS = {
  cowDrinkMilk: {
    id: 'cowDrinkMilk',
    labelKey: 'celebrations.cowDrinkMilk',
    data: cowDrinkMilk,
  },
};

export function getCelebrationAnimation(id) {
  return CELEBRATION_ANIMATIONS[id] ?? null;
}

// Confetti-toast config: één plek voor de visuele tuning van de
// "alles voltooid"-celebratie en counter-celebraties zonder Lottie-overlay.
export const CONFETTI_CONFIG = {
  count: 30,
  maxDelaySeconds: 0.5,
  fadeOutMs: 3000,
  messageFadeMs: 2500,
  colors: ['#fbbf24', '#3b82f6', '#10b981', '#ec4899', '#a855f7'],
};

export function buildConfetti() {
  const { count, maxDelaySeconds, colors } = CONFETTI_CONFIG;
  return Array.from({ length: count }, (_, i) => ({
    id: Date.now() + i,
    x: Math.random() * 100,
    delay: Math.random() * maxDelaySeconds,
    color: colors[Math.floor(Math.random() * colors.length)],
    rotation: Math.random() * 360,
  }));
}
