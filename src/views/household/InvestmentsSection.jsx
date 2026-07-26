import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import LineChart from '../../components/LineChart';
import { formatEuro } from '../../utils/household';
import {
  activeSeries, buildTotalSeries, seriesStats, sortedAsc,
} from '../../utils/investments';
import TotalInput from './investments/TotalInput';
import HoldingsInput from './investments/HoldingsInput';
import { euroAxis } from './investments/format';

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
