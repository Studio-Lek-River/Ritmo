import React from 'react';
import RitmoLogo from '../RitmoLogo';
import { useTranslation } from '../../i18n/useTranslation';

export default function WelcomeStep({ onStart, theme, darkMode }) {
  const { t } = useTranslation();
  return (
    <div className="text-center">
      <div className="flex justify-center mb-5">
        <RitmoLogo
          size={120}
          variant={darkMode ? 'light' : 'dark'}
          animated="splash"
        />
      </div>
      <h1 className={`text-3xl font-bold ${theme.text} mb-1`}>
        {t('onboarding.welcome')}
      </h1>
      <p className={`${theme.textSecondary} mb-4 italic`}>
        {t('onboarding.tagline')}
      </p>
      <p className={`${theme.textMuted} mb-6 text-sm`}>
        {t('onboarding.intro')}
      </p>
      <button
        onClick={onStart}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition"
      >
        {t('onboarding.start')}
      </button>
    </div>
  );
}
