import React, { useState } from 'react';
import { Check, Plus, Minus, Info, StickyNote, Sparkles, Settings } from 'lucide-react';
import { normalizeChecklistItemData, isChecklistItemComplete } from '../utils/dayProgress';

function CheckboxControl({ color, checked, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={checked ? 'Uitvinken' : 'Afvinken'}
      className={`w-7 h-7 rounded-md border-2 flex items-center justify-center transition flex-shrink-0 disabled:cursor-not-allowed ${
        checked ? `bg-${color}-500 border-${color}-500 check-pop` : 'border-slate-300'
      }`}
    >
      {checked && <Check className="w-4 h-4 text-white" />}
    </button>
  );
}

function ProgressControl({ color, progress, target, complete, onIncrement, disabled, t }) {
  return (
    <div className="flex items-center gap-1.5 flex-shrink-0">
      <button
        onClick={() => onIncrement(-1)}
        disabled={disabled || progress <= 0}
        aria-label="Min"
        className={`w-7 h-7 rounded-md flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed ${t.cardSecondary} ${t.textSecondary} ${t.hover}`}
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className={`text-xs font-mono tabular-nums w-10 text-center ${complete ? `text-${color}-500 font-semibold` : t.textSecondary}`}>
        {progress}/{target}
      </span>
      <button
        onClick={() => onIncrement(1)}
        disabled={disabled}
        aria-label="Plus"
        className={`w-7 h-7 rounded-md flex items-center justify-center transition disabled:opacity-30 disabled:cursor-not-allowed ${
          complete ? `bg-${color}-500 text-white` : `${t.cardSecondary} ${t.textSecondary} ${t.hover}`
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
  t,
}) {
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
    <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
      <div className="flex items-center gap-2 mb-4">
        <Glyph className={`w-5 h-5 ${colorClass}`} />
        <h2 className={`font-semibold ${t.textSecondary}`}>{mod.name}</h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className={`ml-auto p-1.5 ${t.hover} rounded-lg ${t.textMuted} transition`}
            title="Module-instellingen"
            aria-label={`Instellingen voor ${mod.name}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <p className={`${t.textMuted} text-sm text-center py-4`}>
          Voeg items toe via instellingen ⚙️
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
              <div key={item.id} className={`rounded-lg ${complete ? t.cardSecondary : ''}`}>
                <div className={`flex items-center gap-3 p-3 rounded-lg transition ${!complete ? t.hover : ''}`}>
                  {item.target ? (
                    <ProgressControl
                      color={mod.color}
                      progress={progress}
                      target={item.target}
                      complete={complete}
                      onIncrement={(delta) => onIncrement(item.id, delta)}
                      disabled={!editable}
                      t={t}
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
                    <div className={`text-sm text-left ${complete ? `line-through ${t.textMuted}` : t.textSecondary}`}>
                      {item.label}
                    </div>
                    {hasNote && !noteOpen && (
                      <div className={`text-xs italic ${t.textMuted} mt-0.5 truncate`}>
                        {note}
                      </div>
                    )}
                  </div>

                  {hasDescription && (
                    <button
                      onClick={() => toggleInfo(item.id)}
                      aria-label="Toon instructie"
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition flex-shrink-0 ${
                        infoOpen ? 'bg-blue-500 text-white' : `${t.textMuted} ${t.hover}`
                      }`}
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}

                  {mod.allowNotes && (
                    <button
                      onClick={() => toggleNote(item.id)}
                      disabled={!editable && !hasNote}
                      aria-label="Notitie"
                      className={`w-7 h-7 rounded-md flex items-center justify-center transition flex-shrink-0 disabled:cursor-not-allowed ${
                        noteOpen
                          ? 'bg-amber-500 text-white'
                          : hasNote
                            ? 'text-amber-500 hover:bg-amber-100 dark:hover:bg-amber-900/30'
                            : `${t.textMuted} ${t.hover}`
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
                      placeholder="Korte notitie voor vandaag..."
                      className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 disabled:opacity-60`}
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
