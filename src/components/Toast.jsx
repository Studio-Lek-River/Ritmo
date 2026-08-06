import React from 'react';
import { useToast } from '../hooks/useToast';

export default function Toast({ theme }) {
  const { toasts, dismiss } = useToast();
  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[60] px-4 w-full max-w-sm pointer-events-none flex flex-col gap-2">
      {toasts.map((toast) => {
        const handleAction = () => {
          toast.onAction?.();
          dismiss(toast.id);
        };

        return (
          <div
            key={toast.id}
            className={`${theme.card} rounded-xl shadow-lg border ${theme.border} px-4 py-3 flex items-center justify-between gap-3 pointer-events-auto slide-in`}
          >
            {/* Geen `truncate`: een toast die zijn eigen boodschap afkapt is
                geen toast. "Melk verwijderd — 66 kcal en 100 ml" past niet op
                één regel naast de actieknop, en juist de staart draagt de
                informatie. Twee regels is de bovengrens, zodat een lange
                zelfgekozen naam de toast niet laat uitgroeien. */}
            <span className={`text-sm ${theme.textSecondary} flex-1 min-w-0 break-words line-clamp-2`}>{toast.message}</span>
            {toast.actionLabel && toast.onAction && (
              <button
                type="button"
                onClick={handleAction}
                className="text-sm font-medium text-blue-500 hover:text-blue-600 transition shrink-0"
              >
                {toast.actionLabel}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
