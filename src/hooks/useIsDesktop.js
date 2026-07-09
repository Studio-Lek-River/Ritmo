import { useEffect, useState } from 'react';

// Live viewport-breedte hook: true zodra het scherm minstens `minWidth` breed is.
// Default breakpoint 1024px = Tailwind `lg`. Updatet live bij resizen, net als de
// dark-mode listener in App.jsx. SSR-veilig: zonder window is de waarde false.
const DESKTOP_QUERY = '(min-width: 1024px)';

function readMatch(query) {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  return window.matchMedia(query).matches;
}

export default function useIsDesktop(query = DESKTOP_QUERY) {
  const [isDesktop, setIsDesktop] = useState(() => readMatch(query));

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined;
    const mql = window.matchMedia(query);
    const onChange = (e) => setIsDesktop(e.matches);
    // Sync direct (breakpoint kan al zijn veranderd tussen render en effect).
    setIsDesktop(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);

  return isDesktop;
}
