import { useEffect, useRef } from 'react';
import Lottie from 'lottie-react';
import { getCelebrationAnimation } from '../utils/celebrations';

const MIN_DISPLAY_MS = 1800;
const MAX_DISPLAY_MS = 6000;

export default function CelebrationOverlay({ animationId, onClose }) {
  const animation = getCelebrationAnimation(animationId);
  const openedAt = useRef(Date.now());
  const closed = useRef(false);

  function safeClose() {
    if (closed.current) return;
    const elapsed = Date.now() - openedAt.current;
    const remaining = MIN_DISPLAY_MS - elapsed;
    if (remaining > 0) {
      setTimeout(() => { if (!closed.current) { closed.current = true; onClose(); } }, remaining);
    } else {
      closed.current = true;
      onClose();
    }
  }

  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') safeClose(); };
    window.addEventListener('keydown', handleKey);
    const maxTimer = setTimeout(safeClose, MAX_DISPLAY_MS);
    return () => {
      window.removeEventListener('keydown', handleKey);
      clearTimeout(maxTimer);
    };
  }, []);

  if (!animation) return null;

  return (
    <div
      onClick={safeClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 cursor-pointer"
    >
      <div className="w-[min(90vw,600px)] pointer-events-none">
        <Lottie
          animationData={animation.data}
          loop={false}
          autoplay
          onComplete={safeClose}
        />
      </div>
    </div>
  );
}
