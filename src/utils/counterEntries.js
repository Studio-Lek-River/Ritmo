// Counter-generieke, pure transformaties op moduleData (het niveau van de
// bestaande seam `updateModuleData` in App.jsx). Geen React, geen storage.
// Mechanische extractie uit App.jsx (addCounterEntry, removeCounterEntry,
// setCounterEntryAmount) — nul gedragswijziging. Zie #141.
//
// Contracten die exact overleven (reviewchecklist):
// - Lezen is `??`, niet `||` — een 0 moet 0 blijven.
// - De `minutes`-spiegel wordt bij élke write meegeschreven.
// - `Math.max(0, …)` staat op remove en op setAmount/updateEntry, niet op add.
// - Entry niet gevonden ⇒ `prev` by reference terug (geen nieuw object).
// - De idempotentie-guard in undo (`entries.some(e => e.id === …)`).
//
// `incrementCounter` en `resetCounter` blijven bewust buiten dit bestand
// (App.jsx): incrementCounter leest currentTotal uit de render-closure i.p.v.
// uit de updater, resetCounter is een snapshot-undo op moduleniveau.

import { genId } from './genId';

// data.total ?? data.minutes ?? 0 — legacy minuten-modules schrijven alleen
// `minutes`, entry-based counters schrijven `total`.
export function readTotal(data) {
  return data?.total ?? data?.minutes ?? 0;
}

// Schrijft total én de legacy minutes-spiegel in één keer.
export function writeTotal(data, total) {
  return { ...data, total, minutes: total };
}

// Bouwt een nieuwe entry. `at` is optioneel (override voor tests/undo-replay);
// zonder `at` wordt `new Date()` gebruikt, net als de oorspronkelijke inline
// tijdopbouw in addCounterEntry.
//
// `linkedTo` volgt hetzelfde optionele patroon als `source`: alleen aanwezig
// als de aanroeper hem meegeeft, zodat een gewone entry exact dezelfde shape
// houdt als voorheen (geen migratie). Het veld wijst naar de entry in een
// andere module waar deze bij hoort: { moduleId, entryId, name } — gebruikt
// door de drink-kant van een gekoppelde voedingsregel (#143).
export function createEntry({ amount, category = null, source, linkedTo, at } = {}) {
  const now = at instanceof Date ? at : new Date();
  const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const entry = {
    id: genId('e'),
    amount,
    category: category ?? null,
    time,
  };
  if (source) entry.source = source;
  if (linkedTo) entry.linkedTo = linkedTo;
  return entry;
}

// Voegt een entry toe en telt `total`/`minutes` op — geen Math.max(0, …):
// toevoegen kan het totaal nooit onder 0 duwen.
export function addEntry(prev, entry, goal = 0) {
  const prevTotal = readTotal(prev);
  const newTotal = prevTotal + entry.amount;
  const crossed = goal > 0 && prevTotal < goal && newTotal >= goal;
  const withTotal = writeTotal(prev, newTotal);
  const next = { ...withTotal, entries: [...(prev.entries || []), entry] };
  return { next, crossed };
}

// Verwijdert een entry. Niet gevonden ⇒ `prev` by reference terug (geen
// save-effect-trigger, geen sync-push voor niets).
export function removeEntryById(prev, entryId) {
  const entries = prev.entries || [];
  const entry = entries.find((e) => e.id === entryId);
  if (!entry) return { next: prev, entry: null };
  const newTotal = Math.max(0, readTotal(prev) - entry.amount);
  const withTotal = writeTotal(prev, newTotal);
  const next = { ...withTotal, entries: entries.filter((e) => e.id !== entryId) };
  return { next, entry };
}

// Undo van removeEntryById: idempotent — is de entry (na een dubbele undo-
// klik, of omdat de gebruiker 'm intussen opnieuw logde) al aanwezig, dan
// verandert er niets.
export function restoreEntry(prev, entry) {
  const entries = prev.entries || [];
  if (entries.some((e) => e.id === entry.id)) return prev;
  const newTotal = readTotal(prev) + entry.amount;
  const withTotal = writeTotal(prev, newTotal);
  return { ...withTotal, entries: [...entries, entry] };
}

