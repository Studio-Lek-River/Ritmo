import { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { sendPasswordReset } from '../../sync/auth';
import { translateAuthError } from '../../utils/authErrors';

const inputClass = (theme) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
    theme?.card === 'bg-slate-900'
      ? 'bg-slate-800 border-slate-700 text-white'
      : 'bg-white border-slate-200 text-slate-900'
  }`;

export default function ForgotPasswordForm({ theme, onSubmitted, onBackToSignIn }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await sendPasswordReset(email.trim());
      onSubmitted?.(email.trim());
    } catch (err) {
      setError(translateAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className={`font-semibold ${theme.textSecondary}`}>{t('auth.forgotPasswordTitle')}</h3>
        <p className={`text-sm ${theme.textMuted}`}>{t('auth.forgotPasswordDescription')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>
            {t('auth.emailLabel')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoFocus
            autoComplete="email"
            className={inputClass(theme)}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? '...' : t('auth.sendResetLink')}
        </button>
      </form>

      <button
        type="button"
        onClick={onBackToSignIn}
        className={`text-sm text-indigo-500 hover:underline`}
      >
        {t('auth.backToSignIn')}
      </button>
    </div>
  );
}
