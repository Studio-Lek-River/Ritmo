import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { createRecipe, recipeRate, missingIngredientIds } from '../../utils/nutrition';
import { parseMeasurementInput } from '../../utils/measurements';
import { useTranslation } from '../../i18n/useTranslation';

const EMPTY_DRAFT = { name: '', ingredients: [] };

function draftFromRecipe(recipe) {
  if (!recipe) return EMPTY_DRAFT;
  return {
    name: recipe.name || '',
    ingredients: (recipe.ingredients || []).map((ing) => ({
      itemId: ing.itemId,
      amount: typeof ing.amount === 'number' ? String(ing.amount) : '',
    })),
  };
}

// Add/edit-formulier voor één recept, als modal boven NutritionLibraryPanel.
// Volgt het NutritionItemForm-patroon één-op-één: lokale draft-state die pas
// op submit naar de provider gaat (anders enqueuet elke toetsaanslag een
// sync-push), reset via useEffect op open/mode/recipe, en dezelfde
// footer/ConfirmDialog-opbouw.
export default function NutritionRecipeForm({ open, mode = 'add', recipe, items, onClose, onSave, onDelete, theme }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(mode === 'edit' && recipe ? draftFromRecipe(recipe) : EMPTY_DRAFT);
    setConfirmDelete(false);
  }, [open, mode, recipe]);

  if (!open) return null;

  const library = items || [];
  const canSave = draft.name.trim().length > 0;

  const addIngredientRow = () => {
    setDraft((prev) => ({
      ...prev,
      ingredients: [...prev.ingredients, { itemId: library[0]?.id || '', amount: '' }],
    }));
  };

  const updateRow = (index, patch) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const removeRow = (index) => {
    setDraft((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== index),
    }));
  };

  // Ongeldige/lege rijen (geen bedrag ingevuld) tellen als 0 in het live
  // totaal i.p.v. NaN — createRecipe filtert diezelfde rijen bij het
  // opslaan zelf weg (normalizeIngredientRow), dus dit is puur de preview.
  const liveIngredients = draft.ingredients.map((row) => {
    const amount = parseMeasurementInput(row.amount);
    return { itemId: row.itemId, amount: Number.isFinite(amount) && amount > 0 ? amount : 0 };
  });
  const liveTotal = recipeRate({ ingredients: liveIngredients }, library, 'kcal');
  const missingIds = missingIngredientIds({ ingredients: draft.ingredients }, library);

  const save = () => {
    if (!canSave) return;
    const built = createRecipe({
      name: draft.name,
      ingredients: draft.ingredients.map((row) => ({
        itemId: row.itemId,
        amount: parseMeasurementInput(row.amount),
      })),
    });
    const result = mode === 'edit' && recipe ? { ...built, id: recipe.id } : built;
    onSave?.(result);
  };

  const confirmDeleteAction = () => {
    setConfirmDelete(false);
    onDelete?.();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`${theme.card} rounded-2xl p-5 max-w-sm w-full max-h-[90vh] overflow-y-auto my-4 shadow-xl slide-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-base font-semibold ${theme.textSecondary}`}>
            {mode === 'add' ? t('nutrition.recipe.addTitle') : t('nutrition.recipe.editTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.recipe.nameLabel')}</p>
          <input
            type="text"
            value={draft.name}
            autoFocus={mode === 'add'}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t('nutrition.recipe.namePlaceholder')}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.recipe.ingredientsLabel')}</p>
          <div className="space-y-2 mb-2">
            {draft.ingredients.map((row, index) => {
              const selected = library.find((it) => it.id === row.itemId);
              const isMissing = row.itemId && missingIds.includes(row.itemId);
              return (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={row.itemId}
                    onChange={(e) => updateRow(index, { itemId: e.target.value })}
                    aria-label={t('nutrition.recipe.ingredientItemAria')}
                    className={`flex-1 min-w-0 px-2 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {library.map((it) => (
                      <option key={it.id} value={it.id}>{it.name}</option>
                    ))}
                    {isMissing && (
                      // Zonder deze optie toont de native select een lege
                      // waarde voor een itemId dat niet in `library` voorkomt
                      // — dat zou de koppeling met het verwijderde item
                      // onzichtbaar maken terwijl de rij hem nog wél bewaart.
                      <option value={row.itemId} disabled>
                        {t('nutrition.recipe.missingIngredientOption')}
                      </option>
                    )}
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.amount}
                    onChange={(e) => updateRow(index, { amount: e.target.value })}
                    placeholder={t('nutrition.recipe.amountPlaceholder')}
                    className={`w-20 px-2 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {selected && (
                    <span className={`text-xs ${theme.textMuted} flex-shrink-0`}>
                      {t(`modules.units.${selected.unit}`)}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label={t('nutrition.recipe.removeIngredientAria')}
                    className={`p-1.5 rounded-lg ${theme.hover} ${theme.textMuted} hover:text-red-500 transition flex-shrink-0`}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={addIngredientRow}
            disabled={library.length === 0}
            className={`w-full inline-flex items-center justify-center gap-2 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-sm font-medium transition`}
          >
            <Plus className="w-4 h-4" />
            {t('nutrition.recipe.addIngredientButton')}
          </button>
        </div>

        {missingIds.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
            {missingIds.length === 1
              ? t('nutrition.recipe.missingHint', { count: missingIds.length })
              : t('nutrition.recipe.missingHintPlural', { count: missingIds.length })}
          </p>
        )}

        <p className={`text-sm font-medium ${theme.textSecondary} mb-4`}>
          {t('nutrition.recipe.totalLabel', { kcal: Math.round(liveTotal) })}
        </p>

        <div className="flex items-center gap-2 mt-5">
          {mode === 'edit' && onDelete && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              aria-label={t('common.delete')}
              title={t('common.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-2 ${theme.cardSecondary} ${theme.textSecondary} rounded-lg text-sm font-medium transition`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
          >
            {t('common.save')}
          </button>
        </div>

        <ConfirmDialog
          open={confirmDelete}
          title={recipe ? t('nutrition.recipe.deleteTitle', { name: recipe.name }) : ''}
          description={t('nutrition.recipe.deleteDescription')}
          confirmLabel={t('common.delete')}
          variant="danger"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(false)}
          theme={theme}
        />
      </div>
    </div>
  );
}
