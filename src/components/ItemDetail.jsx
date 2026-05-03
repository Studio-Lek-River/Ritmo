import React, { useState } from 'react';
import { ArrowLeft, Edit3, Trash2, Plus, X, Check } from 'lucide-react';
import StarRating from './StarRating';
import TagPill from './TagPill';
import { getColorClasses } from '../utils/colors';
import { getItemTrackingMode } from '../utils/collections';

function summary(item, mode) {
  const count = item.events?.length || 0;
  if (mode === 'completion') {
    return count > 0 ? 'Voltooid' : 'Nog niet voltooid';
  }
  if (mode === 'count') {
    return `${count}x gelogd`;
  }
  if (mode === 'amount') {
    const total = (item.events || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
    return `Totaal ${total}`;
  }
  return `${count} events`;
}

export default function ItemDetail({
  item,
  collection,
  Icon,
  editable = true,
  onBack,
  onUpdate,
  onDelete,
  onLogEvent,
  onRemoveEvent,
  t,
}) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState(item);
  const c = getColorClasses(collection.color);
  const fields = collection.itemFields || { rating: true, notes: true, tags: true };
  const mode = getItemTrackingMode(item, collection);
  const tags = collection.tags || [];

  const save = () => {
    onUpdate?.(draft);
    setEditMode(false);
  };

  const cancel = () => {
    setDraft(item);
    setEditMode(false);
  };

  const toggleTag = (tagId) => {
    setDraft((prev) => {
      const has = (prev.tags || []).includes(tagId);
      return {
        ...prev,
        tags: has ? prev.tags.filter((id) => id !== tagId) : [...(prev.tags || []), tagId],
      };
    });
  };

  const setTrackingMode = (m) => {
    setDraft((prev) => ({ ...prev, trackingMode: m }));
  };

  const view = editMode ? draft : item;
  const itemTags = (view.tags || []).map((id) => tags.find((tg) => tg.id === id)).filter(Boolean);

  const handleDelete = () => {
    if (!editable) return;
    if (window.confirm(`"${item.name}" verwijderen?`)) {
      onDelete?.();
    }
  };

  return (
    <div className={`${t.card} rounded-2xl p-5 shadow-sm slide-in`}>
      <div className="flex items-center gap-2 mb-4">
        <button
          type="button"
          onClick={onBack}
          className={`p-2 ${t.hover} rounded-lg ${t.textSecondary} transition`}
          aria-label="Terug"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1" />
        {editable && !editMode && (
          <>
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className={`p-2 ${t.hover} rounded-lg ${t.textSecondary} transition`}
              aria-label="Bewerken"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={handleDelete}
              className={`p-2 ${t.hover} rounded-lg text-red-500 transition`}
              aria-label="Verwijderen"
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
                className={`w-full px-2 py-1 rounded-lg text-base font-semibold ${t.input} ${t.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
              />
            ) : (
              <h3 className={`font-semibold ${t.textSecondary} truncate`}>{item.name}</h3>
            )}
            <p className={`text-xs ${c.iconText}`}>{collection.name}</p>
            <p className={`text-xs ${t.textMuted} mt-0.5`}>{summary(item, mode)}</p>
          </div>
        </div>
      </div>

      {editMode && collection.trackingMode === 'flexible' && (
        <div className="mb-4">
          <p className={`text-xs ${t.textMuted} mb-1`}>Bijhouden als</p>
          <div className="flex gap-2 flex-wrap">
            {['completion', 'count', 'amount'].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setTrackingMode(m)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  (draft.trackingMode || 'completion') === m
                    ? 'bg-blue-500 text-white'
                    : `${t.cardSecondary} ${t.textMuted}`
                }`}
              >
                {m === 'completion' ? 'Voltooien' : m === 'count' ? 'Tellen' : 'Hoeveelheid'}
              </button>
            ))}
          </div>
        </div>
      )}

      {fields.rating && (
        <div className="mb-4">
          <p className={`text-xs ${t.textMuted} mb-1`}>Beoordeling</p>
          <StarRating
            value={view.rating || 0}
            size="md"
            readonly={!editMode}
            onChange={(v) => setDraft({ ...draft, rating: v })}
          />
        </div>
      )}

      {fields.tags && tags.length > 0 && (
        <div className="mb-4">
          <p className={`text-xs ${t.textMuted} mb-1`}>Tags</p>
          <div className="flex gap-1.5 flex-wrap">
            {editMode
              ? tags.map((tg) => (
                  <TagPill
                    key={tg.id}
                    tag={tg}
                    active={(draft.tags || []).includes(tg.id)}
                    onClick={() => toggleTag(tg.id)}
                  />
                ))
              : itemTags.length > 0
                ? itemTags.map((tg) => <TagPill key={tg.id} tag={tg} />)
                : <span className={`text-xs ${t.textMuted}`}>Geen tags</span>}
          </div>
        </div>
      )}

      {fields.notes && (
        <div className="mb-4">
          <p className={`text-xs ${t.textMuted} mb-1`}>Notities</p>
          {editMode ? (
            <textarea
              value={draft.notes || ''}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
              rows={3}
              className={`w-full px-3 py-2 rounded-lg text-sm ${t.input} ${t.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none`}
              placeholder="Vrije notitie..."
            />
          ) : (
            <p className={`text-sm ${t.textSecondary} whitespace-pre-wrap`}>
              {item.notes || <span className={t.textMuted}>Geen notities</span>}
            </p>
          )}
        </div>
      )}

      <div className="mb-2">
        <div className="flex items-center justify-between mb-1">
          <p className={`text-xs ${t.textMuted}`}>Geschiedenis</p>
          {editable && !editMode && (
            <button
              type="button"
              onClick={() => onLogEvent?.()}
              className={`text-xs px-2 py-1 ${c.bar} text-white rounded-lg transition hover:opacity-90 inline-flex items-center gap-1`}
            >
              <Plus className="w-3 h-3" /> Log nu
            </button>
          )}
        </div>
        {(item.events?.length || 0) === 0 ? (
          <p className={`text-xs ${t.textMuted} px-1`}>Nog geen events.</p>
        ) : (
          <ul className="space-y-1">
            {item.events.map((ev, idx) => (
              <li
                key={idx}
                className={`group flex items-center justify-between px-3 py-1.5 rounded-lg ${t.cardSecondary} ${t.textSecondary} text-sm`}
              >
                <span>
                  {ev.date}
                  {typeof ev.amount === 'number' ? ` · ${ev.amount}${collection.amountUnit ? ' ' + collection.amountUnit : ''}` : ''}
                </span>
                {editable && !editMode && (
                  <button
                    type="button"
                    onClick={() => onRemoveEvent?.(idx)}
                    className={`opacity-0 group-hover:opacity-100 p-1 ${t.hover} rounded ${t.textMuted} transition`}
                    aria-label="Event verwijderen"
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
            <Check className="w-4 h-4" /> Opslaan
          </button>
          <button
            type="button"
            onClick={cancel}
            className={`px-3 py-2 ${t.cardSecondary} ${t.textSecondary} rounded-lg text-sm font-medium transition`}
          >
            Annuleren
          </button>
        </div>
      )}
    </div>
  );
}
