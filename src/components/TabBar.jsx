import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';

const MAX_VISIBLE = 5;

export default function TabBar({ modules, view, setView, t, moreOpen, setMoreOpen, moreMenuRef }) {
  const allTabs = [
    { id: 'today', label: 'Vandaag', always: true },
    { id: 'week', label: 'Week', always: true },
    { id: 'month', label: 'Maand', always: true },
    { id: 'household', label: 'Huishouden', always: true },
    {
      id: 'projects',
      label: 'Projecten',
      emptyAddable: true,
      visible: modules.some(m => m.enabled && m.type === 'projects'),
    },
    {
      id: 'collections',
      label: 'Collecties',
      emptyAddable: true,
      visible: modules.some(m => m.enabled && m.type === 'collection'),
    },
    { id: 'reflection', label: 'Reflectie', always: true },
  ];
  const visibleTabs = allTabs.filter(tab => tab.always || tab.visible);
  const overflows = visibleTabs.length > MAX_VISIBLE;
  const inBar = overflows ? visibleTabs.slice(0, MAX_VISIBLE - 1) : visibleTabs;
  const inOverflow = overflows ? visibleTabs.slice(MAX_VISIBLE - 1) : [];
  const discoverable = allTabs.filter(tab => !tab.always && !tab.visible && tab.emptyAddable);
  const showMore = inOverflow.length > 0 || discoverable.length > 0;
  const activeInOverflow = inOverflow.some(tab => tab.id === view);

  const tabBtnClass = (active) =>
    `flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition ${
      active ? 'bg-blue-500 text-white shadow' : `${t.textMuted} ${t.hover}`
    }`;

  return (
    <div className="relative mb-6" ref={moreMenuRef}>
      <div className={`flex gap-1 ${t.card} rounded-xl p-1 shadow-sm`}>
        {inBar.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setView(tab.id); setMoreOpen(false); }}
            className={tabBtnClass(view === tab.id)}
          >
            {tab.label}
          </button>
        ))}
        {showMore && (
          <button
            onClick={() => setMoreOpen(o => !o)}
            className={tabBtnClass(activeInOverflow)}
            aria-label="Meer tabs"
            aria-expanded={moreOpen}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <MoreHorizontal className="w-4 h-4" />
              <span>Meer</span>
            </span>
          </button>
        )}
      </div>
      {showMore && moreOpen && (
        <div
          className={`absolute right-0 mt-2 z-30 ${t.card} rounded-xl shadow-lg border ${t.border} overflow-hidden min-w-[12rem]`}
        >
          {inOverflow.length > 0 && (
            <ul className="py-1">
              {inOverflow.map(tab => (
                <li key={tab.id}>
                  <button
                    onClick={() => { setView(tab.id); setMoreOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      view === tab.id ? `${t.text} font-semibold` : t.textSecondary
                    } ${t.hover}`}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {discoverable.length > 0 && (
            <div className={`${inOverflow.length > 0 ? `border-t ${t.border}` : ''}`}>
              <div className={`px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide ${t.textMuted}`}>
                Nog niet aangemaakt
              </div>
              <ul className="pb-1">
                {discoverable.map(tab => (
                  <li key={tab.id}>
                    <button
                      onClick={() => { setView(tab.id); setMoreOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm ${t.textSecondary} ${t.hover}`}
                    >
                      <span>{tab.label}</span>
                      <Plus className={`w-4 h-4 ${t.textMuted}`} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
