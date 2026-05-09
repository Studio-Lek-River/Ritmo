import React from 'react';
import StepHeader from './StepHeader';
import { useTranslation } from '../../i18n/useTranslation';

// Placeholder voor de drie-tabs-stap. In commit 4 vervangen door volledige
// AreaStep met TabSwitcher + PresetTab/CustomTab/SkipTab.
export default function AreaStep({
  area, current, total, title, subtitle,
  onBack, onNext, onSkipAll, theme,
}) {
  const { t } = useTranslation();
  return (
    <div>
      <StepHeader
        current={current}
        total={total}
        title={title}
        onSkipAll={onSkipAll}
        theme={theme}
      />
      {subtitle && (
        <p className={`${theme.textMuted} text-sm mb-5`}>{subtitle}</p>
      )}
      <div className={`${theme.cardSecondary} rounded-xl p-4 mb-5`}>
        <p className={`${theme.textMuted} text-sm`}>
          {t('onboarding.placeholder', { area })}
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onBack}
          className={`px-4 py-3 ${theme.cardSecondary} ${theme.textSecondary} rounded-xl font-medium transition`}
        >
          {t('common.back')}
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition"
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}
