import React, { useMemo, useState, useRef } from 'react';
import { ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useUndoToast } from '../hooks/useUndoToast';
import { getColorClasses } from '../utils/colors';
import { buildTaskBoard, KANBAN_COLUMNS } from '../utils/taskBoard';

// Kleur per statuskolom, puur visueel (Monday-persoonlijkheid). Leesbaar in
// zowel light als dark; raakt geen kaart-logica of drag-and-drop.
const COLUMN_HEAD = {
  todo: 'text-slate-500 dark:text-slate-400',
  bezig: 'text-blue-500 dark:text-blue-400',
  klaar: 'text-emerald-500 dark:text-emerald-400',
};

// Kanban-bord voor de Planner: losse taken (vandaag) en projecttaken (alle,
// ongeacht deadline) als kaartjes in drie kolommen op status. De drie kolommen
// zijn altijd zichtbaar, ook bij een leeg bord. Hergebruikt bestaande handlers
// uit App.jsx via buildTaskBoard; een nieuwe kaart wordt als losse taak
// (onAddTask) of als projectdoel (onAddSubgoal) toegevoegd en belandt in Te doen.
// Verplaatsen kan zowel via native drag-and-drop als via de toegankelijke
// chevron-knoppen (principe 2: geen enkele interactievorm wordt opgelegd).
// Een kaart is ook inline te hernoemen en te verwijderen met undo (V11,
// #134): beide routeren in buildTaskBoard op `kind` naar de juiste App-
// handler (losseTaak/deleteTask/restoreTask, projecttaak/deleteSubgoal/
// restoreSubgoal/renameSubgoal). Kanban toont zelf alleen lokale projecten
// (`localModules` in ProductivitySuiteView), dus geen bron-guard nodig.
export default function KanbanView({
  modules,
  customTasks,
  onAddTask,
  onAddSubgoal,
  onSetTaskStatus,
  onSetSubgoalStatus,
  onDeleteTask,
  onRestoreTask,
  onSetTaskText,
  onDeleteSubgoal,
  onRestoreSubgoal,
  onRenameSubgoal,
  theme,
}) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();
  const [draggingKey, setDraggingKey] = useState(null);

  const board = useMemo(
    () => buildTaskBoard({
      modules,
      customTasks,
      handlers: {
        onSetTaskStatus,
        onSetSubgoalStatus,
        onDeleteTask,
        onRestoreTask,
        onSetTaskText,
        onDeleteSubgoal,
        onRestoreSubgoal,
        onRenameSubgoal,
      },
    }),
    [
      modules, customTasks, onSetTaskStatus, onSetSubgoalStatus,
      onDeleteTask, onRestoreTask, onSetTaskText,
      onDeleteSubgoal, onRestoreSubgoal, onRenameSubgoal,
    ]
  );

  // Verwijderen met undo (V11, #134): card.remove() doet de echte delete
  // (losseTaak of projecttaak, zie buildTaskBoard) en geeft een undo-callback
  // terug; deze toont daarna de gedeelde undo-toast, zelfde patroon als
  // TaskListPanel.handleDeleteTask.
  const handleRemoveCard = (card) => {
    const result = card.remove?.();
    showUndoToast(t('toast.cardDeleted'), () => result?.undo?.());
  };

  // Beschikbare projecten (subjects) voor een projectdoel-kaart, afgeleid uit de
  // bestaande projects-modules. Leeg => het toevoegveld valt terug op taak-only.
  const projectOptions = useMemo(
    () => (modules || [])
      .filter(m => m.enabled && m.type === 'projects')
      .flatMap(m => (m.subjects || []).map(s => ({ projectId: m.id, subjectId: s.id, name: s.name }))),
    [modules]
  );

  const allCardsByKey = useMemo(() => {
    const map = new Map();
    KANBAN_COLUMNS.forEach(col => {
      board[col].forEach(card => map.set(card.key, card));
    });
    return map;
  }, [board]);

  const handleDrop = (col) => (e) => {
    e.preventDefault();
    const key = e.dataTransfer.getData('text/plain') || draggingKey;
    const card = allCardsByKey.get(key);
    if (card) card.setStatus(col);
    setDraggingKey(null);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {KANBAN_COLUMNS.map(col => (
        <div
          key={col}
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop(col)}
          className={`${theme.cardSecondary} ${theme.radiusCard} ${theme.padRow} space-y-2 min-h-[8rem] border-t-2 border-current ${COLUMN_HEAD[col]}`}
        >
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${COLUMN_HEAD[col]}`}>
            {t(`productivity.kanbanColumns.${col}`)}
          </h2>
          {board[col].length === 0 ? (
            <div className={`text-xs italic ${theme.textMuted}`}>
              {t('productivity.kanbanEmpty')}
            </div>
          ) : (
            board[col].map(card => (
              <KanbanCard
                key={card.key}
                card={card}
                column={col}
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', card.key);
                  setDraggingKey(card.key);
                }}
                onDragEnd={() => setDraggingKey(null)}
                onRemove={() => handleRemoveCard(card)}
                theme={theme}
                t={t}
              />
            ))
          )}
          {col === 'todo' && onAddTask && (
            <AddCardForm
              onAddTask={onAddTask}
              onAddSubgoal={onAddSubgoal}
              projectOptions={projectOptions}
              theme={theme}
              t={t}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Toevoeg-veld onderaan de Te doen-kolom: maakt een losse taak (onAddTask) of een
// projectdoel (onAddSubgoal, gekoppeld aan een gekozen project) aan. Beide belanden
// in Te doen omdat nieuwe kaarten geen status/done/completed hebben. Zonder
// beschikbare projecten valt het veld terug op alleen-taak (principe 2: niets
// opgelegd, projectdoel alleen aangeboden als er projecten zijn).
function AddCardForm({ onAddTask, onAddSubgoal, projectOptions = [], theme, t }) {
  const [text, setText] = useState('');
  const [type, setType] = useState('task');
  const [projectKey, setProjectKey] = useState('');

  const hasProjects = onAddSubgoal && projectOptions.length > 0;
  const isProject = type === 'project' && hasProjects;

  const optionKey = (o) => `${o.projectId}::${o.subjectId}`;
  const selected = isProject
    ? (projectOptions.find(o => optionKey(o) === projectKey) || projectOptions[0])
    : null;

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (isProject && selected) {
      onAddSubgoal(selected.projectId, selected.subjectId, trimmed);
    } else {
      onAddTask(trimmed);
    }
    setText('');
  };

  return (
    <div className="space-y-2 pt-1">
      {hasProjects && (
        <div className={`flex gap-1 p-1 ${theme.cardSecondary} ${theme.radiusControl}`}>
          {[['task', 'cardTypeTask'], ['project', 'cardTypeProject']].map(([id, key]) => (
            <button
              key={id}
              type="button"
              onClick={() => setType(id)}
              aria-pressed={type === id}
              className={`flex-1 px-2 py-1 ${theme.radiusControl} text-xs font-medium transition ${
                type === id ? `${theme.accentBg} shadow` : `${theme.textMuted} ${theme.hover}`
              }`}
            >
              {t(`productivity.${key}`)}
            </button>
          ))}
        </div>
      )}

      {isProject && (
        <select
          value={selected ? optionKey(selected) : ''}
          onChange={(e) => setProjectKey(e.target.value)}
          aria-label={t('productivity.selectProject')}
          className={`w-full min-w-0 px-2 py-1.5 ${theme.input} ${theme.radiusControl} text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
        >
          {projectOptions.map(o => (
            <option key={optionKey(o)} value={optionKey(o)}>{o.name}</option>
          ))}
        </select>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('productivity.addCard')}
          className={`flex-1 min-w-0 px-2 py-1.5 ${theme.input} ${theme.radiusControl} text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
        />
        <button
          type="button"
          onClick={submit}
          aria-label={t('productivity.addCard')}
          className={`p-1.5 rounded-lg transition ${theme.hover} ${theme.textMuted} shrink-0`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function KanbanCard({ card, column, onDragStart, onDragEnd, onRemove, theme, t }) {
  const c = getColorClasses(card.color);
  const columnIndex = KANBAN_COLUMNS.indexOf(column);
  const prevColumn = columnIndex > 0 ? KANBAN_COLUMNS[columnIndex - 1] : null;
  const nextColumn = columnIndex < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[columnIndex + 1] : null;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(card.label);
  // Zelfde Escape-dan-blur-guard als src/components/TaskListPanel.jsx (V04,
  // #127): Escape sluit de input terwijl hij focus heeft, maar sommige
  // browsers vuren daarna alsnog een blur-event op de node die al aan het
  // wegrenderen is. `editSessionRef` volgt buiten React-state om of deze
  // kaart nog een actieve edit-sessie heeft.
  const justCancelledRef = useRef(false);
  const editSessionRef = useRef(false);

  const startEdit = () => {
    justCancelledRef.current = false;
    editSessionRef.current = true;
    setDraft(card.label);
    setEditing(true);
  };
  const commitEdit = () => {
    if (justCancelledRef.current) {
      justCancelledRef.current = false;
      return;
    }
    if (!editSessionRef.current) return;
    editSessionRef.current = false;
    card.rename?.(draft);
    setEditing(false);
  };
  const cancelEdit = () => {
    justCancelledRef.current = true;
    editSessionRef.current = false;
    setEditing(false);
    setDraft(card.label);
  };

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={`${theme.card} ${theme.radiusControl} ${theme.padRow} space-y-2 cursor-grab active:cursor-grabbing`}
    >
      <div className="flex items-start gap-2">
        <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${c.bar}`} />
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              type="text"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              onClick={(e) => e.stopPropagation()}
              aria-label={t('productivity.renameCardAria')}
              className={`w-full text-sm px-1 py-0.5 ${theme.input} rounded focus:outline-none focus:ring-2 focus:ring-blue-300`}
            />
          ) : (
            <div
              onClick={startEdit}
              className={`text-sm ${theme.textSecondary} cursor-text`}
            >
              {card.label}
            </div>
          )}
          <div className={`text-xs ${theme.textMuted}`}>{t(`productivity.types.${card.kind}`)}</div>
          {card.kind === 'projecttaak' && card.projectLabel && (
            <span className={`inline-block mt-1 r-chip text-xs ${c.pillBg} ${c.pillText}`}>
              {card.projectLabel}
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center justify-end gap-1">
        <button
          type="button"
          onClick={() => card.setStatus(prevColumn)}
          disabled={!prevColumn}
          aria-label={t('productivity.moveLeft')}
          className={`p-1.5 rounded-lg transition ${theme.hover} ${theme.textMuted} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => card.setStatus(nextColumn)}
          disabled={!nextColumn}
          aria-label={t('productivity.moveRight')}
          className={`p-1.5 rounded-lg transition ${theme.hover} ${theme.textMuted} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onRemove}
          aria-label={t('productivity.deleteCardAria')}
          className={`p-1.5 rounded-lg transition ${theme.hover} text-slate-400 hover:text-red-500`}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
