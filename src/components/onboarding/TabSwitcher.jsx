import React from 'react';
import { useTranslation } from '../../i18n/useTranslation';

const TABS = ['presets', 'custom', 'skip'];

export default function TabSwitcher({ value, onChange, theme }) {
  const { t } = useTranslation();
  return (
    <div className={`flex gap-1 p-1 rounded-xl ${theme.cardSecondary} mb-4`}>
      {TABS.map(tab => {
        const active = value === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              active
                ? 'bg-blue-500 text-white'
                : `${theme.textMuted} hover:${theme.text}`
            }`}
          >
            {t(`onboarding.tabs.${tab}`)}
          </button>
        );
      })}
    </div>
  );
}
