import React from 'react';
import InsightCardShell from './InsightCardShell';
import { aggregateChoice } from '../../utils/insights';

export default function ChoiceInsightCard({ mod, days, theme, darkMode, t }) {
  const agg = aggregateChoice(mod, days);
  if (!agg.top) {
    return (
      <InsightCardShell
        mod={mod}
        theme={theme}
        darkMode={darkMode}
        t={t}
        summary={t('insight.choice.summaryEmpty')}
      />
    );
  }
  const summary = t('insight.choice.summary', { top: agg.top.label, count: agg.top.count });
  const maxCount = agg.byOption[0]?.count || 1;
  const visible = agg.byOption.filter(o => o.count > 0);
  return (
    <InsightCardShell
      mod={mod}
      theme={theme}
      darkMode={darkMode}
      t={t}
      summary={summary}
    >
      <ul className="space-y-2">
        {visible.map(opt => {
          const pct = Math.round((opt.count / maxCount) * 100);
          return (
            <li key={opt.id}>
              <div className="flex items-center justify-between text-sm mb-1">
                <span className={`${theme.textSecondary} truncate`}>{opt.label}</span>
                <span className={`${theme.textMuted} text-xs ml-2`}>{opt.count}x</span>
              </div>
              <div className={`w-full ${theme.progressBg} rounded-full h-1.5 overflow-hidden`}>
                <div
                  className={`h-1.5 rounded-full transition-all ${darkMode ? `bg-${mod.color}-400` : `bg-${mod.color}-500`}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </InsightCardShell>
  );
}
