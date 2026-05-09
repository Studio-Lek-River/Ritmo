import React from 'react';
import { Sparkles, Settings } from 'lucide-react';
import { goalsForNight, timeDiffMinutes, sleepDurationMinutes, isOnTarget, DEFAULT_SLEEP_TOLERANCE_MINUTES } from '../utils/sleep';
import { formatDuration } from '../utils/format';
import StarRating from '../components/StarRating';
import { useTranslation, resolveModuleName } from '../i18n/useTranslation';

export default function SleepModule({
  module: mod,
  Icon,
  data,
  editable = true,
  date,
  onUpdate,
  onEdit,
  theme,
  darkMode,
}) {
  const { t } = useTranslation();
  const name = resolveModuleName(mod, t);
  const Glyph = Icon || Sparkles;
  const colorClass = `text-${mod.color}-500`;

  const scoreLabels = [1, 2, 3, 4, 5].map(n => t(`modules.sleepScoreLabels.${n}`));
  const minLabel = t('common.minute_short');

  const formatDiff = (diff) => {
    if (diff == null) return '';
    if (diff === 0) return t('modules.sleepOnTime');
    const sign = diff > 0 ? '+' : '-';
    return `${sign}${Math.abs(diff)} ${minLabel}`;
  };

  const goals = goalsForNight(mod.goals, date);
  const tol = mod.toleranceMinutes ?? DEFAULT_SLEEP_TOLERANCE_MINUTES;

  const bedTime = data?.bedTime || '';
  const wakeTime = data?.wakeTime || '';
  const morningScore = data?.morningScore ?? null;

  const bedDiff = bedTime && goals.bed ? timeDiffMinutes(bedTime, goals.bed) : null;
  const wakeDiff = wakeTime && goals.wake ? timeDiffMinutes(wakeTime, goals.wake) : null;
  const duration = sleepDurationMinutes(bedTime, wakeTime);

  const onTarget = isOnTarget(data || {}, goals, tol);
  const hasAny = bedTime || wakeTime || morningScore != null;

  const setBedTime = (value) => {
    onUpdate(prev => ({ ...prev, bedTime: value || null, bedTimeSource: 'manual' }));
  };
  const setWakeTime = (value) => {
    onUpdate(prev => ({ ...prev, wakeTime: value || null, wakeTimeSource: 'manual' }));
  };
  const setScore = (value) => {
    onUpdate(prev => ({ ...prev, morningScore: prev.morningScore === value ? null : value }));
  };

  const diffClass = (diff) => {
    if (diff == null) return theme.textMuted;
    return Math.abs(diff) <= tol
      ? (darkMode ? 'text-green-300' : 'text-green-600')
      : theme.textSecondary;
  };

  return (
    <div className={`${theme.card} rounded-2xl p-5 shadow-sm mb-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Glyph className={`w-5 h-5 ${colorClass}`} />
        <h2 className={`font-semibold ${theme.textSecondary}`}>{name}</h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className={`ml-auto p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
            title={t('modules.settingsTitle')}
            aria-label={t('modules.settingsAria', { name })}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {(goals.bed || goals.wake) && (
        <div className={`text-xs ${theme.textMuted} mb-3`}>
          {t('modules.sleepGoalTonight')} {goals.bed || '?'} {t('common.to')} {goals.wake || '?'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs font-medium ${theme.textMuted}`}>{t('modules.sleepWokeUpLabel')}</label>
            {wakeTime && editable && (
              <button
                type="button"
                onClick={() => setWakeTime('')}
                className={`text-xs ${theme.textMuted} hover:underline`}
              >
                {t('modules.clearTime')}
              </button>
            )}
          </div>
          <input
            type="time"
            value={wakeTime}
            disabled={!editable}
            onChange={(e) => setWakeTime(e.target.value)}
            className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${mod.color}-300 disabled:opacity-60`}
          />
          {wakeDiff != null && (
            <div className={`text-xs mt-1 ${diffClass(wakeDiff)}`}>
              {formatDiff(wakeDiff)}
            </div>
          )}
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className={`text-xs font-medium ${theme.textMuted}`}>{t('modules.sleepBedtimeLabel')}</label>
            {bedTime && editable && (
              <button
                type="button"
                onClick={() => setBedTime('')}
                className={`text-xs ${theme.textMuted} hover:underline`}
              >
                {t('modules.clearTime')}
              </button>
            )}
          </div>
          <input
            type="time"
            value={bedTime}
            disabled={!editable}
            onChange={(e) => setBedTime(e.target.value)}
            className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${mod.color}-300 disabled:opacity-60`}
          />
          {bedDiff != null && (
            <div className={`text-xs mt-1 ${diffClass(bedDiff)}`}>
              {formatDiff(bedDiff)}
            </div>
          )}
        </div>
      </div>

      {duration != null && (
        <div className={`text-xs ${theme.textMuted} mb-3`}>
          {t('modules.sleepDuration')} {formatDuration(duration)}
        </div>
      )}

      {mod.showMorningScore && (
        <div className="mb-3">
          <div className={`text-xs font-medium ${theme.textMuted} mb-1`}>{t('modules.sleepHowSlept')}</div>
          <StarRating
            value={morningScore ?? 0}
            onChange={setScore}
            readonly={!editable}
            size="lg"
            color={mod.color}
            labels={scoreLabels}
          />
        </div>
      )}

      {hasAny && (
        <div
          className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium ${
            onTarget
              ? (darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700')
              : `${theme.cardSecondary} ${theme.textMuted}`
          }`}
        >
          {onTarget ? t('modules.sleepOnTrack') : t('modules.sleepRegistered')}
        </div>
      )}
    </div>
  );
}
