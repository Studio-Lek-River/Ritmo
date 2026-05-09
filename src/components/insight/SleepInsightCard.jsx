import React from 'react';
import InsightCardShell from './InsightCardShell';
import { aggregateSleep } from '../../utils/insights';
import { parseHHMM } from '../../utils/sleep';

// Bedtijden lopen door middernacht; normaliseer naar minutes-since-noon zodat
// 22:00 (600) en 00:30 (750) op een continue lijn liggen.
function bedToMinutesSinceNoon(hhmm) {
  const m = parseHHMM(hhmm);
  if (m == null) return null;
  return m < 720 ? m + 1440 - 720 : m - 720;
}
function minutesSinceNoonToHHMM(m) {
  const total = ((m + 720) % 1440 + 1440) % 1440;
  const h = Math.floor(total / 60);
  const min = Math.round(total) % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

const BED_MIN = 420;  // 19:00 (= 7h after noon)
const BED_MAX = 840;  // 02:00 (= 14h after noon)
const WAKE_MIN = 240; // 04:00
const WAKE_MAX = 660; // 11:00

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export default function SleepInsightCard({ mod, days, theme, darkMode, t }) {
  const agg = aggregateSleep(mod, days);
  if (agg.nightsLogged === 0) {
    return (
      <InsightCardShell
        mod={mod}
        theme={theme}
        darkMode={darkMode}
        t={t}
        summary={t('insight.empty.moduleNoData')}
      />
    );
  }

  const bedMinutes = agg.perNight
    .map(n => bedToMinutesSinceNoon(n.dayData?.bedTime))
    .filter(m => m != null);
  const avgBed = bedMinutes.length > 0
    ? bedMinutes.reduce((s, v) => s + v, 0) / bedMinutes.length
    : null;
  const avgBedHHMM = avgBed != null ? minutesSinceNoonToHHMM(avgBed) : '—';

  const hasGoals = mod.goals && Object.values(mod.goals).some(g => g?.bed || g?.wake);
  const summary = hasGoals
    ? t('insight.sleep.summary', {
        hits: agg.nightsOnTarget,
        total: agg.nightsLogged,
        time: avgBedHHMM,
      })
    : t('insight.sleep.summaryNoGoal', { time: avgBedHHMM });

  const W = 300;
  const H = 80;
  const padX = 6;
  const innerW = W - padX * 2;
  const xFor = (i) => padX + (agg.perNight.length === 1
    ? innerW / 2
    : (i / (agg.perNight.length - 1)) * innerW);
  const yBed = (m) => 6 + ((clamp(m, BED_MIN, BED_MAX) - BED_MIN) / (BED_MAX - BED_MIN)) * 26;
  const yWake = (m) => 48 + ((clamp(m, WAKE_MIN, WAKE_MAX) - WAKE_MIN) / (WAKE_MAX - WAKE_MIN)) * 26;

  const bedColor = darkMode ? '#a5b4fc' : '#6366f1';   // indigo
  const wakeColor = darkMode ? '#fcd34d' : '#f59e0b';  // amber
  const sep = darkMode ? '#475569' : '#cbd5e1';

  return (
    <InsightCardShell
      mod={mod}
      theme={theme}
      darkMode={darkMode}
      t={t}
      summary={summary}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
        <line x1={padX} x2={W - padX} y1={40} y2={40} stroke={sep} strokeWidth="0.5" opacity="0.5" />
        {agg.perNight.map((n, i) => {
          const bedM = bedToMinutesSinceNoon(n.dayData?.bedTime);
          const wakeM = parseHHMM(n.dayData?.wakeTime);
          const x = xFor(i);
          return (
            <g key={i}>
              {bedM != null && (
                <circle cx={x} cy={yBed(bedM)} r="2.8" fill={bedColor} />
              )}
              {wakeM != null && (
                <circle cx={x} cy={yWake(wakeM)} r="2.8" fill={wakeColor} />
              )}
            </g>
          );
        })}
      </svg>
      <div className={`flex items-center gap-4 text-xs ${theme.textMuted} mt-1`}>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: bedColor }} />
          {t('insight.sleep.bedDot')}
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: wakeColor }} />
          {t('insight.sleep.wakeDot')}
        </span>
      </div>
    </InsightCardShell>
  );
}
