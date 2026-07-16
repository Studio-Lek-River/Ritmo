import React, { useEffect, useMemo, useState } from 'react';
import { WandSparkles } from 'lucide-react';
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
  weekOffset,
  onWeekOffsetChange,
  todayKey,
  agendaByDate,
  includedAgendaIds,
  onToggleAgendaBlock,
  outlookConnected,
  connections,
  sourcePrefs,
  setSourcePrefs,
  agendaShown,
  agendaLoading,
  agendaError,
  agendaLastSyncedAt,
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

  // De selectie volgt de getoonde week: bij het bladeren valt de oude keuze
  // buiten `weekDays`. Vandaag als die in de week zit, anders de maandag van die
  // week — zonder dit bleef `selectedDateKey` op een dag uit een andere week
  // staan en week de selectie af van wat het rooster oplichtte.
  useEffect(() => {
    const days = weekDays || [];
    if (days.length === 0) return;
    if (days.some(d => d.dateKey === selectedDateKey)) return;
    setSelectedDateKey(days.some(d => d.dateKey === todayKey) ? todayKey : days[0].dateKey);
  }, [weekDays, selectedDateKey, todayKey]);

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

  // Generieke provider -> actie-map voor SourcesPanel (S07d): alleen een
  // provider met een echte actie (op dit moment enkel Outlook) krijgt een
  // entry, dus Trello/GitHub blijven ongemoeid zonder hardcoded providerlijst
  // hier. `onRefresh` hergebruikt dezelfde handler als de oude knoppenbalk
  // (import de eerste keer, daarna vernieuwen).
  const sourceActions = useMemo(() => (
    outlookConnected
      ? {
          outlook: {
            onRefresh: onImportOrRefreshAgenda,
            loading: agendaLoading,
            shown: agendaShown,
            lastSyncedAt: agendaLastSyncedAt,
          },
        }
      : {}
  ), [outlookConnected, onImportOrRefreshAgenda, agendaLoading, agendaShown, agendaLastSyncedAt]);

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
              {/* Toevoegen kan op elke dag van de getoonde week, niet alleen
                  vandaag: `addCustomTask` schrijft de meegegeven dag via
                  writeTasksForDay rechtstreeks naar het dagrecord. Zonder die
                  dag mee te geven zou een taak stilletjes op vandaag landen. */}
              <TaskPoolPanel
                items={poolItems}
                dayOptions={dayOptions}
                selectedDateKey={selectedDay?.dateKey || todayKey}
                canAddTask
                onAddTask={(text) => onAddTask(text, undefined, {}, selectedDay?.dateKey || todayKey)}
                onMoveItem={onMoveItem}
                theme={theme}
              />
              <SourcesPanel
                connections={connections}
                sourcePrefs={sourcePrefs}
                setSourcePrefs={setSourcePrefs}
                sourceActions={sourceActions}
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
              weekOffset={weekOffset}
              onWeekOffsetChange={onWeekOffsetChange}
              modules={modules}
              agendaByDate={agendaByDate}
              includedAgendaIds={includedAgendaIds}
              onToggleAgendaBlock={onToggleAgendaBlock}
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
