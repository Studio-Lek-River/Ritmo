import React, { useState, useRef } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { formatEuro } from '../../../utils/household';
import { formatAmountInput, hasSharesAndPrice } from '../../../utils/investments';
import { fmtDate, formatShares } from './format';

// Waarde inline bewerken (V11, #134; uitgebreid met aantal/koers in #115).
// Dezelfde Escape-dan-blur-guard als src/components/TaskListPanel.jsx.
// Rijweergave is data-gedreven (hasSharesAndPrice(e)), niet entry-gedreven:
// een meting met aantal én koers toont die twee los bewerkbaar plus een
// read-only berekende waarde; anders het bestaande enkele-bedrag-gedrag.
// De sessiesleutel is `${id}:${field}` zodat blur van het ene veld (bv.
// shares) het andere (price) niet per ongeluk commit.
export default function MeasurementList({ events, onRemove, onEditValue, onEditShares, theme }) {
  const { t } = useTranslation();
  const [editingKey, setEditingKey] = useState(null);
  const [draft, setDraft] = useState('');
  const justCancelledRef = useRef(false);
  const editSessionRef = useRef(null);

  const startEdit = (id, field, value) => {
    const key = `${id}:${field}`;
    justCancelledRef.current = false;
    editSessionRef.current = key;
    setDraft(formatAmountInput(value));
    setEditingKey(key);
  };
  const commitEdit = (id, field) => {
    const key = `${id}:${field}`;
    if (justCancelledRef.current) {
      justCancelledRef.current = false;
      return;
    }
    if (editSessionRef.current !== key) return;
    editSessionRef.current = null;
    if (field === 'amount') onEditValue?.(id, draft);
    else onEditShares?.(id, field, draft);
    setEditingKey(null);
  };
  const cancelEdit = () => {
    justCancelledRef.current = true;
    editSessionRef.current = null;
    setEditingKey(null);
    setDraft('');
  };

  if (!events || events.length === 0) return null;

  const renderInput = (id, field, ariaKey) => (
    <input
      type="text"
      inputMode="decimal"
      autoFocus
      value={draft}
      onChange={ev => setDraft(ev.target.value)}
      onBlur={() => commitEdit(id, field)}
      onKeyDown={ev => {
        if (ev.key === 'Enter') commitEdit(id, field);
        if (ev.key === 'Escape') cancelEdit();
      }}
      aria-label={t(ariaKey)}
      className={`w-16 text-sm font-medium px-1 py-0.5 ${theme.input} rounded focus:outline-none focus:ring-2 focus:ring-blue-300`}
    />
  );

  return (
    <ul className="space-y-1">
      {events.map(e => {
        const withShares = hasSharesAndPrice(e);
        return (
          <li key={e.id} className={`flex items-center gap-3 p-2 rounded-lg ${theme.card}`}>
            <span className={`text-xs ${theme.textMuted} flex-1`}>{fmtDate(e.date)}</span>
            {withShares ? (
              <div className="flex items-center gap-1.5">
                {editingKey === `${e.id}:shares`
                  ? renderInput(e.id, 'shares', 'household.investments.editSharesAria')
                  : (
                    <span
                      onClick={() => startEdit(e.id, 'shares', e.shares)}
                      className={`text-sm font-medium ${theme.text} cursor-text`}
                    >
                      {formatShares(e.shares)}
                    </span>
                  )}
                <span className={`text-xs ${theme.textMuted}`}>×</span>
                {editingKey === `${e.id}:price`
                  ? renderInput(e.id, 'price', 'household.investments.editPriceAria')
                  : (
                    <span
                      onClick={() => startEdit(e.id, 'price', e.price)}
                      className={`text-sm font-medium ${theme.text} cursor-text`}
                    >
                      {formatEuro(e.price)}
                    </span>
                  )}
                <span className={`text-xs ${theme.textMuted}`}>= {formatEuro(e.amount)}</span>
              </div>
            ) : (
              editingKey === `${e.id}:amount`
                ? renderInput(e.id, 'amount', 'household.investments.editMeasurementAria')
                : (
                  <span
                    onClick={() => startEdit(e.id, 'amount', e.amount)}
                    className={`text-sm font-medium ${theme.text} cursor-text`}
                  >
                    {formatEuro(e.amount)}
                  </span>
                )
            )}
            <button
              onClick={() => onRemove(e.id)}
              aria-label={t('household.investments.removeMeasurementAria')}
              className={`p-1 rounded ${theme.textMuted} ${theme.hover} transition`}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
