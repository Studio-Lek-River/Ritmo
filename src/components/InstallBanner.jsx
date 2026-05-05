import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import {
  isStandalone,
  isIOS,
  onPromptAvailableChange,
  triggerInstallPrompt,
} from '../utils/install';

export default function InstallBanner({ onDismiss }) {
  const { t } = useTranslation();
  const [androidPromptable, setAndroidPromptable] = useState(false);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    return onPromptAvailableChange(setAndroidPromptable);
  }, []);

  if (hidden) return null;
  if (isStandalone()) return null;

  const ios = isIOS();
  const showAndroidButton = !ios && androidPromptable;
  if (!ios && !showAndroidButton) return null;

  function handleDismiss() {
    setHidden(true);
    if (onDismiss) onDismiss();
  }

  async function handleInstall() {
    const result = await triggerInstallPrompt();
    if (result.outcome === 'accepted' || result.outcome === 'dismissed') {
      handleDismiss();
    }
  }

  return (
    <div className="rounded-2xl bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 mb-4">
      <div className="flex items-start gap-3">
        <Download className="w-5 h-5 text-blue-600 dark:text-blue-300 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-blue-900 dark:text-blue-100">
            {t('install.bannerTitle')}
          </p>
          <p className="text-sm text-blue-800 dark:text-blue-200 mt-0.5">
            {t('install.bannerBody')}
          </p>

          {ios && (
            <ol className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-0.5 list-decimal list-inside">
              <li>{t('install.iosStep1Prefix')} {t('install.iosStep1Suffix')}</li>
              <li>{t('install.iosStep2Prefix')} <strong>{t('install.iosStep2Mid')}</strong>.</li>
              <li>{t('install.iosStep3Prefix')} <strong>{t('install.iosStep3Action')}</strong>{t('install.iosStep3Suffix')}</li>
            </ol>
          )}

          <div className="flex gap-2 mt-3">
            {showAndroidButton && (
              <button
                onClick={handleInstall}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
              >
                {t('install.installButton')}
              </button>
            )}
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 rounded-lg text-sm text-blue-700 dark:text-blue-200 hover:bg-blue-100 dark:hover:bg-blue-900"
            >
              {t('install.dismissButton')}
            </button>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
          aria-label={t('install.dismissButton')}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
