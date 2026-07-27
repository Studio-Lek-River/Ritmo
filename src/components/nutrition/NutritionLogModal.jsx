import React, { useMemo, useState } from 'react';
import { X, Plus, Search, Utensils, Layers, UtensilsCrossed } from 'lucide-react';
import EmptyState from '../EmptyState';
import NutritionItemForm from './NutritionItemForm';
import { useNutritionLibrary } from '../../context/NutritionLibraryContext';
import {
  buildNutritionLog, buildPortionLog, buildMealLog,
  portionRate, mealRate, missingProductIds, missingPortionIds,
} from '../../utils/nutrition';
import { parseMeasurementInput } from '../../utils/measurements';
import { useTranslation } from '../../i18n/useTranslation';

// Twee stappen, mobiel-eerst (#141): Kiezen (zoeken in de bibliotheek, of
// een nieuw item vastleggen) en Hoeveelheid (live kcal-preview, bevestigen
// pas mogelijk bij een geldige hoeveelheid). Modal-skelet identiek aan het
// voormalige NutritionLibraryModal (sinds #146 het NutritionLibraryPanel in
// Instellingen → Voeding); niet in modules/ want #147 hergebruikt hem voor
// porties/maaltijden en hij is niet counter-specifiek.
//
// #147: producten, porties en maaltijden staan naast elkaar in de
// keuzelijst. De geselecteerde keuze is daarom
// { kind: 'item' | 'portion' | 'meal', data } i.p.v. een kaal item — zelfde
// reden als bij selectedItem hierboven: `library` komt uit useStoredState en
// loopt een render achter, dus een object i.p.v. een id-lookup.
// `drinkTarget` is de al opgeloste drinkteller ({ id, name }) of null (#143).
// De modal rekent zelf niets uit over modules; hij toont alleen vooraf waar
// de ml naartoe gaan, zodat de dubbele boeking geen verrassing is.
export default function NutritionLogModal({ onSubmit, onClose, drinkTarget = null, theme }) {
  const { t } = useTranslation();
  const { library, addItem } = useNutritionLibrary();
  const [step, setStep] = useState('pick');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [mode, setMode] = useState('base');
  const [rawAmount, setRawAmount] = useState('');

  const items = library?.items || [];
  const portions = library?.portions || [];
  const meals = library?.meals || [];
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => it.name.toLowerCase().includes(q));
  }, [items, query]);
  const filteredPortions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return portions;
    return portions.filter((p) => p.name.toLowerCase().includes(q));
  }, [portions, query]);
  const filteredMeals = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return meals;
    return meals.filter((m) => m.name.toLowerCase().includes(q));
  }, [meals, query]);

  // Default-mode is altijd 'base' (g/ml): bij een portie is 100 geen zinnig
  // voorstel, dus wordt het gewicht van één portie voorgevuld. Pas als de
  // gebruiker expliciet naar het portie-label toggelt, wordt de input een
  // aantal in plaats van een gewicht (zie switchMode in AmountStep).
  const selectItem = (item) => {
    const hasPortion = !!item.portion;
    setSelected({ kind: 'item', data: item });
    setMode('base');
    setRawAmount(hasPortion ? String(item.portion.amount) : '100');
    setStep('amount');
  };

  // Bij een portie of maaltijd is de hoeveelheid altijd een aantal,
  // voorgevuld met 1 (Poort-0: porties/maaltijden aanmaken kan alleen in de
  // beheermodal, hier dus geen g/ml-modetoggle nodig).
  const selectPortion = (portion) => {
    setSelected({ kind: 'portion', data: portion });
    setMode('base');
    setRawAmount('1');
    setStep('amount');
  };

  const selectMeal = (meal) => {
    setSelected({ kind: 'meal', data: meal });
    setMode('base');
    setRawAmount('1');
    setStep('amount');
  };

  const handleItemSaved = (savedItem) => {
    addItem(savedItem);
    setFormOpen(false);
    selectItem(savedItem);
  };

  const quantity = parseMeasurementInput(rawAmount);
  const log = useMemo(() => {
    if (!selected || quantity === null) return null;
    if (selected.kind === 'portion') {
      return buildPortionLog(selected.data, items, { count: quantity });
    }
    if (selected.kind === 'meal') {
      return buildMealLog(selected.data, portions, items, { count: quantity });
    }
    return buildNutritionLog(selected.data, { quantity, mode });
  }, [selected, quantity, mode, items, portions]);

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
              items={filteredItems}
              portions={filteredPortions}
              meals={filteredMeals}
              allItems={items}
              allPortions={portions}
              hasLibraryEntries={items.length > 0 || portions.length > 0 || meals.length > 0}
              onSelectItem={selectItem}
              onSelectPortion={selectPortion}
              onSelectMeal={selectMeal}
              onAddNew={() => setFormOpen(true)}
            />
          ) : (
            <AmountStep
              t={t}
              theme={theme}
              selected={selected}
              items={items}
              portions={portions}
              mode={mode}
              setMode={setMode}
              rawAmount={rawAmount}
              setRawAmount={setRawAmount}
              log={log}
              drinkTarget={drinkTarget}
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

// Producten, porties en maaltijden in één lijst (#142, uitgebreid in #147):
// de gebruiker kiest wat hij wil loggen zonder eerst tussen categorieën te
// moeten schakelen. Producten staan eerst, dan porties, dan maaltijden — alle
// drie blijven zichtbaar onder dezelfde zoekfilter.
function PickStep({ t, theme, query, setQuery, items, portions, meals, allItems, allPortions, hasLibraryEntries, onSelectItem, onSelectPortion, onSelectMeal, onAddNew }) {
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

      {!hasLibraryEntries ? (
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
              <li key={`item-${item.id}`}>
                <button
                  type="button"
                  onClick={() => onSelectItem(item)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 ${theme.cardSecondary} ${theme.hover} rounded-xl text-left transition`}
                >
                  <span className={`text-sm font-medium ${theme.textSecondary} truncate`}>{item.name}</span>
                  <span className={`text-[11px] ${theme.textMuted} flex-shrink-0`}>
                    {t('nutrition.library.itemPer100', { kcal: item.per100.kcal, unit: t(`modules.units.${item.unit}`) })}
                  </span>
                </button>
              </li>
            ))}
            {portions.map((portion) => (
              <li key={`portion-${portion.id}`}>
                <button
                  type="button"
                  onClick={() => onSelectPortion(portion)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 ${theme.cardSecondary} ${theme.hover} rounded-xl text-left transition`}
                >
                  <Layers className={`w-4 h-4 flex-shrink-0 ${theme.textMuted}`} />
                  <span className={`flex-1 min-w-0 text-sm font-medium ${theme.textSecondary} truncate`}>{portion.name}</span>
                  <span className={`text-[11px] ${theme.textMuted} flex-shrink-0`}>
                    {t('nutrition.portion.totalLabel', { kcal: Math.round(portionRate(portion, allItems, 'kcal')) })}
                  </span>
                </button>
              </li>
            ))}
            {meals.map((meal) => (
              <li key={`meal-${meal.id}`}>
                <button
                  type="button"
                  onClick={() => onSelectMeal(meal)}
                  className={`w-full flex items-center gap-2 px-3 py-2.5 ${theme.cardSecondary} ${theme.hover} rounded-xl text-left transition`}
                >
                  <UtensilsCrossed className={`w-4 h-4 flex-shrink-0 ${theme.textMuted}`} />
                  <span className={`flex-1 min-w-0 text-sm font-medium ${theme.textSecondary} truncate`}>{meal.name}</span>
                  <span className={`text-[11px] ${theme.textMuted} flex-shrink-0`}>
                    {t('nutrition.meal.totalLabel', { kcal: Math.round(mealRate(meal, allPortions, allItems, 'kcal')) })}
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

function AmountStep({ t, theme, selected, items, portions, mode, setMode, rawAmount, setRawAmount, log, drinkTarget, onBack, onConfirm }) {
  const isPortion = selected?.kind === 'portion';
  const isMeal = selected?.kind === 'meal';
  const isGrouped = isPortion || isMeal;
  const item = !isGrouped ? selected?.data : null;
  const groupEntity = isGrouped ? selected.data : null;
  const hasPortion = !!item?.portion;
  // `item` is null zodra er een portie of maaltijd gekozen is; de
  // portie-modus kan daar vandaag niet bij horen (de modetoggle rendert
  // alleen voor een los product), maar optional chaining houdt die aanname
  // uit het crashpad — een label is nooit een reden voor een TypeError.
  const unitLabel = mode === 'portion' ? item?.portion?.label : t(`modules.units.${item?.unit}`);
  const missingIds = isPortion
    ? missingProductIds(groupEntity, items)
    : isMeal
      ? missingPortionIds(groupEntity, portions)
      : [];

  // Exact dezelfde formule als addNutritionEntry in App.jsx gebruikt, uit
  // dezelfde bevroren perUnit — de preview kan dus niet afwijken van wat er
  // straks daadwerkelijk geboekt wordt.
  const drinkMl = log ? Math.round(log.source.quantity * (log.source.perUnit?.ml ?? 0)) : 0;

  // Bij 'portion' is de input een aantal (default 1 portie); bij 'base' is
  // het weer een gewicht/volume (default: het gewicht van één portie).
  const switchMode = (nextMode) => {
    setMode(nextMode);
    setRawAmount(nextMode === 'portion' ? '1' : String(item.portion.amount));
  };

  return (
    <div>
      <p className={`text-sm font-medium ${theme.textSecondary} mb-3`}>{isGrouped ? groupEntity.name : item.name}</p>

      {!isGrouped && hasPortion && (
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
        <p className={`text-xs ${theme.textMuted} mb-1`}>
          {isPortion
            ? t('nutrition.log.portionAmountLabel')
            : isMeal
              ? t('nutrition.log.mealAmountLabel')
              : t('nutrition.log.amountLabel', { unit: unitLabel })}
        </p>
        <input
          type="text"
          inputMode="decimal"
          autoFocus
          value={rawAmount}
          onChange={(e) => setRawAmount(e.target.value)}
          className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
        />
      </div>

      {isPortion && missingIds.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
          {missingIds.length === 1
            ? t('nutrition.portion.missingHint', { count: missingIds.length })
            : t('nutrition.portion.missingHintPlural', { count: missingIds.length })}
        </p>
      )}
      {isMeal && missingIds.length > 0 && (
        <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
          {missingIds.length === 1
            ? t('nutrition.meal.missingHint', { count: missingIds.length })
            : t('nutrition.meal.missingHintPlural', { count: missingIds.length })}
        </p>
      )}

      <div className="mb-4">
        <p className={`text-sm font-medium ${theme.textSecondary}`}>
          {log ? t('nutrition.log.preview', { kcal: log.amount }) : t('nutrition.log.previewInvalid')}
        </p>
        {drinkTarget && drinkMl > 0 && (
          <p className={`text-xs ${theme.textMuted} mt-1`}>
            {t('nutrition.log.drinkPreview', { ml: drinkMl, name: drinkTarget.name })}
          </p>
        )}
      </div>

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
