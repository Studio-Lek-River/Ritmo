import React, { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import DagView from './DagView';
import KanbanView from './KanbanView';
import TaskListPanel from '../components/TaskListPanel';

const TABS = ['dag', 'kanban'];

// Werkruimte voor de Planner: kop + Dag/Kanban-toggle, met links een gedeelde
// takenlijst en rechts de actieve weergave. Dag rendert de geaggregeerde
// uur-agenda, Kanban het statusbord. Lokale useState zodat de tabkeuze een
// lichte, niet-persistente UI-voorkeur blijft (principe 2: geen gedrag opgelegd).
export default function ProductivitySuiteView({
  modules,
  customTasks,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onSetTaskTime,
  onToggleProjectSubgoal,
  onSetTaskStatus,
  onSetSubgoalStatus,
  theme,
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('dag');

  const tasksColor = modules.find(m => m.enabled && m.type === 'tasks')?.color;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className={`text-2xl font-bold ${theme.text}`}>{t('productivity.title')}</h1>
        <div className={`flex gap-1 p-1 ${theme.cardSecondary} ${theme.radiusControl}`}>
          {TABS.map(id => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              aria-pressed={tab === id}
              className={`px-4 py-2 ${theme.radiusControl} text-sm font-medium transition ${
                tab === id ? 'bg-blue-500 text-white shadow' : `${theme.textMuted} ${theme.hover}`
              }`}
            >
              {t(`productivity.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(240px,300px)_1fr] items-start">
        <TaskListPanel
          tasks={customTasks}
          color={tasksColor}
          onAddTask={onAddTask}
          onToggleTask={onToggleTask}
          onDeleteTask={onDeleteTask}
          onSetTaskTime={onSetTaskTime}
          theme={theme}
        />

        {tab === 'dag' ? (
          <DagView
            modules={modules}
            customTasks={customTasks}
            onToggleTask={onToggleTask}
            onToggleProjectSubgoal={onToggleProjectSubgoal}
            theme={theme}
          />
        ) : (
          <KanbanView
            modules={modules}
            customTasks={customTasks}
            onAddTask={onAddTask}
            onSetTaskStatus={onSetTaskStatus}
            onSetSubgoalStatus={onSetSubgoalStatus}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
