import { useState } from 'react';
import { isDesktopPlatform } from '../utils/platform';

// True wanneer de app op een desktop-besturingssysteem draait (Windows/macOS/Linux),
// false op telefoon/tablet. Bepaalt of de desktop systeem-layout getoond wordt.
// Het platform verandert niet tijdens een sessie, dus we bepalen het eenmalig.
export default function useIsDesktop() {
  const [isDesktop] = useState(() => isDesktopPlatform());
  return isDesktop;
}
