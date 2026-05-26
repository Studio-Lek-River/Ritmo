import { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { updatePassword } from '../../sync/auth';
import { translateAuthError } from '../../utils/authErrors';
import { validatePassword } from '../../utils/passwordValidation';
import PasswordRequirements from './PasswordRequirements';

const inputClass = (theme) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
    theme?.card === 'bg-slate-900'
      ? 'bg-slate-800 border-slate-700 text-white'
      : 'bg-white border-slate-200 text-slate-900'
  }`;

export default function PasswordPrompt({ theme, onSet, onDismiss }) {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const canSubmit = validatePassword(password).valid && !loading;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      await updatePassword(password);
      onSet?.();
    } catch (err) {
      setError(translateAuthError(err, t));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h3 className={`font-semibold ${theme.textSecondary}`}>{t('auth.promptSetPasswordTitle')}</h3>
        <p className={`text-sm ${theme.textMuted}`}>{t('auth.promptSetPasswordDescription')}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
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

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? '...' : t('auth.setPassword')}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} hover:opacity-80 transition`}
          >
            {t('auth.doLater')}
          </button>
        </div>
      </form>
    </div>
  );
}
