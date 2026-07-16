import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Loader2, WandSparkles } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useToast } from '../hooks/useToast';
import WeekView from './WeekView';
import KanbanView from './KanbanView';
import TaskListPanel from '../components/TaskListPanel';
import TaskPoolPanel from '../components/TaskPoolPanel';
import SourcesPanel from '../components/SourcesPanel';
import PlanPreferencesPanel from '../components/PlanPreferencesPanel';
import { buildDayTimeline } from '../utils/dayTimeline';
import { shortWeekdayLabelsMondayFirst } from '../utils/dates';

const TABS = ['dag', 'kanban', 'voorkeuren'];

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
  agendaByDate,
  outlookConnected,
  connections,
  sourcePrefs,
  setSourcePrefs,
  agendaShown,
  agendaLoading,
  agendaError,
  onImportOrRefreshAgenda,
  onOpenConnections,
  onAddTask,
  onAddSubgoal,
  onToggleTask,
  onDeleteTask,
  onSetTaskTime,
  onSetTaskDuration,
  onSetTaskWindow,
  onSetTaskAutoPlan,
  onSetTaskDeepWork,
  onToggleProjectSubgoal,
  onSetTaskStatus,
  onSetSubgoalStatus,
  onToggleTaskInDay,
  onMoveItem,
  pendingPlan,
  onShareDay,
  onAcceptPendingItem,
  onDiscardPendingItem,
  onAcceptAllPending,
  onDiscardAllPending,
  onMovePendingItem,
  planPrefs,
  setPlanPrefs,
  theme,
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const [tab, setTab] = useState('dag');
  const [selectedDateKey, setSelectedDateKey] = useState(todayKey);

  // App.jsx zelf zit niet onder ToastProvider (zie App.jsx), dus een mislukte
  // Outlook-fetch wordt hier gemeld zodra `agendaError` verandert — één toast
  // per nieuwe fout, geen stil console.warn-slikken (AC6).
  useEffect(() => {
    if (agendaError) {
      showToast({ message: t('planner.outlook.fetchFailed') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaError]);

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
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => onShareDay(selectedDay?.dateKey || todayKey, showToast)}
            className={`flex items-center gap-1.5 px-3 py-2 ${theme.radiusControl} text-sm font-medium transition ${theme.accentBg} shadow`}
          >
            <WandSparkles className="w-4 h-4" />
            {t('planner.actions.shareDay')}
          </button>
          {tab === 'dag' && (
            outlookConnected ? (
              <button
                type="button"
                onClick={onImportOrRefreshAgenda}
                disabled={agendaLoading}
                aria-label={agendaLoading ? t('planner.outlook.loading') : undefined}
                className={`flex items-center gap-1.5 px-3 py-2 ${theme.radiusControl} text-sm font-medium transition ${theme.cardSecondary} ${theme.hover} disabled:opacity-60 disabled:cursor-not-allowed`}
              >
                {agendaLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Calendar className="w-4 h-4" />
                )}
                {agendaShown ? t('planner.outlook.refresh') : t('planner.outlook.import')}
              </button>
            ) : (
              <button
                type="button"
                onClick={onOpenConnections}
                className={`flex items-center gap-1.5 px-3 py-2 ${theme.radiusControl} text-sm ${theme.textMuted} ${theme.hover} transition`}
              >
                {t('planner.outlook.notConnectedHint')}
              </button>
            )
          )}
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
      </div>

      {tab === 'voorkeuren' ? (
        <PlanPreferencesPanel
          planPrefs={planPrefs}
          setPlanPrefs={setPlanPrefs}
          theme={theme}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(240px,300px)_1fr] items-start">
          {tab === 'dag' ? (
            <div className="space-y-4">
              <TaskPoolPanel
                items={poolItems}
                dayOptions={dayOptions}
                selectedDateKey={selectedDay?.dateKey || todayKey}
                canAddTask={(selectedDay?.dateKey || todayKey) === todayKey}
                onAddTask={onAddTask}
                onMoveItem={onMoveItem}
                theme={theme}
              />
              <SourcesPanel
                connections={connections}
                sourcePrefs={sourcePrefs}
                setSourcePrefs={setSourcePrefs}
                onOpenConnections={onOpenConnections}
                theme={theme}
              />
            </div>
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
              onSetTaskDeepWork={onSetTaskDeepWork}
              theme={theme}
            />
          )}

          {tab === 'dag' ? (
            <WeekView
              weekDays={weekDays || []}
              modules={modules}
              agendaByDate={agendaByDate}
              sourcePrefs={sourcePrefs}
              selectedDateKey={selectedDay?.dateKey || todayKey}
              onSelectDate={setSelectedDateKey}
              onToggleTask={onToggleTaskInDay}
              onToggleProjectSubgoal={onToggleProjectSubgoal}
              onMoveItem={onMoveItem}
              pendingPlan={pendingPlan}
              onAcceptPendingItem={onAcceptPendingItem}
              onDiscardPendingItem={onDiscardPendingItem}
              onAcceptAllPending={onAcceptAllPending}
              onDiscardAllPending={onDiscardAllPending}
              onMovePendingItem={onMovePendingItem}
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
      )}
    </div>
  );
}
