import { useRef, useState } from 'react';
import { Download, Upload } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { downloadBackup, importData, readFileAsText } from '../utils/backup';
import ConfirmDialog from './ConfirmDialog';
import { useToast } from '../hooks/useToast';

export default function BackupSection({ theme }) {
  const { t } = useTranslation();
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  async function handleExport() {
    try {
      setBusy(true);
      await downloadBackup();
      showToast({ message: t('backup.exportSuccess') });
    } catch {
      showToast({ message: t('backup.importErrorGeneric') });
    } finally {
      setBusy(false);
    }
  }

  function handlePickFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    setPendingFile(file);
    setConfirming(true);
    event.target.value = '';
  }

  async function handleConfirmImport() {
    if (!pendingFile) return;
    setBusy(true);
    setConfirming(false);
    try {
      const text = await readFileAsText(pendingFile);
      const result = await importData(text);
      const message = `${t('backup.importSuccess')} ${t('backup.importDays').replace('{count}', String(result.daysRestored))}`;
      showToast({ message });
      setTimeout(() => window.location.reload(), 800);
    } catch (err) {
      const code = err && err.message;
      const messageKey =
        code === 'parse_failed'
          ? 'backup.importErrorParse'
          : code === 'not_ritmo'
          ? 'backup.importErrorNotRitmo'
          : code === 'newer_version'
          ? 'backup.importErrorVersion'
          : 'backup.importErrorGeneric';
      showToast({ message: t(messageKey) });
    } finally {
      setBusy(false);
      setPendingFile(null);
    }
  }

  return (
    <section className="space-y-2">
      <h3 className={`font-medium ${theme.textSecondary}`}>{t('backup.settingsHeader')}</h3>
      <p className={`text-sm ${theme.textMuted}`}>{t('backup.settingsBody')}</p>

      <div className="flex flex-col gap-2 pt-1">
        <button
          onClick={handleExport}
          disabled={busy}
          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 w-fit"
        >
          <Download className="w-4 h-4" />
          {t('backup.exportButton')}
        </button>

        <button
          onClick={() => fileInputRef.current && fileInputRef.current.click()}
          disabled={busy}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${theme.border} text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-60 w-fit ${theme.textSecondary}`}
        >
          <Upload className="w-4 h-4" />
          {t('backup.importButton')}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          onChange={handlePickFile}
          className="hidden"
          aria-hidden="true"
        />
      </div>

      <ConfirmDialog
        open={confirming}
        variant="danger"
        title={t('backup.importConfirmTitle')}
        description={t('backup.importConfirmBody')}
        confirmLabel={t('backup.importConfirmAction')}
        cancelLabel={t('backup.importCancel')}
        onConfirm={handleConfirmImport}
        onCancel={() => {
          setConfirming(false);
          setPendingFile(null);
        }}
        theme={theme}
      />
    </section>
  );
}
