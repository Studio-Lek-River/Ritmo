import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import NutritionLogModal from '../components/nutrition/NutritionLogModal';
import { useNutritionLibrary } from '../context/NutritionLibraryContext';
import { buildRecipeLog, recipeRate } from '../utils/nutrition';
import { useTranslation } from '../i18n/useTranslation';

// Maximaal aantal eenkliks-receptchips onder de logknop: meer past niet
// overzichtelijk op de dagkaart, de rest van de recepten blijft bereikbaar
// via de log-modal (Poort-0-keuze bij #142, niet configureerbaar gemaakt
// omdat het een layout-limiet is, geen gedragskeuze).
const MAX_RECIPE_CHIPS = 4;

// Alleen de knop "Voeding loggen" plus de open/dicht-state van de modal
// (#141). Losgetrokken van CounterUI zodat (a) CounterUI vrij blijft van
// nutrition-imports en (b) een receptvariant (#142) hier zijn eigen chips
// kan ophangen zonder CounterUI opnieuw aan te raken. Het panel leest de
// bibliotheek zelf via useNutritionLibrary() — CounterUI en App.jsx blijven
// zo ongewijzigd.
export default function CounterNutritionPanel({ colorKey, theme, onLog }) {
  const { t } = useTranslation();
  const { library } = useNutritionLibrary();
  const [open, setOpen] = useState(false);

  const items = library?.items || [];
  const recipeChips = (library?.recipes || []).slice(0, MAX_RECIPE_CHIPS);

  const handleSubmit = (log) => {
    onLog(log);
    setOpen(false);
  };

  // Eén klik logt direct één portie (buildRecipeLog met servings: 1) —
  // dezelfde formule als de log-modal gebruikt, geen eigen rekenpad hier.
  const logRecipe = (recipe) => {
    const log = buildRecipeLog(recipe, items, { servings: 1 });
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
      {recipeChips.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {recipeChips.map((recipe) => (
            <button
              key={recipe.id}
              type="button"
              onClick={() => logRecipe(recipe)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-full text-xs font-medium transition`}
            >
              {t('nutrition.recipe.chipLabel', {
                name: recipe.name,
                kcal: Math.round(recipeRate(recipe, items, 'kcal')),
              })}
            </button>
          ))}
        </div>
      )}
      {open && (
        <NutritionLogModal
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
          theme={theme}
        />
      )}
    </>
  );
}
