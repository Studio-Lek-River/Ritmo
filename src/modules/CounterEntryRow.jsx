import React, { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatAmount } from '../utils/format';
import { useTranslation } from '../i18n/useTranslation';
import { useUndoToast } from '../hooks/useUndoToast';

// Eén gelogde teller-regel, geëxtraheerd uit CounterModule.jsx (V10, #133) —
// nul gedragswijziging bij deze extractie zelf (#141). Per-rij state
// (i.p.v. gedeeld op CounterUI-niveau) is hier correcter: er kan door focus
// toch maar één rij tegelijk in bewerkmodus staan. Het escape/blur-guard-
// patroon (cancelledRef) blijft nodig: Escape sluit de input terwijl hij
// focus heeft, en sommige browsers vuren daarna alsnog een blur op de al
// wegrenderende node — die late blur moet genegeerd worden.
export default function CounterEntryRow({
  entry,
  unit,
  mod,
  editable,
  onRemoveEntry,
  onSetAmount,
  theme,
  darkMode,
}) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const cancelledRef = useRef(false);

  const startEdit = () => {
    if (!editable) return;
    cancelledRef.current = false;
    setDraft(String(entry.amount));
    setEditing(true);
  };

  const cancelEdit = () => {
    cancelledRef.current = true;
    setEditing(false);
    setDraft('');
  };

  const commitEdit = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    setEditing(false);
    const parsed = parseFloat(draft);
    if (parsed > 0) onSetAmount?.(entry.id, parsed);
  };

  const handleRemove = () => {
    const result = onRemoveEntry?.(entry.id);
    showUndoToast(t('toast.counterEntryDeleted'), () => result?.undo?.());
  };

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${theme.cardSecondary} text-sm`}>
      {editing ? (
        <input
          type="number"
          inputMode="decimal"
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') cancelEdit();
          }}
          aria-label={t('modules.counterEntryEditAria')}
          className={`w-20 min-w-0 px-2 py-1 text-sm ${theme.input} rounded focus:outline-none focus:ring-2 focus:ring-${mod.color}-300`}
        />
      ) : (
        <span
          onClick={startEdit}
          className={`font-medium ${theme.textSecondary} ${editable ? 'cursor-text' : ''}`}
        >
          {formatAmount(entry.amount, unit)}
        </span>
      )}
      {entry.category && (
        <span className={`px-2 py-0.5 rounded-full text-xs ${darkMode ? `bg-${mod.color}-900/40 text-${mod.color}-300` : `bg-${mod.color}-100 text-${mod.color}-700`}`}>
          {entry.category}
        </span>
      )}
      <span className={`text-xs ${theme.textMuted} ml-auto`}>{entry.time}</span>
      {editable && (
        <button
          onClick={handleRemove}
          aria-label={t('common.delete')}
          className={`p-1 rounded ${theme.hover} ${theme.textMuted} hover:text-red-500 transition`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
