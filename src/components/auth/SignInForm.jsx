import { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { signInWithPassword } from '../../sync/auth';
import { translateAuthError } from '../../utils/authErrors';

const inputClass = (theme) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
    theme?.card === 'bg-slate-900'
      ? 'bg-slate-800 border-slate-700 text-white'
      : 'bg-white border-slate-200 text-slate-900'
  }`;

export default function SignInForm({ theme, onForgotPassword, onSignUp, onMagicLink }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signInWithPassword(email.trim(), password);
    } catch (err) {
      setError(translateAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className={`font-semibold ${theme.textSecondary}`}>{t('auth.sectionTitle')}</h3>
        <p className={`text-sm ${theme.textMuted}`}>{t('auth.sectionDescription')}</p>
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
            autoComplete="email"
            className={inputClass(theme)}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-sm font-medium ${theme.textMuted}`}>
              {t('auth.passwordLabel')}
            </label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-indigo-500 hover:underline"
            >
              {t('auth.forgotPassword')}
            </button>
          </div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className={inputClass(theme)}
          />
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password}
          className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? '...' : t('auth.signIn')}
        </button>
      </form>

      <div className={`text-sm ${theme.textMuted} flex flex-col gap-1`}>
        <div>
          {t('auth.noAccount')}{' '}
          <button
            type="button"
            onClick={onSignUp}
            className="text-indigo-500 hover:underline font-medium"
          >
            {t('auth.signUpInstead')}
          </button>
        </div>
        <button
          type="button"
          onClick={onMagicLink}
          className="text-indigo-500 hover:underline text-left"
        >
          {t('auth.useMagicLink')}
        </button>
      </div>
    </div>
  );
}
