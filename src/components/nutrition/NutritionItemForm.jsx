import React, { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { NUTRITION_UNITS, createFoodItem } from '../../utils/nutrition';
import { parseMeasurementInput } from '../../utils/measurements';
import { useTranslation } from '../../i18n/useTranslation';

const EMPTY_DRAFT = {
  name: '',
  unit: 'g',
  kcal: '',
  portionLabel: '',
  portionAmount: '',
  countsAsDrink: false,
};

function draftFromItem(item) {
  if (!item) return EMPTY_DRAFT;
  return {
    name: item.name || '',
    unit: item.unit || 'g',
    kcal: typeof item.per100?.kcal === 'number' ? String(item.per100.kcal) : '',
    portionLabel: item.portion?.label || '',
    portionAmount: typeof item.portion?.amount === 'number' ? String(item.portion.amount) : '',
    countsAsDrink: !!item.countsAsDrink,
  };
}

// Add/edit-formulier voor één voedingsmiddel, als modal boven
// NutritionLibraryPanel. Volgt het CollectionItemFormModal-patroon: een
// lokale draft-state die pas op submit naar de provider gaat, zodat niet
// elke toetsaanslag een sync-push enqueuet.
export default function NutritionItemForm({ open, mode = 'add', item, onClose, onSave, onDelete, theme }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(mode === 'edit' && item ? draftFromItem(item) : EMPTY_DRAFT);
    setConfirmDelete(false);
  }, [open, mode, item]);

  if (!open) return null;

  const setUnit = (unit) => {
    setDraft((prev) => ({
      ...prev,
      unit,
      // "Telt ook mee als drinken" geldt alleen bij ml; bij g wissen we 'm
      // meteen zodat de gebruiker nooit een schijnbaar bewaarde waarde ziet.
      countsAsDrink: unit === 'ml' ? prev.countsAsDrink : false,
    }));
  };

  const parsedKcal = parseMeasurementInput(draft.kcal);
  const kcalValid = parsedKcal !== null && parsedKcal >= 0;
  const canSave = draft.name.trim().length > 0 && kcalValid;

  const save = () => {
    if (!canSave) return;
    const portionAmount = parseMeasurementInput(draft.portionAmount);
    const built = createFoodItem({
      name: draft.name,
      unit: draft.unit,
      kcalPer100: parsedKcal,
      portionLabel: draft.portionLabel,
      portionAmount,
      countsAsDrink: draft.countsAsDrink,
    });
    const result = mode === 'edit' && item ? { ...built, id: item.id } : built;
    onSave?.(result);
  };

  const confirmDeleteAction = () => {
    setConfirmDelete(false);
    onDelete?.();
  };

  const unitLabel = t(`modules.units.${draft.unit}`);

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
            {mode === 'add' ? t('nutrition.item.addTitle') : t('nutrition.item.editTitle')}
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
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.item.nameLabel')}</p>
          <input
            type="text"
            value={draft.name}
            autoFocus={mode === 'add'}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t('nutrition.item.namePlaceholder')}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.item.unitLabel')}</p>
          <div className="flex gap-2">
            {NUTRITION_UNITS.map((option) => (
              <button
                key={option.key}
                type="button"
                onClick={() => setUnit(option.key)}
                aria-pressed={draft.unit === option.key}
                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  draft.unit === option.key
                    ? 'bg-blue-500 text-white'
                    : `${theme.cardSecondary} ${theme.textMuted}`
                }`}
              >
                {t(option.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>
            {t('nutrition.item.kcalLabel', { unit: unitLabel })}
          </p>
          <input
            type="text"
            inputMode="decimal"
            value={draft.kcal}
            onChange={(e) => setDraft((prev) => ({ ...prev, kcal: e.target.value }))}
            placeholder={t('nutrition.item.kcalPlaceholder')}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.item.portionSectionLabel')}</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={draft.portionLabel}
              onChange={(e) => setDraft((prev) => ({ ...prev, portionLabel: e.target.value }))}
              placeholder={t('nutrition.item.portionNamePlaceholder')}
              className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <input
              type="text"
              inputMode="decimal"
              value={draft.portionAmount}
              onChange={(e) => setDraft((prev) => ({ ...prev, portionAmount: e.target.value }))}
              placeholder={t('nutrition.item.portionAmountPlaceholder', { unit: unitLabel })}
              className={`w-28 px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        {draft.unit === 'ml' && (
          <label className={`flex items-center gap-2 text-sm ${theme.textSecondary} mb-4`}>
            <input
              type="checkbox"
              checked={draft.countsAsDrink}
              onChange={(e) => setDraft((prev) => ({ ...prev, countsAsDrink: e.target.checked }))}
            />
            {t('nutrition.item.countsAsDrinkLabel')}
          </label>
        )}

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
          title={item ? t('nutrition.item.deleteTitle', { name: item.name }) : ''}
          description={t('nutrition.item.deleteDescription')}
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
