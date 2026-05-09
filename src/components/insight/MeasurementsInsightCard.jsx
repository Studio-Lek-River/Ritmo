import React from 'react';
import InsightCardShell from './InsightCardShell';
import LineChart from '../LineChart';
import { ICON_OPTIONS } from '../../utils/icons';
import { getColorClasses } from '../../utils/colors';
import { getLocale } from '../../i18n/useTranslation';
import {
  metricStats,
  formatMeasurementValue,
  unitSymbol,
  sortedAsc,
} from '../../utils/measurements';

function resolveMetricName(metric, t) {
  if (metric?.name) return metric.name;
  if (metric?.nameKey) return t(metric.nameKey);
  return '';
}

function filterEventsToRange(events, fromKey, toKey) {
  return (events || []).filter(e =>
    typeof e?.date === 'string' && e.date >= fromKey && e.date <= toKey,
  );
}

function MetricRow({ metric, color, days, theme, t, locale }) {
  const fromKey = days[0]?.key;
  const toKey = days[days.length - 1]?.key;
  const inRange = fromKey && toKey
    ? filterEventsToRange(metric.events, fromKey, toKey)
    : (metric.events || []);
  const sorted = sortedAsc(inRange);
  const stats = metricStats({ events: sorted });
  const overallStats = metricStats(metric);
  const Icon = ICON_OPTIONS[metric.icon] || ICON_OPTIONS.Activity;
  const colorCls = getColorClasses(color);
  const name = resolveMetricName(metric, t);

  return (
    <div className="py-3 first:pt-0 last:pb-0">
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg ${colorCls.iconBg} flex items-center justify-center`}>
          <Icon className={`w-3.5 h-3.5 ${colorCls.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${theme.textSecondary} truncate`}>{name}</div>
        </div>
        {overallStats && (
          <div className={`text-sm tabular-nums ${theme.textSecondary}`}>
            {formatMeasurementValue(overallStats.latest.value, metric.decimals, locale)}
            <span className={`text-xs ${theme.textMuted} ml-1`}>{unitSymbol(metric.unit)}</span>
          </div>
        )}
      </div>
      {sorted.length >= 2 ? (
        <LineChart
          events={sorted}
          color={color}
          decimals={metric.decimals}
          target={metric.target}
          unit={metric.unit}
          height={120}
        />
      ) : (
        <p className={`text-xs ${theme.textMuted} italic`}>
          {sorted.length === 1
            ? t('insight.measurements.singlePoint')
            : t('insight.measurements.noDataInPeriod')}
        </p>
      )}
      {stats && stats.count >= 2 && (
        <p className={`text-xs ${theme.textMuted} mt-1`}>
          {t('insight.measurements.changeOverPeriod', {
            change: `${stats.totalChange > 0 ? '+' : ''}${formatMeasurementValue(stats.totalChange, metric.decimals, locale)}${unitSymbol(metric.unit)}`,
            count: stats.count,
          })}
        </p>
      )}
    </div>
  );
}

export default function MeasurementsInsightCard({ mod, days, theme, darkMode, t }) {
  const locale = getLocale();
  const metrics = mod.metrics || [];

  if (metrics.length === 0) {
    return (
      <InsightCardShell
        mod={mod}
        theme={theme}
        darkMode={darkMode}
        t={t}
        summary={t('insight.measurements.noMetrics')}
      />
    );
  }

  const totalEvents = metrics.reduce((sum, m) => sum + (m.events?.length || 0), 0);
  const summary = totalEvents === 0
    ? t('insight.empty.moduleNoData')
    : t(metrics.length === 1
        ? 'insight.measurements.summaryOne'
        : 'insight.measurements.summary', { count: metrics.length });

  return (
    <InsightCardShell
      mod={mod}
      theme={theme}
      darkMode={darkMode}
      t={t}
      summary={summary}
    >
      <div className={`divide-y ${theme.border}`}>
        {metrics.map(metric => (
          <MetricRow
            key={metric.id}
            metric={metric}
            color={mod.color}
            days={days}
            theme={theme}
            t={t}
            locale={locale}
          />
        ))}
      </div>
    </InsightCardShell>
  );
}
