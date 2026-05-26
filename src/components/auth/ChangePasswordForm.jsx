import { useState } from 'react';
import { useTranslation } from '../../i18n/useTranslation';
import { signInWithPassword, updatePassword } from '../../sync/auth';
import { translateAuthError } from '../../utils/authErrors';
import { validatePassword } from '../../utils/passwordValidation';
import PasswordRequirements from './PasswordRequirements';

const inputClass = (theme) =>
  `w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
    theme?.card === 'bg-slate-900'
      ? 'bg-slate-800 border-slate-700 text-white'
      : 'bg-white border-slate-200 text-slate-900'
  }`;

export default function ChangePasswordForm({ theme, email, hasPassword, onSaved, onCancel }) {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const newValid = validatePassword(newPassword).valid;
  const canSubmit = newValid && (!hasPassword || currentPassword.length > 0) && !loading;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      if (hasPassword) {
        try {
          await signInWithPassword(email, currentPassword);
        } catch {
          throw new Error('wrong_current_password');
        }
      }
      await updatePassword(newPassword);
      setSaved(true);
      onSaved?.();
    } catch (err) {
      if (err?.message === 'wrong_current_password') {
        setError(t('auth.wrongCurrentPassword'));
      } else {
        setError(translateAuthError(err, t));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <h3 className={`font-semibold ${theme.textSecondary}`}>{t('auth.changePassword')}</h3>

      <form onSubmit={handleSubmit} className="space-y-3">
        {hasPassword && (
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>
              {t('auth.currentPassword')}
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass(theme)}
            />
          </div>
        )}

        <div>
          <label className={`block text-sm font-medium mb-1 ${theme.textMuted}`}>
            {t('auth.newPassword')}
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            placeholder={t('auth.passwordPlaceholder')}
            autoComplete="new-password"
            className={inputClass(theme)}
          />
        </div>

        <PasswordRequirements password={newPassword} theme={theme} />

        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-green-500">{t('auth.passwordChanged')}</p>}

        <div className="flex gap-2">
          <button
            type="submit"
            disabled={!canSubmit}
            className="flex-1 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? '...' : t('auth.savePassword')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} hover:opacity-80 transition`}
          >
            {t('auth.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
}
