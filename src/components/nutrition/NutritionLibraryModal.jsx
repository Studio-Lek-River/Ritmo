import React, { useState } from 'react';
import { X, Plus, Utensils, Pencil } from 'lucide-react';
import EmptyState from '../EmptyState';
import NutritionItemForm from './NutritionItemForm';
import { useNutritionLibrary } from '../../context/NutritionLibraryContext';
import { useUndoToast } from '../../hooks/useUndoToast';
import { useTranslation } from '../../i18n/useTranslation';

// Bibliotheekbeheer: lijst van voedingsmiddelen + add/edit via
// NutritionItemForm. Start leeg (geen meegeleverde voedingsmiddelen) —
// zie EmptyState hieronder. Volgt het modal-skelet van MetricLibraryModal
// (items-end sm:items-center: mobile sheet die op groter scherm centreert).
export default function NutritionLibraryModal({ onClose, theme }) {
  const { t } = useTranslation();
  const { library, addItem, updateItem, removeItem } = useNutritionLibrary();
  const showUndoToast = useUndoToast();
  const [formOpen, setFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);

  const items = library.items;
  const editingItem = editingItemId ? items.find((it) => it.id === editingItemId) || null : null;

  const openAdd = () => {
    setEditingItemId(null);
    setFormOpen(true);
  };

  const openEdit = (itemId) => {
    setEditingItemId(itemId);
    setFormOpen(true);
  };

  const handleSave = (savedItem) => {
    if (editingItem) {
      updateItem(savedItem);
    } else {
      addItem(savedItem);
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (!editingItem) return;
    const { undo } = removeItem(editingItem.id);
    showUndoToast(t('nutrition.toast.itemDeleted'), undo);
    setFormOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`w-full max-w-sm ${theme.card} rounded-2xl shadow-xl`}>
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h3 className={`font-semibold ${theme.text}`}>{t('nutrition.library.title')}</h3>
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
          {items.length === 0 ? (
            <EmptyState
              icon={Utensils}
              title={t('nutrition.library.emptyTitle')}
              description={t('nutrition.library.emptyDesc')}
              buttonLabel={t('nutrition.library.addButton')}
              onClick={openAdd}
              theme={theme}
            />
          ) : (
            <>
              <ul className="space-y-2 max-h-72 overflow-y-auto mb-3">
                {items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => openEdit(item.id)}
                      className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 ${theme.cardSecondary} ${theme.hover} rounded-xl text-left transition`}
                    >
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${theme.textSecondary} truncate`}>{item.name}</p>
                        <p className={`text-[11px] ${theme.textMuted}`}>
                          {t('nutrition.library.itemPer100', {
                            kcal: item.per100.kcal,
                            unit: t(`modules.units.${item.unit}`),
                          })}
                        </p>
                      </div>
                      <Pencil className={`w-4 h-4 flex-shrink-0 ${theme.textMuted}`} />
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={openAdd}
                className="w-full inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 font-medium text-sm transition"
              >
                <Plus className="w-4 h-4" />
                {t('nutrition.library.addButton')}
              </button>
            </>
          )}
        </div>

        <NutritionItemForm
          open={formOpen}
          mode={editingItem ? 'edit' : 'add'}
          item={editingItem}
          onClose={() => setFormOpen(false)}
          onSave={handleSave}
          onDelete={editingItem ? handleDelete : undefined}
          theme={theme}
        />
      </div>
    </div>
  );
}
