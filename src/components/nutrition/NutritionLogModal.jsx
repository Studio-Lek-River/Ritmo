import React, { useMemo, useState } from 'react';
import { X, Plus, Search, Utensils } from 'lucide-react';
import EmptyState from '../EmptyState';
import NutritionItemForm from './NutritionItemForm';
import { useNutritionLibrary } from '../../context/NutritionLibraryContext';
import { buildNutritionLog } from '../../utils/nutrition';
import { parseMeasurementInput } from '../../utils/measurements';
import { useTranslation } from '../../i18n/useTranslation';

// Twee stappen, mobiel-eerst (#141): Kiezen (zoeken in de bibliotheek, of
// een nieuw item vastleggen) en Hoeveelheid (live kcal-preview, bevestigen
// pas mogelijk bij een geldige hoeveelheid). Modal-skelet identiek aan
// NutritionLibraryModal; niet in modules/ want #142 hergebruikt hem voor
// recepten en hij is niet counter-specifiek.
export default function NutritionLogModal({ onSubmit, onClose, theme }) {
  const { t } = useTranslation();
  const { library, addItem } = useNutritionLibrary();
  const [step, setStep] = useState('pick');
  const [query, setQuery] = useState('');
  // Object, geen id-lookup: addItem geeft het opgeslagen item terug, maar
  // `library` komt uit useStoredState en is pas een render later bij.
  const [selectedItem, setSelectedItem] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState('base');
  const [rawAmount, setRawAmount] = useState('');

  const items = library?.items || [];
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q));
  }, [items, query]);

  // Default-mode is altijd 'base' (g/ml): bij een portie is 100 geen zinnig
  // voorstel, dus wordt het gewicht van één portie voorgevuld. Pas als de
  // gebruiker expliciet naar het portie-label toggelt, wordt de input een
  // aantal in plaats van een gewicht (zie switchMode in AmountStep).
  const selectItem = (item) => {
    const hasPortion = !!item.portion;
    setSelectedItem(item);
    setMode('base');
    setRawAmount(hasPortion ? String(item.portion.amount) : '100');
    setStep('amount');
  };

  const handleItemSaved = (savedItem) => {
    addItem(savedItem);
    setFormOpen(false);
    selectItem(savedItem);
  };

  const quantity = parseMeasurementInput(rawAmount);
  const log = selectedItem && quantity !== null
    ? buildNutritionLog(selectedItem, { quantity, mode })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`w-full max-w-sm ${theme.card} rounded-2xl shadow-xl`}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className={`font-semibold ${theme.text}`}>{t('nutrition.log.title')}</h3>
          <button
            type="button"
            onClick={onClose}
            className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted}`}
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-4">
          {step === 'pick' ? (
            <PickStep
              t={t}
              theme={theme}
              query={query}
              setQuery={setQuery}
              items={filtered}
              hasLibraryItems={items.length > 0}
              onSelect={selectItem}
              onAddNew={() => setFormOpen(true)}
            />
          ) : (
            <AmountStep
              t={t}
              theme={theme}
              item={selectedItem}
              mode={mode}
              setMode={setMode}
              rawAmount={rawAmount}
              setRawAmount={setRawAmount}
              log={log}
              onBack={() => setStep('pick')}
              onConfirm={() => log && onSubmit(log)}
            />
          )}
        </div>

        <NutritionItemForm
          open={formOpen}
          mode="add"
          item={null}
          onClose={() => setFormOpen(false)}
          onSave={handleItemSaved}
          theme={theme}
        />
      </div>
    </div>
  );
}

function PickStep({ t, theme, query, setQuery, items, hasLibraryItems, onSelect, onAddNew }) {
  return (
    <>
      <div className="relative mb-3">
        <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
        <input
          type="text"
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('nutrition.log.searchPlaceholder')}
          className={`w-full pl-8 pr-3 py-2 ${theme.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>

      {!hasLibraryItems ? (
        <EmptyState
          icon={Utensils}
          title={t('nutrition.library.emptyTitle')}
          description={t('nutrition.library.emptyDesc')}
          buttonLabel={t('nutrition.log.addNew')}
          onClick={onAddNew}
          theme={theme}
        />
      ) : (
        <>
          <ul className="space-y-2 max-h-72 overflow-y-auto mb-3">
            {items.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelect(item)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 ${theme.cardSecondary} ${theme.hover} rounded-xl text-left transition`}
                >
                  <span className={`text-sm font-medium ${theme.textSecondary} truncate`}>{item.name}</span>
                  <span className={`text-[11px] ${theme.textMuted} flex-shrink-0`}>
                    {t('nutrition.library.itemPer100', { kcal: item.per100.kcal, unit: t(`modules.units.${item.unit}`) })}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={onAddNew}
            className="w-full inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 font-medium text-sm transition"
          >
            <Plus className="w-4 h-4" />
            {t('nutrition.log.addNew')}
          </button>
        </>
      )}
    </>
  );
}

function AmountStep({ t, theme, item, mode, setMode, rawAmount, setRawAmount, log, onBack, onConfirm }) {
  const hasPortion = !!item?.portion;
  const unitLabel = mode === 'portion' ? item.portion.label : t(`modules.units.${item.unit}`);

  // Bij 'portion' is de input een aantal (default 1 portie); bij 'base' is
  // het weer een gewicht/volume (default: het gewicht van één portie).
  const switchMode = (nextMode) => {
    setMode(nextMode);
    setRawAmount(nextMode === 'portion' ? '1' : String(item.portion.amount));
  };

  return (
    <div>
      <p className={`text-sm font-medium ${theme.textSecondary} mb-3`}>{item.name}</p>

      {hasPortion && (
        <div className="flex gap-2 mb-3">
          <button
            type="button"
            onClick={() => switchMode('base')}
            aria-pressed={mode === 'base'}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${mode === 'base' ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`}`}
          >
            {t(`modules.units.${item.unit}`)}
          </button>
          <button
            type="button"
            onClick={() => switchMode('portion')}
            aria-pressed={mode === 'portion'}
            className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${mode === 'portion' ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`}`}
          >
            {item.portion.label}
          </button>
        </div>
      )}

      <div className="mb-3">
        <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.log.amountLabel', { unit: unitLabel })}</p>
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={rawAmount}
          onChange={(e) => setRawAmount(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>

      <p className={`text-sm font-medium ${theme.textSecondary} mb-4`}>
        {log ? t('nutrition.log.preview', { kcal: log.amount }) : t('nutrition.log.previewInvalid')}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onBack}
          className={`px-3 py-2 ${theme.cardSecondary} ${theme.textSecondary} rounded-lg text-sm font-medium transition`}
        >
          {t('common.back')}
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onConfirm}
          disabled={!log}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
        >
          {t('nutrition.log.confirm')}
        </button>
      </div>
    </div>
  );
}
