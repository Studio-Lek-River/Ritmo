import React from 'react';
import InsightCardShell from './InsightCardShell';
import { aggregateChecklist } from '../../utils/insights';

export default function ChecklistInsightCard({ mod, days, theme, darkMode, t }) {
  const agg = aggregateChecklist(mod, days);
  if (agg.daysWithEntry === 0 || agg.perItem.length === 0) {
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
  const summary = t('insight.checklist.summary', {
    avg: agg.avgPct,
    days: agg.daysWithEntry,
  });
  return (
    <InsightCardShell
      mod={mod}
      theme={theme}
      darkMode={darkMode}
      t={t}
      summary={summary}
    >
      <ul className="space-y-2">
        {agg.perItem.map(item => (
          <li key={item.id}>
            <div className="flex items-center justify-between text-sm mb-1">
              <span className={`${theme.textSecondary} truncate`}>{item.label}</span>
              <span className={`${theme.textMuted} text-xs ml-2`}>{item.pct}%</span>
            </div>
            <div className={`w-full ${theme.progressBg} rounded-full h-1.5 overflow-hidden`}>
              <div
                className={`h-1.5 rounded-full transition-all ${darkMode ? `bg-${mod.color}-400` : `bg-${mod.color}-500`}`}
                style={{ width: `${item.pct}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </InsightCardShell>
  );
}
