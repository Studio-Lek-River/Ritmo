import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import NutritionLogModal from '../components/nutrition/NutritionLogModal';
import { useNutritionLibrary } from '../context/NutritionLibraryContext';
import { buildMealLog, mealRate } from '../utils/nutrition';
import { useTranslation } from '../i18n/useTranslation';

// Maximaal aantal eenkliks-maaltijdchips onder de logknop: meer past niet
// overzichtelijk op de dagkaart, de rest van de maaltijden blijft bereikbaar
// via de log-modal (Poort-0-keuze bij #142, niet configureerbaar gemaakt
// omdat het een layout-limiet is, geen gedragskeuze).
const MAX_MEAL_CHIPS = 4;

// Alleen de knop "Voeding loggen" plus de open/dicht-state van de modal
// (#141). Losgetrokken van CounterUI zodat (a) CounterUI vrij blijft van
// nutrition-imports en (b) een maaltijdvariant (#142/#147) hier zijn eigen
// chips kan ophangen zonder CounterUI opnieuw aan te raken. Het panel leest
// de bibliotheek zelf via useNutritionLibrary() — CounterUI en App.jsx
// blijven zo ongewijzigd.
export default function CounterNutritionPanel({ colorKey, drinkTarget = null, theme, onLog }) {
  const { t } = useTranslation();
  const { library } = useNutritionLibrary();
  const [open, setOpen] = useState(false);

  const items = library?.items || [];
  const portions = library?.portions || [];
  const mealChips = (library?.meals || []).slice(0, MAX_MEAL_CHIPS);

  const handleSubmit = (log) => {
    onLog(log);
    setOpen(false);
  };

  // Eén klik logt direct één maaltijd (buildMealLog met count: 1) —
  // dezelfde formule als de log-modal gebruikt, geen eigen rekenpad hier.
  const logMeal = (meal) => {
    const log = buildMealLog(meal, portions, items, { count: 1 });
    if (log) onLog(log);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full mb-3 inline-flex items-center justify-center gap-2 py-2 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-lg text-sm font-medium transition`}
      >
        <UtensilsCrossed className={`w-4 h-4 text-${colorKey}-500`} />
        {t('nutrition.log.title')}
      </button>
      {mealChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {mealChips.map((meal) => (
            <button
              key={meal.id}
              type="button"
              onClick={() => logMeal(meal)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-full text-xs font-medium transition`}
            >
              {t('nutrition.meal.chipLabel', {
                name: meal.name,
                kcal: Math.round(mealRate(meal, portions, items, 'kcal')),
              })}
            </button>
          ))}
        </div>
      )}
      {open && (
        <NutritionLogModal
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
          drinkTarget={drinkTarget}
          theme={theme}
        />
      )}
    </>
  );
}
