// Detecteert of de app op een echt mobiel platform draait (telefoon/tablet:
// iOS/Android) versus een desktop-besturingssysteem (Windows, macOS, Linux).
// Bepaalt of Ritmo de mobiele layout of de desktop systeem-layout toont.
//
// Bewust op basis van de user-agent, niet op touch/pointer: veel Windows-laptops
// hebben een touchscreen maar moeten de desktop-layout krijgen. Alleen echte
// telefoons en tablets vallen terug op mobiel.

export function isMobilePlatform() {
  if (typeof navigator === 'undefined') return false;

  const ua = navigator.userAgent || '';

  // Chromium geeft een betrouwbare boolean voor telefoons (niet voor tablets).
  if (navigator.userAgentData?.mobile === true) return true;

  // iPad op iPadOS 13+ doet zich voor als macOS; herken aan de touch-punten.
  const isIPadOS = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  if (isIPadOS) return true;

  // Telefoons en tablets herkennen aan de user-agent (Android-tablets bevatten
  // "Android" zonder "Mobi"; die willen we ook als mobiel behandelen).
  return /Android|iPhone|iPod|iPad|Windows Phone|Mobi/i.test(ua);
}

export function isDesktopPlatform() {
  return !isMobilePlatform();
}
