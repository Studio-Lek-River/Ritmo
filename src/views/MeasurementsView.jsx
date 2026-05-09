import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus, ChevronLeft, TrendingUp, TrendingDown, Minus,
  Pencil, X, Target, Activity, Settings,
} from 'lucide-react';
import LineChart from '../components/LineChart';
import ConfirmDialog from '../components/ConfirmDialog';
import { ICON_OPTIONS } from '../utils/icons';
import { getColorClasses, getColorHex } from '../utils/colors';
import { useTranslation, getLocale, resolveModuleName } from '../i18n/useTranslation';
import {
  metricStats,
  sortedDesc,
  formatMeasurementValue,
  parseMeasurementInput,
  unitSymbol,
  createEvent,
} from '../utils/measurements';
import { todayKey } from '../utils/dates';

function resolveMetricName(metric, t) {
  if (metric?.name) return metric.name;
  if (metric?.nameKey) return t(metric.nameKey);
  return '';
}

function formatLongDate(iso, locale) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric', month: 'long', year: 'numeric',
  }).format(d);
}

function formatShortDate(iso, locale) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' }).format(d);
}

function TrendPill({ change, decimals, unit, lowerIsBetter, label, locale }) {
  if (change === null || change === undefined || !Number.isFinite(change)) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-stone-500 dark:text-stone-400">
        <Minus className="w-3 h-3" /> {label}
      </span>
    );
  }
  const isPositive = change > 0;
  const isNegative = change < 0;
  const isGood = (lowerIsBetter && isNegative) || (!lowerIsBetter && isPositive);
  const isBad = (lowerIsBetter && isPositive) || (!lowerIsBetter && isNegative);
  const colorClass = isGood
    ? 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-900/30'
    : isBad
    ? 'text-rose-700 bg-rose-50 dark:text-rose-300 dark:bg-rose-900/30'
    : 'text-stone-600 bg-stone-100 dark:text-stone-300 dark:bg-stone-800';
  const Icon = isPositive ? TrendingUp : isNegative ? TrendingDown : Minus;
  const sign = isPositive ? '+' : '';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      <Icon className="w-3 h-3" />
      {sign}{formatMeasurementValue(change, decimals, locale)}{unitSymbol(unit)} {label}
    </span>
  );
}

