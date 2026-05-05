import React, { useState } from 'react';
import { ArrowLeft, Edit3, Trash2, Plus, X, Check } from 'lucide-react';
import StarRating from './StarRating';
import TagPill from './TagPill';
import ConfirmDialog from './ConfirmDialog';
import { deleteItemConfirmationDescription, getItemTrackingMode, getAllTags } from '../utils/collections';
import { getColorClasses } from '../utils/colors';
import { useTranslation } from '../i18n/useTranslation';

function summary(item, mode, t) {
  const count = item.events?.length || 0;
  if (mode === 'completion') {
    return count > 0 ? t('collections.completed') : t('collections.notCompleted');
  }
  if (mode === 'count') {
    return t('collections.countLogged', { n: count });
  }
  if (mode === 'amount') {
    const total = (item.events || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return t('collections.totalAmount', { n: total });
  }
  return t('collections.eventsCount', { n: count });
}

export default function ItemDetail({
  item,
  collection,
  Icon,
  editable = true,
  initialEditMode = false,
  onBack,
  onUpdate,
  onDelete,
  onLogEvent,
  onRemoveEvent,
  theme,
}) {
  const { t } = useTranslation();
  const [editMode, setEditMode] = useState(initialEditMode);
  const [draft, setDraft] = useState(item);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const c = getColorClasses(collection.color);
  const fields = collection.itemFields || { rating: true, notes: true, tags: true };
  const mode = getItemTrackingMode(item, collection);
  const tagGroups = collection.tagGroups || [];

  const save = () => {
    onUpdate?.(draft);
    setEditMode(false);
  };

  const cancel = () => {
    setDraft(item);
    setEditMode(false);
  };

  const handleTagClick = (group, tagId) => {
    setDraft((prev) => {
      const current = prev.tags || [];
      const groupTagIds = group.tags.map((t) => t.id);
      const isSelected = current.includes(tagId);
      if (group.allowMultiple) {
        return { ...prev, tags: isSelected ? current.filter((id) => id !== tagId) : [...current, tagId] };
      }
      const without = current.filter((id) => !groupTagIds.includes(id));
      return { ...prev, tags: isSelected ? without : [...without, tagId] };
    });
  };

  const setTrackingMode = (m) => {
    setDraft((prev) => ({ ...prev, trackingMode: m }));
  };

  const view = editMode ? draft : item;

  const handleDelete = () => {
    if (!editable) return;
    setConfirmDelete(true);
  };

  const confirmDeleteAction = () => {
    setConfirmDelete(false);
    onDelete?.();
  };

  return (
    <div className={`${theme.card} rounded-2xl p-5 shadow-sm slide-in`}>
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={onBack}
          className={`p-2 ${theme.hover} rounded-lg ${theme.textSecondary} transition`}
          aria-label={t('common.back')}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        {editable && !editMode && (
          <>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className={`p-2 ${theme.hover} rounded-lg ${theme.textSecondary} transition`}
              aria-label={t('common.edit')}
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className={`p-2 ${theme.hover} rounded-lg text-red-500 transition`}
              aria-label={t('common.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      <div className={`${c.iconBg} rounded-xl p-4 mb-4`}>
        <div className="flex items-center gap-3">
          <div className={`${c.bar} text-white w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0`}>
            {Icon ? <Icon className="w-5 h-5" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            {editMode ? (
              <input
                type="text"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                className={`w-full px-2 py-1 rounded-lg text-base font-semibold ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            ) : (
              <h3 className={`font-semibold ${theme.textSecondary} truncate`}>{item.name}</h3>
            )}
            <p className={`text-xs ${c.iconText}`}>{collection.name}</p>
            <p className={`text-xs ${theme.textMuted} mt-0.5`}>{summary(item, mode, t)}</p>
          </div>
        </div>
      </div>

      {editMode && collection.trackingMode === 'flexible' && (
        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('collections.trackAs')}</p>
          <div className="flex gap-2 flex-wrap">
            {['completion', 'count', 'amount'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTrackingMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  (draft.trackingMode || 'completion') === m
                    ? 'bg-blue-500 text-white'
                    : `${theme.cardSecondary} ${theme.textMuted}`
                }`}
              >
                {t(`collections.trackingModes.${m}`)}
              </button>
            ))}
          </div>
        </div>
      )}

      {fields.rating && (
        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('collections.rating')}</p>
          <StarRating
            value={view.rating || 0}
            size="md"
            readonly={!editMode}
            onChange={(v) => setDraft({ ...draft, rating: v })}
          />
        </div>
      )}

      {fields.tags && tagGroups.length > 0 && (
        <div className="mb-4">
          {editMode
            ? tagGroups.map((group) => {
                if (group.tags.length === 0) return null;
                const groupLabel = group.labelKey ? t(group.labelKey) : (group.label || '');
                return (
                  <div key={group.id} className="mb-2 last:mb-0">
                    {groupLabel && <p className={`text-xs ${theme.textMuted} mb-1`}>{groupLabel}</p>}
                    <div className="flex gap-1.5 flex-wrap">
                      {group.tags.map((tag) => (
                        <TagPill
                          key={tag.id}
                          tag={{ ...tag, color: group.color || 'blue' }}
                          active={(draft.tags || []).includes(tag.id)}
                          onClick={() => handleTagClick(group, tag.id)}
                        />
                      ))}
                    </div>
                  </div>
                );
              })
            : (() => {
                const activeParts = tagGroups
                  .map((group) => ({
                    group,
                    selected: group.tags.filter((tag) => (view.tags || []).includes(tag.id)),
                  }))
                  .filter(({ selected }) => selected.length > 0);
                if (activeParts.length === 0) {
                  return <span className={`text-xs ${theme.textMuted}`}>{t('collections.noTagsShort')}</span>;
                }
                return activeParts.map(({ group, selected }) => {
                  const groupLabel = group.labelKey ? t(group.labelKey) : (group.label || '');
                  return (
                    <div key={group.id} className="mb-2 last:mb-0">
                      {groupLabel && <p className={`text-xs ${theme.textMuted} mb-1`}>{groupLabel}</p>}
                      <div className="flex gap-1.5 flex-wrap">
                        {selected.map((tag) => (
                          <TagPill key={tag.id} tag={{ ...tag, color: group.color || 'blue' }} />
                        ))}
                      </div>
                    </div>
                  );
                });
              })()
          }
        </div>
      )}

      {fields.notes && (
        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('collections.notes')}</p>
          {editMode ? (
            <textarea
              value={draft.notes || ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
              placeholder={t('collections.notePlaceholder')}
            />
          ) : (
            <p className={`text-sm ${theme.textSecondary} whitespace-pre-wrap`}>
              {item.notes || <span className={theme.textMuted}>{t('collections.noNotes')}</span>}
            </p>
          )}
        </div>
      )}

      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <p className={`text-xs ${theme.textMuted}`}>{t('collections.history')}</p>
          {editable && !editMode && (
            <button
              type="button"
              onClick={() => onLogEvent?.()}
              className={`text-xs px-2 py-1 ${c.bar} text-white rounded-lg transition hover:opacity-90 inline-flex items-center gap-1`}
            >
              <Plus className="w-3 h-3" /> {t('collections.logNow')}
            </button>
          )}
        </div>
        {(item.events?.length || 0) === 0 ? (
          <p className={`text-xs ${theme.textMuted} px-1`}>{t('collections.noEvents')}</p>
        ) : (
          <ul className="space-y-1">
            {item.events.map((ev, idx) => (
              <li
                key={idx}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-lg ${theme.cardSecondary} ${theme.textSecondary} text-sm`}
              >
                <span>
                  {ev.date}
                  {typeof ev.amount === 'number' ? ` · ${ev.amount}${collection.amountUnit ? ' ' + collection.amountUnit : ''}` : ''}
                </span>
                {editable && !editMode && (
                  <button
                    type="button"
                    onClick={() => onRemoveEvent?.(idx)}
                    className={`opacity-0 group-hover:opacity-100 p-1 ${theme.hover} rounded ${theme.textMuted} transition`}
                    aria-label={t('collections.deleteEventAria')}
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {editMode && (
        <div className="flex gap-2 mt-4">
          <button
            type="button"
            onClick={save}
            className="flex-1 px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition inline-flex items-center justify-center gap-1"
          >
            <Check className="w-4 h-4" /> {t('common.save')}
          </button>
          <button
            type="button"
            onClick={cancel}
            className={`px-3 py-2 ${theme.cardSecondary} ${theme.textSecondary} rounded-lg text-sm font-medium transition`}
          >
            {t('common.cancel')}
          </button>
        </div>
      )}

      {editable && !editMode && (
        <button
          type="button"
          onClick={handleDelete}
          className="mt-5 w-full px-3 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition inline-flex items-center justify-center gap-2"
        >
          <Trash2 className="w-4 h-4" />
          {t('collectionList.deleteItemAction')}
        </button>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title={t('collectionList.deleteItemTitle', { name: item.name })}
        description={deleteItemConfirmationDescription(item, t)}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete(false)}
        theme={theme}
      />
    </div>
  );
}
