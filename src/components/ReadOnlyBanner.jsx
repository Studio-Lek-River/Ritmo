import React from 'react';
import { Eye } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function ReadOnlyBanner({ theme }) {
  const { t } = useTranslation();
  return (
    <div className={`flex items-center gap-2 ${theme.cardSecondary} rounded-md px-3 py-2 text-xs ${theme.textMuted} mb-4`}>
      <Eye className="w-3.5 h-3.5 shrink-0" />
      <span>{t('banners.readOnly')}</span>
    </div>
  );
}
