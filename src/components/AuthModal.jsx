import { useState, useEffect } from 'react';
import { Mail, X } from 'lucide-react';
import { sendMagicLink, onAuthChange } from '../sync/auth';
import { useTranslation } from '../i18n/useTranslation';

export default function AuthModal({ onClose, onAuthenticated, theme, redirectTo }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const unsub = onAuthChange(user => {
      if (user) {
        onAuthenticated?.(user);
        onClose?.();
      }
    });
    return unsub;
  }, [onAuthenticated, onClose]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await sendMagicLink(email.trim(), redirectTo);
      setSent(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl ${theme?.card || 'bg-white'}`}>
        <div className="flex items-center justify-between mb-4">
          <h2 className={`text-lg font-semibold ${theme?.text || 'text-slate-900'}`}>
            {t('auth.signInTitle')}
          </h2>
          {onClose && (
            <button onClick={onClose} className={`p-1 rounded ${theme?.hover || 'hover:bg-slate-100'}`}>
              <X size={20} className={theme?.textMuted || 'text-slate-500'} />
            </button>
          )}
        </div>

        {sent ? (
          <div className="text-center py-4">
            <Mail size={40} className="mx-auto mb-3 text-indigo-500" />
            <p className={`font-medium ${theme?.text || 'text-slate-900'}`}>
              {t('auth.checkMailbox')}
            </p>
            <p className={`text-sm mt-1 ${theme?.textMuted || 'text-slate-500'}`}>{email}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-1 ${theme?.textMuted || 'text-slate-600'}`}>
                {t('auth.emailLabel')}
              </label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
                className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
                  theme?.card === 'bg-slate-900'
                    ? 'bg-slate-800 border-slate-700 text-white'
                    : 'bg-white border-slate-200 text-slate-900'
                }`}
              />
            </div>
            {error && (
              <p className="text-sm text-red-500">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !email.trim()}
              className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {loading ? '...' : t('auth.sendLink')}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
