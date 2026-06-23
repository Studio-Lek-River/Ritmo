import React, { useState } from 'react';
import { TrendingUp, TrendingDown, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation, getLocale } from '../../i18n/useTranslation';
import LineChart from '../../components/LineChart';
import { formatEuro } from '../../utils/household';
import { COLOR_OPTIONS } from '../../utils/colors';
import { todayKey } from '../../utils/dates';
import {
  parseAmount, activeSeries, buildTotalSeries, seriesStats, sortedAsc, newId,
} from '../../utils/investments';

// Euro-formatter zonder decimalen voor de grafiek-as (kale getallen zouden
// niet als bedrag leesbaar zijn). Stats en meta gebruiken het volledige
// formatEuro uit utils/household.
function euroAxis(v) {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(v || 0);
}

function fmtDate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '';
  return new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(y, m - 1, d));
}

// Laatst bekende waarde van een aandeel (chronologisch laatste event), of null.
function holdingCurrent(holding) {
  const evs = sortedAsc(holding?.events);
  return evs.length ? evs[evs.length - 1].amount : null;
}

function StatCard({ theme, label, value, accent, icon }) {
  return (
    <div className={`${theme.cardSecondary} rounded-xl p-3 text-center`}>
      <div className={`text-xs ${theme.textMuted} mb-1`}>{label}</div>
      <div className={`text-sm font-semibold ${accent} flex items-center justify-center gap-1`}>
        {icon}{value}
      </div>
    </div>
  );
}

