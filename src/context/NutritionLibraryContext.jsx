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

  // Portie-mutators, één-op-één gemodelleerd naar de item-mutators hierboven
  // (zelfde undo-contract). De item-mutators gebruiken al `{ ...base, ... }`
  // bij het schrijven, dus `recipes` blijft daar vanzelf ongemoeid (#147) —
  // deze zes (portie + maaltijd) zijn de enige plekken die `portions`/`meals`
  // zelf muteren.
  const addPortion = useCallback((portion) => {
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      return { ...base, portions: [...base.portions, portion] };
    });
    return portion;
  }, [setRaw]);

  const updatePortion = useCallback((portion) => {
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      return { ...base, portions: base.portions.map((p) => (p.id === portion.id ? portion : p)) };
    });
  }, [setRaw]);

  // Zelfde undo-contract als removeItem: { portion, undo } terug, undo zet de
  // portie terug op zijn oorspronkelijke index en is idempotent (id-guard),
  // zodat een dubbele klik op de undo-actie niet per ongeluk dupliceert.
  const removePortion = useCallback((portionId) => {
    let removedPortion = null;
    let removedIndex = -1;
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      const idx = base.portions.findIndex((p) => p.id === portionId);
      if (idx === -1) return base;
      removedPortion = base.portions[idx];
      removedIndex = idx;
      return { ...base, portions: [...base.portions.slice(0, idx), ...base.portions.slice(idx + 1)] };
    });
    const undo = () => {
      if (!removedPortion) return;
      setRaw((prev) => {
        const base = normalizeNutritionLibrary(prev);
        if (base.portions.some((p) => p.id === removedPortion.id)) return base;
        const idx = Math.min(removedIndex, base.portions.length);
        return { ...base, portions: [...base.portions.slice(0, idx), removedPortion, ...base.portions.slice(idx)] };
      });
    };
    return { portion: removedPortion, undo };
  }, [setRaw]);

  // Maaltijd-mutators, zelfde patroon als de portie-mutators hierboven, één
  // laag hoger.
  const addMeal = useCallback((meal) => {
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      return { ...base, meals: [...base.meals, meal] };
    });
    return meal;
  }, [setRaw]);

  const updateMeal = useCallback((meal) => {
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      return { ...base, meals: base.meals.map((m) => (m.id === meal.id ? meal : m)) };
    });
  }, [setRaw]);

  const removeMeal = useCallback((mealId) => {
    let removedMeal = null;
    let removedIndex = -1;
    setRaw((prev) => {
      const base = normalizeNutritionLibrary(prev);
      const idx = base.meals.findIndex((m) => m.id === mealId);
      if (idx === -1) return base;
      removedMeal = base.meals[idx];
      removedIndex = idx;
      return { ...base, meals: [...base.meals.slice(0, idx), ...base.meals.slice(idx + 1)] };
    });
    const undo = () => {
      if (!removedMeal) return;
      setRaw((prev) => {
        const base = normalizeNutritionLibrary(prev);
        if (base.meals.some((m) => m.id === removedMeal.id)) return base;
        const idx = Math.min(removedIndex, base.meals.length);
        return { ...base, meals: [...base.meals.slice(0, idx), removedMeal, ...base.meals.slice(idx)] };
      });
    };
    return { meal: removedMeal, undo };
  }, [setRaw]);

  const value = useMemo(
    () => ({
      library,
      addItem, updateItem, removeItem,
      addPortion, updatePortion, removePortion,
      addMeal, updateMeal, removeMeal,
    }),
    [library, addItem, updateItem, removeItem, addPortion, updatePortion, removePortion, addMeal, updateMeal, removeMeal]
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
