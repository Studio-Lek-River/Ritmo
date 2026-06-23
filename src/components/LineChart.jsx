import React from 'react';
import { getColorHex } from '../utils/colors';
import { getLocale } from '../i18n/useTranslation';
import {
  sortedAsc,
  formatMeasurementValue,
  unitSymbol,
} from '../utils/measurements';

// Generieke SVG-lijngrafiek voor een tijdreeks van numerieke events.
// Niet gebonden aan een specifiek module-type — wordt initieel gebruikt door
// het measurements-type maar de API is bewust algemeen gehouden.
//
// Props:
//  - events: [{ id, date: 'YYYY-MM-DD', value: number }]
//  - color:  COLOR_OPTIONS-key (bv. 'pink', 'blue'); fallback zinc bij onbekend
//  - decimals: 0 | 1 | 2 — voor as-labels en target-label
//  - target: number | null — toont een gestippelde doellijn
//  - unit: MEASUREMENT_UNITS-key — alleen voor het label naast de doellijn
//  - height: optionele SVG-hoogte; default 200
//  - formatValue: optionele (value:number)=>string voor as- en target-labels.
//      Afwezig → formatMeasurementValue(value, decimals, locale) + unit-symbool.
//  - series: optioneel [{ name, color, events }]. Indien aanwezig worden meerdere
//      lijnen getekend i.p.v. de enkele `events`-prop. De eerste serie is primair
//      (dikker, met area-fill en de target-lijn); volgende series zijn dunner
//      zonder area. De y-range wordt over alle series samen bepaald. `color` per
//      serie blijft een COLOR_OPTIONS-key (omgezet via getColorHex). Afwezig →
//      exact het bestaande gedrag op basis van `events`/`color`.
export default function LineChart({
  events,
  color,
  decimals = 1,
  target = null,
  unit,
  height = 200,
  formatValue,
  series,
}) {
  const locale = getLocale();
  // Default formatter (measurements-pad): kale waarde zonder unit, net als
  // voorheen. De unit hangt alleen aan het target-label (zie hieronder).
  const fmtVal = formatValue || ((v) => formatMeasurementValue(v, decimals, locale));

  const seriesInput = (Array.isArray(series) && series.length > 0)
    ? series
    : [{ name: undefined, color, events }];

  const norm = seriesInput.map(s => ({
    name: s.name,
    color: s.color,
    stroke: getColorHex(s.color),
    data: sortedAsc(s.events).filter(
      e => typeof e?.value === 'number' && Number.isFinite(e.value),
    ),
  }));

  const primary = norm[0];
  const allData = norm.flatMap(s => s.data);

  if (allData.length === 0) {
    return null;
  }

  const W = 600;
  const H = height;
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = allData.map(d => d.value);
  const hasTarget = target !== null && target !== undefined && Number.isFinite(target);
  if (hasTarget) {
    values.push(target);
  }
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const yMin = minV - range * 0.1;
  const yMax = maxV + range * 0.1;
  const yRange = yMax - yMin;

  const allTimes = allData.map(d => new Date(d.date).getTime());
  const firstDate = Math.min(...allTimes);
  const lastDate = Math.max(...allTimes);
  const xRange = Math.max(lastDate - firstDate, 1);
  const singleX = lastDate === firstDate;

  const xFor = (iso) => {
    if (singleX) return PAD.left + innerW / 2;
    const t = new Date(iso).getTime();
    return PAD.left + ((t - firstDate) / xRange) * innerW;
  };
  const yFor = (v) => PAD.top + innerH - ((v - yMin) / yRange) * innerH;

  const pathFor = (data) => data
    .map((d, i) => {
      const x = xFor(d.date);
      const y = yFor(d.value);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const primaryPath = pathFor(primary.data);
  const areaD = primary.data.length > 1
    ? `${primaryPath} L ${xFor(primary.data[primary.data.length - 1].date).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${xFor(primary.data[0].date).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`
    : '';

  const yTicks = [];
  for (let i = 0; i <= 3; i++) {
    const v = yMin + (yRange * i) / 3;
    yTicks.push({ v, y: yFor(v) });
  }

  const labelData = primary.data;
  const xLabels = [];
  if (labelData.length === 1) {
    xLabels.push({ date: labelData[0].date, x: xFor(labelData[0].date) });
  } else if (labelData.length > 1) {
    xLabels.push({ date: labelData[0].date, x: xFor(labelData[0].date) });
    if (labelData.length > 3) {
      const mid = labelData[Math.floor(labelData.length / 2)];
      xLabels.push({ date: mid.date, x: xFor(mid.date) });
    }
    xLabels.push({
      date: labelData[labelData.length - 1].date,
      x: xFor(labelData[labelData.length - 1].date),
    });
  }

  const targetY = hasTarget ? yFor(target) : null;
  const gradientId = `lc-grad-${primary.color || 'default'}-${allData.length}`;

  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={primary.stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={primary.stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {yTicks.map((t, i) => (
        <line
          key={i}
          x1={PAD.left}
          y1={t.y}
          x2={W - PAD.right}
          y2={t.y}
          stroke="currentColor"
          className="text-stone-200 dark:text-stone-700"
          strokeWidth="1"
          strokeDasharray={i === 0 ? '' : '2,3'}
        />
      ))}
      {hasTarget && (
        <g>
          <line
            x1={PAD.left}
            y1={targetY}
            x2={W - PAD.right}
            y2={targetY}
            stroke={primary.stroke}
            strokeWidth="1.5"
            strokeDasharray="4,4"
            opacity="0.6"
          />
          <text
            x={W - PAD.right - 4}
            y={targetY - 4}
            textAnchor="end"
            fill={primary.stroke}
            fontSize="11"
            fontWeight="500"
            opacity="0.85"
          >
            {formatValue ? fmtVal(target) : `${fmtVal(target)}${unitSymbol(unit)}`}
          </text>
        </g>
      )}
      {yTicks.map((t, i) => (
        <text
          key={i}
          x={PAD.left - 6}
          y={t.y + 4}
          textAnchor="end"
          fill="currentColor"
          className="text-stone-500 dark:text-stone-400"
          fontSize="10"
        >
          {fmtVal(t.v)}
        </text>
      ))}
      {xLabels.map((l, i) => (
        <text
          key={i}
          x={l.x}
          y={H - 8}
          textAnchor="middle"
          fill="currentColor"
          className="text-stone-500 dark:text-stone-400"
          fontSize="10"
        >
          {fmtDate(l.date)}
        </text>
      ))}
      {areaD && <path d={areaD} fill={`url(#${gradientId})`} />}
      {norm.slice(1).map((s, i) => (
        s.data.length > 0 && (
          <path
            key={`series-${i}`}
            d={pathFor(s.data)}
            fill="none"
            stroke={s.stroke}
            strokeWidth="1.5"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity="0.85"
          />
        )
      ))}
      <path
        d={primaryPath}
        fill="none"
        stroke={primary.stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {primary.data.map((d) => (
        <circle
          key={d.id || `${d.date}-${d.value}`}
          cx={xFor(d.date)}
          cy={yFor(d.value)}
          r="4"
          fill="white"
          stroke={primary.stroke}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
