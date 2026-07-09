import React from 'react';
import { Sun, Moon, BarChart3, Settings } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { getNavGroups } from './navItems';

// Desktop (systeem-layout) shell: verticale sidebar-navigatie links, brede
// content-area rechts. Alleen actief op breed scherm; de mobiele render (App.jsx)
// blijft volledig ongemoeid. Deelt nav-items en het theme-object met mobiel.
export default function DesktopShell({
  view,
  setView,
  theme,
  appMode,
  darkMode,
  setDarkMode,
  setShowSettings,
  children,
}) {
  const { t, language } = useTranslation();
  const groups = getNavGroups(t, appMode);

  const navBtnClass = (active) =>
    `w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition ${
      active ? 'bg-blue-500 text-white shadow' : `${theme.textSecondary} ${theme.hover}`
    }`;

  const iconBtnClass = `p-2 rounded-xl shadow-sm ${theme.hover} transition ${theme.bg}`;

  return (
    <div className="max-w-7xl mx-auto flex gap-6">
      <aside
        className={`w-64 shrink-0 self-start sticky top-4 ${theme.card} rounded-2xl shadow-sm p-4 flex flex-col`}
      >
        <div className="mb-6">
          <h1 className={`text-2xl font-bold ${theme.text} mb-1`}>{t('app.title')}</h1>
          <p className={`${theme.textMuted} text-xs`}>{t('app.tagline')}</p>
          <p className={`${theme.textMuted} text-xs mt-1`}>
            {new Date().toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
            })}
          </p>
        </div>

        <nav className="flex-1">
          {groups.map((group, i) => (
            <div
              key={i}
              className={`space-y-1 ${i > 0 ? `mt-3 pt-3 border-t ${theme.border}` : ''}`}
            >
              {group.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setView(tab.id)}
                  className={navBtnClass(view === tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="flex gap-2 mt-6">
          <button onClick={() => setDarkMode(!darkMode)} className={iconBtnClass}>
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
          <button
            onClick={() => setView('insight')}
            aria-label={t('insight.headerButtonAria')}
            className={`${iconBtnClass} ${view === 'insight' ? 'ring-2 ring-blue-400' : ''}`}
          >
            <BarChart3 className={`w-5 h-5 ${view === 'insight' ? 'text-blue-500' : theme.textSecondary}`} />
          </button>
          <button onClick={() => setShowSettings(true)} className={iconBtnClass}>
            <Settings className={`w-5 h-5 ${theme.textSecondary}`} />
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
