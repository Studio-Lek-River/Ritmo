import React from 'react';
import { Share, Plus, MoreVertical, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

function InlineIcon({ icon: Icon }) {
  return (
    <span className="inline-flex items-center justify-center align-middle w-5 h-5 mx-0.5 rounded bg-blue-50 text-blue-600">
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  const matchStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = window.navigator && window.navigator.standalone === true;
  return Boolean(matchStandalone || iosStandalone);
}

export default function InstallGuide({ theme }) {
  const { t } = useTranslation();

  if (isStandalone()) {
    return (
      <div className={`p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3`}>
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">{t('install.alreadyInstalled')}</p>
          <p className="text-xs text-green-700 mt-1">
            {t('install.alreadyInstalledDesc')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className={`text-sm ${theme.textSecondary}`}>
        {t('install.intro')}
      </p>

      <section>
        <h3 className={`text-sm font-semibold ${theme.text} mb-1`}>{t('install.iosTitle')}</h3>
        <p className={`text-xs ${theme.textMuted} mb-3`}>
          {t('install.iosNote')}
        </p>
        <ol className={`space-y-2 text-sm ${theme.textSecondary} list-decimal pl-5`}>
          <li>
            {t('install.iosStep1Prefix')} <InlineIcon icon={Share} /> {t('install.iosStep1Suffix')}
          </li>
          <li>
            {t('install.iosStep2Prefix')} <span className={`font-medium ${theme.text}`}>{t('install.iosStep2Mid')}</span> <InlineIcon icon={Plus} />.
          </li>
          <li>
            {t('install.iosStep3Prefix')} <span className={`font-medium ${theme.text}`}>{t('install.iosStep3Action')}</span> {t('install.iosStep3Suffix')}
          </li>
        </ol>
      </section>

      <section>
        <h3 className={`text-sm font-semibold ${theme.text} mb-1`}>{t('install.androidTitle')}</h3>
        <p className={`text-xs ${theme.textMuted} mb-3`}>
          {t('install.androidNote')}
        </p>
        <ol className={`space-y-2 text-sm ${theme.textSecondary} list-decimal pl-5`}>
          <li>
            {t('install.androidStep1Prefix')} <InlineIcon icon={MoreVertical} /> {t('install.androidStep1Suffix')}
          </li>
          <li>
            {t('install.androidStep2Prefix')} <span className={`font-medium ${theme.text}`}>{t('install.androidStep2A')}</span> {t('install.androidStep2Or')} <span className={`font-medium ${theme.text}`}>{t('install.androidStep2B')}</span>{t('install.androidStep2Suffix')}
          </li>
          <li>
            {t('install.androidStep3Prefix')} <span className={`font-medium ${theme.text}`}>{t('install.androidStep3Action')}</span>{t('install.androidStep3Suffix')}
          </li>
        </ol>
      </section>
    </div>
  );
}
