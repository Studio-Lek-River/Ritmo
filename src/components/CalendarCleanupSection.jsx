// Opruimknop voor alle Ritmo-blokken (S12/#155) — een vangnet los van "Zet in
// agenda" (dat per dag werkt, zie App.jsx's handleWriteDayToCalendar). Alleen
// gerenderd door SettingsModal wanneer Outlook verbonden is (`outlookConnected`
// in App.jsx), onder de bestemmings-checkboxes van settings.calendarWrite*.
//
// SettingsModal wordt gerenderd binnen <ToastProvider> (App.jsx:3393/3709),
// dus dit component gebruikt useToast() rechtstreeks — geen `notify`-prop
// zoals bij de write-handlers in App.jsx.
import { useState } from 'react';
import { Trash2, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useToast } from '../hooks/useToast';
import { scanOutlookRitmoBlocks, startOutlookConnect } from '../sync/connections';
import { runCalendarCleanup } from '../utils/calendarCleanup';
import { ERROR_KEYS } from './ConnectionsSection';
import ConfirmDialog from './ConfirmDialog';

export default function CalendarCleanupSection({ theme, onCleaned }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deletedSoFar, setDeletedSoFar] = useState(0);
  const [pendingScan, setPendingScan] = useState(null); // { count, atLeast } | null
  const [confirmOpen, setConfirmOpen] = useState(false);

  function reportError(err) {
    if (err?.code === 'scope_upgrade_required') {
      showToast({
        message: t('connections.errors.scopeUpgradeRequired'),
        actionLabel: t('planner.calendar.reconnect'),
        onAction: () => startOutlookConnect(),
      });
      return;
    }
    const key = ERROR_KEYS[err?.code] || 'connections.errors.unexpected';
    showToast({ message: `${t('settings.calendarCleanupFailed')} ${t(key)}` });
  }

  async function handleScanClick() {
    setScanning(true);
    try {
      const result = await scanOutlookRitmoBlocks();
      setScanning(false);
      if (!result?.count) {
        showToast({ message: t('settings.calendarCleanupNone') });
        return;
      }
      setPendingScan({ count: result.count, atLeast: !!result.atLeast });
      setConfirmOpen(true);
    } catch (err) {
      setScanning(false);
      reportError(err);
    }
  }

  async function handleConfirmCleanup() {
    setConfirmOpen(false);
    setPendingScan(null);
    setBusy(true);
    setDeletedSoFar(0);

    let result;
    try {
      result = await runCalendarCleanup({ onProgress: ({ deleted }) => setDeletedSoFar(deleted) });
    } catch (err) {
      setBusy(false);
      reportError(err);
      if (err.deleted > 0) onCleaned?.();
      return;
    }

    setBusy(false);
    if (result.failed > 0) {
      showToast({ message: t('settings.calendarCleanupPartial', { deleted: result.deleted, failed: result.failed }) });
    } else if (result.capped) {
      showToast({ message: t('settings.calendarCleanupMore') });
    } else {
      showToast({ message: t('settings.calendarCleanupDone', { deleted: result.deleted }) });
    }
    if (result.deleted > 0) onCleaned?.();
  }

  const busyLabel = scanning
    ? t('settings.calendarCleanupScanning')
    : busy
    ? t('settings.calendarCleanupBusy', { deleted: deletedSoFar })
    : t('settings.calendarCleanupButton');

  return (
    <div className={`mt-6 pt-6 border-t ${theme.border}`}>
      <h3 className={`font-semibold ${theme.textSecondary} mb-1`}>{t('settings.calendarCleanup')}</h3>
      <p className={`text-xs ${theme.textMuted} mb-3`}>{t('settings.calendarCleanupHint')}</p>

      <button
        type="button"
        onClick={handleScanClick}
        disabled={scanning || busy}
        aria-busy={scanning || busy}
        className={`flex items-center gap-2 px-3 py-2 ${theme.radiusControl} text-sm font-medium border border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 disabled:opacity-60 w-fit`}
      >
        {scanning || busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
        {busyLabel}
      </button>

      <ConfirmDialog
        open={confirmOpen}
        variant="danger"
        title={t('settings.calendarCleanupConfirmTitle')}
        description={t(
          pendingScan?.atLeast ? 'settings.calendarCleanupConfirmBodyAtLeast' : 'settings.calendarCleanupConfirmBody',
          { count: pendingScan?.count ?? 0 }
        )}
        confirmLabel={t('settings.calendarCleanupConfirm')}
        onConfirm={handleConfirmCleanup}
        onCancel={() => {
          setConfirmOpen(false);
          setPendingScan(null);
        }}
        theme={theme}
      />
    </div>
  );
}
