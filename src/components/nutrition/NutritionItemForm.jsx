import React, { useEffect, useState } from 'react';
import { X, Trash2 } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import { MACRO_KEYS, NUTRITION_UNITS, createFoodItem, kcalPerProduct } from '../../utils/nutrition';
import { parseMeasurementInput } from '../../utils/measurements';
import { useTranslation } from '../../i18n/useTranslation';

const EMPTY_DRAFT = {
  name: '',
  unit: 'g',
  kcal: '',
  protein: '',
  carbs: '',
  fat: '',
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
    protein: typeof item.per100?.protein === 'number' ? String(item.per100.protein) : '',
    carbs: typeof item.per100?.carbs === 'number' ? String(item.per100.carbs) : '',
    fat: typeof item.per100?.fat === 'number' ? String(item.per100.fat) : '',
    portionLabel: item.portion?.label || '',
    portionAmount: typeof item.portion?.amount === 'number' ? String(item.portion.amount) : '',
    countsAsDrink: !!item.countsAsDrink,
  };
}

// Eén macro (eiwit/koolhydraten/vet) is optioneel: leeg laten is geldig en
// telt als 0 (AC1), maar een ingevulde onzin- of negatieve waarde is
// ongeldig, zodat canSave uitblijft — zelfde regel als kcalValid hieronder,
// alleen met "leeg mag" ervoor.
function parseOptionalNutrient(raw) {
  const trimmed = (raw || '').trim();
  if (trimmed === '') return { value: 0, valid: true };
  const parsed = parseMeasurementInput(trimmed);
  return { value: parsed, valid: parsed !== null && parsed >= 0 };
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
  const protein = parseOptionalNutrient(draft.protein);
  const carbs = parseOptionalNutrient(draft.carbs);
  const fat = parseOptionalNutrient(draft.fat);
  const parsedPortionAmount = parseMeasurementInput(draft.portionAmount);
  // Poort-0-aanvulling (#147): "1 product = X g/ml" is verplicht om op te
  // slaan — zonder label én zonder een positief bedrag is er geen geldige
  // maat, en dus geen kcal-per-product uit te rekenen (AC11). Het lezen van
  // bestaande data blijft lenient (normalizeProductSize); dit is puur een
  // formuliervoorwaarde.
  const portionValid = draft.portionLabel.trim().length > 0
    && parsedPortionAmount !== null && parsedPortionAmount > 0;
  const canSave = draft.name.trim().length > 0 && kcalValid
    && protein.valid && carbs.valid && fat.valid && portionValid;
  // Live preview van de kcal per product (AC1): hergebruikt kcalPerProduct
  // op een tijdelijk item-object uit de nog niet opgeslagen draft-waarden,
  // zodat de preview altijd exact dezelfde formule gebruikt als het echte
  // opgeslagen item straks.
  const previewKcalPerProduct = kcalValid && portionValid
    ? Math.round(kcalPerProduct({
      per100: { kcal: parsedKcal },
      portion: { label: draft.portionLabel, amount: parsedPortionAmount },
    }))
    : null;

  const save = () => {
    if (!canSave) return;
    const portionAmount = parseMeasurementInput(draft.portionAmount);
    const built = createFoodItem({
      name: draft.name,
      unit: draft.unit,
      per100: { kcal: parsedKcal, protein: protein.value, carbs: carbs.value, fat: fat.value },
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

        {/* Drie optionele macro's (#148): leeg laten telt als 0 (AC1). Het
            "optioneel per 100 {unit}"-deel staat één keer in het sectielabel;
            per veld alleen de korte naam, anders wrapt elk label op een andere
            hoogte en lopen de drie invoervelden uit lijn. */}
        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>
            {t('nutrition.item.macrosSectionLabel', { unit: unitLabel })}
          </p>
          <div className="grid grid-cols-3 gap-2">
            {MACRO_KEYS.map((key) => (
              <div key={key}>
                <p className={`text-xs ${theme.textMuted} mb-1`}>
                  {t(`nutrition.macros.${key}Label`)}
                </p>
                <input
                  type="text"
                  inputMode="decimal"
                  value={draft[key]}
                  onChange={(e) => setDraft((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={t(`nutrition.item.${key}Placeholder`)}
                  className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            ))}
          </div>
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
          {/* Live kcal per product (AC1): alleen zichtbaar bij een geldige
              kcal én een geldige maat — dezelfde twee voorwaarden als
              canSave (AC11), dus de preview verschijnt precies op het moment
              dat opslaan ook mogelijk wordt. */}
          <p className={`text-xs ${theme.textMuted} mt-1.5`}>
            {previewKcalPerProduct !== null
              ? t('nutrition.item.perProductLabel', { kcal: previewKcalPerProduct })
              : t('nutrition.item.perProductRequiredHint')}
          </p>
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
