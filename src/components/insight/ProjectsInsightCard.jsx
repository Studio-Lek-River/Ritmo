import React from 'react';
import InsightCardShell from './InsightCardShell';
import { aggregateProjects } from '../../utils/insights';

export default function ProjectsInsightCard({ mod, theme, darkMode, t }) {
  const agg = aggregateProjects(mod);
  const summary = t('insight.projects.summary', {
    active: agg.activeSubjects,
    completed: agg.completedSubjects,
  });
  return (
    <InsightCardShell
      mod={mod}
      theme={theme}
      darkMode={darkMode}
      t={t}
      summary={summary}
    >
      <div className="flex items-center justify-between text-sm">
        <span className={theme.textSecondary}>{agg.progress.pct}%</span>
        <div className={`flex-1 mx-3 ${theme.progressBg} rounded-full h-2 overflow-hidden`}>
          <div
            className="bg-gradient-to-r from-cyan-400 to-blue-500 h-2 rounded-full transition-all duration-700"
            style={{ width: `${agg.progress.pct}%` }}
          />
        </div>
        <span className={theme.textMuted}>
          {agg.progress.done}/{agg.progress.total}
        </span>
      </div>
      {agg.overdueCount > 0 && (
        <p className={`text-xs mt-2 ${darkMode ? 'text-rose-300' : 'text-rose-600'}`}>
          {t('insight.projects.overdueLabel', { n: agg.overdueCount })}
        </p>
      )}
    </InsightCardShell>
  );
}
