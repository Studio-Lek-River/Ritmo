import React, { createContext, useCallback, useContext, useMemo } from 'react';
import useStoredState from '../hooks/useStoredState';
import { STORAGE_KEYS } from '../storage';
import { emptyNutritionLibrary, normalizeNutritionLibrary } from '../utils/nutrition';

// Eén provider voor de voedingsbibliotheek (`nutrition:library`). De
// bibliotheek heeft twee consumenten in verschillende takken van de app (de
// counterkaart en de ModuleEditor); twee losse useStoredState-aanroepen op
// dezelfde key zouden twee React-states geven die uit elkaar kunnen lopen.
// Deze provider is de enige bron van waarheid en normaliseert bij elke
// lezing (zelfde patroon als normalizeWeekMenu in mealplan.js), zodat een
// corrupte opgeslagen waarde nooit tot een crash leidt.
const NutritionLibraryContext = createContext(null);

export function NutritionLibraryProvider({ children }) {
  const [raw, setRaw] = useStoredState(STORAGE_KEYS.NUTRITION_LIBRARY, emptyNutritionLibrary());
  const library = useMemo(() => normalizeNutritionLibrary(raw), [raw]);

  const addItem = useCallback((item) => {
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      return { ...base, items: [...base.items, item] };
    });
    return item;
  }, [setRaw]);

  const updateItem = useCallback((item) => {
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      return { ...base, items: base.items.map((it) => (it.id === item.id ? item : it)) };
    });
  }, [setRaw]);

  // Verwijdert een item en geeft, analoog aan removeCollectionEvent
  // (App.jsx), een { item, undo } paar terug: undo zet het item terug op
  // zijn oorspronkelijke index i.p.v. vooraan, zodat de volgorde na undo
  // weer klopt.
  const removeItem = useCallback((itemId) => {
    let removedItem = null;
    let removedIndex = -1;
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      const idx = base.items.findIndex((it) => it.id === itemId);
      if (idx === -1) return base;
      removedItem = base.items[idx];
      removedIndex = idx;
      return { ...base, items: [...base.items.slice(0, idx), ...base.items.slice(idx + 1)] };
    });
    const undo = () => {
      if (!removedItem) return;
      setRaw((prev) => {
        const base = normalizeNutritionLibrary(prev);
        if (base.items.some((it) => it.id === removedItem.id)) return base;
        const idx = Math.min(removedIndex, base.items.length);
        return { ...base, items: [...base.items.slice(0, idx), removedItem, ...base.items.slice(idx)] };
      });
    };
    return { item: removedItem, undo };
  }, [setRaw]);

  // Recept-mutators, één-op-één gemodelleerd naar de item-mutators hierboven
  // (zelfde undo-contract). De item-mutators gebruiken al `{ ...base, ... }`
  // bij het schrijven, dus `recipes` blijft daar vanzelf ongemoeid — deze
  // drie zijn de enige plek die `recipes` zelf muteert.
  const addRecipe = useCallback((recipe) => {
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      return { ...base, recipes: [...base.recipes, recipe] };
    });
    return recipe;
  }, [setRaw]);

  const updateRecipe = useCallback((recipe) => {
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      return { ...base, recipes: base.recipes.map((r) => (r.id === recipe.id ? recipe : r)) };
    });
  }, [setRaw]);

  // Zelfde undo-contract als removeItem: { recipe, undo } terug, undo zet het
  // recept terug op zijn oorspronkelijke index en is idempotent (id-guard),
  // zodat een dubbele klik op de undo-actie niet per ongeluk dupliceert.
  const removeRecipe = useCallback((recipeId) => {
    let removedRecipe = null;
    let removedIndex = -1;
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      const idx = base.recipes.findIndex((r) => r.id === recipeId);
      if (idx === -1) return base;
      removedRecipe = base.recipes[idx];
      removedIndex = idx;
      return { ...base, recipes: [...base.recipes.slice(0, idx), ...base.recipes.slice(idx + 1)] };
    });
    const undo = () => {
      if (!removedRecipe) return;
      setRaw((prev) => {
        const base = normalizeNutritionLibrary(prev);
        if (base.recipes.some((r) => r.id === removedRecipe.id)) return base;
        const idx = Math.min(removedIndex, base.recipes.length);
        return { ...base, recipes: [...base.recipes.slice(0, idx), removedRecipe, ...base.recipes.slice(idx)] };
      });
    };
    return { recipe: removedRecipe, undo };
  }, [setRaw]);

  const value = useMemo(
    () => ({ library, addItem, updateItem, removeItem, addRecipe, updateRecipe, removeRecipe }),
    [library, addItem, updateItem, removeItem, addRecipe, updateRecipe, removeRecipe]
  );

  return (
    <NutritionLibraryContext.Provider value={value}>
      {children}
    </NutritionLibraryContext.Provider>
  );
}

export function useNutritionLibrary() {
  return useContext(NutritionLibraryContext);
}
