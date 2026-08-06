import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import MacroSummary from './MacroSummary';
import { createMeal, mealRate, portionRate, missingPortionIds, MACRO_KEYS } from '../../utils/nutrition';
import { parseMeasurementInput } from '../../utils/measurements';
import { useTranslation } from '../../i18n/useTranslation';

const EMPTY_DRAFT = { name: '', entries: [] };

function draftFromMeal(meal) {
  if (!meal) return EMPTY_DRAFT;
  return {
    name: meal.name || '',
    entries: (meal.entries || []).map((entry) => ({
      portionId: entry.portionId,
      count: typeof entry.count === 'number' ? String(entry.count) : '',
    })),
  };
}

// Add/edit-formulier voor één maaltijd, als modal boven
// NutritionLibraryPanel. Was NutritionRecipeForm.jsx (ingrediënten in
// grammen); #147 bouwt hem om naar porties: elke rij kiest een portie uit de
// bibliotheek en een aantal, in plaats van een item en een gewicht. Volgt
// verder hetzelfde patroon: lokale draft-state die pas op submit naar de
// provider gaat, reset via useEffect op open/mode/meal, en dezelfde
// footer/ConfirmDialog-opbouw als NutritionPortionForm.
export default function NutritionMealForm({ open, mode = 'add', meal, portions, items, onClose, onSave, onDelete, theme }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(mode === 'edit' && meal ? draftFromMeal(meal) : EMPTY_DRAFT);
    setConfirmDelete(false);
  }, [open, mode, meal]);

  if (!open) return null;

  const library = portions || [];
  const canSave = draft.name.trim().length > 0;

  const addEntryRow = () => {
    setDraft((prev) => ({
      ...prev,
      entries: [...prev.entries, { portionId: library[0]?.id || '', count: '' }],
    }));
  };

  const updateRow = (index, patch) => {
    setDraft((prev) => ({
      ...prev,
      entries: prev.entries.map((row, i) => (i === index ? { ...row, ...patch } : row)),
    }));
  };

  const removeRow = (index) => {
    setDraft((prev) => ({
      ...prev,
      entries: prev.entries.filter((_, i) => i !== index),
    }));
  };

  // Ongeldige/lege rijen (geen aantal ingevuld) tellen als 0 in het live
  // totaal i.p.v. NaN — createMeal filtert diezelfde rijen bij het opslaan
  // zelf weg (normalizeMealEntryRow), dus dit is puur de preview.
  const liveEntries = draft.entries.map((row) => {
    const count = parseMeasurementInput(row.count);
    return { portionId: row.portionId, count: Number.isFinite(count) && count > 0 ? count : 0 };
  });
  const liveTotal = mealRate({ entries: liveEntries }, library, items, 'kcal');
  // Zelfde liveEntries-previewdata als het kcal-totaal, nu over MACRO_KEYS
  // (AC2) — geen nieuw rekenpad, alleen dezelfde mealRate met een andere
  // nutriëntsleutel.
  const liveMacros = MACRO_KEYS.reduce((acc, key) => {
    acc[key] = mealRate({ entries: liveEntries }, library, items, key);
    return acc;
  }, {});
  const missingIds = missingPortionIds({ entries: draft.entries }, library);

  const save = () => {
    if (!canSave) return;
    const built = createMeal({
      name: draft.name,
      entries: draft.entries.map((row) => ({
        portionId: row.portionId,
        count: parseMeasurementInput(row.count),
      })),
    });
    const result = mode === 'edit' && meal ? { ...built, id: meal.id } : built;
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
            {mode === 'add' ? t('nutrition.meal.addTitle') : t('nutrition.meal.editTitle')}
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
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.meal.nameLabel')}</p>
          <input
            type="text"
            value={draft.name}
            autoFocus={mode === 'add'}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t('nutrition.meal.namePlaceholder')}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.meal.entriesLabel')}</p>
          <div className="space-y-2 mb-2">
            {draft.entries.map((row, index) => {
              const selected = library.find((p) => p.id === row.portionId);
              const isMissing = row.portionId && missingIds.includes(row.portionId);
              return (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={row.portionId}
                    onChange={(e) => updateRow(index, { portionId: e.target.value })}
                    aria-label={t('nutrition.meal.entryPortionAria')}
                    className={`flex-1 min-w-0 px-2 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {library.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                    {isMissing && (
                      // Zonder deze optie toont de native select een lege
                      // waarde voor een portionId dat niet in `library`
                      // voorkomt — dat zou de koppeling met de verwijderde
                      // portie onzichtbaar maken terwijl de rij hem nog wél
                      // bewaart.
                      <option value={row.portionId} disabled>
                        {t('nutrition.meal.missingPortionOption')}
                      </option>
                    )}
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.count}
                    onChange={(e) => updateRow(index, { count: e.target.value })}
                    placeholder={t('nutrition.meal.countPlaceholder')}
                    className={`w-16 px-2 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {selected && (
                    <span className={`text-xs ${theme.textMuted} flex-shrink-0`}>
                      {t('nutrition.portion.totalLabel', { kcal: Math.round(portionRate(selected, items, 'kcal')) })}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label={t('nutrition.meal.removeEntryAria')}
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
            onClick={addEntryRow}
            disabled={library.length === 0}
            className={`w-full inline-flex items-center justify-center gap-2 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} disabled:opacity-40 disabled:cursor-not-allowed rounded-lg px-3 py-2 text-sm font-medium transition`}
          >
            <Plus className="w-4 h-4" />
            {t('nutrition.meal.addEntryButton')}
          </button>
        </div>

        {missingIds.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
            {missingIds.length === 1
              ? t('nutrition.meal.missingHint', { count: missingIds.length })
              : t('nutrition.meal.missingHintPlural', { count: missingIds.length })}
          </p>
        )}

        <p className={`text-sm font-medium ${theme.textSecondary} mb-1`}>
          {t('nutrition.meal.totalLabel', { kcal: Math.round(liveTotal) })}
        </p>
        <div className="mb-4">
          <MacroSummary macros={liveMacros} theme={theme} t={t} />
        </div>

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
          title={meal ? t('nutrition.meal.deleteTitle', { name: meal.name }) : ''}
          description={t('nutrition.meal.deleteDescription')}
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
