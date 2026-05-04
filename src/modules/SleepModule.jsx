import React from 'react';
import { Sparkles, Settings } from 'lucide-react';
import { goalsForNight, timeDiffMinutes, sleepDurationMinutes, isOnTarget } from '../utils/sleep';
import { formatDuration } from '../utils/format';
import StarRating from '../components/StarRating';

const SCORE_LABELS = ['Slecht geslapen', 'Matig', 'Oké', 'Goed', 'Heerlijk uitgerust'];

function formatDiff(diff) {
  if (diff == null) return '';
  if (diff === 0) return 'op tijd';
  const sign = diff > 0 ? '+' : '-';
  return `${sign}${Math.abs(diff)} min`;
}

export default function SleepModule({
  module: mod,
  Icon,
  data,
  editable = true,
  date,
  onUpdate,
  onEdit,
  t,
  darkMode,
}) {
  const Glyph = Icon || Sparkles;
  const colorClass = `text-${mod.color}-500`;

  const goals = goalsForNight(mod.goals, date);
  const tol = mod.toleranceMinutes ?? 15;

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
    if (diff == null) return t.textMuted;
    return Math.abs(diff) <= tol
      ? (darkMode ? 'text-green-300' : 'text-green-600')
      : t.textSecondary;
  };

  return (
    <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Glyph className={`w-5 h-5 ${colorClass}`} />
        <h2 className={`font-semibold ${t.textSecondary}`}>{mod.name}</h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className={`ml-auto p-1.5 ${t.hover} rounded-lg ${t.textMuted} transition`}
            title="Module-instellingen"
            aria-label={`Instellingen voor ${mod.name}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      {(goals.bed || goals.wake) && (
        <div className={`text-xs ${t.textMuted} mb-3`}>
          Doel vannacht: {goals.bed || '?'} naar {goals.wake || '?'}
        </div>
      )}

      <div className="grid grid-cols-2 gap-6 mb-3">
        <div>
          <label className={`text-xs font-medium ${t.textMuted} mb-1 block`}>Opgestaan</label>
          <input
            type="time"
            value={wakeTime}
            disabled={!editable}
            onChange={(e) => setWakeTime(e.target.value)}
            className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${mod.color}-300 disabled:opacity-60`}
          />
          {wakeDiff != null && (
            <div className={`text-xs mt-1 ${diffClass(wakeDiff)}`}>
              {formatDiff(wakeDiff)}
            </div>
          )}
        </div>
        <div>
          <label className={`text-xs font-medium ${t.textMuted} mb-1 block`}>Naar bed</label>
          <input
            type="time"
            value={bedTime}
            disabled={!editable}
            onChange={(e) => setBedTime(e.target.value)}
            className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${mod.color}-300 disabled:opacity-60`}
          />
          {bedDiff != null && (
            <div className={`text-xs mt-1 ${diffClass(bedDiff)}`}>
              {formatDiff(bedDiff)}
            </div>
          )}
        </div>
      </div>

      {duration != null && (
        <div className={`text-xs ${t.textMuted} mb-3`}>
          Slaapduur: {formatDuration(duration)}
        </div>
      )}

      {mod.showMorningScore && (
        <div className="mb-3">
          <div className={`text-xs font-medium ${t.textMuted} mb-1`}>Hoe sliep je?</div>
          <StarRating
            value={morningScore ?? 0}
            onChange={setScore}
            readonly={!editable}
            size="lg"
            color={mod.color}
            labels={SCORE_LABELS}
          />
        </div>
      )}

      {hasAny && (
        <div
          className={`mt-2 px-3 py-2 rounded-lg text-xs font-medium ${
            onTarget
              ? (darkMode ? 'bg-green-900/30 text-green-300' : 'bg-green-50 text-green-700')
              : `${t.cardSecondary} ${t.textMuted}`
          }`}
        >
          {onTarget ? 'Op ritme' : 'Geregistreerd'}
        </div>
      )}
    </div>
  );
}
