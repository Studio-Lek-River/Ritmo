import React, { useState } from 'react';
import { Check, Plus } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { getColorClasses } from '../utils/colors';
import { encodeDragPayload, decodeDragPayload } from '../utils/dragPayload';
import TimeInput from './TimeInput';

// Takenpool voor de WeekView: alle items zonder `time` van de geselecteerde
// dag (losse taken + projecttaken), gegroepeerd per bron. Sleepbaar naar een
// dagkolom in WeekView (native HTML5 DnD, `draggable` + dataTransfer) én zelf
// een drop-target (zelfde patroon: onDragOver preventDefault + onDrop decode
// + handler) — een geagendeerd blok terugslepen naar de pool verplaatst het
// naar de geselecteerde dag en wist `time`. Naast slepen heeft elk item ook
// een tijd-invoer (plant het meteen in de geselecteerde dag) en een
// dag-kiesveld (verplaatst het naar een andere dag, zonder tijd) — geen
// enkele interactievorm is verplicht (principe 2).
export default function TaskPoolPanel({
  items = [],
  dayOptions = [],
  selectedDateKey,
  canAddTask = false,
  onAddTask,
  onMoveItem,
  theme,
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed) return;
    onAddTask?.(trimmed);
    setText('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const { key, sourceDateKey } = decodeDragPayload(e.dataTransfer.getData('text/plain'));
    if (!key || !sourceDateKey) return;
    onMoveItem(key, sourceDateKey, selectedDateKey, '');
  };

  const groups = [
    { kind: 'losseTaak', items: items.filter(i => i.kind === 'losseTaak') },
    { kind: 'projecttaak', items: items.filter(i => i.kind === 'projecttaak') },
  ].filter(g => g.items.length > 0);

  return (
    <div className={`${theme.card} ${theme.radiusCard} ${theme.padRow} space-y-3`}>
      <h2 className={`text-xs font-semibold uppercase tracking-wide ${theme.textMuted}`}>
        {t('planner.pool.title')}
      </h2>

      {canAddTask && (
        <div className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder={t('modules.addTaskPlaceholder')}
            className={`flex-1 min-w-0 px-3 py-2 ${theme.input} ${theme.radiusControl} text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
          />
          <button
            type="button"
            onClick={submit}
            aria-label={t('productivity.addCard')}
            className={`px-3 py-2 ${theme.accentBg} ${theme.radiusControl} transition shrink-0`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      )}

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        className="space-y-3 min-h-[3rem]"
      >
        {items.length === 0 ? (
          <p className={`text-sm ${theme.textMuted} text-center py-4`}>
            {t('planner.pool.empty')}
          </p>
        ) : (
          groups.map(group => (
            <section key={group.kind} className="space-y-1.5">
              <h3 className={`text-[11px] font-semibold uppercase tracking-wide ${theme.textMuted}`}>
                {t(`productivity.types.${group.kind}`)}
              </h3>
              {group.items.map(item => (
                <PoolItemRow
                  key={item.key}
                  item={item}
                  dayOptions={dayOptions}
                  selectedDateKey={selectedDateKey}
                  onMoveItem={onMoveItem}
                  theme={theme}
                  t={t}
                />
              ))}
            </section>
          ))
        )}
      </div>
    </div>
  );
}

function PoolItemRow({ item, dayOptions, selectedDateKey, onMoveItem, theme, t }) {
  const c = getColorClasses(item.color);

  return (
    <div
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', encodeDragPayload(selectedDateKey, item.key))}
      className={`flex items-center gap-2 ${theme.padRow} ${theme.cardSecondary} ${theme.radiusControl} cursor-grab active:cursor-grabbing`}
    >
      <button
        type="button"
        onClick={item.toggle}
        disabled={!item.toggle}
        aria-label={t('productivity.toggleAria', { label: item.label })}
        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
          item.status ? `${c.bar} border-transparent` : theme.border
        }`}
      >
        {item.status && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${item.status ? `line-through ${theme.textMuted}` : theme.textSecondary}`}>
          {item.label}
        </div>
        <div className={`text-[11px] ${theme.textMuted}`}>{t('planner.pool.durationHint')}</div>
      </div>

      <TimeInput
        value=""
        onChange={(v) => v && onMoveItem(item.key, selectedDateKey, selectedDateKey, v)}
        theme={theme}
        className="w-20 shrink-0"
      />

      <select
        value={selectedDateKey}
        onChange={(e) => onMoveItem(item.key, selectedDateKey, e.target.value, item.time || undefined)}
        aria-label={t('planner.pool.moveToDayAria')}
        className={`text-xs px-1.5 py-1.5 ${theme.input} ${theme.radiusControl} shrink-0`}
      >
        {dayOptions.map(opt => (
          <option key={opt.dateKey} value={opt.dateKey}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}
