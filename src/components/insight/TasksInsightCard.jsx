import React from 'react';
import InsightCardShell from './InsightCardShell';
import { aggregateTasks } from '../../utils/insights';

export default function TasksInsightCard({ mod, days, theme, darkMode, t }) {
  const agg = aggregateTasks(days);
  if (agg.total === 0) {
    return (
      <InsightCardShell
        mod={mod}
        theme={theme}
        darkMode={darkMode}
        t={t}
        summary={t('insight.tasks.summaryEmpty')}
      />
    );
  }
  const pct = Math.round((agg.completed / agg.total) * 100);
  return (
    <InsightCardShell
      mod={mod}
      theme={theme}
      darkMode={darkMode}
      t={t}
      summary={t('insight.tasks.summary', { completed: agg.completed, total: agg.total })}
    >
      <div className={`w-full ${theme.progressBg} rounded-full h-2 overflow-hidden`}>
        <div
          className="bg-gradient-to-r from-blue-400 to-blue-600 h-2 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </InsightCardShell>
  );
}
