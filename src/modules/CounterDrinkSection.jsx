import React from 'react';
import { formatAmount } from '../utils/format';
import { useTranslation } from '../i18n/useTranslation';

// De drinkkant van een samengevoegde voedingskaart (#151, Poort-0: één
// kaart, twee modules). Losgetrokken van CounterUI om dezelfde reden als
// CounterNutritionPanel (#141): CounterUI blijft vrij van drink-specifieke
// opmaak, en dit blok kan straight herbruikt worden. Toont bewust een balk,
// geen tweede ring — de kcal-ring blijft de hoofdweergave van de kaart.
//
// `drink` is het bundel dat App.jsx al opbouwt (module, name, data,
// onAddEntry/onRemoveEntry/onSetEntryAmount, allemaal al gebonden aan
// drinkModule.id) — geen nieuw schrijfpad, dezelfde handlers als de
// standalone drinkkaart. `activeCategory`/`onCategoryChange` zijn controlled
// state van de aanroeper (CounterUI), zodat dezelfde categoriekeuze ook de
// handmatige ml-invoer in het bedrag-veld van de kaart kan sturen.
export default function CounterDrinkSection({
  drink,
  activeCategory,
  onCategoryChange,
  editable = true,
  theme,
  darkMode,
}) {
  const { t } = useTranslation();
  const mod = drink.module;
  const unit = mod.unit || 'ml';
  const dailyGoal = mod.dailyGoal ?? 0;
  const presets = mod.presets || [];
  const categoriesEnabled = !!mod.categoriesEnabled;
  const categories = mod.categories || [];
  const total = drink.data?.total ?? drink.data?.minutes ?? 0;

  const pct = dailyGoal > 0 ? Math.min(100, (total / dailyGoal) * 100) : 0;
  const reachedGoal = dailyGoal > 0 && total >= dailyGoal;
  const barColor = reachedGoal
    ? 'bg-green-500'
    : darkMode ? `bg-${mod.color}-400` : `bg-${mod.color}-500`;
  const goalValue = dailyGoal > 0
    ? `${formatAmount(total, unit)} / ${formatAmount(dailyGoal, unit)}`
    : formatAmount(total, unit);

  return (
    <div className={`pt-3 mt-1 border-t ${theme.border} mb-3`}>
      <div className={`text-sm font-medium ${theme.textSecondary} mb-1.5`}>
        {t('nutrition.drink.mergedLabel', { name: drink.name, value: goalValue })}
      </div>
      <div className={`w-full ${theme.progressBg} rounded-full h-2 overflow-hidden mb-3`}>
        <div
          className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      {categoriesEnabled && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map(cat => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => onCategoryChange(cat)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  active
                    ? `bg-${mod.color}-500 text-white`
                    : `${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {presets.length > 0 && (
        <div className={`grid gap-2 ${presets.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {presets.map((amount, i) => (
            <button
              key={`${amount}-${i}`}
              onClick={() => drink.onAddEntry(amount, activeCategory)}
              disabled={!editable}
              className={`py-2 ${darkMode ? `bg-${mod.color}-900/30 hover:bg-${mod.color}-900/50 text-${mod.color}-300` : `bg-${mod.color}-50 hover:bg-${mod.color}-100 text-${mod.color}-700`} rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              + {formatAmount(amount, unit)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