function MetricCard({ metric, color, theme, onOpen, t, locale }) {
  const Icon = ICON_OPTIONS[metric.icon] || Activity;
  const stats = metricStats(metric);
  const colorCls = getColorClasses(color);
  const name = resolveMetricName(metric, t);

  return (
    <button
      type="button"
      onClick={onOpen}
      className={`w-full text-left ${theme.card} rounded-2xl border ${theme.border} p-4 hover:shadow-sm transition-all`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-9 h-9 rounded-xl ${colorCls.iconBg} flex items-center justify-center shrink-0`}>
            <Icon className={`w-4 h-4 ${colorCls.iconText}`} strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <div className={`font-medium ${theme.text} text-[15px] leading-tight truncate`}>
              {name}
            </div>
            <div className={`text-xs ${theme.textMuted} mt-0.5`}>
              {stats
                ? t(stats.count === 1 ? 'modules.measurements.measurementCountOne' : 'modules.measurements.measurementCount', { count: stats.count })
                : t('modules.measurements.noMeasurements')}
            </div>
          </div>
        </div>
        {metric.target !== null && metric.target !== undefined && (
          <div className={`flex items-center gap-1 text-xs ${theme.textMuted} pt-1 shrink-0`}>
            <Target className="w-3 h-3" />
            <span className="tabular-nums">
              {formatMeasurementValue(metric.target, metric.decimals, locale)}{unitSymbol(metric.unit)}
            </span>
          </div>
        )}
      </div>
      {stats ? (
        <>
          <div className="flex items-baseline gap-2 mb-2">
            <span className={`text-2xl font-semibold ${theme.text} tabular-nums`}>
              {formatMeasurementValue(stats.latest.value, metric.decimals, locale)}
            </span>
            <span className={`text-sm ${theme.textMuted}`}>{unitSymbol(metric.unit)}</span>
            <span className={`text-xs ${theme.textMuted} ml-auto`}>
              {formatShortDate(stats.latest.date, locale)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <TrendPill
              change={stats.lastChange}
              decimals={metric.decimals}
              unit={metric.unit}
              lowerIsBetter={metric.lowerIsBetter}
              label={t('modules.measurements.vsLast')}
              locale={locale}
            />
            <TrendPill
              change={stats.totalChange}
              decimals={metric.decimals}
              unit={metric.unit}
              lowerIsBetter={metric.lowerIsBetter}
              label={t('modules.measurements.sinceStart')}
              locale={locale}
            />
          </div>
        </>
      ) : (
        <div className={`text-sm ${theme.textMuted} italic py-2`}>
          {t('modules.measurements.addFirst')}
        </div>
      )}
    </button>
  );
}

function MeasurementForm({
  metric,
  existing,
  theme,
  onSave,
  onCancel,
  onDelete,
  t,
  locale,
}) {
  const today = todayKey();
  const [date, setDate] = useState(existing?.date || today);
  const [valueRaw, setValueRaw] = useState(() => {
    if (existing?.value === undefined || existing?.value === null) return '';
    return formatMeasurementValue(existing.value, metric.decimals, locale);
  });
  const [note, setNote] = useState(existing?.note || '');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleSave = () => {
    const numValue = parseMeasurementInput(valueRaw);
    if (numValue === null) return;
    const event = existing
      ? { ...existing, date, value: numValue, note: note.trim() }
      : createEvent({ date, value: numValue, note: note.trim() });
    onSave(event);
  };

  const inputClass = `w-full px-3 py-2 rounded-lg border ${theme.border} ${theme.input} focus:outline-none focus:ring-2 focus:ring-blue-400`;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className={`${theme.card} rounded-2xl w-full max-w-md shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${theme.border}`}>
          <h3 className={`font-semibold ${theme.text}`}>
            {existing
              ? t('modules.measurements.editMeasurement')
              : `${t('modules.measurements.addMeasurement')}: ${resolveMetricName(metric, t)}`}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className={`${theme.textMuted} hover:${theme.text}`}
            aria-label={t('common.cancel')}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-1.5`}>
              {t('modules.measurements.fields.date')}
            </label>
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-1.5`}>
              {t('modules.measurements.fields.value')} ({unitSymbol(metric.unit)})
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={valueRaw}
              onChange={(e) => setValueRaw(e.target.value)}
              autoFocus
              className={`${inputClass} text-lg tabular-nums`}
            />
          </div>
          <div>
            <label className={`block text-sm font-medium ${theme.textSecondary} mb-1.5`}>
              {t('modules.measurements.fields.note')}
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className={`${inputClass} text-sm resize-none`}
            />
          </div>
        </div>
        <div className={`flex items-center justify-between gap-2 px-5 py-3 border-t ${theme.border} ${theme.cardSecondary} rounded-b-2xl`}>
          {existing ? (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="text-sm text-rose-600 dark:text-rose-400 hover:text-rose-700 font-medium"
            >
              {t('common.delete')}
            </button>
          ) : <div />}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className={`px-3 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary}`}
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={parseMeasurementInput(valueRaw) === null}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium disabled:bg-blue-300 disabled:cursor-not-allowed"
            >
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
      <ConfirmDialog
        open={confirmDelete}
        title={t('modules.measurements.confirmDeleteEvent.title')}
        description={t('modules.measurements.confirmDeleteEvent.description')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={() => { setConfirmDelete(false); onDelete(existing.id); }}
        onCancel={() => setConfirmDelete(false)}
        theme={theme}
      />
    </div>
  );
}

function MetricDetail({ metric, color, theme, t, locale, onBack, onUpdateMetric }) {
  const [editingEvent, setEditingEvent] = useState(null);
  const [adding, setAdding] = useState(false);
  const Icon = ICON_OPTIONS[metric.icon] || Activity;
  const colorCls = getColorClasses(color);
  const colorHex = getColorHex(color);
  const stats = metricStats(metric);
  const sortedEvents = useMemo(() => sortedDesc(metric.events), [metric.events]);
  const name = resolveMetricName(metric, t);

  const handleSaveEvent = (event) => {
    const events = editingEvent
      ? (metric.events || []).map(e => (e.id === event.id ? event : e))
      : [...(metric.events || []), event];
    onUpdateMetric({ ...metric, events });
    setEditingEvent(null);
    setAdding(false);
  };

  const handleDeleteEvent = (id) => {
    onUpdateMetric({
      ...metric,
      events: (metric.events || []).filter(e => e.id !== id),
    });
    setEditingEvent(null);
  };

  return (
    <div className="pb-20">
      <div className="flex items-center gap-3 mb-5">
        <button
          type="button"
          onClick={onBack}
          className={`w-9 h-9 rounded-full ${theme.hover} flex items-center justify-center ${theme.textSecondary}`}
          aria-label={t('common.back')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className={`w-10 h-10 rounded-xl ${colorCls.iconBg} flex items-center justify-center`}>
          <Icon className={`w-5 h-5 ${colorCls.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className={`font-semibold ${theme.text} text-lg leading-tight truncate`}>{name}</h1>
          <div className={`text-xs ${theme.textMuted}`}>
            {stats
              ? t(stats.count === 1 ? 'modules.measurements.measurementCountOne' : 'modules.measurements.measurementCount', { count: stats.count })
              : t('modules.measurements.noMeasurements')}
            {metric.target !== null && metric.target !== undefined && (
              <> · {t('modules.measurements.target')} {formatMeasurementValue(metric.target, metric.decimals, locale)}{unitSymbol(metric.unit)}</>
            )}
          </div>
        </div>
      </div>

      {stats && (
        <div className={`${theme.card} rounded-2xl border ${theme.border} p-5 mb-4`}>
          <div className={`text-xs ${theme.textMuted} uppercase tracking-wide mb-1`}>
            {t('modules.measurements.latest')}
          </div>
          <div className="flex items-baseline gap-2 mb-3">
            <span className={`text-4xl font-semibold ${theme.text} tabular-nums`}>
              {formatMeasurementValue(stats.latest.value, metric.decimals, locale)}
            </span>
            <span className={`text-lg ${theme.textMuted}`}>{unitSymbol(metric.unit)}</span>
            <span className={`text-xs ${theme.textMuted} ml-auto`}>
              {formatLongDate(stats.latest.date, locale)}
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <TrendPill
              change={stats.lastChange}
              decimals={metric.decimals}
              unit={metric.unit}
              lowerIsBetter={metric.lowerIsBetter}
              label={t('modules.measurements.vsLast')}
              locale={locale}
            />
            <TrendPill
              change={stats.totalChange}
              decimals={metric.decimals}
              unit={metric.unit}
              lowerIsBetter={metric.lowerIsBetter}
              label={t('modules.measurements.sinceStart')}
              locale={locale}
            />
          </div>
        </div>
      )}

      {(metric.events || []).length > 0 && (
        <div className={`${theme.card} rounded-2xl border ${theme.border} p-4 mb-4`}>
          <LineChart
            events={metric.events}
            color={color}
            decimals={metric.decimals}
            target={metric.target}
            unit={metric.unit}
          />
        </div>
      )}

      <div className={`${theme.card} rounded-2xl border ${theme.border} overflow-hidden mb-4`}>
        <div className={`flex items-center justify-between px-4 py-3 border-b ${theme.border}`}>
          <h2 className={`text-sm font-medium ${theme.textSecondary}`}>
            {t('modules.measurements.history')}
          </h2>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`flex items-center gap-1 text-sm font-medium ${colorCls.iconText} hover:opacity-80`}
          >
            <Plus className="w-4 h-4" /> {t('modules.measurements.addMeasurement')}
          </button>
        </div>
        {sortedEvents.length === 0 ? (
          <div className={`px-4 py-8 text-center text-sm ${theme.textMuted} italic`}>
            {t('modules.measurements.addFirst')}
          </div>
        ) : (
          <ul className={`divide-y ${theme.border}`}>
            {sortedEvents.map((event, idx) => {
              const next = sortedEvents[idx + 1];
              const change = next ? event.value - next.value : null;
              return (
                <li key={event.id}>
                  <button
                    type="button"
                    onClick={() => setEditingEvent(event)}
                    className={`w-full flex items-center gap-3 px-4 py-3 ${theme.hover} text-left`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className={`font-medium ${theme.text} tabular-nums`}>
                          {formatMeasurementValue(event.value, metric.decimals, locale)}{unitSymbol(metric.unit)}
                        </span>
                        {change !== null && Number.isFinite(change) && (
                          <span className={`text-xs tabular-nums ${theme.textMuted}`}>
                            {change > 0 ? '+' : ''}{formatMeasurementValue(change, metric.decimals, locale)}
                          </span>
                        )}
                      </div>
                      <div className={`text-xs ${theme.textMuted} mt-0.5`}>
                        {formatLongDate(event.date, locale)}
                        {event.note && <span className="ml-2 italic">· {event.note}</span>}
                      </div>
                    </div>
                    <Pencil className={`w-4 h-4 ${theme.textMuted} opacity-50`} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <button
        type="button"
        onClick={() => setAdding(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full text-white shadow-lg flex items-center justify-center hover:scale-105 transition-transform z-40"
        style={{ backgroundColor: colorHex }}
        aria-label={t('modules.measurements.addMeasurement')}
      >
        <Plus className="w-6 h-6" />
      </button>

      {(adding || editingEvent) && (
        <MeasurementForm
          metric={metric}
          existing={editingEvent}
          theme={theme}
          onSave={handleSaveEvent}
          onCancel={() => { setEditingEvent(null); setAdding(false); }}
          onDelete={handleDeleteEvent}
          t={t}
          locale={locale}
        />
      )}
    </div>
  );
}

function EmptyState({ theme, t, onCreate }) {
  return (
    <div className={`${theme.card} rounded-2xl border ${theme.border} p-8 text-center`}>
      <Activity className={`w-10 h-10 ${theme.textMuted} mx-auto mb-3 opacity-60`} />
      <h3 className={`font-medium ${theme.text} mb-1`}>
        {t('modules.measurements.emptyState.title')}
      </h3>
      <p className={`text-sm ${theme.textMuted} mb-4`}>
        {t('modules.measurements.emptyState.description')}
      </p>
      {onCreate && (
        <button
          type="button"
          onClick={onCreate}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          {t('modules.measurements.createModule')}
        </button>
      )}
    </div>
  );
}

export default function MeasurementsView({
  module,
  onUpdateModule,
  onCreate,
  onEditModule,
  theme,
}) {
  const { t } = useTranslation();
  const locale = getLocale();
  const [openMetricId, setOpenMetricId] = useState(null);

  // Reset selectie als de module of metrics-array veranderen.
  useEffect(() => {
    if (!module) { setOpenMetricId(null); return; }
    const exists = (module.metrics || []).some(m => m.id === openMetricId);
    if (openMetricId && !exists) setOpenMetricId(null);
  }, [module, openMetricId]);

  if (!module) {
    return (
      <EmptyState theme={theme} t={t} onCreate={onCreate} />
    );
  }

  const metrics = module.metrics || [];
  const openMetric = openMetricId ? metrics.find(m => m.id === openMetricId) : null;
  const colorCls = getColorClasses(module.color);
  const ModuleIcon = ICON_OPTIONS[module.icon] || Activity;

  const updateMetric = (next) => {
    onUpdateModule({
      ...module,
      metrics: metrics.map(m => (m.id === next.id ? next : m)),
    });
  };

  if (openMetric) {
    return (
      <MetricDetail
        metric={openMetric}
        color={module.color}
        theme={theme}
        t={t}
        locale={locale}
        onBack={() => setOpenMetricId(null)}
        onUpdateMetric={updateMetric}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <div className={`w-11 h-11 rounded-xl ${colorCls.iconBg} flex items-center justify-center`}>
          <ModuleIcon className={`w-5 h-5 ${colorCls.iconText}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className={`font-semibold ${theme.text} text-xl truncate`}>
            {resolveModuleName(module, t)}
          </h1>
          <div className={`text-sm ${theme.textMuted}`}>
            {t(metrics.length === 1 ? 'modules.measurements.metricCountOne' : 'modules.measurements.metricCount', { count: metrics.length })}
          </div>
        </div>
        {onEditModule && (
          <button
            type="button"
            onClick={() => onEditModule(module)}
            className={`p-2 rounded-lg ${theme.hover} ${theme.textSecondary}`}
            aria-label={t('common.settings')}
          >
            <Settings className="w-5 h-5" />
          </button>
        )}
      </div>

      {metrics.length === 0 ? (
        <div className={`${theme.card} rounded-2xl border ${theme.border} p-8 text-center`}>
          <Activity className={`w-10 h-10 ${theme.textMuted} mx-auto mb-3 opacity-60`} />
          <h3 className={`font-medium ${theme.text} mb-1`}>
            {t('modules.measurements.noMetrics')}
          </h3>
          <p className={`text-sm ${theme.textMuted} mb-4`}>
            {t('modules.measurements.addFirstHint')}
          </p>
          {onEditModule && (
            <button
              type="button"
              onClick={() => onEditModule(module)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              {t('modules.measurements.addMetric')}
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {metrics.map(metric => (
            <MetricCard
              key={metric.id}
              metric={metric}
              color={module.color}
              theme={theme}
              t={t}
              locale={locale}
              onOpen={() => setOpenMetricId(metric.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
