import React from 'react';
import { MoreHorizontal, Plus } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

const MAX_VISIBLE = 5;

export default function TabBar({ modules, view, setView, theme, moreOpen, setMoreOpen, moreMenuRef }) {
  const { t } = useTranslation();
  const allTabs = [
    { id: 'today', label: t('nav.today'), always: true },
    { id: 'week', label: t('nav.week'), always: true },
    { id: 'month', label: t('nav.month'), always: true },
    { id: 'household', label: t('nav.household'), always: true },
    {
      id: 'projects',
      label: t('nav.projects'),
      emptyAddable: true,
      visible: modules.some(m => m.enabled && m.type === 'projects'),
    },
    {
      id: 'collections',
      label: t('nav.collections'),
      emptyAddable: true,
      visible: modules.some(m => m.enabled && m.type === 'collection'),
    },
    {
      id: 'measurements',
      label: t('nav.measurements'),
      emptyAddable: true,
      visible: modules.some(m => m.enabled && m.type === 'measurements'),
    },
    { id: 'reflection', label: t('nav.reflection'), always: true },
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
      active ? 'bg-blue-500 text-white shadow' : `${theme.textMuted} ${theme.hover}`
    }`;

  return (
    <div className="relative mb-6" ref={moreMenuRef}>
      <div className={`flex gap-1 ${theme.card} rounded-xl p-1 shadow-sm`}>
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
            aria-label={t('nav.more')}
            aria-expanded={moreOpen}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <MoreHorizontal className="w-4 h-4" />
              <span>{t('nav.more')}</span>
            </span>
          </button>
        )}
      </div>
      {showMore && moreOpen && (
        <div
          className={`absolute right-0 mt-2 z-30 ${theme.card} rounded-xl shadow-lg border ${theme.border} overflow-hidden min-w-[12rem]`}
        >
          {inOverflow.length > 0 && (
            <ul className="py-1">
              {inOverflow.map(tab => (
                <li key={tab.id}>
                  <button
                    onClick={() => { setView(tab.id); setMoreOpen(false); }}
                    className={`w-full text-left px-3 py-2 text-sm ${
                      view === tab.id ? `${theme.text} font-semibold` : theme.textSecondary
                    } ${theme.hover}`}
                  >
                    {tab.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
          {discoverable.length > 0 && (
            <div className={`${inOverflow.length > 0 ? `border-t ${theme.border}` : ''}`}>
              <div className={`px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide ${theme.textMuted}`}>
                {t('nav.notYetCreated')}
              </div>
              <ul className="pb-1">
                {discoverable.map(tab => (
                  <li key={tab.id}>
                    <button
                      onClick={() => { setView(tab.id); setMoreOpen(false); }}
                      className={`w-full flex items-center justify-between px-3 py-2 text-sm ${theme.textSecondary} ${theme.hover}`}
                    >
                      <span>{tab.label}</span>
                      <Plus className={`w-4 h-4 ${theme.textMuted}`} />
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
