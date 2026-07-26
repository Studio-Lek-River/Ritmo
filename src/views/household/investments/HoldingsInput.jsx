import React, { useState, useRef } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { useUndoToast } from '../../../hooks/useUndoToast';
import ConfirmDialog from '../../../components/ConfirmDialog';
import { formatEuro } from '../../../utils/household';
import { COLOR_OPTIONS } from '../../../utils/colors';
import { parseAmount, sortedAsc, newId } from '../../../utils/investments';
import HoldingEventInput from './HoldingEventInput';
import MeasurementList from './MeasurementList';

// Laatst bekende waarde van een aandeel (chronologisch laatste event), of null.
function holdingCurrent(holding) {
  const evs = sortedAsc(holding?.events);
  return evs.length ? evs[evs.length - 1].amount : null;
}

// ── Per-aandeel-modus ───────────────────────────────────────────────────────

export default function HoldingsInput({ investments, setInvestments, theme }) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();
  const [expandedId, setExpandedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [confirmDeleteHolding, setConfirmDeleteHolding] = useState(null);
  const [editingHoldingId, setEditingHoldingId] = useState(null);
  const [holdingDraft, setHoldingDraft] = useState('');
  // Zelfde Escape-dan-blur-guard als src/components/TaskListPanel.jsx (V04,
  // #127): Escape sluit de input terwijl hij focus heeft, maar sommige
  // browsers vuren daarna alsnog een blur-event op de node die al aan het
  // wegrenderen is. `editSessionRef` volgt buiten React-state om welke
  // holding-id nog actief bewerkt wordt.
  const justCancelledRef = useRef(false);
  const editSessionRef = useRef(null);

  const holdings = investments.holdings || [];

  const addHolding = () => {
    const name = newName.trim();
    if (!name) return;
    setInvestments(prev => {
      const list = prev.holdings || [];
      const used = new Set(list.map(h => h.color));
      const color = COLOR_OPTIONS.find(c => !used.has(c)) || COLOR_OPTIONS[list.length % COLOR_OPTIONS.length];
      return { ...prev, holdings: [...list, { id: newId(), name, color, events: [] }] };
    });
    setNewName('');
  };

  // Naam hernoemen (V11, #134). Lege naam wordt genegeerd, de oude naam
  // blijft staan.
  const renameHolding = (id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setInvestments(prev => ({
      ...prev,
      holdings: (prev.holdings || []).map(h => h.id === id ? { ...h, name: trimmed } : h),
    }));
  };

  const startEditHolding = (holding) => {
    justCancelledRef.current = false;
    editSessionRef.current = holding.id;
    setHoldingDraft(holding.name);
    setEditingHoldingId(holding.id);
  };
  const commitEditHolding = (id) => {
    if (justCancelledRef.current) {
      justCancelledRef.current = false;
      return;
    }
    if (editSessionRef.current !== id) return;
    editSessionRef.current = null;
    renameHolding(id, holdingDraft);
    setEditingHoldingId(null);
  };
  const cancelEditHolding = () => {
    justCancelledRef.current = true;
    editSessionRef.current = null;
    setEditingHoldingId(null);
    setHoldingDraft('');
  };

  const removeHolding = (id) => setInvestments(prev => ({
    ...prev,
    holdings: (prev.holdings || []).filter(h => h.id !== id),
  }));

  // Verwijderen wist het aandeel én al zijn metingen in één keer — een
  // cascade in historische meetdata (V11, #134). Vraagt daarom eerst een
  // bevestiging (ConfirmDialog, variant danger) en snapshot het volledige
  // holding-object (incl. events) voor een idempotente undo.
  const handleConfirmDeleteHolding = () => {
    if (!confirmDeleteHolding) return;
    const snapshot = confirmDeleteHolding;
    removeHolding(snapshot.id);
    setConfirmDeleteHolding(null);
    setExpandedId(prev => prev === snapshot.id ? null : prev);
    showUndoToast(t('toast.holdingDeleted'), () => {
      setInvestments(prev => (prev.holdings || []).some(h => h.id === snapshot.id)
        ? prev
        : { ...prev, holdings: [...(prev.holdings || []), snapshot] });
    });
  };

  const addEvent = (hid, date, val) => setInvestments(prev => ({
    ...prev,
    holdings: (prev.holdings || []).map(h => h.id === hid
      ? { ...h, events: [...(h.events || []), { id: newId(), date, amount: val }] }
      : h),
  }));

  // Undo-flow voor een losse meting (V11, #134): licht genoeg voor undo-only,
  // geen bevestigingsdialoog nodig.
  const removeEvent = (hid, eid) => {
    const holding = holdings.find(h => h.id === hid);
    const snapshot = holding?.events?.find(e => e.id === eid);
    setInvestments(prev => ({
      ...prev,
      holdings: (prev.holdings || []).map(h => h.id === hid
        ? { ...h, events: (h.events || []).filter(e => e.id !== eid) }
        : h),
    }));
    if (!snapshot) return;
    showUndoToast(t('toast.investmentMeasurementDeleted'), () => {
      setInvestments(prev => ({
        ...prev,
        holdings: (prev.holdings || []).map(h => {
          if (h.id !== hid) return h;
          return (h.events || []).some(e => e.id === snapshot.id)
            ? h
            : { ...h, events: [...(h.events || []), snapshot] };
        }),
      }));
    });
  };

  // Waarde inline bewerken (V11, #134): de waarde zetten volstaat, geen
  // herberekening elders. Ongeldige invoer wordt genegeerd.
  const editEventAmount = (hid, eid, valStr) => {
    const val = parseAmount(valStr);
    if (val === null) return;
    setInvestments(prev => ({
      ...prev,
      holdings: (prev.holdings || []).map(h => h.id === hid
        ? { ...h, events: (h.events || []).map(e => e.id === eid ? { ...e, amount: val } : e) }
        : h),
    }));
  };

  return (
    <div className="space-y-3">
      <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{t('household.investments.holdingsHeading')}</h3>

      <ul className="space-y-2">
        {holdings.map(h => {
          const current = holdingCurrent(h);
          const open = expandedId === h.id;
          return (
            <li key={h.id} className={`rounded-xl ${theme.cardSecondary} overflow-hidden`}>
              <div className={`w-full flex items-center gap-3 p-3 ${theme.hover} transition`}>
                {editingHoldingId === h.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={holdingDraft}
                    onChange={e => setHoldingDraft(e.target.value)}
                    onBlur={() => commitEditHolding(h.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEditHolding(h.id);
                      if (e.key === 'Escape') cancelEditHolding();
                    }}
                    onClick={e => e.stopPropagation()}
                    aria-label={t('household.investments.renameHoldingAria')}
                    className={`flex-1 min-w-0 text-sm font-medium px-1 py-0.5 ${theme.input} rounded focus:outline-none focus:ring-2 focus:ring-blue-300`}
                  />
                ) : (
                  <span
                    onClick={() => startEditHolding(h)}
                    className={`text-sm font-medium ${theme.text} truncate flex-1 text-left cursor-text`}
                  >
                    {h.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : h.id)}
                  aria-label={open ? t('common.collapse') : t('common.expand')}
                  className="flex items-center gap-2 shrink-0"
                >
                  <span className={`text-sm ${current === null ? theme.textMuted : theme.textSecondary}`}>
                    {current === null ? t('household.investments.holdingNoValue') : formatEuro(current)}
                  </span>
                  {open
                    ? <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
                    : <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />}
                </button>
              </div>
              {open && (
                <div className={`p-3 pt-0 space-y-3`}>
                  <HoldingEventInput onAdd={(date, val) => addEvent(h.id, date, val)} theme={theme} />
                  <MeasurementList
                    events={[...(h.events || [])].sort((a, b) => b.date.localeCompare(a.date))}
                    onRemove={(eid) => removeEvent(h.id, eid)}
                    onEditValue={(eid, val) => editEventAmount(h.id, eid, val)}
                    theme={theme}
                  />
                  <button
                    onClick={() => setConfirmDeleteHolding(h)}
                    className={`w-full py-2 rounded-lg text-sm font-medium text-rose-500 ${theme.hover} transition flex items-center justify-center gap-1.5`}
                  >
                    <Trash2 className="w-4 h-4" /> {t('household.investments.removeHolding')}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className={`${theme.cardSecondary} rounded-xl p-3`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHolding()}
            placeholder={t('household.investments.newHoldingPlaceholder')}
            className={`flex-1 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
          />
          <button
            onClick={addHolding}
            disabled={!newName.trim()}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> {t('household.investments.addHolding')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteHolding}
        title={confirmDeleteHolding ? t('household.investments.deleteHoldingTitle', { name: confirmDeleteHolding.name }) : ''}
        description={confirmDeleteHolding ? t('household.investments.deleteHoldingDesc', { count: (confirmDeleteHolding.events || []).length }) : ''}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleConfirmDeleteHolding}
        onCancel={() => setConfirmDeleteHolding(null)}
        theme={theme}
      />
    </div>
  );
}
