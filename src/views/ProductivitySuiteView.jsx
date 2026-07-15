import React, { useMemo, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import WeekView from './WeekView';
import KanbanView from './KanbanView';
import TaskListPanel from '../components/TaskListPanel';
import TaskPoolPanel from '../components/TaskPoolPanel';
import { buildDayTimeline } from '../utils/dayTimeline';
import { shortWeekdayLabelsMondayFirst } from '../utils/dates';

const TABS = ['dag', 'kanban'];

// Werkruimte voor de Planner: kop + Dag/Kanban-toggle. Dag rendert het
// weekrooster (WeekView, met zijn eigen interne Dag/Week-toggle) met de
// takenpool van de geselecteerde dag ernaast; Kanban rendert het ongewijzigde
// statusbord met de gedeelde takenlijst. Lokale useState zodat de tabkeuze en
// de geselecteerde dag lichte, niet-persistente UI-voorkeuren blijven
// (principe 2: geen gedrag opgelegd).
export default function ProductivitySuiteView({
  modules,
  customTasks,
  weekDays,
  todayKey,
  onAddTask,
  onAddSubgoal,
  onToggleTask,
  onDeleteTask,
  onSetTaskTime,
  onSetTaskDuration,
  onSetTaskWindow,
  onSetTaskAutoPlan,
  onToggleProjectSubgoal,
  onSetTaskStatus,
  onSetSubgoalStatus,
  onToggleTaskInDay,
  onMoveItem,
  theme,
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('dag');
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  const tasksColor = modules.find(m => m.enabled && m.type === 'tasks')?.color;

  const selectedDay = (weekDays || []).find(d => d.dateKey === selectedDateKey) || weekDays?.[0];

  const shortLabels = useMemo(() => shortWeekdayLabelsMondayFirst(), []);
  const dayOptions = useMemo(() => (weekDays || []).map((d, idx) => ({
    dateKey: d.dateKey,
    label: `${shortLabels[idx]} ${d.date.getDate()}`,
  })), [weekDays, shortLabels]);

  const poolItems = useMemo(() => {
    if (!selectedDay) return [];
    const items = buildDayTimeline({
      modules,
      customTasks: selectedDay.customTasks,
      referenceDate: selectedDay.date,
      handlers: {
        onToggleTask: (id) => onToggleTaskInDay(selectedDay.dateKey, id),
        onToggleProjectSubgoal,
      },
    });
    return items
      .filter(item => !item.time)
      .map(item => (item.key.startsWith('task:virtual:') ? { ...item, toggle: undefined } : item));
  }, [selectedDay, modules, onToggleTaskInDay, onToggleProjectSubgoal]);

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
                tab === id ? `${theme.accentBg} shadow` : `${theme.textMuted} ${theme.hover}`
              }`}
            >
              {t(`productivity.${id}`)}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-[minmax(240px,300px)_1fr] items-start">
        {tab === 'dag' ? (
          <TaskPoolPanel
            items={poolItems}
            dayOptions={dayOptions}
            selectedDateKey={selectedDay?.dateKey || todayKey}
            canAddTask={(selectedDay?.dateKey || todayKey) === todayKey}
            onAddTask={onAddTask}
            onMoveItem={onMoveItem}
            theme={theme}
          />
        ) : (
          <TaskListPanel
            tasks={customTasks}
            color={tasksColor}
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onDeleteTask={onDeleteTask}
            onSetTaskTime={onSetTaskTime}
            onSetTaskDuration={onSetTaskDuration}
            onSetTaskWindow={onSetTaskWindow}
            onSetTaskAutoPlan={onSetTaskAutoPlan}
            theme={theme}
          />
        )}

        {tab === 'dag' ? (
          <WeekView
            weekDays={weekDays || []}
            modules={modules}
            selectedDateKey={selectedDay?.dateKey || todayKey}
            onSelectDate={setSelectedDateKey}
            onToggleTask={onToggleTaskInDay}
            onToggleProjectSubgoal={onToggleProjectSubgoal}
            onMoveItem={onMoveItem}
            theme={theme}
          />
        ) : (
          <KanbanView
            modules={modules}
            customTasks={customTasks}
            onAddTask={onAddTask}
            onAddSubgoal={onAddSubgoal}
            onSetTaskStatus={onSetTaskStatus}
            onSetSubgoalStatus={onSetSubgoalStatus}
            theme={theme}
          />
        )}
      </div>
    </div>
  );
}
