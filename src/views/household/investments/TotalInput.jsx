import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { useUndoToast } from '../../../hooks/useUndoToast';
import { todayKey } from '../../../utils/dates';
import { parseDecimalInput } from '../../../utils/numberInput';
import { newId } from '../../../utils/investments';
import MeasurementList from './MeasurementList';

// ── Totaal-modus ────────────────────────────────────────────────────────────

export default function TotalInput({ investments, setInvestments, theme }) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState('');

  const events = investments.total?.events || [];
  const sortedDesc = [...events].sort((a, b) => b.date.localeCompare(a.date));

  const add = () => {
    const val = parseDecimalInput(amount);
    if (val === null || !date) return;
    setInvestments(prev => ({
      ...prev,
      total: {
        ...(prev.total || {}),
        events: [...(prev.total?.events || []), { id: newId(), date, amount: val }],
      },
    }));
    setAmount('');
  };

  // Undo-flow (V11, #134): snapshot de meting vóórdat hij verdwijnt, undo zet
  // hem idempotent terug (geen dubbele meting als undo twee keer vuurt).
  const remove = (id) => {
    const snapshot = events.find(e => e.id === id);
    setInvestments(prev => ({
      ...prev,
      total: { ...(prev.total || {}), events: (prev.total?.events || []).filter(e => e.id !== id) },
    }));
    if (!snapshot) return;
    showUndoToast(t('toast.investmentMeasurementDeleted'), () => {
      setInvestments(prev => {
        const evs = prev.total?.events || [];
        return evs.some(e => e.id === snapshot.id)
          ? prev
          : { ...prev, total: { ...(prev.total || {}), events: [...evs, snapshot] } };
      });
    });
  };

  // Waarde inline bewerken (V11, #134): een meting is een los waarde-punt,
  // dus de waarde zetten volstaat — geen herberekening elders. Ongeldige
  // invoer wordt genegeerd, de oude waarde blijft staan.
  const editAmount = (id, valStr) => {
    const val = parseDecimalInput(valStr);
    if (val === null) return;
    setInvestments(prev => ({
      ...prev,
      total: {
        ...(prev.total || {}),
        events: (prev.total?.events || []).map(e => e.id === id ? { ...e, amount: val } : e),
      },
    }));
  };

  return (
    <div className="space-y-3">
      <div className={`${theme.cardSecondary} rounded-xl p-3 space-y-2`}>
        <div className={`text-xs font-medium ${theme.textSecondary}`}>{t('household.investments.newTotalLabel')}</div>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            aria-label={t('household.investments.fieldDate')}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
          />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={t('household.investments.fieldAmountTotal')}
            aria-label={t('household.investments.fieldAmountTotal')}
            className={`w-28 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
          />
          <button
            onClick={add}
            disabled={parseDecimalInput(amount) === null}
            aria-label={t('household.investments.addMeasurement')}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <MeasurementList events={sortedDesc} onRemove={remove} onEditValue={editAmount} theme={theme} />
    </div>
  );
}
