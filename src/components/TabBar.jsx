import React from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { getNavGroups } from './navItems';

export default function TabBar({ view, setView, theme, appMode }) {
  const { t } = useTranslation();

  const groups = getNavGroups(t, appMode);

  const tabBtnClass = (active) =>
    `flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition ${
      active ? 'bg-blue-500 text-white shadow' : `${theme.textMuted} ${theme.hover}`
    }`;

  return (
    <div className="mb-6 space-y-1">
      {groups.map((group, i) => (
        <div key={i} className={`flex gap-1 ${theme.card} rounded-xl p-1 shadow-sm`}>
          {group.map(tab => (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={tabBtnClass(view === tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}
