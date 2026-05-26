import { Mail } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

export default function MailSentNotice({ theme, email, onUseOtherEmail }) {
  const { t } = useTranslation();

  return (
    <div className="space-y-3">
      <div className={`${theme.cardSecondary} rounded-2xl p-4 flex gap-3`}>
        <Mail size={20} className="text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className={`font-medium ${theme.textSecondary}`}>{t('auth.checkInboxTitle')}</p>
          <p className={`text-sm ${theme.textMuted}`}>
            {t('auth.checkInboxBody', { email })}
          </p>
        </div>
      </div>
      {onUseOtherEmail && (
        <button
          type="button"
          onClick={onUseOtherEmail}
          className={`w-full py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} hover:opacity-80 transition`}
        >
          {t('auth.useOtherEmailButton')}
        </button>
      )}
    </div>
  );
}
