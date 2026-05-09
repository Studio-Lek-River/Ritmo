import React from 'react';
import InsightCardShell from './InsightCardShell';
import { aggregateCollection } from '../../utils/insights';

export default function CollectionInsightCard({ mod, days, theme, darkMode, t }) {
  const agg = aggregateCollection(mod, days);
  if (agg.totalEvents === 0) {
    return (
      <InsightCardShell
        mod={mod}
        theme={theme}
        darkMode={darkMode}
        t={t}
        summary={t('insight.collection.summaryEmpty')}
      />
    );
  }
  const summary = t('insight.collection.summary', {
    count: agg.totalEvents,
    days: agg.totalDays,
  });
  return (
    <InsightCardShell
      mod={mod}
      theme={theme}
      darkMode={darkMode}
      t={t}
      summary={summary}
    >
      {agg.topItems.length > 0 && (
        <>
          <h4 className={`text-xs uppercase tracking-wide ${theme.textMuted} mb-2`}>
            {t('insight.collection.topItemsHeading')}
          </h4>
          <ul className="space-y-1">
            {agg.topItems.map(item => (
              <li key={item.id} className="flex items-center justify-between text-sm">
                <span className={`${theme.textSecondary} truncate`}>{item.name}</span>
                <span className={`${theme.textMuted} text-xs ml-2`}>{item.count}x</span>
              </li>
            ))}
          </ul>
        </>
      )}
    </InsightCardShell>
  );
}
