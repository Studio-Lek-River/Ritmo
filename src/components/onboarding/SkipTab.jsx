import React from 'react';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

export default function SkipTab({ theme }) {
  const { t } = useTranslation();
  return (
    <div className={`${theme.cardSecondary} rounded-xl p-5 text-center mb-2`}>
      <Sparkles className={`w-8 h-8 mx-auto mb-2 ${theme.textMuted}`} />
      <p className={`${theme.textSecondary} text-sm`}>
        {t('onboarding.skipTab.description')}
      </p>
    </div>
  );
}
