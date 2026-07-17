import React, { useMemo, useState } from 'react';
import { Plus, Search, Sparkles, Pencil, Library, ChevronRight } from 'lucide-react';
import { getColorClasses } from '../utils/colors';
import {
  aggregateStats,
  getAllTags,
  resolveTagLabel,
  countCheckedItems,
  countEventsThisWeek,
  countItemsWithActivity,
} from '../utils/collections';
import { formatRelativeDate } from '../utils/dates';
import StarRating from '../components/StarRating';
import TagPill from '../components/TagPill';
import CollectionItemFormModal from '../components/CollectionItemFormModal';
import EmptyState from '../components/EmptyState';
import { useUndoToast } from '../hooks/useUndoToast';
import { useTranslation } from '../i18n/useTranslation';

const ACCENT_COLORS = {
  blue: '#3b82f6', amber: '#f59e0b', green: '#22c55e', red: '#ef4444',
  orange: '#f97316', teal: '#14b8a6', cyan: '#06b6d4', yellow: '#eab308',
  violet: '#8b5cf6', purple: '#a855f7', rose: '#f43f5e', slate: '#64748b',
};

function itemEventMeta(item, t) {
  const count = item.events?.length || 0;
  if (count === 0) return t('collections.noEventsShort');
  const when = formatRelativeDate(item.events[0].date);
  const key = count === 1 ? 'collections.eventsWithLast' : 'collections.eventsWithLastPlural';
  return t(key, { count, when });
}

