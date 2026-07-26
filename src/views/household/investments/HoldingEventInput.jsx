import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { todayKey } from '../../../utils/dates';
import { parseAmount } from '../../../utils/investments';

export default function HoldingEventInput({ onAdd, theme }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState('');

  const add = () => {
    const val = parseAmount(amount);
    if (val === null || !date) return;
    onAdd(date, val);
    setAmount('');
  };

  return (
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
        placeholder={t('household.investments.fieldAmountHolding')}
        aria-label={t('household.investments.fieldAmountHolding')}
        className={`w-28 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
      />
      <button
        onClick={add}
        disabled={parseAmount(amount) === null}
        aria-label={t('household.investments.addMeasurement')}
        className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}
