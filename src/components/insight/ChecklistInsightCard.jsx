import React from 'react';
import InsightCardShell from './InsightCardShell';
import { aggregateChecklist, checklistDayMatrix } from '../../utils/insights';
import { getColorHex } from '../../utils/colors';
import { monthNameShort } from '../../utils/dates';

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
  const matrix = checklistDayMatrix(mod, days);
  const formatCellDate = (date) => `${date.getDate()} ${monthNameShort(date)}`;
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
      {matrix.length > 0 && (
        <>
          <p className={`text-xs ${theme.textMuted} mt-4 mb-2`}>
            {t('insight.checklist.matrixHeading')}
          </p>
          <div className="overflow-x-auto">
            <div className="space-y-1">
              {matrix.map(row => (
                <div key={row.id} className="flex items-center gap-1">
                  <span className={`w-20 shrink-0 text-xs truncate ${theme.textSecondary}`}>
                    {row.label}
                  </span>
                  <div className="flex gap-1">
                    {row.cells.map(cell => {
                      const dateLabel = formatCellDate(cell.date);
                      const label = cell.complete
                        ? t('insight.checklist.dayChecked', { item: row.label, date: dateLabel })
                        : t('insight.checklist.dayUnchecked', { item: row.label, date: dateLabel });
                      return (
                        <div
                          key={cell.key}
                          title={label}
                          aria-label={label}
                          className="w-3 h-3 rounded-sm shrink-0"
                          style={{ background: cell.complete ? getColorHex(mod.color) : (darkMode ? '#334155' : '#e2e8f0') }}
                        />
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </InsightCardShell>
  );
}
