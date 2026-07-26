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

  const value = useMemo(
    () => ({ library, addItem, updateItem, removeItem }),
    [library, addItem, updateItem, removeItem]
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
