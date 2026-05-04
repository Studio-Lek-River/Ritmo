import React from 'react';
import { useToast } from '../hooks/useToast';

export default function Toast({ theme }) {
  const { toast, dismiss } = useToast();
  if (!toast) return null;

  const handleAction = () => {
    toast.onAction?.();
    dismiss();
  };

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 px-4 w-full max-w-sm pointer-events-none">
      <div
        className={`${theme.card} rounded-xl shadow-lg border ${theme.border} px-4 py-3 flex items-center justify-between gap-3 pointer-events-auto slide-in`}
      >
        <span className={`text-sm ${theme.textSecondary} flex-1 truncate`}>{toast.message}</span>
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
    </div>
  );
}