export default function CollectionsView({
  modules,
  iconOptions,
  initialFilterModuleId: _initialFilterModuleId,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onLogEvent,
  onRemoveEvent,
  onCreate,
  onDeleteCollection: _onDeleteCollection,
  onEditCollection,
  hasUsedSwipe: _hasUsedSwipe,
  onFirstSwipe: _onFirstSwipe,
  editable = true,
  theme,
}) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();

  const collections = useMemo(
    () => modules.filter((m) => m.type === 'collection'),
    [modules]
  );
  const enabledCollections = useMemo(
    () => collections.filter((c) => c.enabled !== false),
    [collections]
  );

  const [editingItemId, setEditingItemId] = useState(null);
  const [addingItemModuleId, setAddingItemModuleId] = useState(null);
  const [perModuleQuery, setPerModuleQuery] = useState({});
  const [perModuleTagId, setPerModuleTagId] = useState({});
  const [manageOpen, setManageOpen] = useState(false);

  const allItems = useMemo(
    () => collections.flatMap((c) => (c.items || []).map((it) => ({ ...it, _collection: c }))),
    [collections]
  );

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

  const editingItem = editingItemId ? allItems.find((it) => it.id === editingItemId) || null : null;
  const editingCollection = editingItem ? editingItem._collection : null;
  const addingCollection = addingItemModuleId
    ? collections.find((c) => c.id === addingItemModuleId) || null
    : null;

  const stats = aggregateStats(enabledCollections);
  const checkedCount = countCheckedItems(enabledCollections);
  const weekCount = countEventsThisWeek(enabledCollections);
  const activityCount = countItemsWithActivity(enabledCollections);

  const handleDeleteEditingItem = () => {
    if (!editingItem || !editingCollection) return;
    const snapshot = editingItem;
    const collectionId = editingCollection.id;
    onDeleteItem?.(collectionId, snapshot.id);
    setEditingItemId(null);
    showUndoToast(t('toast.itemDeleted'), () => {
      onUpdateItem?.(collectionId, snapshot);
    });
  };

  return (
    <div className="slide-in space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-base font-semibold ${theme.textSecondary}`}>
          {t('collections.title')}
        </h2>
        <div className="flex gap-2">
          {onEditCollection && collections.length > 0 && (
            <button
              type="button"
              onClick={() => setManageOpen(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} transition ${theme.hover}`}
            >
              {t('collectionsView.manage')}
            </button>
          )}
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
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 gap-2">
        {[
          { label: t('collections.totalItems'), value: stats.totalItems },
          { label: t('collections.checkedItems'), value: checkedCount },
          { label: t('collections.eventsThisWeek'), value: weekCount },
          { label: t('collections.withActivity'), value: activityCount },
        ].map(({ label, value }) => (
          <div key={label} className={`${theme.card} rounded-xl p-3 shadow-sm`}>
            <p className={`text-xs ${theme.textMuted}`}>{label}</p>
            <p className={`text-xl font-bold ${theme.textSecondary}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Per-collection cards */}
      {enabledCollections.map((col) => {
        const cc = getColorClasses(col.color);
        const Icon = iconOptions[col.icon] || Sparkles;
        const allColTags = getAllTags(col);
        const moduleQuery = (perModuleQuery[col.id] || '').toLowerCase();
        const moduleTagId = perModuleTagId[col.id] || null;
        const colItems = (col.items || []).filter((it) => {
          if (moduleQuery && !it.name.toLowerCase().includes(moduleQuery)) return false;
          if (moduleTagId && !(it.tags || []).includes(moduleTagId)) return false;
          return true;
        });
        const checkedInCol = (col.items || []).filter((it) => it.checked === true).length;
        const accentColor = ACCENT_COLORS[col.color] || '#3b82f6';

        return (
          <div key={col.id} className={`${theme.card} rounded-2xl shadow-sm overflow-hidden`}>
            {/* Card header */}
            <div className="flex items-center gap-3 p-4 pb-3">
              <div className={`${cc.iconBg} ${cc.iconText} w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${theme.textSecondary} truncate`}>{col.name}</p>
                <p className={`text-xs ${theme.textMuted}`}>
                  {t('collectionList.itemsInCollection', { count: (col.items || []).length })}
                  {checkedInCol > 0 && `, ${t('collections.checkedCount', { count: checkedInCol })}`}
                </p>
              </div>
              {editable && onEditCollection && (
                <button
                  type="button"
                  onClick={() => onEditCollection(col)}
                  className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition flex-shrink-0`}
                  aria-label={t('collections.editCollection', { name: col.name })}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Filter row */}
            <div className="flex gap-2 px-4 pb-3">
              <div className="relative flex-1">
                <Search className={`w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 ${theme.textMuted}`} />
                <input
                  type="text"
                  value={perModuleQuery[col.id] || ''}
                  onChange={(e) =>
                    setPerModuleQuery((prev) => ({ ...prev, [col.id]: e.target.value }))
                  }
                  placeholder={t('collections.searchInCollection', { name: col.name })}
                  className={`w-full pl-8 pr-3 py-1.5 ${theme.input} rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              {allColTags.length > 0 && (
                <select
                  value={perModuleTagId[col.id] || ''}
                  onChange={(e) =>
                    setPerModuleTagId((prev) => ({
                      ...prev,
                      [col.id]: e.target.value || null,
                    }))
                  }
                  className={`px-2 py-1.5 ${theme.input} ${theme.textSecondary} rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[8rem]`}
                >
                  <option value="">{t('collections.filterAll')}</option>
                  {allColTags.map((tg) => (
                    <option key={tg.id} value={tg.id}>{resolveTagLabel(tg, t)}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Item list */}
            {colItems.length > 0 && (
              <ul className="px-2 pb-1">
                {colItems.map((item) => {
                  const itemTags = (item.tags || [])
                    .map((id) => allColTags.find((tg) => tg.id === id))
                    .filter(Boolean);
                  const eventMeta = itemEventMeta(item, t);
                  const isChecked = item.checked === true;
                  return (
                    <li key={item.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditingItemId(item.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setEditingItemId(item.id);
                          }
                        }}
                        className={`flex items-start gap-2.5 py-2.5 px-2 rounded-xl ${theme.hover} cursor-pointer`}
                      >
                        {editable && (
                          <input
                            type="checkbox"
                            checked={isChecked}
                            style={{ accentColor }}
                            className="mt-0.5 w-4 h-4 flex-shrink-0 cursor-pointer"
                            onChange={() => onUpdateItem?.(col.id, { ...item, checked: !isChecked })}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={`text-sm font-medium truncate ${
                                isChecked ? `line-through ${theme.textMuted}` : theme.textSecondary
                              }`}
                            >
                              {item.name}
                            </span>
                            {editable && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onLogEvent?.(col.id, item.id);
                                }}
                                className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${cc.pillBg} ${cc.pillText} transition`}
                              >
                                {t('collections.logShort')}
                              </button>
                            )}
                          </div>
                          {(itemTags.length > 0 || (item.rating > 0 && col.itemFields?.rating !== false)) && (
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              {item.rating > 0 && col.itemFields?.rating !== false && (
                                <StarRating value={item.rating} size="xs" readonly />
                              )}
                              {itemTags.map((tg) => (
                                <TagPill key={tg.id} tag={tg} />
                              ))}
                            </div>
                          )}
                          <p className={`text-xs ${theme.textMuted} mt-0.5`}>{eventMeta}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            {colItems.length === 0 && (moduleQuery || moduleTagId) && (
              <p className={`text-xs ${theme.textMuted} px-4 pb-3`}>{t('collections.noResults')}</p>
            )}

            {/* Add item */}
            {editable && (
              <div className="px-4 pb-4 pt-1">
                <button
                  type="button"
                  onClick={() => setAddingItemModuleId(col.id)}
                  className={`text-sm ${theme.textMuted} ${theme.hover} px-2 py-1.5 rounded-lg transition flex items-center gap-1.5 w-full`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t('collections.addItem')}
                </button>
              </div>
            )}
          </div>
        );
      })}

      {/* Manage modal */}
      {manageOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setManageOpen(false)}
        >
          <div
            className={`${theme.card} rounded-2xl w-full max-w-sm shadow-xl overflow-hidden`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={`flex items-center justify-between px-4 py-3 border-b ${theme.border}`}>
              <h3 className={`font-semibold text-sm ${theme.textSecondary}`}>
                {t('collectionsView.manageAll')}
              </h3>
              <button
                type="button"
                onClick={() => setManageOpen(false)}
                className={`text-xs ${theme.textMuted} ${theme.hover} px-2 py-1 rounded-lg transition`}
              >
                {t('common.close')}
              </button>
            </div>
            <ul className="max-h-80 overflow-y-auto py-2">
              {collections.map((col) => {
                const cc = getColorClasses(col.color);
                const Icon = iconOptions[col.icon] || Sparkles;
                return (
                  <li key={col.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setManageOpen(false);
                        onEditCollection?.(col);
                      }}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 ${theme.hover} transition text-left`}
                    >
                      <div className={`${cc.iconBg} ${cc.iconText} w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-sm ${theme.textSecondary} truncate block`}>{col.name}</span>
                        {!col.enabled && (
                          <span className={`text-xs ${theme.textMuted}`}>{t('collectionsView.hiddenSuffix')}</span>
                        )}
                      </div>
                      <ChevronRight className={`w-4 h-4 ${theme.textMuted} flex-shrink-0`} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      )}

      {/* Add-item modal */}
      <CollectionItemFormModal
        open={!!addingCollection}
        mode="add"
        collection={addingCollection}
        Icon={addingCollection ? (iconOptions[addingCollection.icon] || Sparkles) : null}
        editable={editable}
        onClose={() => setAddingItemModuleId(null)}
        onSave={(item) => {
          if (addingItemModuleId) onAddItem?.(addingItemModuleId, item);
        }}
        theme={theme}
      />

      {/* Edit-item modal */}
      <CollectionItemFormModal
        open={!!editingItem}
        mode="edit"
        collection={editingCollection}
        Icon={editingCollection ? (iconOptions[editingCollection.icon] || Sparkles) : null}
        item={editingItem}
        editable={editable}
        onClose={() => setEditingItemId(null)}
        onSave={(updated) => {
          if (editingCollection) onUpdateItem?.(editingCollection.id, updated);
        }}
        onDelete={handleDeleteEditingItem}
        onLogEvent={() => {
          if (editingCollection && editingItem) onLogEvent?.(editingCollection.id, editingItem.id);
        }}
        onRemoveEvent={(idx) => {
          if (editingCollection && editingItem) onRemoveEvent?.(editingCollection.id, editingItem.id, idx);
        }}
        theme={theme}
      />
    </div>
  );
}
