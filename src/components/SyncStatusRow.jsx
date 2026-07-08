import { useState } from 'react';
import { Check, RefreshCw, Clock, CloudOff, AlertTriangle, Smartphone } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useSyncStatus } from '../hooks/useSyncStatus';
import { isSyncEnabled } from '../sync/supabase';
import { flushQueue } from '../sync/flush';
import { pullUserData } from '../sync/userDataStorage';

const ICONS = {
  synced: { Icon: Check, color: 'text-teal-500' },
  syncing: { Icon: RefreshCw, color: 'text-blue-500', spin: true },
  pending: { Icon: Clock, color: 'text-amber-500' },
  offline: { Icon: CloudOff, color: 'text-slate-400' },
  error: { Icon: AlertTriangle, color: 'text-red-500' },
  localOnly: { Icon: Smartphone, color: 'text-slate-400' },
};

function lastSyncedLabel(t, lastSyncedAt) {
  if (!lastSyncedAt) return null;
  const minutes = Math.floor((Date.now() - lastSyncedAt) / 60_000);
  if (minutes <= 0) return t('sync.status.lastJustNow');
  return t('sync.status.lastMinutes', { n: minutes });
}

export default function SyncStatusRow({ theme, signedIn, userId }) {
  const { t } = useTranslation();
  const { status, pending, lastSyncedAt } = useSyncStatus({ signedIn });
  const [busy, setBusy] = useState(false);

  const { Icon, color, spin } = ICONS[status] ?? ICONS.localOnly;

  let label;
  if (status === 'pending') {
    label = t(pending === 1 ? 'sync.status.pending' : 'sync.status.pendingPlural', { n: pending });
  } else {
    label = t(`sync.status.${status}`);
  }

  const last = status === 'synced' ? lastSyncedLabel(t, lastSyncedAt) : null;
  const showSignInHint = status === 'localOnly' && isSyncEnabled() && !signedIn;

  async function handleSyncNow() {
    if (busy) return;
    setBusy(true);
    try {
      if (userId) await pullUserData(userId); // pull + push, voedt status zelf
      await flushQueue();
    } finally {
      setBusy(false);
    }
  }

  const canSyncNow = isSyncEnabled() && signedIn && status !== 'syncing';

  return (
    <div className={`${theme.cardSecondary} rounded-2xl p-3 space-y-2`}>
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon size={18} className={`${color} ${spin ? 'animate-spin' : ''} shrink-0`} />
          <span className={`text-sm ${theme.textSecondary} truncate`}>
            {label}
            {last && <span className={theme.textMuted}> · {last}</span>}
          </span>
        </div>

        {canSyncNow && (
          <button
            type="button"
            onClick={handleSyncNow}
            disabled={busy}
            className={`text-xs font-medium shrink-0 ${
              status === 'error' ? 'text-red-500' : theme.textMuted
            } hover:underline disabled:opacity-50`}
          >
            {status === 'error' ? t('sync.status.retry') : t('sync.status.syncNow')}
          </button>
        )}
      </div>

      {showSignInHint && (
        <p className={`text-xs ${theme.textMuted}`}>{t('sync.status.signInHint')}</p>
      )}
    </div>
  );
}
