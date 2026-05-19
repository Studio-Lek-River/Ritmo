import { useState } from 'react';
import { Home, Users } from 'lucide-react';
import { createHousehold, redeemInvite } from '../sync/households';
import { useTranslation } from '../i18n/useTranslation';

export default function HouseholdSetupView({ currentUser, onSetupComplete, theme }) {
  const { t } = useTranslation();
  const [mode, setMode] = useState(null); // 'start' | 'join'
  const [householdName, setHouseholdName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleStart(e) {
    e.preventDefault();
    if (!householdName.trim() || !displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await createHousehold(householdName.trim(), displayName.trim());
      onSetupComplete?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e) {
    e.preventDefault();
    const cleanToken = token.trim().toUpperCase();
    if (!cleanToken || !displayName.trim()) return;
    setLoading(true);
    setError(null);
    try {
      await redeemInvite(cleanToken, displayName.trim());
      onSetupComplete?.();
    } catch (err) {
      const key = err.message === 'invite_used'
        ? 'auth.inviteUsed'
        : err.message === 'invite_expired' || err.message === 'invite_not_found'
          ? 'auth.inviteInvalid'
          : null;
      setError(key ? t(key) : err.message);
    } finally {
      setLoading(false);
    }
  }

  if (mode === 'start') {
    return (
      <div className="max-w-sm mx-auto py-8 px-4">
        <button onClick={() => setMode(null)} className={`text-sm mb-4 ${theme?.textMuted || 'text-slate-500'} hover:underline`}>
          &larr; {t('common.back')}
        </button>
        <h2 className={`text-xl font-semibold mb-6 ${theme?.text || 'text-slate-900'}`}>
          {t('household.startButton')}
        </h2>
        <form onSubmit={handleStart} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme?.textMuted || 'text-slate-600'}`}>
              {t('household.startHouseholdName')}
            </label>
            <input
              type="text"
              value={householdName}
              onChange={e => setHouseholdName(e.target.value)}
              required
              autoFocus
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
                theme?.card === 'bg-slate-900' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme?.textMuted || 'text-slate-600'}`}>
              {t('household.startDisplayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
                theme?.card === 'bg-slate-900' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
              }`}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !householdName.trim() || !displayName.trim()}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? '...' : t('household.startButton')}
          </button>
        </form>
      </div>
    );
  }

  if (mode === 'join') {
    return (
      <div className="max-w-sm mx-auto py-8 px-4">
        <button onClick={() => setMode(null)} className={`text-sm mb-4 ${theme?.textMuted || 'text-slate-500'} hover:underline`}>
          &larr; {t('common.back')}
        </button>
        <h2 className={`text-xl font-semibold mb-6 ${theme?.text || 'text-slate-900'}`}>
          {t('household.joinButton')}
        </h2>
        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme?.textMuted || 'text-slate-600'}`}>
              {t('household.joinTokenLabel')}
            </label>
            <input
              type="text"
              value={token}
              onChange={e => setToken(e.target.value.toUpperCase())}
              required
              autoFocus
              placeholder="ABCD1234"
              maxLength={8}
              className={`w-full rounded-lg border px-3 py-2 text-sm font-mono uppercase outline-none focus:ring-2 focus:ring-indigo-400 ${
                theme?.card === 'bg-slate-900' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
              }`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium mb-1 ${theme?.textMuted || 'text-slate-600'}`}>
              {t('household.joinDisplayName')}
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setDisplayName(e.target.value)}
              required
              className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 ${
                theme?.card === 'bg-slate-900' ? 'bg-slate-800 border-slate-700 text-white' : 'bg-white border-slate-200'
              }`}
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading || !token.trim() || !displayName.trim()}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
          >
            {loading ? '...' : t('household.joinButton')}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-sm mx-auto py-8 px-4 text-center">
      <h2 className={`text-xl font-semibold mb-2 ${theme?.text || 'text-slate-900'}`}>
        {t('household.setupTitle')}
      </h2>
      <p className={`text-sm mb-8 ${theme?.textMuted || 'text-slate-500'}`}>
        {currentUser?.email}
      </p>
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setMode('start')}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 transition"
        >
          <Home size={20} />
          <span>{t('household.startButton')}</span>
        </button>
        <button
          onClick={() => setMode('join')}
          className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl border font-medium transition ${
            theme?.card === 'bg-slate-900'
              ? 'border-slate-700 text-white hover:bg-slate-800'
              : 'border-slate-200 text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Users size={20} />
          <span>{t('household.joinButton')}</span>
        </button>
      </div>
    </div>
  );
}
