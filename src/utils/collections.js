// Pure helpers voor het collection-module-type.
// Items en events leven in settings.modules[i].items[j].events,
// niet in per-dag moduleData.

import { todayKey } from './dates';

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export function getItemTrackingMode(item, collection) {
  if (collection.trackingMode === 'flexible') {
    return item.trackingMode || 'completion';
  }
  return collection.trackingMode || 'completion';
}

export function logEvent(item, event = {}) {
  const newEvent = { date: event.date || todayKey(), ...event };
  return { ...item, events: [newEvent, ...(item.events || [])] };
}

export function removeEvent(item, eventIndex) {
  return {
    ...item,
    events: (item.events || []).filter((_, i) => i !== eventIndex),
  };
}

export function aggregateStats(collections) {
  const allItems = collections.flatMap((c) =>
    (c.items || []).map((it) => ({ ...it, _collection: c }))
  );
  const totalItems = allItems.length;
  const totalEvents = allItems.reduce((s, it) => s + (it.events?.length || 0), 0);
  const topByCount = [...allItems]
    .filter((it) => (it.events?.length || 0) > 0)
    .sort((a, b) => (b.events?.length || 0) - (a.events?.length || 0))
    .slice(0, 5);
  return { totalItems, totalEvents, topByCount };
}

export function createItem(name) {
  return {
    id: genId('item'),
    name,
    tags: [],
    rating: 0,
    notes: '',
    events: [],
  };
}

export function createTag(label, color = 'blue') {
  return {
    id: genId('tag'),
    label,
    color,
  };
}
