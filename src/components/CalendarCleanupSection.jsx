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
import { scanOutlookRitmoBlocks, cleanupOutlookRitmoBlocks, startOutlookConnect } from '../sync/connections';
import { ERROR_KEYS } from './ConnectionsSection';
import ConfirmDialog from './ConfirmDialog';

// Client-cap op het aantal opruim-rondes per klik: één ronde ruimt maximaal
// CLEANUP_DELETE_BATCH (server, cleanup.js) events op. 25 rondes is dus 5000
// events per klik — ruim boven wat een reële mailbox aan Ritmo-blokken bevat
// zonder dat de knop bij een onverwacht grote mailbox eindeloos doorloopt
// (AC6): wordt de cap geraakt, dan meldt de toast dat opnieuw klikken de rest
// opruimt, nooit stilzwijgend "klaar".
const MAX_CLEANUP_ROUNDS = 25;

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

    let totalDeleted = 0;
    let totalFailed = 0;
    let more = true;
    let capped = false;

    try {
      for (let round = 0; round < MAX_CLEANUP_ROUNDS && more; round += 1) {
        // eslint-disable-next-line no-await-in-loop
        const result = await cleanupOutlookRitmoBlocks();
        totalDeleted += result?.deleted || 0;
        totalFailed += result?.failed || 0;
        setDeletedSoFar(totalDeleted);
        more = !!result?.more;
      }
      capped = more;
    } catch (err) {
      setBusy(false);
      reportError(err);
      if (totalDeleted > 0) onCleaned?.();
      return;
    }

    setBusy(false);
    if (totalFailed > 0) {
      showToast({ message: t('settings.calendarCleanupPartial', { deleted: totalDeleted, failed: totalFailed }) });
    } else if (capped) {
      showToast({ message: t('settings.calendarCleanupMore') });
    } else {
      showToast({ message: t('settings.calendarCleanupDone', { deleted: totalDeleted }) });
    }
    if (totalDeleted > 0) onCleaned?.();
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
