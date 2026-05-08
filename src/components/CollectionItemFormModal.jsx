import React, { useEffect, useState } from 'react';
import { Trash2, Plus, X, ChevronDown, ChevronUp } from 'lucide-react';
import StarRating from './StarRating';
import TagPill from './TagPill';
import ConfirmDialog from './ConfirmDialog';
import {
  createItem,
  logEvent,
  deleteItemConfirmationDescription,
  getItemTrackingMode,
} from '../utils/collections';
import { todayKey } from '../utils/dates';
import { getColorClasses } from '../utils/colors';
import { useTranslation } from '../i18n/useTranslation';

const EMPTY_DRAFT = { name: '', tags: [], rating: 0, notes: '', events: [] };

export default function CollectionItemFormModal({
  open,
  mode = 'edit',
  collection,
  Icon,
  item,
  editable = true,
  onClose,
  onSave,
  onDelete,
  onLogEvent,
  onRemoveEvent,
  theme,
}) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [eventExpanded, setEventExpanded] = useState(true);
  const [eventDate, setEventDate] = useState(todayKey());
  const [eventAmount, setEventAmount] = useState(1);
  const [eventNote, setEventNote] = useState('');

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && item) {
      setDraft(item);
    } else {
      setDraft(EMPTY_DRAFT);
    }
    setEventExpanded(true);
    setEventDate(todayKey());
    setEventAmount(1);
    setEventNote('');
    setConfirmDelete(false);
  }, [open, mode, item]);

  if (!open || !collection) return null;

  const c = getColorClasses(collection.color);
  const fields = collection.itemFields || { rating: true, notes: true, tags: true };
  const tagGroups = collection.tagGroups || [];
  const effectiveTrackingMode = getItemTrackingMode(draft, collection);
  const showAmountField = effectiveTrackingMode === 'count' || effectiveTrackingMode === 'amount';
  const showUnit = effectiveTrackingMode === 'amount' && !!collection.amountUnit;

  const handleTagClick = (group, tagId) => {
    setDraft((prev) => {
      const current = prev.tags || [];
      const groupTagIds = group.tags.map((tg) => tg.id);
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

  const buildEvent = () => {
    const event = { date: eventDate || todayKey() };
    if (showAmountField) {
      const n = Number(eventAmount);
      event.amount = Number.isFinite(n) ? n : 1;
    }
    const trimmedNote = (eventNote || '').trim();
    if (trimmedNote) event.note = trimmedNote;
    return event;
  };

  const canSave = (draft.name || '').trim().length > 0;

  const save = () => {
    if (!canSave) return;
    if (mode === 'add') {
      let newItem = createItem(draft.name.trim());
      newItem = {
        ...newItem,
        tags: draft.tags || [],
        rating: draft.rating || 0,
        notes: draft.notes || '',
      };
      if (collection.trackingMode === 'flexible' && draft.trackingMode) {
        newItem.trackingMode = draft.trackingMode;
      }
      if (eventExpanded) {
        newItem = logEvent(newItem, buildEvent());
      }
      onSave?.(newItem);
    } else {
      onSave?.({ ...draft, name: draft.name.trim() });
    }
    onClose?.();
  };

  const handleDeleteClick = () => {
    if (!editable) return;
    setConfirmDelete(true);
  };

  const confirmDeleteAction = () => {
    setConfirmDelete(false);
    onDelete?.();
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`${theme.card} rounded-2xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto my-4 shadow-xl slide-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-base font-semibold ${theme.textSecondary}`}>
            {mode === 'add' ? t('collections.addItem') : t('collections.editItem')}
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

        <div className={`${c.iconBg} rounded-xl p-3 mb-4 flex items-center gap-3`}>
          <div className={`${c.bar} text-white w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0`}>
            {Icon ? <Icon className="w-4 h-4" /> : null}
          </div>
          <div className="min-w-0 flex-1">
            <p className={`text-xs ${c.iconText} truncate`}>{collection.name}</p>
          </div>
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('collections.itemName')}</p>
          <input
            type="text"
            value={draft.name}
            autoFocus={mode === 'add'}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={t('collections.namePlaceholder')}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        {collection.trackingMode === 'flexible' && (
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
              value={draft.rating || 0}
              size="md"
              onChange={(v) => setDraft({ ...draft, rating: v })}
            />
          </div>
        )}

        {fields.tags && tagGroups.length > 0 && (
          <div className="mb-4">
            {tagGroups.map((group) => {
              if (!group.tags || group.tags.length === 0) return null;
              const groupLabel = group.labelKey ? t(group.labelKey) : (group.label || '');
              const subtitle = group.allowMultiple
                ? t('collections.allowMultiple')
                : t('collections.singleSelect');
              return (
                <div key={group.id} className="mb-3 last:mb-0">
                  <div className="flex items-baseline justify-between mb-1">
                    {groupLabel && <p className={`text-xs ${theme.textMuted}`}>{groupLabel}</p>}
                    <p className={`text-[10px] ${theme.textMuted}`}>{subtitle}</p>
                  </div>
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
            })}
          </div>
        )}

        {fields.notes && (
          <div className="mb-4">
            <p className={`text-xs ${theme.textMuted} mb-1`}>{t('collections.notes')}</p>
            <textarea
              value={draft.notes || ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
              placeholder={t('collections.notePlaceholder')}
            />
          </div>
        )}

        {mode === 'add' && (
          <div className="mb-4">
            <button
              type="button"
              onClick={() => setEventExpanded((v) => !v)}
              className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-sm ${theme.cardSecondary} ${theme.textSecondary} transition`}
              aria-expanded={eventExpanded}
            >
              <span className="font-medium">{t('collections.firstEvent')}</span>
              {eventExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {eventExpanded && (
              <div className="mt-2 space-y-2 px-1">
                <div>
                  <p className={`text-xs ${theme.textMuted} mb-1`}>{t('collections.eventDate')}</p>
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
                {showAmountField && (
                  <div>
                    <p className={`text-xs ${theme.textMuted} mb-1`}>{t('collections.eventAmount')}</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={eventAmount}
                        onChange={(e) => setEventAmount(e.target.value)}
                        min="0"
                        step="any"
                        className={`flex-1 min-w-0 px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                      />
                      {showUnit && (
                        <span className={`text-xs ${theme.textMuted}`}>{collection.amountUnit}</span>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <p className={`text-xs ${theme.textMuted} mb-1`}>{t('collections.eventNote')}</p>
                  <input
                    type="text"
                    value={eventNote}
                    onChange={(e) => setEventNote(e.target.value)}
                    placeholder={t('collections.notePlaceholder')}
                    className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {mode === 'edit' && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1">
              <p className={`text-xs ${theme.textMuted}`}>{t('collections.history')}</p>
              {editable && (
                <button
                  type="button"
                  onClick={() => onLogEvent?.()}
                  className={`text-xs px-2 py-1 ${c.bar} text-white rounded-lg transition hover:opacity-90 inline-flex items-center gap-1`}
                >
                  <Plus className="w-3 h-3" /> {t('collections.logNow')}
                </button>
              )}
            </div>
            {(item?.events?.length || 0) === 0 ? (
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
                      {typeof ev.amount === 'number'
                        ? ` · ${ev.amount}${collection.amountUnit ? ' ' + collection.amountUnit : ''}`
                        : ''}
                      {ev.note ? ` · ${ev.note}` : ''}
                    </span>
                    {editable && (
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
        )}

        <div className="flex items-center gap-2 mt-5">
          {mode === 'edit' && editable && (
            <button
              type="button"
              onClick={handleDeleteClick}
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
            {mode === 'add' ? t('collections.submitAdd') : t('common.save')}
          </button>
        </div>

        <ConfirmDialog
          open={confirmDelete}
          title={item ? t('collectionList.deleteItemTitle', { name: item.name }) : ''}
          description={item ? deleteItemConfirmationDescription(item, t) : ''}
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