// Generieke entry-wijziging: patchFn(oldEntry) → partiële patch, gemerged in
// de entry. Het totaal verschuift met het delta tussen oude en nieuwe
// `amount`, geklemd op 0 (analoog aan removeEntryById). Niet gevonden ⇒ prev
// by reference terug, entry: null, crossed: false.
export function updateEntry(prev, entryId, patchFn, goal = 0) {
  const entries = prev.entries || [];
  const idx = entries.findIndex((e) => e.id === entryId);
  if (idx === -1) return { next: prev, entry: null, crossed: false };
  const oldEntry = entries[idx];
  const patch = patchFn(oldEntry) || {};
  const newEntry = { ...oldEntry, ...patch };
  const delta = newEntry.amount - oldEntry.amount;
  const prevTotal = readTotal(prev);
  const newTotal = Math.max(0, prevTotal + delta);
  const crossed = goal > 0 && prevTotal < goal && newTotal >= goal;
  const withTotal = writeTotal(prev, newTotal);
  const nextEntries = [...entries];
  nextEntries[idx] = newEntry;
  const next = { ...withTotal, entries: nextEntries };
  return { next, entry: newEntry, crossed };
}

// Dunne wrapper op updateEntry voor het rauwe-kcal-inline-edit-pad.
export function setEntryAmount(prev, entryId, amount) {
  const { next } = updateEntry(prev, entryId, () => ({ amount }));
  return { next };
}

// Over meerdere modules tegelijk: prevAll is de hele moduleData-map, writes
// is [{ moduleId, entry }], goals is { [moduleId]: number }. Retourneert de
// bijgewerkte map en de lijst moduleId's die hun dagdoel passeerden, zodat
// één setModuleData-call meerdere modules tegelijk kan bijwerken (nodig voor
// #143) zonder het save-effect meermaals te laten vuren.
export function applyEntryWrites(prevAll, writes, goals = {}) {
  let next = prevAll;
  const crossed = [];
  for (const { moduleId, entry } of writes) {
    const prevModuleData = next[moduleId] || {};
    const goal = goals[moduleId] ?? 0;
    const { next: nextModuleData, crossed: didCross } = addEntry(prevModuleData, entry, goal);
    next = { ...next, [moduleId]: nextModuleData };
    if (didCross) crossed.push(moduleId);
  }
  return { next, crossed };
}

// Spiegel van applyEntryWrites voor verwijderen. `targets` is
// [{ moduleId, entryId }]. Een target dat niet (meer) bestaat levert gewoon
// geen `removed`-rij op — een dangling pointer naar een al verwijderde
// tegenhanger mag nooit crashen of de rest van de verwijdering blokkeren.
// `removed` is [{ moduleId, entry }] en is precies de input van
// applyEntryRestores, zodat de undo van een gepaarde verwijdering óók in één
// setModuleData-call past.
export function applyEntryRemovals(prevAll, targets) {
  let next = prevAll;
  const removed = [];
  for (const { moduleId, entryId } of targets) {
    const prevModuleData = next[moduleId] || {};
    const { next: nextModuleData, entry } = removeEntryById(prevModuleData, entryId);
    if (!entry) continue;
    next = { ...next, [moduleId]: nextModuleData };
    removed.push({ moduleId, entry });
  }
  return { next, removed };
}

// Undo van applyEntryRemovals: zet elke verwijderde entry terug in zijn eigen
// module. Erft de idempotentie-guard van restoreEntry, dus een dubbele
// undo-klik verandert niets.
export function applyEntryRestores(prevAll, removed) {
  let next = prevAll;
  for (const { moduleId, entry } of removed) {
    const prevModuleData = next[moduleId] || {};
    next = { ...next, [moduleId]: restoreEntry(prevModuleData, entry) };
  }
  return next;
}

// Spiegel van applyEntryWrites voor bewerken. `updates` is
// [{ moduleId, entryId, patchFn }]; patchFn krijgt de oude entry en geeft een
// partiële patch terug, net als bij updateEntry. Een niet-gevonden entry
// wordt overgeslagen (prev blijft by reference staan), zodat een gepaarde
// bewerking met een verdwenen tegenhanger de gevonden kant gewoon bijwerkt.
export function applyEntryUpdates(prevAll, updates, goals = {}) {
  let next = prevAll;
  const crossed = [];
  for (const { moduleId, entryId, patchFn } of updates) {
    const prevModuleData = next[moduleId] || {};
    const goal = goals[moduleId] ?? 0;
    const { next: nextModuleData, entry, crossed: didCross } = updateEntry(prevModuleData, entryId, patchFn, goal);
    if (!entry) continue;
    next = { ...next, [moduleId]: nextModuleData };
    if (didCross) crossed.push(moduleId);
  }
  return { next, crossed };
}
