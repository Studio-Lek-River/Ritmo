import React, { useEffect, useState } from 'react';
import { X, Trash2, Plus } from 'lucide-react';
import ConfirmDialog from '../ConfirmDialog';
import MacroSummary from './MacroSummary';
import { createPortion, portionRate, kcalPerProduct, missingProductIds, MACRO_KEYS } from '../../utils/nutrition';
import { parseMeasurementInput } from '../../utils/measurements';
import { useTranslation } from '../../i18n/useTranslation';

const EMPTY_DRAFT = { name: '', entries: [] };

function draftFromPortion(portion) {
  if (!portion) return EMPTY_DRAFT;
  return {
    name: portion.name || '',
    entries: (portion.entries || []).map((entry) => ({
      productId: entry.productId,
      count: typeof entry.count === 'number' ? String(entry.count) : '',
    })),
  };
}

// Add/edit-formulier voor één portie, als modal boven NutritionLibraryPanel.
// Kopie van het NutritionRecipeForm-skelet (#147): lokale draft-state die
// pas op submit naar de provider gaat, reset via useEffect op
// open/mode/portion, en dezelfde footer/ConfirmDialog-opbouw. Verschil met
// het (voormalige) receptformulier: de invoer per rij is een AANTAL
// producten, niet een gewicht/volume, en achter elke rij staat de kcal van
// dat product i.p.v. een eenheid.
export default function NutritionPortionForm({ open, mode = 'add', portion, items, onClose, onSave, onDelete, theme }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(mode === 'edit' && portion ? draftFromPortion(portion) : EMPTY_DRAFT);
    setConfirmDelete(false);
  }, [open, mode, portion]);

  if (!open) return null;

  const library = items || [];
  const canSave = draft.name.trim().length > 0;

  const addEntryRow = () => {
    setDraft((prev) => ({
      ...prev,
      entries: [...prev.entries, { productId: library[0]?.id || '', count: '' }],
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
  // totaal i.p.v. NaN — createPortion filtert diezelfde rijen bij het
  // opslaan zelf weg (normalizePortionEntryRow), dus dit is puur de preview.
  const liveEntries = draft.entries.map((row) => {
    const count = parseMeasurementInput(row.count);
    return { productId: row.productId, count: Number.isFinite(count) && count > 0 ? count : 0 };
  });
  const liveTotal = portionRate({ entries: liveEntries }, library, 'kcal');
  // Zelfde liveEntries-previewdata als het kcal-totaal, nu over MACRO_KEYS
  // (AC2) — geen nieuw rekenpad, alleen dezelfde portionRate met een andere
  // nutriëntsleutel.
  const liveMacros = MACRO_KEYS.reduce((acc, key) => {
    acc[key] = portionRate({ entries: liveEntries }, library, key);
    return acc;
  }, {});
  const missingIds = missingProductIds({ entries: draft.entries }, library);

  const save = () => {
    if (!canSave) return;
    const built = createPortion({
      name: draft.name,
      entries: draft.entries.map((row) => ({
        productId: row.productId,
        count: parseMeasurementInput(row.count),
      })),
    });
    const result = mode === 'edit' && portion ? { ...built, id: portion.id } : built;
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
            {mode === 'add' ? t('nutrition.portion.addTitle') : t('nutrition.portion.editTitle')}
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
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.portion.nameLabel')}</p>
          <input
            type="text"
            value={draft.name}
            autoFocus={mode === 'add'}
            onChange={(e) => setDraft((prev) => ({ ...prev, name: e.target.value }))}
            placeholder={t('nutrition.portion.namePlaceholder')}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('nutrition.portion.entriesLabel')}</p>
          <div className="space-y-2 mb-2">
            {draft.entries.map((row, index) => {
              const selected = library.find((it) => it.id === row.productId);
              const isMissing = row.productId && missingIds.includes(row.productId);
              // Een gekozen product zonder maat rekent (nog) als 0 kcal —
              // stil 0 tellen zou onopgemerkt blijven, dus een zichtbare hint
              // in plaats van gewoon "0 kcal" tonen.
              const selectedHasNoSize = selected && !selected.portion;
              return (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={row.productId}
                    onChange={(e) => updateRow(index, { productId: e.target.value })}
                    aria-label={t('nutrition.portion.entryProductAria')}
                    className={`flex-1 min-w-0 px-2 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  >
                    {library.map((it) => (
                      <option key={it.id} value={it.id}>{it.name}</option>
                    ))}
                    {isMissing && (
                      // Zonder deze optie toont de native select een lege
                      // waarde voor een productId dat niet in `library`
                      // voorkomt — dat zou de koppeling met het verwijderde
                      // product onzichtbaar maken terwijl de rij hem nog wél
                      // bewaart.
                      <option value={row.productId} disabled>
                        {t('nutrition.portion.missingProductOption')}
                      </option>
                    )}
                  </select>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={row.count}
                    onChange={(e) => updateRow(index, { count: e.target.value })}
                    placeholder={t('nutrition.portion.countPlaceholder')}
                    className={`w-16 px-2 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                  {selected && !selectedHasNoSize && (
                    <span className={`text-xs ${theme.textMuted} flex-shrink-0`}>
                      {t('nutrition.item.perProductLabel', { kcal: Math.round(kcalPerProduct(selected, 'kcal')) })}
                    </span>
                  )}
                  {selectedHasNoSize && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 flex-shrink-0">
                      {t('nutrition.portion.noProductSizeHint')}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    aria-label={t('nutrition.portion.removeEntryAria')}
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
            {t('nutrition.portion.addEntryButton')}
          </button>
        </div>

        {missingIds.length > 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-3">
            {missingIds.length === 1
              ? t('nutrition.portion.missingHint', { count: missingIds.length })
              : t('nutrition.portion.missingHintPlural', { count: missingIds.length })}
          </p>
        )}

        <p className={`text-sm font-medium ${theme.textSecondary} mb-1`}>
          {t('nutrition.portion.totalLabel', { kcal: Math.round(liveTotal) })}
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
          title={portion ? t('nutrition.portion.deleteTitle', { name: portion.name }) : ''}
          description={t('nutrition.portion.deleteDescription')}
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
