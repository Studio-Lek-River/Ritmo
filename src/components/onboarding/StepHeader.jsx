import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';

// Header bovenaan elke onboarding-stap. Toont voortgang (n van totaal),
// een titel, en een 'overslaan'-link rechtsboven die direct naar de
// afrondings-stap springt.
export default function StepHeader({ current, total, title, onSkipAll, theme }) {
  const { t } = useTranslation();
  const dots = Array.from({ length: total }, (_, i) => i);

  return (
    <div className="mb-5">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs ${theme.textMuted}`}>
          {t('onboarding.progress', { current, total })}
        </span>
        {onSkipAll && (
          <button
            onClick={onSkipAll}
            className={`text-xs ${theme.textMuted} underline hover:opacity-80`}
          >
            {t('onboarding.skipAll')}
          </button>
        )}
      </div>
      <div className="flex gap-1.5 mb-4">
        {dots.map(i => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition ${
              i < current ? 'bg-blue-500' : i === current - 1 ? 'bg-blue-400' : `${theme.progressBg}`
            }`}
          />
        ))}
      </div>
      {title && (
        <h2 className={`text-2xl font-bold ${theme.text}`}>{title}</h2>
      )}
    </div>
  );
}
