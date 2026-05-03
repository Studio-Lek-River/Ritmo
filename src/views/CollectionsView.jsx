import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Sparkles, ArrowUpDown, Library } from 'lucide-react';
import { getColorClasses } from '../utils/colors';
import { aggregateStats, getItemTrackingMode } from '../utils/collections';
import StarRating from '../components/StarRating';
import TagPill from '../components/TagPill';
import ItemDetail from '../components/ItemDetail';
import EmptyState from '../components/EmptyState';

const SORT_OPTIONS = [
  { id: 'recent', label: 'Recent' },
  { id: 'count', label: 'Meest gelogd' },
  { id: 'alpha', label: 'A-Z' },
];

function lastEventDate(item) {
  return item.events && item.events.length > 0 ? item.events[0].date : null;
}

function sortItems(items, mode) {
  const arr = [...items];
  if (mode === 'count') {
    arr.sort((a, b) => (b.events?.length || 0) - (a.events?.length || 0));
  } else if (mode === 'alpha') {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  } else {
    arr.sort((a, b) => {
      const da = lastEventDate(a) || '';
      const db = lastEventDate(b) || '';
      return db.localeCompare(da);
    });
  }
  return arr;
}

export default function CollectionsView({
  modules,
  iconOptions,
  initialFilterModuleId,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onLogEvent,
  onRemoveEvent,
  onCreate,
  editable = true,
  t,
}) {
  const collections = useMemo(
    () => modules.filter((m) => m.enabled && m.type === 'collection'),
    [modules]
  );

  const [filterModuleId, setFilterModuleId] = useState(initialFilterModuleId || null);
  const [activeTagId, setActiveTagId] = useState(null);
  const [sort, setSort] = useState('recent');
  const [query, setQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [adding, setAdding] = useState(false);
  const [newItemModuleId, setNewItemModuleId] = useState(initialFilterModuleId || '');
  const [newItemName, setNewItemName] = useState('');

  useEffect(() => {
    if (initialFilterModuleId) {
      setFilterModuleId(initialFilterModuleId);
      setNewItemModuleId(initialFilterModuleId);
    }
  }, [initialFilterModuleId]);

  useEffect(() => {
    if (filterModuleId && !collections.find((c) => c.id === filterModuleId)) {
      setFilterModuleId(null);
    }
    if (newItemModuleId && !collections.find((c) => c.id === newItemModuleId)) {
      setNewItemModuleId('');
    }
    setActiveTagId(null);
  }, [filterModuleId, newItemModuleId, collections]);

  if (collections.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title="Nog geen collecties"
        description="Maak een collectie-module aan om bijvoorbeeld boeken, films of recepten te catalogiseren."
        buttonLabel={onCreate ? 'Collectie-module aanmaken' : null}
        onClick={onCreate}
        t={t}
      />
    );
  }

  const stats = aggregateStats(collections);
  const filtered = filterModuleId
    ? collections.filter((c) => c.id === filterModuleId)
    : collections;

  const allItems = filtered.flatMap((c) =>
    (c.items || []).map((it) => ({ ...it, _collection: c }))
  );

  const visibleItems = sortItems(
    allItems
      .filter((it) => {
        if (!query.trim()) return true;
        return it.name.toLowerCase().includes(query.trim().toLowerCase());
      })
      .filter((it) => {
        if (!activeTagId) return true;
        return (it.tags || []).includes(activeTagId);
      }),
    sort
  );

  const tagsForChips = filterModuleId
    ? (collections.find((c) => c.id === filterModuleId)?.tags || [])
    : collections.flatMap((c) => c.tags || []);

  const cycleSort = () => {
    const idx = SORT_OPTIONS.findIndex((s) => s.id === sort);
    setSort(SORT_OPTIONS[(idx + 1) % SORT_OPTIONS.length].id);
  };

  const selected = selectedItemId
    ? allItems.find((it) => it.id === selectedItemId) || null
    : null;

  if (selected) {
    const collection = selected._collection;
    const Icon = iconOptions[collection.icon] || Sparkles;
    return (
      <ItemDetail
        item={selected}
        collection={collection}
        Icon={Icon}
        editable={editable}
        onBack={() => setSelectedItemId(null)}
        onUpdate={(item) => onUpdateItem?.(collection.id, item)}
        onDelete={() => {
          onDeleteItem?.(collection.id, selected.id);
          setSelectedItemId(null);
        }}
        onLogEvent={(eventData) => onLogEvent?.(collection.id, selected.id, eventData)}
        onRemoveEvent={(idx) => onRemoveEvent?.(collection.id, selected.id, idx)}
        t={t}
      />
    );
  }

  const submitNewItem = () => {
    const name = newItemName.trim();
    if (!name || !newItemModuleId) return;
    onAddItem?.(newItemModuleId, name);
    setNewItemName('');
    setAdding(false);
  };

  return (
    <div className="slide-in space-y-4">
      <div className="grid grid-cols-2 gap-2">
        <div className={`${t.card} rounded-xl p-3 shadow-sm`}>
          <p className={`text-xs ${t.textMuted}`}>Totaal items</p>
          <p className={`text-xl font-bold ${t.textSecondary}`}>{stats.totalItems}</p>
        </div>
        <div className={`${t.card} rounded-xl p-3 shadow-sm`}>
          <p className={`text-xs ${t.textMuted}`}>Totaal events</p>
          <p className={`text-xl font-bold ${t.textSecondary}`}>{stats.totalEvents}</p>
        </div>
      </div>

      {stats.topByCount.length > 0 && stats.topByCount.some((it) => (it.events?.length || 0) > 1) && (
        <div className={`${t.card} rounded-2xl p-4 shadow-sm`}>
          <h3 className={`font-semibold ${t.textSecondary} mb-2 text-sm`}>Top 5 meest gelogd</h3>
          <ul className="space-y-1">
            {stats.topByCount.map((it) => {
              const cc = getColorClasses(it._collection.color);
              return (
                <li
                  key={it.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${t.hover} cursor-pointer`}
                  onClick={() => setSelectedItemId(it.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${cc.bar} flex-shrink-0`} />
                    <span className={`truncate text-sm ${t.textSecondary}`}>{it.name}</span>
                  </div>
                  <span className={`text-xs ${t.textMuted} flex-shrink-0`}>{it.events.length}x</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className={`${t.card} rounded-2xl p-4 shadow-sm space-y-3`}>
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoeken..."
            className={`w-full pl-9 pr-3 py-2 ${t.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        {collections.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterModuleId(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                !filterModuleId ? 'bg-blue-500 text-white' : `${t.cardSecondary} ${t.textMuted}`
              }`}
            >
              Alles
            </button>
            {collections.map((col) => {
              const cc = getColorClasses(col.color);
              const Icon = iconOptions[col.icon] || Sparkles;
              const active = filterModuleId === col.id;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setFilterModuleId(active ? null : col.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition inline-flex items-center gap-1.5 ${
                    active ? `${cc.bar} text-white` : `${cc.pillBg} ${cc.pillText}`
                  }`}
                >
                  <Icon className="w-3 h-3" />
                  {col.name}
                </button>
              );
            })}
          </div>
        )}

        {tagsForChips.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {tagsForChips.map((tg) => (
              <TagPill
                key={tg.id}
                tag={tg}
                active={activeTagId === tg.id}
                onClick={() => setActiveTagId((cur) => (cur === tg.id ? null : tg.id))}
              />
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={cycleSort}
            className={`text-xs ${t.textMuted} ${t.hover} px-2 py-1 rounded-lg inline-flex items-center gap-1 transition`}
          >
            <ArrowUpDown className="w-3 h-3" />
            {SORT_OPTIONS.find((s) => s.id === sort).label}
          </button>
          {editable && (
            <button
              type="button"
              onClick={() => {
                setAdding((v) => !v);
                if (!newItemModuleId && collections.length > 0) {
                  setNewItemModuleId(filterModuleId || collections[0].id);
                }
              }}
              className="text-xs px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg inline-flex items-center gap-1 transition"
            >
              <Plus className="w-3 h-3" /> Nieuw item
            </button>
          )}
        </div>

        {adding && editable && (
          <div className="flex gap-2 flex-wrap">
            <select
              value={newItemModuleId}
              onChange={(e) => setNewItemModuleId(e.target.value)}
              className={`px-2 py-2 ${t.input} ${t.textSecondary} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {collections.map((col) => (
                <option key={col.id} value={col.id}>{col.name}</option>
              ))}
            </select>
            <input
              type="text"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); submitNewItem(); }
                if (e.key === 'Escape') { setAdding(false); setNewItemName(''); }
              }}
              autoFocus
              placeholder="Naam..."
              className={`flex-1 min-w-[10rem] px-3 py-2 ${t.input} ${t.textSecondary} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
            <button
              type="button"
              onClick={submitNewItem}
              disabled={!newItemName.trim() || !newItemModuleId}
              className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm transition"
            >
              Toevoegen
            </button>
          </div>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className={`${t.card} rounded-2xl p-6 shadow-sm text-center`}>
          <p className={`text-sm ${t.textMuted}`}>
            {query.trim() || activeTagId ? 'Geen resultaten.' : 'Nog geen items.'}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {visibleItems.map((it) => {
            const col = it._collection;
            const cc = getColorClasses(col.color);
            const Icon = iconOptions[col.icon] || Sparkles;
            const mode = getItemTrackingMode(it, col);
            const eventsCount = it.events?.length || 0;
            const last = lastEventDate(it);
            const itemTags = (it.tags || [])
              .map((id) => (col.tags || []).find((tg) => tg.id === id))
              .filter(Boolean);
            return (
              <li
                key={it.id}
                className={`${t.card} rounded-xl p-3 shadow-sm ${t.hover} cursor-pointer transition`}
                onClick={() => setSelectedItemId(it.id)}
              >
                <div className="flex items-start gap-3">
                  <div className={`${cc.iconBg} ${cc.iconText} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className={`font-medium text-sm ${t.textSecondary} truncate`}>{it.name}</h4>
                      {mode === 'completion' && eventsCount > 0 && (
                        <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0">Voltooid</span>
                      )}
                      {mode === 'count' && eventsCount > 0 && (
                        <span className={`text-xs ${cc.iconText} flex-shrink-0`}>{eventsCount}x</span>
                      )}
                    </div>
                    <p className={`text-xs ${t.textMuted} truncate`}>
                      {col.name}{last ? ` · laatst ${last}` : ''}
                    </p>
                    {(it.rating > 0 || itemTags.length > 0) && (
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {it.rating > 0 && (
                          <StarRating value={it.rating} size="xs" readonly />
                        )}
                        {itemTags.map((tg) => (
                          <TagPill key={tg.id} tag={tg} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
