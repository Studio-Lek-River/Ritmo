import React from 'react';
import InsightCardShell from './InsightCardShell';
import { aggregateCounter } from '../../utils/insights';
import { getColorHex } from '../../utils/colors';
import { formatAmount, formatDuration } from '../../utils/format';

function formatValue(value, unit) {
  if (unit === 'minutes') return formatDuration(value);
  return formatAmount(Math.round(value), unit);
}

export default function CounterInsightCard({ mod, days, theme, darkMode, t }) {
  const agg = aggregateCounter(mod, days);
  if (agg.daysWithEntry === 0) {
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

  const unit = mod.unit || '';
  const avgFmt = formatValue(agg.average, unit);
  const summary = agg.goal > 0
    ? t('insight.counter.summary', { avg: avgFmt, hits: agg.goalHitDays, total: agg.totalDays })
    : t('insight.counter.summaryNoGoal', { avg: avgFmt });

  const W = 300;
  const H = 80;
  const padX = 6;
  const padY = 8;
  const innerW = W - padX * 2;
  const innerH = H - padY * 2;
  const maxValue = Math.max(
    agg.goal > 0 ? agg.goal * 1.1 : 0,
    ...agg.series.map(p => p.value),
    1,
  );
  const yFor = (v) => padY + innerH - (v / maxValue) * innerH;

  const stroke = getColorHex(mod.color);
  const goalY = agg.goal > 0 ? yFor(agg.goal) : null;
  const slot = innerW / agg.series.length;
  const barW = slot * 0.7;

  return (
    <InsightCardShell
      mod={mod}
      theme={theme}
      darkMode={darkMode}
      t={t}
      summary={summary}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
        {goalY != null && (
          <line
            x1={padX} x2={W - padX} y1={goalY} y2={goalY}
            stroke={darkMode ? '#94a3b8' : '#64748b'}
            strokeWidth="1"
            strokeDasharray="4 3"
            opacity="0.6"
          />
        )}
        {agg.series.map((p, i) => {
          const barH = p.value > 0 ? (p.value / maxValue) * innerH : 1;
          const x = padX + i * slot + (slot - barW) / 2;
          const y = padY + innerH - barH;
          return (
            <rect
              key={p.key}
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx="1"
              fill={p.value > 0 ? stroke : (darkMode ? '#475569' : '#cbd5e1')}
            />
          );
        })}
      </svg>
      {agg.goal > 0 && (
        <p className={`text-xs ${theme.textMuted} mt-1`}>
          {t('insight.counter.goalLabel', { value: formatValue(agg.goal, unit) })}
        </p>
      )}
    </InsightCardShell>
  );
}
