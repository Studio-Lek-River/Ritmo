import React from 'react';
import RitmoLogo from '../RitmoLogo';
import { useTranslation } from '../../i18n/useTranslation';

// Telt voor de samenvatting hoeveel items per gebied klaargezet worden.
function summarize(areaState) {
  const counts = { modules: 0, projects: 0, collections: 0, household: 0 };
  for (const area of Object.keys(counts)) {
    const s = areaState[area];
    if (!s || s.tab === 'skip') continue;
    if (s.tab === 'presets') {
      counts[area] = Object.values(s.selectedPresetIds || {}).filter(Boolean).length;
    } else if (s.tab === 'custom') {
      counts[area] = (s.custom || []).length;
    }
  }
  return counts;
}

export default function DoneStep({ areaState, onBack, onFinish, committing, theme, darkMode }) {
  const { t } = useTranslation();
  const counts = summarize(areaState);
  const totalItems = counts.modules + counts.projects + counts.collections + counts.household;
  const empty = totalItems === 0;

  return (
    <div className="text-center">
      <div className="flex justify-center mb-5">
        <RitmoLogo
          size={96}
          variant={darkMode ? 'light' : 'dark'}
          animated="splash"
        />
      </div>
      <h1 className={`text-2xl font-bold ${theme.text} mb-2`}>
        {t('onboarding.done.title')}
      </h1>
      <p className={`${theme.textMuted} mb-5 text-sm`}>
        {empty
          ? t('onboarding.done.summaryEmpty')
          : t('onboarding.done.summary', counts)}
      </p>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          disabled={committing}
          className={`px-4 py-3 ${theme.cardSecondary} ${theme.textSecondary} rounded-xl font-medium transition disabled:opacity-50`}
        >
          {t('common.back')}
        </button>
        <button
          onClick={onFinish}
          disabled={committing}
          className={`flex-1 py-3 rounded-xl font-medium transition ${
            committing
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {t('onboarding.done.finish')}
        </button>
      </div>
    </div>
  );
}
