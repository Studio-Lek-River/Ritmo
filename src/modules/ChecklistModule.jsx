import React, { useState } from 'react';
import { Check, Plus, Minus, Info, StickyNote, Sparkles, Settings } from 'lucide-react';
import { normalizeChecklistItemData, isChecklistItemComplete } from '../utils/dayProgress';
import { useTranslation } from '../i18n/useTranslation';

function CheckboxControl({ color, checked, onClick, disabled }) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={checked ? t('modules.uncheckAria') : t('modules.checkAria')}
      className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition flex-shrink-0 disabled:cursor-not-allowed ${
        checked ? `bg-${color}-500 border-${color}-500 check-pop` : 'border-slate-300'
      }`}
    >
      {checked && <Check className="w-4 h-4 text-white" />}
    </button>
  );
}

function ProgressControl({ color, progress, target, complete, onIncrement, disabled, theme }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        onClick={() => onIncrement(-1)}
        disabled={disabled || progress <= 0}
        aria-label={t('modules.counterMin')}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed ${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className={`text-xs font-mono tabular-nums w-10 text-center ${complete ? `text-${color}-500 font-semibold` : theme.textSecondary}`}>
        {progress}/{target}
      </span>
      <button
        onClick={() => onIncrement(1)}
        disabled={disabled}
        aria-label={t('modules.counterPlus')}
        className={`w-7 h-7 rounded-md flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed ${
          complete ? `bg-${color}-500 text-white` : `${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`
        }`}
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function ChecklistModule({
  module: mod,
  Icon,
  data,
  editable = true,
  onToggle,
  onIncrement,
  onSetNote,
  onEdit,
  theme,
}) {
  const { t } = useTranslation();
  const [expandedNoteId, setExpandedNoteId] = useState(null);
  const [expandedInfoId, setExpandedInfoId] = useState(null);

  const Glyph = Icon || Sparkles;
  const colorClass = `text-${mod.color}-500`;
  const items = mod.items || [];

  const toggleNote = (id) => {
    setExpandedNoteId(prev => (prev === id ? null : id));
    setExpandedInfoId(null);
  };
  const toggleInfo = (id) => {
    setExpandedInfoId(prev => (prev === id ? null : id));
    setExpandedNoteId(null);
  };

  return (
    <div className={`${theme.card} rounded-2xl p-5 shadow-sm mb-4`}>
      <div className="flex items-center gap-2 mb-4">
        <Glyph className={`w-5 h-5 ${colorClass}`} />
        <h2 className={`font-semibold ${theme.textSecondary}`}>{mod.name}</h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className={`ml-auto p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
            title={t('modules.settingsTitle')}
            aria-label={t('modules.settingsAria', { name: mod.name })}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className={`${theme.textMuted} text-sm text-center py-4`}>
          {t('modules.addItemsHint')}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => {
            const itemData = normalizeChecklistItemData(data?.[item.id]);
            const complete = isChecklistItemComplete(item, data?.[item.id]);
            const progress = itemData.progress || 0;
            const note = itemData.note || '';
            const hasDescription = !!item.description;
            const hasNote = note.trim().length > 0;
            const noteOpen = expandedNoteId === item.id;
            const infoOpen = expandedInfoId === item.id;

            return (
              <div key={item.id} className={`rounded-lg ${complete ? theme.cardSecondary : ''}`}>
                <div className={`flex items-center gap-3 p-3 rounded-lg transition ${!complete ? theme.hover : ''}`}>
                  {item.target ? (
                    <ProgressControl
                      color={mod.color}
                      progress={progress}
                      target={item.target}
                      complete={complete}
                      onIncrement={(delta) => onIncrement(item.id, delta)}
                      disabled={!editable}
                      theme={theme}
                    />
                  ) : (
                    <CheckboxControl
                      color={mod.color}
                      checked={complete}
                      onClick={() => onToggle(item.id)}
                      disabled={!editable}
                    />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className={`text-sm text-left ${complete ? `line-through ${theme.textMuted}` : theme.textSecondary}`}>
                      {item.label}
                    </div>
                    {hasNote && !noteOpen && (
                      <div className={`text-xs italic ${theme.textMuted} mt-0.5 truncate`}>
                        {note}
                      </div>
                    )}
                  </div>

                  {hasDescription && (
                    <button
                      onClick={() => toggleInfo(item.id)}
                      aria-label={t('modules.showInstructionAria')}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition flex-shrink-0 ${
                        infoOpen ? 'bg-blue-500 text-white' : `${theme.textMuted} ${theme.hover}`
                      }`}
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}

                  {mod.allowNotes && (
                    <button
                      onClick={() => toggleNote(item.id)}
                      disabled={!editable && !hasNote}
                      aria-label={t('modules.noteAria')}
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition flex-shrink-0 disabled:cursor-not-allowed ${
                        noteOpen
                          ? 'bg-amber-500 text-white'
                          : hasNote
                            ? 'text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                            : `${theme.textMuted} ${theme.hover}`
                      }`}
                    >
                      <StickyNote className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {infoOpen && hasDescription && (
                  <div className="mx-3 mb-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800/40 text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap">
                    {item.description}
                  </div>
                )}

                {noteOpen && mod.allowNotes && (
                  <div className="mx-3 mb-2">
                    <textarea
                      value={note}
                      onChange={(e) => onSetNote(item.id, e.target.value)}
                      disabled={!editable}
                      rows={2}
                      placeholder={t('modules.dailyNotePlaceholder')}
                      className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
