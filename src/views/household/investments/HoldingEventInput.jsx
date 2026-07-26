import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from '../../../i18n/useTranslation';
import { formatEuro } from '../../../utils/household';
import { todayKey } from '../../../utils/dates';
import { parseAmount, computeAmount } from '../../../utils/investments';

// Invoerregel voor een nieuwe meting. `entryMode` bepaalt de variant:
// 'total' vraagt een enkel bedrag (bestaand gedrag); 'shares' vraagt aantal
// en koers en toont de berekende waarde vooraf. `onAdd(date, amount, extra)`
// — `extra` is `{ shares, price }` in shares-modus, anders undefined.
export default function HoldingEventInput({ entryMode, onAdd, theme }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState('');
  const [shares, setShares] = useState('');
  const [price, setPrice] = useState('');

  const isShares = entryMode === 'shares';
  const sharesNum = parseAmount(shares);
  const priceNum = parseAmount(price);
  // Negatieve aantallen of koersen zijn betekenisloos (randgeval uit de spec).
  const sharesValid = sharesNum !== null && sharesNum >= 0;
  const priceValid = priceNum !== null && priceNum >= 0;
  const computed = isShares && sharesValid && priceValid ? computeAmount(sharesNum, priceNum) : null;

  const canAdd = isShares ? computed !== null : parseAmount(amount) !== null;

  const add = () => {
    if (!date || !canAdd) return;
    if (isShares) {
      onAdd(date, computed, { shares: sharesNum, price: priceNum });
      setShares('');
      setPrice('');
    } else {
      onAdd(date, parseAmount(amount));
      setAmount('');
    }
  };

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          aria-label={t('household.investments.fieldDate')}
          className={`flex-1 min-w-0 px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
        />
        {isShares ? (
          <>
            <input
              type="text"
              inputMode="decimal"
              value={shares}
              onChange={e => setShares(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={t('household.investments.fieldShares')}
              aria-label={t('household.investments.fieldShares')}
              className={`w-20 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
            />
            <input
              type="text"
              inputMode="decimal"
              value={price}
              onChange={e => setPrice(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && add()}
              placeholder={t('household.investments.fieldPrice')}
              aria-label={t('household.investments.fieldPrice')}
              className={`w-20 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
            />
          </>
        ) : (
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
        )}
        <button
          onClick={add}
          disabled={!canAdd}
          aria-label={t('household.investments.addMeasurement')}
          className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {isShares && computed !== null && (
        <div className={`text-xs ${theme.textMuted}`}>
          {t('household.investments.computedValue', { value: formatEuro(computed) })}
        </div>
      )}
    </div>
  );
}
