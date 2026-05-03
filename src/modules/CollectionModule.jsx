import React, { useState, useMemo } from 'react';
import { Settings, Plus, Search, Check, X } from 'lucide-react';
import { getColorClasses } from '../utils/colors';

function lastEventDate(item) {
  return item.events && item.events.length > 0 ? item.events[0].date : null;
}

function recentlyLogged(items) {
  return [...items]
    .filter((it) => (it.events?.length || 0) > 0)
    .sort((a, b) => {
      const da = lastEventDate(a) || '';
      const db = lastEventDate(b) || '';
      return db.localeCompare(da);
    })
    .slice(0, 3);
}

export default function CollectionModule({
  module: mod,
  Icon,
  editable = true,
  onAddItem,
  onLogEvent,
  onOpenView,
  onEdit,
  t,
}) {
  const c = getColorClasses(mod.color);
  const items = mod.items || [];
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState('');
  const [query, setQuery] = useState('');

  const matches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toLowerCase();
    return items.filter((it) => it.name.toLowerCase().includes(q)).slice(0, 5);
  }, [items, query]);

  const recent = useMemo(() => recentlyLogged(items), [items]);

  const handleHeaderClick = () => {
    if (typeof onOpenView === 'function') onOpenView();
  };

  const submitNew = () => {
    const name = newName.trim();
    if (!name || !editable) return;
    onAddItem?.(name);
    setNewName('');
    setAdding(false);
  };

  const logMatch = (itemId) => {
    if (!editable) return;
    onLogEvent?.(itemId);
    setQuery('');
  };

  return (
    <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
      <div className="flex items-center gap-3 mb-3">
        <div
          role="button"
          tabIndex={0}
          onClick={handleHeaderClick}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleHeaderClick(); } }}
          className={`flex items-center gap-3 flex-1 min-w-0 ${t.hover} -m-1 p-1 rounded-lg cursor-pointer transition`}
        >
          <div className={`${c.iconBg} ${c.iconText} w-9 h-9 rounded-xl flex items-center justify-center`}>
            {Icon ? <Icon className="w-5 h-5" /> : null}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold ${t.textSecondary} truncate`}>{mod.name}</h2>
            <p className={`text-xs ${t.textMuted}`}>{items.length} {items.length === 1 ? 'item' : 'items'}</p>
          </div>
        </div>
        {editable && (
          <button
            type="button"
            onClick={() => setAdding((v) => !v)}
            className={`p-1.5 ${t.hover} rounded-lg ${t.textMuted} transition`}
            title="Item toevoegen"
            aria-label="Item toevoegen"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
        {onEdit && (
          <button
            type="button"
            onClick={onEdit}
            className={`p-1.5 ${t.hover} rounded-lg ${t.textMuted} transition`}
            title="Module-instellingen"
            aria-label={`Instellingen voor ${mod.name}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {adding && editable && (
        <div className="flex items-center gap-2 mb-3">
          <input
            autoFocus
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') { e.preventDefault(); submitNew(); }
              if (e.key === 'Escape') { setAdding(false); setNewName(''); }
            }}
            placeholder="Nieuw item..."
            className={`flex-1 px-3 py-2 rounded-lg text-sm ${t.input} ${t.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
          <button
            type="button"
            onClick={submitNew}
            disabled={!newName.trim()}
            className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition"
            aria-label="Item toevoegen"
          >
            <Check className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => { setAdding(false); setNewName(''); }}
            className={`px-3 py-2 ${t.hover} rounded-lg ${t.textMuted} transition`}
            aria-label="Annuleren"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className="relative mb-2">
          <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${t.textMuted}`} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Zoek en log..."
            className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm ${t.input} ${t.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>
      )}

      {query.trim() && matches.length > 0 && (
        <ul className="space-y-1 mt-2">
          {matches.map((it) => (
            <li key={it.id}>
              <button
                type="button"
                onClick={() => logMatch(it.id)}
                disabled={!editable}
                className={`w-full text-left px-3 py-2 rounded-lg ${t.hover} ${t.textSecondary} text-sm transition flex items-center justify-between disabled:opacity-50`}
              >
                <span className="truncate">{it.name}</span>
                <span className={`text-xs ${t.textMuted}`}>
                  {(it.events?.length || 0)}x
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {query.trim() && matches.length === 0 && (
        <p className={`text-xs ${t.textMuted} mt-2 px-1`}>Geen resultaten.</p>
      )}

      {!query.trim() && recent.length > 0 && (
        <div className="mt-2">
          <p className={`text-xs ${t.textMuted} mb-1 px-1`}>Recent gelogd</p>
          <ul className="space-y-1">
            {recent.map((it) => (
              <li key={it.id} className={`px-3 py-1.5 rounded-lg ${t.textSecondary} text-sm flex items-center justify-between`}>
                <span className="truncate">{it.name}</span>
                <span className={`text-xs ${t.textMuted}`}>{lastEventDate(it)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {items.length === 0 && !adding && (
        <p className={`text-xs ${t.textMuted} px-1`}>
          Nog geen items. Tik op + om er een toe te voegen.
        </p>
      )}
    </div>
  );
}
