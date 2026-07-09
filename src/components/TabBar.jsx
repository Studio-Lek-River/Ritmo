import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

export default function TabBar({ view, setView, theme, appMode }) {
  const { t } = useTranslation();

  const row1 = [
    { id: 'today',      label: t('nav.today') },
    { id: 'week',       label: t('nav.week') },
    { id: 'month',      label: t('nav.month') },
    { id: 'reflection', label: t('nav.reflection') },
  ];
  const row2 = [
    { id: 'household',    label: t('nav.household') },
    { id: 'projects',     label: t('nav.projects') },
    { id: 'collections',  label: t('nav.collections') },
    { id: 'measurements', label: t('nav.measurements') },
  ];
  // Health-modus: één rij. De 'today'-tab is het gecombineerde Health-scherm
  // (dagelijks dashboard + gezondheidsmodules) en draagt daarom het label
  // "Gezondheid". Er is geen aparte measurements-tab in health mode.
  const healthTabs = [
    { id: 'today',     label: t('nav.measurements') },
    { id: 'week',      label: t('nav.week') },
    { id: 'month',     label: t('nav.month') },
    { id: 'household', label: t('nav.household') },
  ];

  const tabBtnClass = (active) =>
    `flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition ${
      active ? 'bg-blue-500 text-white shadow' : `${theme.textMuted} ${theme.hover}`
    }`;

  if (appMode === 'health') {
    return (
      <div className="mb-6 space-y-1">
        <div className={`flex gap-1 ${theme.card} rounded-xl p-1 shadow-sm`}>
          {healthTabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={tabBtnClass(view === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mb-6 space-y-1">
      <div className={`flex gap-1 ${theme.card} rounded-xl p-1 shadow-sm`}>
        {row1.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={tabBtnClass(view === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={`flex gap-1 ${theme.card} rounded-xl p-1 shadow-sm`}>
        {row2.map(tab => (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={tabBtnClass(view === tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
