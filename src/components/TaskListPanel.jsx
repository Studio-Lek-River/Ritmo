import React, { useState } from 'react';
import { Check, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { getColorClasses } from '../utils/colors';
import TimeInput from './TimeInput';

// Gedeelde takenlijst voor de Planner: een vaste linkerkolom met een toevoeg-veld
// en de losse taken (customTasks). Zichtbaar in zowel Dag als Kanban, zodat een
// taak toevoegen hier meteen een agenda-rij én een Kanban-kaart oplevert.
// Hergebruikt uitsluitend bestaande App-handlers; schrijft zelf niets naar opslag.
export default function TaskListPanel({
  tasks = [],
  color,
  onAddTask,
  onToggleTask,
  onDeleteTask,
  onSetTaskTime,
  theme,
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [time, setTime] = useState('');
  const c = getColorClasses(color);

  const submit = () => {
    if (!text.trim()) return;
    onAddTask?.(text.trim(), time || undefined);
    setText('');
    setTime('');
  };

  return (
    <div className={`${theme.card} ${theme.radiusCard} ${theme.padRow} space-y-3`}>
      <h2 className={`text-xs font-semibold uppercase tracking-wide ${theme.textMuted}`}>
        {t('productivity.taskListTitle')}
      </h2>

      <div className="flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder={t('modules.addTaskPlaceholder')}
          className={`flex-1 min-w-0 px-3 py-2 ${theme.input} ${theme.radiusControl} text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
        />
        <TimeInput value={time} onChange={setTime} theme={theme} />
        <button
          type="button"
          onClick={submit}
          aria-label={t('productivity.addCard')}
          className={`px-3 py-2 ${c.bar} ${theme.radiusControl} text-white transition shrink-0`}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="space-y-2">
        {tasks.length === 0 ? (
          <p className={`text-sm ${theme.textMuted} text-center py-4`}>
            {t('modules.noTasksAdded')}
          </p>
        ) : (
          tasks.map(task => (
            <div key={task.id} className={`flex items-center gap-2 ${theme.padRow} ${theme.cardSecondary} ${theme.radiusControl} group`}>
              <button
                type="button"
                onClick={() => onToggleTask?.(task.id)}
                aria-label={t('productivity.toggleAria', { label: task.text })}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition shrink-0 ${
                  task.done ? `${c.bar} border-transparent check-pop` : theme.border
                }`}
              >
                {task.done && <Check className="w-3 h-3 text-white" />}
              </button>
              <span className={`flex-1 min-w-0 text-sm truncate ${task.done ? `line-through ${theme.textMuted}` : theme.textSecondary}`}>
                {task.text}
              </span>
              <TimeInput value={task.time} onChange={(v) => onSetTaskTime?.(task.id, v)} theme={theme} className="w-20" />
              <button
                type="button"
                onClick={() => onDeleteTask?.(task.id)}
                aria-label={t('common.delete')}
                className="opacity-50 sm:opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
