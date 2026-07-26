import React, { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { formatEuro } from '../../../utils/household';
import { fmtDate } from './format';

// Waarde inline bewerken (V11, #134): dezelfde Escape-dan-blur-guard als
// src/components/TaskListPanel.jsx. Alleen de waarde is bewerkbaar; de datum
// blijft read-only (zie issue #134, "kleine follow-up"). Lege/ongeldige
// invoer wordt door de aanroeper (onEditValue) genegeerd.
export default function MeasurementList({ events, onRemove, onEditValue, theme }) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const justCancelledRef = useRef(false);
  const editSessionRef = useRef(null);

  const startEdit = (e) => {
    justCancelledRef.current = false;
    editSessionRef.current = e.id;
    setDraft(String(e.amount));
    setEditingId(e.id);
  };
  const commitEdit = (id) => {
    if (justCancelledRef.current) {
      justCancelledRef.current = false;
      return;
    }
    if (editSessionRef.current !== id) return;
    editSessionRef.current = null;
    onEditValue?.(id, draft);
    setEditingId(null);
  };
  const cancelEdit = () => {
    justCancelledRef.current = true;
    editSessionRef.current = null;
    setEditingId(null);
    setDraft('');
  };

  if (!events || events.length === 0) return null;
  return (
    <ul className="space-y-1">
      {events.map(e => (
        <li key={e.id} className={`flex items-center gap-3 p-2 rounded-lg ${theme.card}`}>
          <span className={`text-xs ${theme.textMuted} flex-1`}>{fmtDate(e.date)}</span>
          {editingId === e.id ? (
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={draft}
              onChange={ev => setDraft(ev.target.value)}
              onBlur={() => commitEdit(e.id)}
              onKeyDown={ev => {
                if (ev.key === 'Enter') commitEdit(e.id);
                if (ev.key === 'Escape') cancelEdit();
              }}
              aria-label={t('household.investments.editMeasurementAria')}
              className={`w-24 text-sm font-medium px-1 py-0.5 ${theme.input} rounded focus:outline-none focus:ring-2 focus:ring-blue-300`}
            />
          ) : (
            <span
              onClick={() => startEdit(e)}
              className={`text-sm font-medium ${theme.text} cursor-text`}
            >
              {formatEuro(e.amount)}
            </span>
          )}
          <button
            onClick={() => onRemove(e.id)}
            aria-label={t('household.investments.removeMeasurementAria')}
            className={`p-1 rounded ${theme.textMuted} ${theme.hover} transition`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
