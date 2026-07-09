import React, { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import DagView from './DagView';

const TABS = ['dag', 'kanban'];

// Werkruimte voor de Productivity Suite: kop + Dag/Kanban-toggle. Kanban is in
// deze slice een placeholder (volgt in een latere slice); Dag rendert de
// geaggregeerde tijdlijn. Lokale useState zodat de keuze een lichte,
// niet-persistente UI-voorkeur blijft (principe 2: geen gedrag opgelegd).
export default function ProductivitySuiteView({
  modules,
  moduleData,
  customTasks,
  onChecklistToggle,
  onChoiceOptionSet,
  onToggleTask,
  onToggleProjectSubgoal,
  setView,
  theme,
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('dag');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className={`text-2xl font-bold ${theme.text}`}>{t('productivity.title')}</h1>
        <div className={`flex gap-1 p-1 ${theme.cardSecondary} rounded-xl`}>
          {TABS.map(id => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                tab === id ? 'bg-blue-500 text-white shadow' : `${theme.textMuted} ${theme.hover}`
              }`}
            >
              {t(`productivity.${id}`)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'dag' ? (
        <DagView
          modules={modules}
          moduleData={moduleData}
          customTasks={customTasks}
          onChecklistToggle={onChecklistToggle}
          onChoiceOptionSet={onChoiceOptionSet}
          onToggleTask={onToggleTask}
          onToggleProjectSubgoal={onToggleProjectSubgoal}
          setView={setView}
          theme={theme}
        />
      ) : (
        <div className={`${theme.card} rounded-2xl p-8 text-center text-sm ${theme.textMuted}`}>
          {t('productivity.kanbanPlaceholder')}
        </div>
      )}
    </div>
  );
}
