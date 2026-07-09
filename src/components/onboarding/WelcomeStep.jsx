import React, { useState } from 'react';
import { Check, HeartPulse, LayoutGrid } from 'lucide-react';
import RitmoLogo from '../RitmoLogo';
import { useTranslation } from '../../i18n/useTranslation';

// Startprofiel-keuze (H02): bepaalt of de onboarding de volledige wizard
// doorloopt ('full', default) of direct de vaste Ritmo-Health-startpreset
// seedt en de app in Health-modus opent ('health'). `onStart` geeft de
// gekozen waarde door aan OnboardingView.
const PROFILES = [
  { id: 'full',   icon: LayoutGrid, color: 'blue' },
  { id: 'health', icon: HeartPulse, color: 'pink' },
];

export default function WelcomeStep({ onStart, theme, darkMode }) {
  const { t } = useTranslation();
  const [profile, setProfile] = useState('full');

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

      <div className="text-left mb-6">
        <p className={`${theme.textSecondary} font-medium text-sm mb-2`}>
          {t('onboarding.profile.title')}
        </p>
        <div className="grid grid-cols-1 gap-2">
          {PROFILES.map(({ id, icon: Icon, color }) => {
            const selected = profile === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setProfile(id)}
                aria-pressed={selected}
                className={`w-full text-left rounded-xl border-2 p-3 transition ${
                  selected
                    ? `border-${color}-400 bg-${color}-50 ${darkMode ? 'bg-opacity-10' : ''}`
                    : `${theme.border} ${theme.cardSecondary}`
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 ${selected ? `text-${color}-500` : theme.textMuted}`} />
                  <div className="flex-1">
                    <div className={`font-medium text-sm ${selected ? theme.textSecondary : theme.textMuted}`}>
                      {t(`onboarding.profile.${id}.title`)}
                    </div>
                    <div className={`text-xs ${theme.textMuted}`}>
                      {t(`onboarding.profile.${id}.description`)}
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selected ? `bg-${color}-500 border-${color}-500` : 'border-slate-300'
                  }`}>
                    {selected && <Check className="w-3 h-3 text-white" />}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={() => onStart(profile)}
        className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition"
      >
        {t('onboarding.start')}
      </button>
    </div>
  );
}
