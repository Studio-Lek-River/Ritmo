import React from 'react';
import { Sun, Moon, BarChart3, Settings, HelpCircle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { getNavGroups } from './navItems';
import RitmoLogo from './RitmoLogo';

// Desktop (systeem-layout) shell: horizontale topbalk boven, brede content-area
// eronder. Alleen actief op breed scherm; de mobiele render (App.jsx) blijft
// volledig ongemoeid. Deelt nav-items en het theme-object met mobiel.
export default function DesktopShell({
  view,
  setView,
  theme,
  appMode,
  darkMode,
  setDarkMode,
  setShowSettings,
  onOpenHelp,
  children,
}) {
  const { t } = useTranslation();
  const groups = getNavGroups(t, appMode);

  const navBtnClass = (active) =>
    `whitespace-nowrap px-4 py-2.5 rounded-lg text-sm font-medium transition ${
      active ? `${theme.accentBg} shadow` : `${theme.textSecondary} ${theme.hover}`
    }`;

  const iconBtnClass = `p-2 rounded-xl shadow-sm ${theme.hover} transition ${theme.bg}`;

  return (
    <div className="max-w-7xl mx-auto flex flex-col gap-6">
      <header
        className={`${theme.card} rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between gap-4`}
      >
        <div className="flex items-center gap-2 shrink-0">
          <RitmoLogo size={32} variant={darkMode ? 'light' : 'dark'} />
          <h1 className={`text-lg font-bold ${theme.text}`}>{t('app.title')}</h1>
        </div>

        <nav className="flex items-center flex-wrap justify-center gap-1">
          {groups.map((group, i) => (
            <div
              key={i}
              className={`flex items-center gap-1 ${i > 0 ? `ml-2 pl-2 border-l ${theme.border}` : ''}`}
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

        <div className="flex gap-2 shrink-0">
          <button onClick={() => setDarkMode(!darkMode)} className={iconBtnClass}>
            {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
          </button>
          <button
            onClick={() => setView('insight')}
            aria-label={t('insight.headerButtonAria')}
            className={`${iconBtnClass} ${view === 'insight' ? `ring-2 ${theme.accentRing}` : ''}`}
          >
            <BarChart3 className={`w-5 h-5 ${view === 'insight' ? theme.accentText : theme.textSecondary}`} />
          </button>
          <button onClick={() => onOpenHelp?.()} aria-label={t('help.title')} className={iconBtnClass}>
            <HelpCircle className={`w-5 h-5 ${theme.textSecondary}`} />
          </button>
          <button onClick={() => setShowSettings(true)} className={iconBtnClass}>
            <Settings className={`w-5 h-5 ${theme.textSecondary}`} />
          </button>
        </div>
      </header>

      <main className="min-w-0">
        {children}
      </main>
    </div>
  );
}
