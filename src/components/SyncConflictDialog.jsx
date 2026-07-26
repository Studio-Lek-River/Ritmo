import React, { useEffect } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { parseDateKey, formatDaySubtitle } from '../utils/dates';

function labelForKey(key, t) {
  if (key === 'settings') return t('sync.conflict.itemSettings');
  if (key === 'nutrition:library') return t('sync.conflict.itemNutrition');
  if (key.startsWith('day:')) {
    const date = parseDateKey(key.slice(4));
    return t('sync.conflict.itemDay', { date: formatDaySubtitle(date) });
  }
  return key;
}

export default function SyncConflictDialog({ open, conflicts, onResolve, theme }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  if (!open || !conflicts || conflicts.length === 0) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className={`${theme.card} rounded-2xl p-5 shadow-lg max-w-sm w-full slide-in`}>
        <h3 className={`text-base font-semibold ${theme.textSecondary} mb-2`}>
          {t('sync.conflict.title')}
        </h3>
        <p className={`text-sm ${theme.textMuted} mb-3`}>
          {t('sync.conflict.description')}
        </p>
        <ul className={`text-sm ${theme.textSecondary} mb-5 pl-4 list-disc space-y-1`}>
          {conflicts.map((c) => (
            <li key={c.key}>{labelForKey(c.key, t)}</li>
          ))}
        </ul>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={() => onResolve('local')}
            className={`px-3 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} transition`}
          >
            {t('sync.conflict.keepLocal')}
          </button>
          <button
            type="button"
            onClick={() => onResolve('cloud')}
            className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition"
          >
            {t('sync.conflict.keepCloud')}
          </button>
        </div>
      </div>
    </div>
  );
}
