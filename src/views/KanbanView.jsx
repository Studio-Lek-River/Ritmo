import React, { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { getColorClasses } from '../utils/colors';
import { buildTaskBoard, KANBAN_COLUMNS } from '../utils/taskBoard';

// Kanban-bord voor de Planner: losse taken (vandaag) en projecttaken (alle,
// ongeacht deadline) als kaartjes in drie kolommen op status. De drie kolommen
// zijn altijd zichtbaar, ook bij een leeg bord. Hergebruikt bestaande handlers
// uit App.jsx via buildTaskBoard; een nieuwe kaart wordt als losse taak
// toegevoegd via onAddTask (belandt in Te doen). Verplaatsen kan zowel via
// native drag-and-drop als via de toegankelijke chevron-knoppen (principe 2:
// geen enkele interactievorm wordt opgelegd).
export default function KanbanView({ modules, customTasks, onAddTask, onSetTaskStatus, onSetSubgoalStatus, theme }) {
  const { t } = useTranslation();
  const [draggingKey, setDraggingKey] = useState(null);

  const board = useMemo(
    () => buildTaskBoard({ modules, customTasks, handlers: { onSetTaskStatus, onSetSubgoalStatus } }),
    [modules, customTasks, onSetTaskStatus, onSetSubgoalStatus]
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
          className={`${theme.cardSecondary} ${theme.radiusCard} ${theme.padRow} space-y-2 min-h-[8rem]`}
        >
          <h2 className={`text-xs font-semibold uppercase tracking-wide mb-1 ${theme.textMuted}`}>
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
                theme={theme}
                t={t}
              />
            ))
          )}
          {col === 'todo' && onAddTask && <AddCardForm onAddTask={onAddTask} theme={theme} t={t} />}
        </div>
      ))}
    </div>
  );
}

// Compact toevoeg-veld onderaan de Te doen-kolom: maakt een losse taak aan via
// onAddTask (belandt in Te doen omdat nieuwe taken geen status/done hebben).
function AddCardForm({ onAddTask, theme, t }) {
  const [text, setText] = useState('');

  const submit = () => {
    if (!text.trim()) return;
    onAddTask(text.trim());
    setText('');
  };

  return (
    <div className="flex gap-2 pt-1">
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
  );
}

function KanbanCard({ card, column, onDragStart, onDragEnd, theme, t }) {
  const c = getColorClasses(card.color);
  const columnIndex = KANBAN_COLUMNS.indexOf(column);
  const prevColumn = columnIndex > 0 ? KANBAN_COLUMNS[columnIndex - 1] : null;
  const nextColumn = columnIndex < KANBAN_COLUMNS.length - 1 ? KANBAN_COLUMNS[columnIndex + 1] : null;

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
          <div className={`text-sm ${theme.textSecondary}`}>{card.label}</div>
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
      </div>
    </div>
  );
}
