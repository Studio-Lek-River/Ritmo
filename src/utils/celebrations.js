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
