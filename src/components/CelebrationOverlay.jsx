import { useEffect } from 'react';
import Lottie from 'lottie-react';
import { getCelebrationAnimation } from '../utils/celebrations';

export default function CelebrationOverlay({ animationId, onClose }) {
  const animation = getCelebrationAnimation(animationId);

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  if (!animation) return null;

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 cursor-pointer"
    >
      <div className="w-[min(90vw,600px)] pointer-events-none">
        <Lottie
          animationData={animation.data}
          loop={false}
          autoplay
          onComplete={onClose}
        />
      </div>
    </div>
  );
}
