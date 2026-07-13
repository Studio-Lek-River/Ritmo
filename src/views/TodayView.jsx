import React from 'react';
import { Flame, Sparkles } from 'lucide-react';
import DayNavigator from '../components/DayNavigator';
import ReadOnlyBanner from '../components/ReadOnlyBanner';
import InstallBanner from '../components/InstallBanner';
import { formatDayTitle, formatDaySubtitle } from '../utils/dates';
import { resolveModuleName } from '../i18n/useTranslation';
import { MedicationScheduleCard } from './MedicationView';

export default function TodayView({
  t,
  theme,
  activeDate, setActiveDate,
  editable, goldenBorderEnabled, todayFullyComplete,
  hasDismissedInstallBanner, setHasDismissedInstallBanner,
  enabledModules, todayVisibleModules,
  getModuleStreak, renderTodayModule,
  totalCompletionItems, completedItems, overallPercentage,
  setShowSettings,
  StreakBadge,
  modules, onLogMedIntake,
}) {
  return (
    <div className={`slide-in ${(goldenBorderEnabled && todayFullyComplete) ? 'ritmo-golden-border rounded-2xl' : ''}`}>
      <DayNavigator
        currentDate={activeDate}
        onChange={(d) => setActiveDate(d)}
        title={formatDayTitle(activeDate)}
        subtitle={formatDaySubtitle(activeDate)}
        theme={theme}
      />
      {!editable && <ReadOnlyBanner theme={theme} />}
      {editable && !hasDismissedInstallBanner && (
        <InstallBanner onDismiss={() => setHasDismissedInstallBanner(true)} />
      )}
      {editable && enabledModules.filter(m => m.countInStreak === true).length > 0 && (
        <div className={`${theme.card} rounded-2xl p-4 shadow-sm mb-4`}>
          <div className="flex items-center gap-2 mb-3">
            <Flame className="w-4 h-4 text-orange-500" />
            <h2 className={`font-semibold ${theme.textSecondary} text-sm`}>{t('today.streaks')}</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {enabledModules.filter(m => m.countInStreak === true).slice(0, 4).map(mod => (
              <StreakBadge
                key={mod.id}
                label={resolveModuleName(mod, t)}
                days={getModuleStreak(mod)}
                color={mod.color}
                theme={theme}
              />
            ))}
          </div>
        </div>
      )}

      <MedicationScheduleCard modules={modules} onLogIntake={onLogMedIntake} theme={theme} />

      {totalCompletionItems > 0 && (
        <div className={`${theme.card} rounded-2xl p-5 shadow-sm mb-4`}>
          <div className="flex items-center justify-between mb-3">
            <h2 className={`font-semibold ${theme.textSecondary}`}>{t('today.dayProgress')}</h2>
            <span className="text-2xl font-bold text-blue-500">{Math.round(overallPercentage)}%</span>
          </div>
          <div className={`w-full ${theme.progressBg} rounded-full h-3 overflow-hidden`}>
            <div
              className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-700"
              style={{ width: `${overallPercentage}%` }}
            />
          </div>
          <p className={`text-xs ${theme.textMuted} mt-2`}>
            {t('today.itemsCompleted', { completed: completedItems, total: totalCompletionItems })}
          </p>
        </div>
      )}

      {!editable && todayVisibleModules.length === 0 && (
        <div className={`${theme.card} rounded-2xl p-8 shadow-sm text-center mb-4`}>
          <div className={`text-2xl mb-2 ${theme.textMuted}`}>○</div>
          <p className={`text-sm ${theme.textMuted}`}>{t('today.noActivity')}</p>
        </div>
      )}
      {todayVisibleModules.map(renderTodayModule)}

      {editable && enabledModules.length === 0 && (
        <div className={`${theme.card} rounded-2xl p-8 shadow-sm text-center`}>
          <Sparkles className={`w-12 h-12 mx-auto mb-3 ${theme.textMuted}`} />
          <h3 className={`font-semibold ${theme.textSecondary} mb-2`}>{t('today.noModulesActive')}</h3>
          <p className={`text-sm ${theme.textMuted} mb-4`}>
            {t('today.activateModulesHint')}
          </p>
          <button
            onClick={() => setShowSettings(true)}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
          >
            {t('today.toSettings')}
          </button>
        </div>
      )}

    </div>
  );
}
