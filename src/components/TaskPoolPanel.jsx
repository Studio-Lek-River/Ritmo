import React, { useEffect, useState } from 'react';
import { Check, Clock, ExternalLink, MoreHorizontal, Plus } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { getColorClasses, getColorHex } from '../utils/colors';
import { encodeDragPayload, decodeDragPayload } from '../utils/dragPayload';
import { DEFAULT_BLOCK_MINUTES, DEFAULT_PRIORITY } from '../utils/dayTimeline';
import { SOURCE_ICONS } from '../utils/sourcePrefs';
import { getPriorityColor } from '../utils/priorityPrefs';
import TimeInput from './TimeInput';

// Takenpool voor de WeekView: alle items zonder `time` van de geselecteerde
// dag (losse taken + projecttaken), gegroepeerd per bron. Sleepbaar naar een
// dagkolom in WeekView (native HTML5 DnD, `draggable` + dataTransfer) én zelf
// een drop-target (zelfde patroon: onDragOver preventDefault + onDrop decode
// + handler) — een geagendeerd blok terugslepen naar de pool verplaatst het
// naar de geselecteerde dag en wist `time`. Elke kaart toont zijn tijd- en
// dag-controls in een "..."-menu (popover) in plaats van inline: slepen
// blijft de primaire actie, maar geen enkele interactievorm is verplicht
// (principe 2) — één klik dieper via het menu voor tijd/dag, of voor een
// kaart van een gekoppelde bron de "Openen in {bron}"-actie.
export default function TaskPoolPanel({
  items = [],
  dayOptions = [],
  selectedDateKey,
  canAddTask = false,
  onAddTask,
  onMoveItem,
  priorityPrefs,
  theme,
}) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  // Eén menu-state voor het hele paneel (niet per kaart): garandeert dat er
  // nooit twee menu's tegelijk open staan en levert één click-outside/Escape-
  // effect op in plaats van N. Het `ProjectsView`-patroon per rij kopiëren
  // zou botsen: `e.target.closest('[data-pool-menu]')` matcht dan een
  // willekeurige kaart, niet per se de kaart waarvan het menu open staat.
  const [openMenuKey, setOpenMenuKey] = useState(null);

  useEffect(() => {
    if (!openMenuKey) return undefined;
    const handleClick = (e) => {
      if (!e.target.closest('[data-pool-menu]')) setOpenMenuKey(null);
    };
    // Escape sluit ook: dit menu bevat formuliervelden (tijd-invoer, dag-
    // keuze) waar je met Tab in vast kunt lopen zonder een muisklik-uitweg.
    const handleKey = (e) => {
      if (e.key === 'Escape') setOpenMenuKey(null);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [openMenuKey]);

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
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-xs font-semibold uppercase tracking-wide ${theme.textMuted}`}>
          {t('planner.pool.title')}
        </h2>
        <span
          aria-label={t('planner.pool.countAria', { count: items.length })}
          className={`text-xs font-semibold ${theme.textMuted} ${theme.cardSecondary} ${theme.radiusControl} px-2 py-0.5`}
        >
          {items.length}
        </span>
      </div>

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
                {t(`planner.pool.groups.${group.kind}`)}
              </h3>
              {group.items.map(item => (
                <PoolItemCard
                  key={item.key}
                  item={item}
                  dayOptions={dayOptions}
                  selectedDateKey={selectedDateKey}
                  onMoveItem={onMoveItem}
                  priorityPrefs={priorityPrefs}
                  menuOpen={openMenuKey === item.key}
                  onToggleMenu={() => setOpenMenuKey(v => (v === item.key ? null : item.key))}
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

function PoolItemCard({ item, dayOptions, selectedDateKey, onMoveItem, priorityPrefs, menuOpen, onToggleMenu, theme, t }) {
  const c = getColorClasses(item.color);
  const priorityColor = getPriorityColor(priorityPrefs, item.priority || DEFAULT_PRIORITY);
  const pc = getColorClasses(priorityColor);
  // Bron-kenmerk (S08): een pool-item van een gekoppelde module (bv. Trello)
  // draagt `source.provider`, waarmee TaskPoolPanel hetzelfde icoon toont als
  // SourcesPanel/WeekView (SOURCE_ICONS, één mapping, geen tweede kopie).
  const SourceIcon = item.source ? SOURCE_ICONS[item.source.provider] : null;
  const providerLabel = item.source ? t(`connections.providers.${item.source.provider}`) : '';

  return (
    <div
      draggable={!menuOpen}
      onDragStart={(e) => e.dataTransfer.setData('text/plain', encodeDragPayload(selectedDateKey, item.key))}
      style={{ borderLeft: `4px solid ${getColorHex(item.color)}` }}
      className={`flex items-start gap-2 ${theme.padRow} ${theme.cardSecondary} ${theme.radiusControl} cursor-grab active:cursor-grabbing`}
    >
      <button
        type="button"
        onClick={item.toggle}
        disabled={!item.toggle}
        aria-label={t('productivity.toggleAria', { label: item.label })}
        className={`w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
          item.status ? `${c.bar} border-transparent` : theme.border
        }`}
      >
        {item.status && <Check className="w-3 h-3 text-white" />}
      </button>

      <div className="flex-1 min-w-0 space-y-1">
        <div className={`text-sm font-semibold truncate ${item.status ? `line-through ${theme.textMuted}` : theme.textSecondary}`}>
          {item.label}
        </div>

        <div className={`flex items-center gap-1 text-[11px] ${theme.textMuted}`}>
          <Clock className="w-3 h-3 shrink-0" />
          {t('planner.pool.durationMinutes', { min: item.duration ?? DEFAULT_BLOCK_MINUTES })}
          {item.window && <span> · {t(`productivity.dagdelen.${item.window}`)}</span>}
        </div>

        <div className="flex flex-wrap items-center gap-1">
          {item.kind === 'projecttaak' && item.projectName && (
            <span className={`text-[11px] r-chip ${c.pillBg} ${c.pillText} flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${c.bar}`} />
              {item.projectName}
            </span>
          )}
          {item.kind === 'projecttaak' && item.subjectName && (
            <span className={`text-[11px] r-chip ${theme.cardSecondary} ${theme.textMuted} border ${theme.border}`}>
              {item.subjectName}
            </span>
          )}
          <span className={`text-[11px] r-chip ${pc.pillBg} ${pc.pillText}`}>
            {t(`planner.priority.${item.priority || DEFAULT_PRIORITY}`)}
          </span>
          {item.deepWork && (
            <span className={`text-[11px] r-chip ${theme.cardSecondary} ${theme.textMuted} border ${theme.border}`}>
              {t('planner.deepWork.short')}
            </span>
          )}
          {item.source && SourceIcon && (
            <span className={`text-[11px] r-chip ${c.pillBg} ${c.pillText} flex items-center gap-1`}>
              <SourceIcon className="w-3 h-3" />
              {providerLabel}
            </span>
          )}
        </div>
      </div>

      <div className="relative shrink-0" data-pool-menu>
        <button
          type="button"
          onClick={onToggleMenu}
          aria-haspopup="true"
          aria-expanded={menuOpen}
          aria-label={t('common.options')}
          className={`p-1.5 ${theme.hover} ${theme.radiusControl} ${theme.textMuted} transition`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>

        {menuOpen && (
          <div className={`absolute right-0 top-full mt-1 z-20 ${theme.card} rounded-xl shadow-lg border ${theme.border} overflow-hidden min-w-[11rem] p-2`}>
            {item.source ? (
              item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={onToggleMenu}
                  className={`flex items-center gap-1.5 px-2 py-1.5 text-sm ${theme.radiusControl} ${theme.textSecondary} ${theme.hover} transition`}
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                  {t('planner.pool.openInSource', { provider: providerLabel })}
                </a>
              )
            ) : (
              <div className="flex flex-col gap-2">
                <TimeInput
                  value=""
                  onChange={(v) => v && onMoveItem(item.key, selectedDateKey, selectedDateKey, v)}
                  theme={theme}
                  className="w-full"
                />
                <select
                  value={selectedDateKey}
                  onChange={(e) => onMoveItem(item.key, selectedDateKey, e.target.value, item.time || undefined)}
                  aria-label={t('planner.pool.moveToDayAria')}
                  className={`w-full text-xs px-1.5 py-1.5 ${theme.input} ${theme.radiusControl}`}
                >
                  {dayOptions.map(opt => (
                    <option key={opt.dateKey} value={opt.dateKey}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