export default function InvestmentsSection({ investments, setInvestments, theme }) {
  const { t } = useTranslation();
  const mode = investments?.mode || 'total';
  const [showHoldings, setShowHoldings] = useState(false);

  const points = activeSeries(investments);
  const stats = seriesStats(points);

  const setMode = (m) => setInvestments(prev => ({ ...(prev || {}), mode: m }));

  // Stats-cijfer met richting: stijgt = groen + TrendingUp, daalt = rood +
  // TrendingDown, gelijk = neutraal zonder icoon. Geen oordeel, alleen cijfers.
  const changeStat = (change) => {
    if (!change) {
      return { value: t('household.investments.unchanged'), accent: theme.textMuted, icon: null };
    }
    const up = change > 0;
    return {
      value: `${up ? '+' : '-'}${formatEuro(Math.abs(change))}`,
      accent: up ? 'text-emerald-500' : 'text-rose-500',
      icon: up
        ? <TrendingUp className="w-3.5 h-3.5" />
        : <TrendingDown className="w-3.5 h-3.5" />,
    };
  };

  const sinceFirst = stats ? changeStat(stats.changeAll) : null;
  const sincePrev = stats && stats.hasPrev
    ? changeStat(stats.changePrev)
    : { value: t('household.investments.notApplicable'), accent: theme.textMuted, icon: null };

  // Grafiek: in holdings-modus met "toon losse aandelen" een series-array
  // (totaal-lijn + lijn per aandeel), anders de enkele actieve reeks.
  const useSeries = mode === 'holdings' && showHoldings;
  const chartSeries = useSeries ? [
    { name: t('household.investments.statCurrent'), color: 'blue', events: buildTotalSeries(investments.holdings) },
    ...(investments.holdings || []).map(h => ({
      name: h.name,
      color: h.color,
      events: sortedAsc(h.events).map(e => ({ id: e.id, date: e.date, value: e.amount })),
    })),
  ] : null;

  return (
    <div className="space-y-4">
      {/* Modus-keuze */}
      <div>
        <div className={`text-xs ${theme.textMuted} mb-2`}>{t('household.investments.modeLabel')}</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'total', label: t('household.investments.modeTotal'), hint: t('household.investments.modeTotalHint') },
            { id: 'holdings', label: t('household.investments.modeHoldings'), hint: t('household.investments.modeHoldingsHint') },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              aria-pressed={mode === opt.id}
              className={`rounded-xl p-3 text-left transition ${
                mode === opt.id
                  ? 'bg-blue-500 text-white'
                  : `${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`
              }`}
            >
              <span className="block text-sm font-medium">{opt.label}</span>
              <span className={`block text-[11px] ${mode === opt.id ? 'text-blue-100' : theme.textMuted}`}>{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard theme={theme} label={t('household.investments.statCurrent')} value={formatEuro(stats.current)} accent={theme.text} />
          <StatCard theme={theme} label={t('household.investments.statSinceFirst')} value={sinceFirst.value} accent={sinceFirst.accent} icon={sinceFirst.icon} />
          <StatCard theme={theme} label={t('household.investments.statSincePrev')} value={sincePrev.value} accent={sincePrev.accent} icon={sincePrev.icon} />
        </div>
      )}

      {/* Grafiek */}
      {points.length > 0 ? (
        <div className={`${theme.cardSecondary} rounded-xl p-3`}>
          {useSeries
            ? <LineChart series={chartSeries} formatValue={euroAxis} />
            : <LineChart events={points} color="blue" formatValue={euroAxis} />}
          {mode === 'holdings' && (investments.holdings || []).length > 0 && (
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setShowHoldings(s => !s)}
                className={`text-xs font-medium ${theme.textSecondary} ${theme.hover} px-2 py-1 rounded-lg transition`}
              >
                {showHoldings ? t('household.investments.hideHoldings') : t('household.investments.showHoldings')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className={`text-sm ${theme.textMuted} text-center py-4`}>{t('household.investments.chartEmpty')}</p>
      )}

      {/* Invoer */}
      {mode === 'total'
        ? <TotalInput investments={investments} setInvestments={setInvestments} theme={theme} />
        : <HoldingsInput investments={investments} setInvestments={setInvestments} theme={theme} />}
    </div>
  );
}

// ── Totaal-modus ────────────────────────────────────────────────────────────

function TotalInput({ investments, setInvestments, theme }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState('');

  const events = investments.total?.events || [];
  const sortedDesc = [...events].sort((a, b) => b.date.localeCompare(a.date));

  const add = () => {
    const val = parseAmount(amount);
    if (val === null || !date) return;
    setInvestments(prev => ({
      ...prev,
      total: {
        ...(prev.total || {}),
        events: [...(prev.total?.events || []), { id: newId(), date, amount: val }],
      },
    }));
    setAmount('');
  };

  const remove = (id) => setInvestments(prev => ({
    ...prev,
    total: { ...(prev.total || {}), events: (prev.total?.events || []).filter(e => e.id !== id) },
  }));

  return (
    <div className="space-y-3">
      <div className={`${theme.cardSecondary} rounded-xl p-3 space-y-2`}>
        <div className={`text-xs font-medium ${theme.textSecondary}`}>{t('household.investments.newTotalLabel')}</div>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            aria-label={t('household.investments.fieldDate')}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
          />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={t('household.investments.fieldAmountTotal')}
            aria-label={t('household.investments.fieldAmountTotal')}
            className={`w-28 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
          />
          <button
            onClick={add}
            disabled={parseAmount(amount) === null}
            aria-label={t('household.investments.addMeasurement')}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <MeasurementList events={sortedDesc} onRemove={remove} theme={theme} />
    </div>
  );
}

// ── Per-aandeel-modus ───────────────────────────────────────────────────────

function HoldingsInput({ investments, setInvestments, theme }) {
  const { t } = useTranslation();
  const [expandedId, setExpandedId] = useState(null);
  const [newName, setNewName] = useState('');

  const holdings = investments.holdings || [];

  const addHolding = () => {
    const name = newName.trim();
    if (!name) return;
    setInvestments(prev => {
      const list = prev.holdings || [];
      const used = new Set(list.map(h => h.color));
      const color = COLOR_OPTIONS.find(c => !used.has(c)) || COLOR_OPTIONS[list.length % COLOR_OPTIONS.length];
      return { ...prev, holdings: [...list, { id: newId(), name, color, events: [] }] };
    });
    setNewName('');
  };

  const removeHolding = (id) => setInvestments(prev => ({
    ...prev,
    holdings: (prev.holdings || []).filter(h => h.id !== id),
  }));

  const addEvent = (hid, date, val) => setInvestments(prev => ({
    ...prev,
    holdings: (prev.holdings || []).map(h => h.id === hid
      ? { ...h, events: [...(h.events || []), { id: newId(), date, amount: val }] }
      : h),
  }));

  const removeEvent = (hid, eid) => setInvestments(prev => ({
    ...prev,
    holdings: (prev.holdings || []).map(h => h.id === hid
      ? { ...h, events: (h.events || []).filter(e => e.id !== eid) }
      : h),
  }));

  return (
    <div className="space-y-3">
      <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{t('household.investments.holdingsHeading')}</h3>

      <ul className="space-y-2">
        {holdings.map(h => {
          const current = holdingCurrent(h);
          const open = expandedId === h.id;
          return (
            <li key={h.id} className={`rounded-xl ${theme.cardSecondary} overflow-hidden`}>
              <button
                onClick={() => setExpandedId(open ? null : h.id)}
                className={`w-full flex items-center gap-3 p-3 ${theme.hover} transition`}
              >
                <span className={`text-sm font-medium ${theme.text} truncate flex-1 text-left`}>{h.name}</span>
                <span className={`text-sm ${current === null ? theme.textMuted : theme.textSecondary}`}>
                  {current === null ? t('household.investments.holdingNoValue') : formatEuro(current)}
                </span>
                {open
                  ? <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
                  : <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />}
              </button>
              {open && (
                <div className={`p-3 pt-0 space-y-3`}>
                  <HoldingEventInput onAdd={(date, val) => addEvent(h.id, date, val)} theme={theme} />
                  <MeasurementList
                    events={[...(h.events || [])].sort((a, b) => b.date.localeCompare(a.date))}
                    onRemove={(eid) => removeEvent(h.id, eid)}
                    theme={theme}
                  />
                  <button
                    onClick={() => { removeHolding(h.id); setExpandedId(null); }}
                    className={`w-full py-2 rounded-lg text-sm font-medium text-rose-500 ${theme.hover} transition flex items-center justify-center gap-1.5`}
                  >
                    <Trash2 className="w-4 h-4" /> {t('household.investments.removeHolding')}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className={`${theme.cardSecondary} rounded-xl p-3`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHolding()}
            placeholder={t('household.investments.newHoldingPlaceholder')}
            className={`flex-1 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
          />
          <button
            onClick={addHolding}
            disabled={!newName.trim()}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> {t('household.investments.addHolding')}
          </button>
        </div>
      </div>
    </div>
  );
}

function HoldingEventInput({ onAdd, theme }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState('');

  const add = () => {
    const val = parseAmount(amount);
    if (val === null || !date) return;
    onAdd(date, val);
    setAmount('');
  };

  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        aria-label={t('household.investments.fieldDate')}
        className={`flex-1 min-w-0 px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
      />
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && add()}
        placeholder={t('household.investments.fieldAmountHolding')}
        aria-label={t('household.investments.fieldAmountHolding')}
        className={`w-28 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
      />
      <button
        onClick={add}
        disabled={parseAmount(amount) === null}
        aria-label={t('household.investments.addMeasurement')}
        className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

function MeasurementList({ events, onRemove, theme }) {
  const { t } = useTranslation();
  if (!events || events.length === 0) return null;
  return (
    <ul className="space-y-1">
      {events.map(e => (
        <li key={e.id} className={`flex items-center gap-3 p-2 rounded-lg ${theme.card}`}>
          <span className={`text-xs ${theme.textMuted} flex-1`}>{fmtDate(e.date)}</span>
          <span className={`text-sm font-medium ${theme.text}`}>{formatEuro(e.amount)}</span>
          <button
            onClick={() => onRemove(e.id)}
            aria-label={t('household.investments.removeMeasurementAria')}
            className={`p-1 rounded ${theme.textMuted} ${theme.hover} transition`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
