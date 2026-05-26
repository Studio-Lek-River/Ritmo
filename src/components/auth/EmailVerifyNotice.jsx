import { useState } from 'react';
import { Mail } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { resendVerification } from '../../sync/auth';
import { translateAuthError } from '../../utils/authErrors';

export default function EmailVerifyNotice({ theme, email, onUseOtherEmail }) {
  const { t } = useTranslation();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  const [error, setError] = useState(null);

  async function handleResend() {
    setResending(true);
    setError(null);
    try {
      await resendVerification(email);
      setResent(true);
    } catch (err) {
      setError(translateAuthError(err, t));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className={`${theme.cardSecondary} rounded-2xl p-4 flex gap-3`}>
        <Mail size={20} className="text-indigo-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className={`font-medium ${theme.textSecondary}`}>{t('auth.verifyEmailTitle')}</p>
          <p className={`text-sm ${theme.textMuted}`}>
            {t('auth.verifyEmailBody', { email })}
          </p>
        </div>
      </div>

      <div className={`text-sm ${theme.textMuted} space-y-1`}>
        <p className="font-medium">{t('auth.noMailReceived')}</p>
        <p>
          {t('auth.checkSpam')}{' '}
          <button
            type="button"
            disabled={resending || resent}
            onClick={handleResend}
            className="text-indigo-500 hover:underline disabled:opacity-50"
          >
            {resent ? t('auth.checkInboxTitle') : t('auth.resendVerification')}
          </button>
        </p>
        {error && <p className="text-red-500">{error}</p>}
      </div>

      <button
        type="button"
        onClick={onUseOtherEmail}
        className={`w-full py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} hover:opacity-80 transition`}
      >
        {t('auth.useOtherEmail')}
      </button>
    </div>
  );
}
