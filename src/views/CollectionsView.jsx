import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Sparkles, ArrowUpDown, Library, MoreHorizontal, Edit3 } from 'lucide-react';
import { getColorClasses } from '../utils/colors';
import {
  aggregateStats,
  getItemTrackingMode,
  deleteItemConfirmationDescription,
} from '../utils/collections';
import StarRating from '../components/StarRating';
import TagPill from '../components/TagPill';
import ItemDetail from '../components/ItemDetail';
import EmptyState from '../components/EmptyState';
import SwipeRow from '../components/SwipeRow';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';
import { useTranslation } from '../i18n/useTranslation';

const SORT_IDS = ['recent', 'count', 'alpha'];
const SORT_LABEL_KEY = {
  recent: 'collections.sortRecent',
  count: 'collections.sortMostLogged',
  alpha: 'collections.sortAZ',
};

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
  onDeleteCollection,
  hasUsedSwipe,
  onFirstSwipe,
  editable = true,
  theme,
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const collections = useMemo(
    () => modules.filter((m) => m.type === 'collection'),
    [modules]
  );

  const [filterModuleId, setFilterModuleId] = useState(initialFilterModuleId || null);
  const [activeTagId, setActiveTagId] = useState(null);
  const [sort, setSort] = useState('recent');
  const [query, setQuery] = useState('');
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [selectedItemEditMode, setSelectedItemEditMode] = useState(false);
  const [newItemModuleId, setNewItemModuleId] = useState(initialFilterModuleId || '');
  const [newItemName, setNewItemName] = useState('');
  const [confirmDeleteItem, setConfirmDeleteItem] = useState(null);
  const [confirmDeleteCollection, setConfirmDeleteCollection] = useState(null);
  const [collectionMenuOpen, setCollectionMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!collectionMenuOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-collection-menu]')) {
        setCollectionMenuOpen(false);
      }
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [collectionMenuOpen]);

  if (collections.length === 0) {
    return (
      <EmptyState
        icon={Library}
        title={t('collectionsView.emptyTitle')}
        description={t('collectionsView.emptyDesc')}
        buttonLabel={onCreate ? t('collectionsView.emptyButton') : null}
        onClick={onCreate}
        theme={theme}
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
    const idx = SORT_IDS.indexOf(sort);
    setSort(SORT_IDS[(idx + 1) % SORT_IDS.length]);
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
        initialEditMode={selectedItemEditMode}
        onBack={() => {
          setSelectedItemId(null);
          setSelectedItemEditMode(false);
        }}
        onUpdate={(item) => onUpdateItem?.(collection.id, item)}
        onDelete={() => {
          const snapshot = selected;
          onDeleteItem?.(collection.id, selected.id);
          setSelectedItemId(null);
          setSelectedItemEditMode(false);
          showToast({
            message: t('toast.itemDeleted'),
            actionLabel: t('common.undo'),
            onAction: () => {
              onUpdateItem?.(collection.id, snapshot);
            },
          });
        }}
        onLogEvent={(eventData) => onLogEvent?.(collection.id, selected.id, eventData)}
        onRemoveEvent={(idx) => onRemoveEvent?.(collection.id, selected.id, idx)}
        theme={theme}
      />
    );
  }

  const targetModuleId = filterModuleId || newItemModuleId || (collections[0] && collections[0].id);
  const trimmedNewName = newItemName.trim();
  const canAdd = !!trimmedNewName && !!targetModuleId;

  const submitNewItem = () => {
    if (!canAdd) return;
    onAddItem?.(targetModuleId, trimmedNewName);
    setNewItemName('');
  };

  const submitNewItemWithDetails = () => {
    if (!canAdd) return;
    const created = onAddItem?.(targetModuleId, trimmedNewName, { skipInitialEvent: true });
    setNewItemName('');
    if (created && created.id) {
      setSelectedItemId(created.id);
      setSelectedItemEditMode(true);
    }
  };

  const handleSwipeDelete = (item, collection) => {
    setConfirmDeleteItem({ item, collection });
  };

  const handleConfirmDeleteItem = () => {
    if (!confirmDeleteItem) return;
    const { item, collection } = confirmDeleteItem;
    onDeleteItem?.(collection.id, item.id);
    setConfirmDeleteItem(null);
    showToast({
      message: t('toast.itemDeleted'),
      actionLabel: t('common.undo'),
      onAction: () => {
        onUpdateItem?.(collection.id, item);
      },
    });
  };

  const handleConfirmDeleteCollection = () => {
    if (!confirmDeleteCollection) return;
    const collectionId = confirmDeleteCollection.id;
    onDeleteCollection?.(collectionId);
    setConfirmDeleteCollection(null);
    setFilterModuleId(null);
    showToast({ message: t('toast.collectionDeleted') });
  };

  const filteredCollection = filterModuleId
    ? collections.find((c) => c.id === filterModuleId)
    : null;
  const filteredItemsCount = filteredCollection ? (filteredCollection.items || []).length : null;
  const showAddHint = editable && !trimmedNewName;
  const showSwipeHint = editable && !hasUsedSwipe && visibleItems.length > 0;

  return (
    <div className="slide-in space-y-4">
      <div className="flex justify-end">
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
            aria-label={t('collectionsView.newCollectionAria')}
          >
            <Plus className="w-4 h-4" />
            {t('collectionsView.newCollectionLabel')}
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className={`${theme.card} rounded-xl p-3 shadow-sm`}>
          <p className={`text-xs ${theme.textMuted}`}>{t('collections.totalItems')}</p>
          <p className={`text-xl font-bold ${theme.textSecondary}`}>{stats.totalItems}</p>
        </div>
        <div className={`${theme.card} rounded-xl p-3 shadow-sm`}>
          <p className={`text-xs ${theme.textMuted}`}>{t('collections.totalEvents')}</p>
          <p className={`text-xl font-bold ${theme.textSecondary}`}>{stats.totalEvents}</p>
        </div>
      </div>

      {stats.topByCount.length > 0 && stats.topByCount.some((it) => (it.events?.length || 0) > 1) && (
        <div className={`${theme.card} rounded-2xl p-4 shadow-sm`}>
          <h3 className={`font-semibold ${theme.textSecondary} mb-2 text-sm`}>{t('collections.top5MostLogged')}</h3>
          <ul className="space-y-1">
            {stats.topByCount.map((it) => {
              const cc = getColorClasses(it._collection.color);
              return (
                <li
                  key={it.id}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg ${theme.hover} cursor-pointer`}
                  onClick={() => setSelectedItemId(it.id)}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`w-2 h-2 rounded-full ${cc.bar} flex-shrink-0`} />
                    <span className={`truncate text-sm ${theme.textSecondary}`}>{it.name}</span>
                  </div>
                  <span className={`text-xs ${theme.textMuted} flex-shrink-0`}>{it.events.length}x</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className={`${theme.card} rounded-2xl p-4 shadow-sm space-y-3`}>
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('collections.searchAllPlaceholder')}
            className={`w-full pl-9 pr-3 py-2 ${theme.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        {collections.length > 1 && (
          <div className="flex gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setFilterModuleId(null)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                !filterModuleId ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
              }`}
            >
              {t('collections.filterAll')}
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
                  {!col.enabled && (
                    <span className="opacity-70 text-[10px]">{t('collectionsView.hiddenSuffix')}</span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {filteredCollection && (
          <div className="relative flex items-center justify-between gap-2" data-collection-menu>
            <p className={`text-xs ${theme.textMuted}`}>
              {filteredItemsCount === 0
                ? t('collectionList.noItemsInCollection')
                : t('collectionList.itemsInCollection', { count: filteredItemsCount })}
            </p>
            {editable && (
              <button
                type="button"
                onClick={() => setCollectionMenuOpen((v) => !v)}
                className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
                aria-label={t('common.options')}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
            )}
            {collectionMenuOpen && (
              <div
                className={`absolute right-0 top-full mt-1 z-20 ${theme.card} rounded-xl shadow-lg border ${theme.border} overflow-hidden min-w-[10rem]`}
              >
                <button
                  type="button"
                  onClick={() => {
                    setCollectionMenuOpen(false);
                    setConfirmDeleteCollection(filteredCollection);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm text-red-500 ${theme.hover} transition`}
                >
                  {t('collectionsView.deleteCollectionAction')}
                </button>
              </div>
            )}
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
            className={`text-xs ${theme.textMuted} ${theme.hover} px-2 py-1 rounded-lg inline-flex items-center gap-1 transition`}
          >
            <ArrowUpDown className="w-3 h-3" />
            {t(SORT_LABEL_KEY[sort])}
          </button>
        </div>

        {editable && (
          <div className="space-y-2">
            <div className="flex gap-2 flex-wrap items-stretch">
              {!filterModuleId && collections.length > 1 && (
                <select
                  value={newItemModuleId}
                  onChange={(e) => setNewItemModuleId(e.target.value)}
                  className={`px-2 py-2 ${theme.input} ${theme.textSecondary} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
                >
                  <option value="">{t('collectionList.pickCollection')}</option>
                  {collections.map((col) => (
                    <option key={col.id} value={col.id}>{col.name}</option>
                  ))}
                </select>
              )}
              <input
                type="text"
                value={newItemName}
                onChange={(e) => setNewItemName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') { e.preventDefault(); submitNewItem(); }
                }}
                placeholder={t('collectionList.addPlaceholder')}
                className={`flex-1 min-w-[8rem] px-3 py-2 ${theme.input} ${theme.textSecondary} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
              <button
                type="button"
                onClick={submitNewItem}
                disabled={!canAdd}
                aria-label={t('collections.addItemAria')}
                className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm transition"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={submitNewItemWithDetails}
                disabled={!canAdd}
                title={t('collectionList.addWithDetailsTooltip')}
                aria-label={t('collectionList.addWithDetailsTooltip')}
                className={`px-3 py-2 ${theme.cardSecondary} ${theme.textSecondary} disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm transition`}
              >
                <Edit3 className="w-4 h-4" />
              </button>
            </div>
            {showAddHint && (
              <p className={`text-xs ${theme.textMuted}`}>{t('collectionList.addHint')}</p>
            )}
            {filteredCollection && filteredItemsCount === 0 && (
              <p className={`text-xs ${theme.textMuted}`}>{t('collectionList.emptyItemsText')}</p>
            )}
          </div>
        )}
      </div>

      {visibleItems.length === 0 ? (
        <div className={`${theme.card} rounded-2xl p-6 shadow-sm text-center`}>
          <p className={`text-sm ${theme.textMuted}`}>
            {query.trim() || activeTagId ? t('collections.noResults') : t('collections.noItemsYet')}
          </p>
        </div>
      ) : (
        <>
          {showSwipeHint && (
            <p className={`text-xs ${theme.textMuted} px-1`}>{t('collectionList.swipeHint')}</p>
          )}
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
                <li key={it.id} className="rounded-xl">
                  <SwipeRow
                    disabled={!editable}
                    onDelete={() => handleSwipeDelete(it, col)}
                    onFirstSwipe={onFirstSwipe}
                    ariaLabel={t('collectionList.deleteItemAria')}
                    className="rounded-xl"
                  >
                    <div
                      className={`${theme.card} rounded-xl p-3 shadow-sm ${theme.hover} cursor-pointer transition`}
                      onClick={() => setSelectedItemId(it.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`${cc.iconBg} ${cc.iconText} w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className={`font-medium text-sm ${theme.textSecondary} truncate`}>{it.name}</h4>
                            {mode === 'completion' && eventsCount > 0 && (
                              <span className="text-xs text-green-600 dark:text-green-400 flex-shrink-0">{t('collections.completed')}</span>
                            )}
                            {mode === 'count' && eventsCount > 0 && (
                              <span className={`text-xs ${cc.iconText} flex-shrink-0`}>{eventsCount}x</span>
                            )}
                          </div>
                          <p className={`text-xs ${theme.textMuted} truncate`}>
                            {col.name}{last ? ` · ${t('collections.lastEventSuffix', { date: last })}` : ''}
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
                    </div>
                  </SwipeRow>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <ConfirmDialog
        open={!!confirmDeleteItem}
        title={confirmDeleteItem ? t('collectionList.deleteItemTitle', { name: confirmDeleteItem.item.name }) : ''}
        description={confirmDeleteItem ? deleteItemConfirmationDescription(confirmDeleteItem.item, t) : ''}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleConfirmDeleteItem}
        onCancel={() => setConfirmDeleteItem(null)}
        theme={theme}
      />

      <ConfirmDialog
        open={!!confirmDeleteCollection}
        title={confirmDeleteCollection ? t('collectionsView.deleteCollectionTitle', { name: confirmDeleteCollection.name }) : ''}
        description={t('collectionsView.deleteCollectionDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleConfirmDeleteCollection}
        onCancel={() => setConfirmDeleteCollection(null)}
        theme={theme}
      />
    </div>
  );
}
