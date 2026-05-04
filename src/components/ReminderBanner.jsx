import React from 'react';
import { Info, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function ReminderBanner({ message, onDismiss }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-sm text-blue-900 dark:text-blue-100 mb-3">
      <Info className="w-4 h-4 mt-0.5 shrink-0" />
      <div className="flex-1">{message}</div>
      <button
        onClick={onDismiss}
        aria-label={t('common.close')}
        className="text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 -mt-0.5"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
