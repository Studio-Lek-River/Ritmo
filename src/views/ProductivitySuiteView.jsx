import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { RotateCcw, WandSparkles } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useToast } from '../hooks/useToast';
import WeekView from './WeekView';
import KanbanView from './KanbanView';
import FeedView from './FeedView';
import TaskListPanel from '../components/TaskListPanel';
import TaskPoolPanel from '../components/TaskPoolPanel';
import SourcesPanel from '../components/SourcesPanel';
import TrelloBoardPicker from '../components/TrelloBoardPicker';
import GithubRepoPicker from '../components/GithubRepoPicker';
import PlanPreferencesPanel from '../components/PlanPreferencesPanel';
import { buildDayTimeline } from '../utils/dayTimeline';
import { isVirtualTaskKey } from '../utils/itemKeys';
import { shortWeekdayLabelsMondayFirst } from '../utils/dates';

const TABS = ['dag', 'feed', 'kanban', 'voorkeuren'];

// Werkruimte voor de Planner: kop + Dag/Feed/Kanban/Voorkeuren-toggle. Dag
// rendert het weekrooster (WeekView, met zijn eigen interne Dag/Week-toggle)
// met de takenpool van de geselecteerde dag ernaast; Feed (S10) rendert
// FeedView over de volle breedte, zoals Voorkeuren dat al deed — geen
// linkerpaneel nodig, de feed is zelf al gegroepeerd; Kanban rendert het
// ongewijzigde statusbord met de gedeelde takenlijst. Lokale useState zodat de
// tabkeuze en de geselecteerde dag lichte, niet-persistente UI-voorkeuren
// blijven (principe 2: geen gedrag opgelegd).
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
  priorityPrefs,
  setPriorityPrefs,
  agendaShown,
  agendaLoading,
  agendaError,
  agendaLastSyncedAt,
  onImportOrRefreshAgenda,
  trelloConnected,
  trelloBoardPrefs,
  onChangeTrelloBoardPrefs,
  trelloCacheBoards,
  trelloCardsLoading,
  trelloCardsError,
  trelloLastSyncedAt,
  onRefreshTrelloCards,
  githubConnected,
  githubRepoPrefs,
  onChangeGithubRepoPrefs,
  githubIssuesLoading,
  githubIssuesError,
  githubLastSyncedAt,
  onRefreshGithubIssues,
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
  onSetTaskPriority,
  onToggleProjectSubgoal,
  onSetTaskStatus,
  onSetSubgoalStatus,
  onToggleTaskInDay,
  onMoveItem,
  onSetItemDuration,
  onResetItem,
  pendingPlan,
  onShareDay,
  planUndoDateKey,
  onUndoPlan,
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
  // per nieuwe fout, geen stil console.warn-slikken (AC6). De melding is
  // provider-agnostisch (`planner.sources.fetchFailed`, S08): Trello's eigen
  // fetch-fout hieronder hergebruikt dezelfde key.
  useEffect(() => {
    if (agendaError) {
      showToast({ message: t('planner.sources.fetchFailed', { provider: t('connections.providers.outlook') }) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agendaError]);

  // Zelfde patroon voor een mislukte Trello-kaartenfetch (S08, AC14): de
  // bestaande borden blijven staan (useTrelloCards veegt de state nooit leeg
  // bij een fout), alleen deze toast meldt het.
  useEffect(() => {
    if (trelloCardsError) {
      showToast({ message: t('planner.sources.fetchFailed', { provider: t('connections.providers.trello') }) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trelloCardsError]);

  // Zelfde patroon voor een mislukte GitHub-issuesfetch (S09, AC10): de
  // bestaande repo's blijven staan (useGithubIssues veegt de state nooit leeg
  // bij een fout), alleen deze toast meldt het.
  useEffect(() => {
    if (githubIssuesError) {
      showToast({ message: t('planner.sources.fetchFailed', { provider: t('connections.providers.github') }) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubIssuesError]);

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

  // `modules` is hier `allModules` (App.jsx, S08/S09): bevat ook de afgeleide
  // Trello- en GitHub-projecten. Die horen in de takenpool én, sinds ze een
  // eigen dag en tijd kunnen krijgen (sourceItemPrefs.js), in het weekrooster:
  // anders verdwijnt een kaart zodra je hem inplant, want de pool toont alleen
  // items zónder tijd. Alleen een kaart die de gebruiker zelf op een dag heeft
  // gezet komt in het rooster terecht — een vrij blok zonder binding blijft in
  // de pool en zou anders in elke dagkolom staan.
  //
  // Het Kanban-bord houdt ze wél buiten: KANBAN_COLUMNS mapt niet op externe
  // statussen zonder informatieverlies. `localModules` is daarvoor de
  // settings-only deelverzameling (elke module met een `source`-binding eruit,
  // ongeacht provider).
  const localModules = useMemo(() => modules.filter(m => !m.source), [modules]);

  const selectedDay = (weekDays || []).find(d => d.dateKey === selectedDateKey) || weekDays?.[0];

  // "Alles overnemen" schrijft de hele dag in één klik weg en meldt dat met een
  // ongedaan-maken-toast. App.jsx zit zelf niet onder ToastProvider, dus het
  // krijgt showToast van hier — zelfde constructie als onShareDay hieronder.
  // Zo blijft showToast buiten WeekView.
  const acceptAllPendingWithToast = useCallback(() => onAcceptAllPending(showToast), [onAcceptAllPending, showToast]);

  // De knop rendert alleen als er echt iets terug te draaien is, dus deze
  // bevestiging liegt nooit.
  const handleUndoPlan = useCallback(() => {
    onUndoPlan();
    showToast({ message: t('planner.toast.planUndone') });
  }, [onUndoPlan, showToast, t]);

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
      .map(item => (isVirtualTaskKey(item.key) ? { ...item, toggle: undefined } : item));
  }, [selectedDay, modules, onToggleTaskInDay, onToggleProjectSubgoal]);

  // Generieke provider -> actie-map voor SourcesPanel (S07d, uitgebreid in
  // S08/S09): alleen een provider met een echte actie krijgt een entry, dus
  // een provider zonder koppeling blijft ongemoeid zonder hardcoded
  // providerlijst hier. `onRefresh` hergebruikt dezelfde handler als de oude
  // knoppenbalk (import de eerste keer, daarna vernieuwen). Trello en GitHub
  // hebben geen aparte "importeren"-stap (het aanvinken van een bord/repo in
  // `panel` IS de opt-in), dus `shown` is simpelweg "is er al iets
  // aangevinkt".
  const trelloBoardsIncluded = Object.values(trelloBoardPrefs?.boards || {}).some(b => b?.include);
  const githubReposIncluded = Object.values(githubRepoPrefs?.repos || {}).some(r => r?.include);
  const sourceActions = useMemo(() => ({
    ...(outlookConnected ? {
      outlook: {
        onRefresh: onImportOrRefreshAgenda,
        loading: agendaLoading,
        shown: agendaShown,
        lastSyncedAt: agendaLastSyncedAt,
      },
    } : {}),
    ...(trelloConnected ? {
      trello: {
        onRefresh: onRefreshTrelloCards,
        loading: trelloCardsLoading,
        shown: trelloBoardsIncluded,
        lastSyncedAt: trelloLastSyncedAt,
        panel: (
          <TrelloBoardPicker
            boardPrefs={trelloBoardPrefs}
            onChangeBoardPrefs={onChangeTrelloBoardPrefs}
            cacheBoards={trelloCacheBoards}
            theme={theme}
          />
        ),
      },
    } : {}),
    ...(githubConnected ? {
      github: {
        onRefresh: onRefreshGithubIssues,
        loading: githubIssuesLoading,
        shown: githubReposIncluded,
        lastSyncedAt: githubLastSyncedAt,
        panel: (
          <GithubRepoPicker
            repoPrefs={githubRepoPrefs}
            onChangeRepoPrefs={onChangeGithubRepoPrefs}
            theme={theme}
          />
        ),
      },
    } : {}),
  }), [
    outlookConnected, onImportOrRefreshAgenda, agendaLoading, agendaShown, agendaLastSyncedAt,
    trelloConnected, onRefreshTrelloCards, trelloCardsLoading, trelloBoardsIncluded, trelloLastSyncedAt,
    trelloBoardPrefs, onChangeTrelloBoardPrefs, trelloCacheBoards, theme,
    githubConnected, onRefreshGithubIssues, githubIssuesLoading, githubReposIncluded, githubLastSyncedAt,
    githubRepoPrefs, onChangeGithubRepoPrefs,
  ]);

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
          {/* Alleen zichtbaar zolang de laatste indeling van de getoonde dag
              is: bij het bladeren naar een andere dag verdwijnt hij en bij
              terugkeer staat hij er weer. Secundair gestyled — indelen blijft
              de primaire actie. */}
          {planUndoDateKey === (selectedDay?.dateKey || todayKey) && (
            <button
              type="button"
              onClick={handleUndoPlan}
              className={`flex items-center gap-1.5 px-3 py-2 ${theme.radiusControl} text-sm font-medium transition ${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`}
            >
              <RotateCcw className="w-4 h-4" />
              {t('planner.actions.undoPlan')}
            </button>
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
          priorityPrefs={priorityPrefs}
          setPriorityPrefs={setPriorityPrefs}
          theme={theme}
        />
      ) : tab === 'feed' ? (
        <FeedView
          modules={modules}
          customTasks={customTasks}
          sourcePrefs={sourcePrefs}
          theme={theme}
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-[minmax(320px,28%)_1fr] items-start">
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
                onSetItemDuration={onSetItemDuration}
                onResetItem={onResetItem}
                priorityPrefs={priorityPrefs}
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
              onSetTaskPriority={onSetTaskPriority}
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
              onAcceptAllPending={acceptAllPendingWithToast}
              onDiscardAllPending={onDiscardAllPending}
              onMovePendingItem={onMovePendingItem}
              theme={theme}
            />
          ) : (
            <KanbanView
              modules={localModules}
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
