import React, { useState } from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import LineChart from '../../components/LineChart';
import { formatEuro } from '../../utils/household';
import { getColorHex } from '../../utils/colors';
import {
  activeSeries, buildTotalSeries, buildPriceSeries, changeBreakdown, seriesStats, sortedAsc,
} from '../../utils/investments';
import TotalInput from './investments/TotalInput';
import HoldingsInput from './investments/HoldingsInput';
import { euroAxis, euroPriceAxis, indexAxis } from './investments/format';

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

// Legenda onder een series-grafiek: gekleurde stip + naam per lijn. Namen
// zijn user-data en hebben dus geen i18n-key nodig.
function ChartLegend({ items, theme }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
      {items.map((it, i) => (
        <div key={it.id || i} className="flex items-center gap-1.5">
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: getColorHex(it.color) }}
          />
          <span className={`text-xs ${theme.textMuted}`}>{it.name}</span>
        </div>
      ))}
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

  // Grafiek- en schaalkeuze leven in investments.view (optioneel, additief) en
  // worden dus automatisch bewaard door dezelfde useStoredState als de rest
  // van investments — geen aparte persistentie nodig.
  const chartView = investments?.view?.chart === 'price' ? 'price' : 'total';
  const priceScale = investments?.view?.priceScale === 'indexed' ? 'indexed' : 'abs';
  const setChartView = (c) => setInvestments(prev => ({
    ...(prev || {}), view: { ...(prev?.view || {}), chart: c },
  }));
  const setPriceScale = (s) => setInvestments(prev => ({
    ...(prev || {}), view: { ...(prev?.view || {}), priceScale: s },
  }));

  const priceSeriesResult = mode === 'holdings'
    ? buildPriceSeries(investments.holdings, { indexed: priceScale === 'indexed' })
    : { series: [], skipped: 0 };
  // Afgeleide waarde i.p.v. state-opschoning: als alle koersen later gewist
  // worden, valt de weergave vanzelf terug op 'total' zonder effect-hook.
  const effectiveChart = chartView === 'price' && priceSeriesResult.series.length > 0 ? 'price' : 'total';

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

  // Koersdeel/inlegdeel-splitsing (alleen relevant in per-aandeel-modus).
  const breakdown = mode === 'holdings' ? changeBreakdown(investments.holdings) : null;
  const fmtSigned = (v) => `${v > 0 ? '+' : v < 0 ? '-' : ''}${formatEuro(Math.abs(v))}`;

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

      {/* Koersdeel/inlegdeel-splitsing */}
      {mode === 'holdings' && breakdown?.hasSplit && (
        <div className={`${theme.cardSecondary} rounded-xl p-3`}>
          <p className={`text-xs ${theme.textSecondary}`}>
            {t('household.investments.splitHeading')}{' '}
            {t('household.investments.splitPriceLabel', { value: fmtSigned(breakdown.priceGain) })}
            {' · '}
            {t('household.investments.splitContributionLabel', { value: fmtSigned(breakdown.contribution) })}
            {breakdown.unattributed !== 0 && (
              <>
                {' · '}
                {t('household.investments.splitUnknownLabel', { value: fmtSigned(breakdown.unattributed) })}
              </>
            )}
          </p>
          <p className={`text-[11px] ${theme.textMuted} mt-1`}>{t('household.investments.splitHint')}</p>
        </div>
      )}

      {/* Grafiek */}
      {points.length > 0 ? (
        <div className="space-y-2">
          {mode === 'holdings' && priceSeriesResult.series.length > 0 && (
            <div>
              <div className={`text-xs ${theme.textMuted} mb-2`}>{t('household.investments.chartViewLabel')}</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'total', label: t('household.investments.chartTotal') },
                  { id: 'price', label: t('household.investments.chartPrice') },
                ].map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setChartView(opt.id)}
                    aria-pressed={effectiveChart === opt.id}
                    className={`rounded-xl p-2.5 text-xs font-medium transition ${
                      effectiveChart === opt.id
                        ? 'bg-blue-500 text-white'
                        : `${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className={`${theme.cardSecondary} rounded-xl p-3`}>
            {effectiveChart === 'price' ? (
              <>
                <LineChart
                  series={priceSeriesResult.series}
                  formatValue={priceScale === 'indexed' ? indexAxis : euroPriceAxis}
                />
                <ChartLegend items={priceSeriesResult.series} theme={theme} />
              </>
            ) : useSeries ? (
              <>
                <LineChart series={chartSeries} formatValue={euroAxis} />
                <ChartLegend
                  items={[
                    { id: 'total', name: t('household.investments.statCurrent'), color: 'blue' },
                    ...(investments.holdings || []).map(h => ({ id: h.id, name: h.name, color: h.color })),
                  ]}
                  theme={theme}
                />
              </>
            ) : (
              <LineChart events={points} color="blue" formatValue={euroAxis} />
            )}

            {effectiveChart === 'price' ? (
              <div className="flex justify-end mt-2">
                <div className="flex gap-1">
                  {[
                    { id: 'abs', label: t('household.investments.priceScaleAbs') },
                    { id: 'indexed', label: t('household.investments.priceScaleIndexed') },
                  ].map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => setPriceScale(opt.id)}
                      aria-pressed={priceScale === opt.id}
                      className={`text-xs font-medium px-2 py-1 rounded-lg transition ${
                        priceScale === opt.id
                          ? 'bg-blue-500 text-white'
                          : `${theme.textSecondary} ${theme.hover}`
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            ) : mode === 'holdings' && (investments.holdings || []).length > 0 && (
              <div className="flex justify-end mt-2">
                <button
                  onClick={() => setShowHoldings(s => !s)}
                  className={`text-xs font-medium ${theme.textSecondary} ${theme.hover} px-2 py-1 rounded-lg transition`}
                >
                  {showHoldings ? t('household.investments.hideHoldings') : t('household.investments.showHoldings')}
                </button>
              </div>
            )}

            {effectiveChart === 'price' && priceScale === 'indexed' && (
              <p className={`text-xs ${theme.textMuted} mt-1`}>{t('household.investments.priceScaleHint')}</p>
            )}
            {effectiveChart === 'price' && priceScale === 'indexed' && priceSeriesResult.skipped > 0 && (
              <p className={`text-xs ${theme.textMuted}`}>
                {t('household.investments.priceIndexSkipped', { n: priceSeriesResult.skipped })}
              </p>
            )}
          </div>
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
