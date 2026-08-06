import React, { useState } from 'react';
import { Plus, Utensils, Layers, UtensilsCrossed, Pencil } from 'lucide-react';
import EmptyState from '../EmptyState';
import NutritionItemForm from './NutritionItemForm';
import NutritionPortionForm from './NutritionPortionForm';
import NutritionMealForm from './NutritionMealForm';
import { useNutritionLibrary } from '../../context/NutritionLibraryContext';
import { useUndoToast } from '../../hooks/useUndoToast';
import { portionRate, mealRate } from '../../utils/nutrition';
import { useTranslation } from '../../i18n/useTranslation';

// Bibliotheekbeheer: lijst van voedingsmiddelen + add/edit via
// NutritionItemForm. Start leeg (geen meegeleverde voedingsmiddelen) —
// zie EmptyState hieronder. Dit panel wordt gerenderd in de
// "Voeding"-tab van SettingsModal en heeft daarom geen eigen kaart/overlay
// of sluitknop; SettingsModal levert al de buitenrand-padding.
//
// Drie tabs (#147): Producten / Porties / Maaltijden. De denkstap Product →
// Portie → Maaltijd zit al in het datamodel (nutrition.js); deze tabs volgen
// diezelfde volgorde. De drie takken zijn structureel identiek (EmptyState ->
// lijst -> add-knop -> form-modal); die herhaling zit in de lokale
// LibrarySection-helper hieronder, niet drie keer uitgeschreven.
export default function NutritionLibraryPanel({ theme }) {
  const { t } = useTranslation();
  const {
    library,
    addItem, updateItem, removeItem,
    addPortion, updatePortion, removePortion,
    addMeal, updateMeal, removeMeal,
  } = useNutritionLibrary();
  const showUndoToast = useUndoToast();
  const [activeTab, setActiveTab] = useState('items');

  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [portionFormOpen, setPortionFormOpen] = useState(false);
  const [editingPortionId, setEditingPortionId] = useState(null);
  const [mealFormOpen, setMealFormOpen] = useState(false);
  const [editingMealId, setEditingMealId] = useState(null);

  const items = library.items;
  const portions = library.portions;
  const meals = library.meals;
  const editingItem = editingItemId ? items.find((it) => it.id === editingItemId) || null : null;
  const editingPortion = editingPortionId ? portions.find((p) => p.id === editingPortionId) || null : null;
  const editingMeal = editingMealId ? meals.find((m) => m.id === editingMealId) || null : null;

  const openAddItem = () => {
    setEditingItemId(null);
    setItemFormOpen(true);
  };
  const openEditItem = (itemId) => {
    setEditingItemId(itemId);
    setItemFormOpen(true);
  };
  const handleSaveItem = (savedItem) => {
    if (editingItem) {
      updateItem(savedItem);
    } else {
      addItem(savedItem);
    }
    setItemFormOpen(false);
  };
  const handleDeleteItem = () => {
    if (!editingItem) return;
    const { undo } = removeItem(editingItem.id);
    showUndoToast(t('nutrition.toast.itemDeleted'), undo);
    setItemFormOpen(false);
  };

  const openAddPortion = () => {
    setEditingPortionId(null);
    setPortionFormOpen(true);
  };
  const openEditPortion = (portionId) => {
    setEditingPortionId(portionId);
    setPortionFormOpen(true);
  };
  const handleSavePortion = (savedPortion) => {
    if (editingPortion) {
      updatePortion(savedPortion);
    } else {
      addPortion(savedPortion);
    }
    setPortionFormOpen(false);
  };
  const handleDeletePortion = () => {
    if (!editingPortion) return;
    const { undo } = removePortion(editingPortion.id);
    showUndoToast(t('nutrition.toast.portionDeleted'), undo);
    setPortionFormOpen(false);
  };

  const openAddMeal = () => {
    setEditingMealId(null);
    setMealFormOpen(true);
  };
  const openEditMeal = (mealId) => {
    setEditingMealId(mealId);
    setMealFormOpen(true);
  };
  const handleSaveMeal = (savedMeal) => {
    if (editingMeal) {
      updateMeal(savedMeal);
    } else {
      addMeal(savedMeal);
    }
    setMealFormOpen(false);
  };
  const handleDeleteMeal = () => {
    if (!editingMeal) return;
    const { undo } = removeMeal(editingMeal.id);
    showUndoToast(t('nutrition.toast.mealDeleted'), undo);
    setMealFormOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className={`flex gap-1 ${theme.cardSecondary} rounded-xl p-1`}>
        {[
          { id: 'items', label: t('nutrition.library.tabProducts') },
          { id: 'portions', label: t('nutrition.library.tabPortions') },
          { id: 'meals', label: t('nutrition.library.tabMeals') },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
              activeTab === tab.id ? 'bg-blue-500 text-white' : `${theme.textMuted}`
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div>
        {activeTab === 'items' && (
          <LibrarySection
            theme={theme}
            list={items}
            icon={Utensils}
            emptyTitle={t('nutrition.library.emptyTitle')}
            emptyDesc={t('nutrition.library.emptyDesc')}
            addLabel={t('nutrition.library.addButton')}
            onOpenAdd={openAddItem}
            onOpenEdit={openEditItem}
            renderMeta={(item) => t('nutrition.library.itemPer100', { kcal: item.per100.kcal, unit: t(`modules.units.${item.unit}`) })}
          />
        )}
        {activeTab === 'portions' && (
          <LibrarySection
            theme={theme}
            list={portions}
            icon={Layers}
            emptyTitle={t('nutrition.library.portionEmptyTitle')}
            emptyDesc={t('nutrition.library.portionEmptyDesc')}
            addLabel={t('nutrition.library.addPortionButton')}
            onOpenAdd={openAddPortion}
            onOpenEdit={openEditPortion}
            renderMeta={(portion) => t('nutrition.portion.totalLabel', { kcal: Math.round(portionRate(portion, items, 'kcal')) })}
          />
        )}
        {activeTab === 'meals' && (
          <LibrarySection
            theme={theme}
            list={meals}
            icon={UtensilsCrossed}
            emptyTitle={t('nutrition.library.mealEmptyTitle')}
            emptyDesc={t('nutrition.library.mealEmptyDesc')}
            addLabel={t('nutrition.library.addMealButton')}
            onOpenAdd={openAddMeal}
            onOpenEdit={openEditMeal}
            renderMeta={(meal) => t('nutrition.meal.totalLabel', { kcal: Math.round(mealRate(meal, portions, items, 'kcal')) })}
          />
        )}
      </div>

      <NutritionItemForm
        open={itemFormOpen}
        mode={editingItem ? 'edit' : 'add'}
        item={editingItem}
        onClose={() => setItemFormOpen(false)}
        onSave={handleSaveItem}
        onDelete={editingItem ? handleDeleteItem : undefined}
        theme={theme}
      />

      <NutritionPortionForm
        open={portionFormOpen}
        mode={editingPortion ? 'edit' : 'add'}
        portion={editingPortion}
        items={items}
        onClose={() => setPortionFormOpen(false)}
        onSave={handleSavePortion}
        onDelete={editingPortion ? handleDeletePortion : undefined}
        theme={theme}
      />

      <NutritionMealForm
        open={mealFormOpen}
        mode={editingMeal ? 'edit' : 'add'}
        meal={editingMeal}
        portions={portions}
        items={items}
        onClose={() => setMealFormOpen(false)}
        onSave={handleSaveMeal}
        onDelete={editingMeal ? handleDeleteMeal : undefined}
        theme={theme}
      />
    </div>
  );
}

// Eén tak van het bibliotheekpanel: EmptyState -> lijst -> add-knop. De drie
// tabs (producten/porties/maaltijden) zijn hierin structureel identiek; de
// specifieke tekst en het per-rij kcal-label komen van de aanroeper
// (renderMeta), zodat deze helper zelf niets van het datamodel afweet.
function LibrarySection({ theme, list, icon, emptyTitle, emptyDesc, addLabel, onOpenAdd, onOpenEdit, renderMeta }) {
  if (list.length === 0) {
    return (
      <EmptyState
        icon={icon}
        title={emptyTitle}
        description={emptyDesc}
        buttonLabel={addLabel}
        onClick={onOpenAdd}
        theme={theme}
      />
    );
  }

  return (
    <>
      <ul className="space-y-2 max-h-72 overflow-y-auto mb-3">
        {list.map((entry) => (
          <li key={entry.id}>
            <button
              type="button"
              onClick={() => onOpenEdit(entry.id)}
              className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 ${theme.cardSecondary} ${theme.hover} rounded-xl text-left transition`}
            >
              <div className="min-w-0">
                <p className={`text-sm font-medium ${theme.textSecondary} truncate`}>{entry.name}</p>
                <p className={`text-[11px] ${theme.textMuted}`}>{renderMeta(entry)}</p>
              </div>
              <Pencil className={`w-4 h-4 flex-shrink-0 ${theme.textMuted}`} />
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onOpenAdd}
        className="w-full inline-flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 font-medium text-sm transition"
      >
        <Plus className="w-4 h-4" />
        {addLabel}
      </button>
    </>
  );
}
