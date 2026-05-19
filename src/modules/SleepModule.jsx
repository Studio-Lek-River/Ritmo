import { Sparkles, Settings, Check } from 'lucide-react';
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

  const headerGoal = (goals.wake || goals.bed)
    ? `${goals.wake || '?'} · ${goals.bed || '?'}`
    : null;

  return (
    <div className={`${theme.card} rounded-2xl p-5 shadow-sm mb-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Glyph className={`w-5 h-5 ${colorClass}`} />
        <h2 className={`font-semibold ${theme.textSecondary} flex-1`}>{name}</h2>
        {headerGoal && (
          <span className={`text-[10px] ${theme.textMuted} uppercase tracking-wide`}>
            {headerGoal}
          </span>
        )}
        {onEdit && (
          <button
            onClick={onEdit}
            className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
            title={t('modules.settingsTitle')}
            aria-label={t('modules.settingsAria', { name })}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <SleepTimeBlock
          label={t('modules.sleepWokeUpLabel')}
          value={wakeTime}
          diff={wakeDiff}
          tol={tol}
          editable={editable}
          onChange={setWakeTime}
          color={mod.color}
          darkMode={darkMode}
          formatDiff={formatDiff}
          placeholderHint={t('modules.sleepTapToFill')}
        />
        <SleepTimeBlock
          label={t('modules.sleepBedtimeLabel')}
          value={bedTime}
          diff={bedDiff}
          tol={tol}
          editable={editable}
          onChange={setBedTime}
          color={mod.color}
          darkMode={darkMode}
          formatDiff={formatDiff}
          placeholderHint={t('modules.sleepTapToFill')}
        />
      </div>

      {duration != null && (
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className={theme.textMuted}>{t('modules.sleepDuration')}</span>
          <span className={`font-semibold ${theme.textSecondary}`}>{formatDuration(duration)}</span>
        </div>
      )}

      {mod.showMorningScore && (
        <div className="mb-3">
          <div className={`text-xs font-medium ${theme.textMuted} mb-1`}>
            {t('modules.sleepHowSlept')}
          </div>
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
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium ${
            onTarget
              ? (darkMode ? 'bg-emerald-900/30 text-emerald-300' : 'bg-emerald-50 text-emerald-700')
              : (darkMode ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-600')
          }`}
        >
          {onTarget ? (
            <>
              <Check className="w-3.5 h-3.5" strokeWidth={3} />
              <span>{t('modules.sleepOnTimeGoalReached')}</span>
            </>
          ) : (
            <span>{t('modules.sleepRegistered')}</span>
          )}
        </div>
      )}
    </div>
  );
}

function SleepTimeBlock({
  label, value, diff, tol, editable, onChange, color, darkMode, formatDiff, placeholderHint,
}) {
  const hasValue = !!value;

  const onTargetDiff = diff != null && Math.abs(diff) <= tol;
  const diffColor = onTargetDiff
    ? (darkMode ? 'text-emerald-300' : 'text-emerald-700')
    : (darkMode ? 'text-amber-300' : 'text-amber-700');

  const blockClass = hasValue
    ? (darkMode
        ? `bg-${color}-900/30 hover:bg-${color}-900/40`
        : `bg-${color}-50 hover:bg-${color}-100`)
    : (darkMode
        ? 'bg-slate-800/60 hover:bg-slate-800 border border-dashed border-slate-600'
        : 'bg-stone-50 hover:bg-stone-100 border border-dashed border-stone-300');
  const valueColor = hasValue
    ? (darkMode ? `text-${color}-200` : `text-${color}-900`)
    : (darkMode ? 'text-slate-500' : 'text-stone-400');
  const labelColor = hasValue
    ? (darkMode ? `text-${color}-300` : `text-${color}-600`)
    : (darkMode ? 'text-slate-500' : 'text-stone-500');

  return (
    <label
      className={`relative block ${blockClass} rounded-xl px-3 py-3 text-left transition ${
        editable ? 'cursor-pointer' : 'opacity-60 pointer-events-none'
      }`}
    >
      <p className={`text-[10px] font-medium uppercase tracking-wide mb-0.5 ${labelColor}`}>
        {label}
      </p>
      <p className={`text-2xl font-bold ${valueColor}`}>
        {hasValue ? value : '--:--'}
      </p>
      {hasValue ? (
        diff != null && <p className={`text-[11px] mt-0.5 ${diffColor}`}>{formatDiff(diff)}</p>
      ) : (
        <p className={`text-[11px] mt-0.5 ${darkMode ? 'text-slate-500' : 'text-stone-400'}`}>{placeholderHint}</p>
      )}
      <input
        type="time"
        value={value || ''}
        disabled={!editable}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
      />
    </label>
  );
}
