import React from 'react';

const PERIODS = [
  { id: '7', labelKey: '7days' },
  { id: '30', labelKey: '30days' },
  { id: '90', labelKey: '90days' },
  { id: 'all', labelKey: 'all' },
];

export default function InsightHeader({ period, setPeriod, theme, t }) {
  return (
    <div className={`${theme.card} rounded-xl p-1 shadow-sm mb-4 flex gap-1`}>
      {PERIODS.map(p => {
        const active = p.id === period;
        return (
          <button
            key={p.id}
            onClick={() => setPeriod(p.id)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              active ? 'bg-blue-500 text-white shadow' : `${theme.textMuted} ${theme.hover}`
            }`}
          >
            {t(`insight.period.${p.labelKey}`)}
          </button>
        );
      })}
    </div>
  );
}
