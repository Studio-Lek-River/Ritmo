import React from 'react';
import { X } from 'lucide-react';
import { METRIC_LIBRARY } from '../utils/metricLibrary';
import { ICON_OPTIONS } from '../utils/icons';

export default function MetricLibraryModal({ onPick, onClose, theme, t }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`w-full max-w-sm ${theme.card} rounded-2xl shadow-xl`}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div>
            <h3 className={`font-semibold ${theme.text}`}>{t('modules.measurements.libraryTitle')}</h3>
            <p className={`text-xs ${theme.textMuted} mt-0.5`}>{t('modules.measurements.libraryIntro')}</p>
          </div>
          <button
            onClick={onClose}
            className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted}`}
            aria-label="Sluiten"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="px-3 pb-4 grid grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {METRIC_LIBRARY.map(entry => {
            const IconComp = ICON_OPTIONS[entry.icon];
            return (
              <button
                key={entry.key}
                onClick={() => onPick(entry.key)}
                className={`flex items-center gap-2 px-3 py-2.5 ${theme.cardSecondary} ${theme.hover} rounded-xl text-left transition`}
              >
                {IconComp && <IconComp className={`w-4 h-4 flex-shrink-0 ${theme.textMuted}`} />}
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${theme.textSecondary} truncate`}>{t(entry.nameKey)}</p>
                  <p className={`text-[11px] ${theme.textMuted}`}>{entry.unit}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
