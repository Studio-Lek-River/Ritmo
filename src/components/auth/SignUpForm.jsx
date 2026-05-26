import { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { signUpWithPassword } from '../../sync/auth';
import { translateAuthError } from '../../utils/authErrors';
import { validatePassword } from '../../utils/passwordValidation';
import PasswordRequirements from './PasswordRequirements';

const inputClass = (theme) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
    theme?.card === 'bg-slate-900'
      ? 'bg-slate-800 border-slate-700 text-white'
      : 'bg-white border-slate-200 text-slate-900'
  }`;

export default function SignUpForm({ theme, onSubmitted, onBackToSignIn }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pwValid = validatePassword(password).valid;
  const canSubmit = email.trim() && pwValid && !loading;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await signUpWithPassword(email.trim(), password);
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
        <h3 className={`font-semibold ${theme.textSecondary}`}>{t('auth.signUpTitle')}</h3>
        <p className={`text-sm ${theme.textMuted}`}>{t('auth.signUpDescription')}</p>
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
          <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>
            {t('auth.choosePassword')}
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete="new-password"
            className={inputClass(theme)}
          />
        </div>

        <PasswordRequirements password={password} theme={theme} />

        {error && <p className="text-sm text-red-500">{error}</p>}

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
        >
          {loading ? '...' : t('auth.createAccount')}
        </button>
      </form>

      <div className={`text-sm ${theme.textMuted}`}>
        {t('auth.alreadyAccount')}{' '}
        <button
          type="button"
          onClick={onBackToSignIn}
          className="text-indigo-500 hover:underline font-medium"
        >
          {t('auth.signIn')}
        </button>
      </div>
    </div>
  );
}
