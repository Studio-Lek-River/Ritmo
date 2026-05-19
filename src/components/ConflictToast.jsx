import { useEffect } from 'react';
import { AlertCircle, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function ConflictToast({ name, onDismiss }) {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = setTimeout(onDismiss, 5000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-amber-100 text-amber-900 border border-amber-300 rounded-xl px-4 py-3 shadow-lg max-w-xs">
      <AlertCircle size={16} className="flex-shrink-0 text-amber-600" />
      <span className="text-sm flex-1">
        {t('household.conflictToast', { name })}
      </span>
      <button onClick={onDismiss} className="flex-shrink-0 hover:text-amber-700">
        <X size={14} />
      </button>
    </div>
  );
}
