import React, { useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation';

export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  variant = 'default',
  onConfirm,
  onCancel,
  theme,
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onCancel?.();
      if (e.key === 'Enter') onConfirm?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onConfirm, onCancel]);

  if (!open) return null;

  const confirmClass = variant === 'danger'
    ? 'bg-red-500 hover:bg-red-600 text-white'
    : 'bg-blue-500 hover:bg-blue-600 text-white';

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onCancel}
    >
      <div
        className={`${theme.card} rounded-2xl p-5 shadow-lg max-w-sm w-full slide-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-base font-semibold ${theme.textSecondary} mb-2`}>{title}</h3>
        {description && (
          <p className={`text-sm ${theme.textMuted} mb-5`}>{description}</p>
        )}
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} transition`}
          >
            {cancelLabel || t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`px-3 py-2 rounded-lg text-sm font-medium transition ${confirmClass}`}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
