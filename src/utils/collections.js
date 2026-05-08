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

export function generateTagId() {
  return genId('tag');
}

export function generateTagGroupId() {
  return genId('group');
}

export function getAllTags(module) {
  if (!module?.tagGroups) return [];
  return module.tagGroups.flatMap((g) =>
    g.tags.map((t) => ({ ...t, color: g.color || 'blue', groupId: g.id }))
  );
}

export function resolveTagLabel(tag, t) {
  if (!tag) return '';
  if (tag.label) return tag.label;
  if (tag.labelKey && typeof t === 'function') return t(tag.labelKey);
  return '';
}

export function findTagWithGroup(module, tagId) {
  if (!module?.tagGroups) return null;
  for (const group of module.tagGroups) {
    const tag = group.tags.find((t) => t.id === tagId);
    if (tag) return { tag, group };
  }
  return null;
}

export function countCheckedItems(collections) {
  return collections.flatMap((c) => c.items || []).filter((it) => it.checked === true).length;
}

export function countEventsThisWeek(collections) {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0=ma, 6=zo
  const monday = new Date(now);
  monday.setDate(now.getDate() - day);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return collections
    .flatMap((c) => c.items || [])
    .flatMap((it) => it.events || [])
    .filter((ev) => {
      const d = new Date(ev.date);
      return d >= monday && d <= sunday;
    }).length;
}

export function countItemsWithActivity(collections) {
  return collections
    .flatMap((c) => c.items || [])
    .filter((it) => (it.events?.length || 0) > 0).length;
}

export function deleteItemConfirmationDescription(item, t) {
  const eventCount = (item.events || []).length;
  if (eventCount > 0) {
    return t('collectionList.deleteItemDescWithEvents', { count: eventCount });
  }
  return t('collectionList.deleteItemDesc');
}
