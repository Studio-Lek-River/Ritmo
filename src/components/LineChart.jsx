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
export default function LineChart({
  events,
  color,
  decimals = 1,
  target = null,
  unit,
  height = 200,
}) {
  const data = sortedAsc(events).filter(
    e => typeof e?.value === 'number' && Number.isFinite(e.value),
  );
  const stroke = getColorHex(color);
  const locale = getLocale();

  if (data.length === 0) {
    return null;
  }

  const W = 600;
  const H = height;
  const PAD = { top: 16, right: 16, bottom: 28, left: 40 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const values = data.map(d => d.value);
  if (target !== null && target !== undefined && Number.isFinite(target)) {
    values.push(target);
  }
  const minV = Math.min(...values);
  const maxV = Math.max(...values);
  const range = maxV - minV || 1;
  const yMin = minV - range * 0.1;
  const yMax = maxV + range * 0.1;
  const yRange = yMax - yMin;

  const firstDate = new Date(data[0].date).getTime();
  const lastDate = new Date(data[data.length - 1].date).getTime();
  const xRange = Math.max(lastDate - firstDate, 1);

  const xFor = (iso) => {
    if (data.length === 1) return PAD.left + innerW / 2;
    const t = new Date(iso).getTime();
    return PAD.left + ((t - firstDate) / xRange) * innerW;
  };
  const yFor = (v) => PAD.top + innerH - ((v - yMin) / yRange) * innerH;

  const pathD = data
    .map((d, i) => {
      const x = xFor(d.date);
      const y = yFor(d.value);
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');

  const areaD = data.length > 1
    ? `${pathD} L ${xFor(data[data.length - 1].date).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} L ${xFor(data[0].date).toFixed(1)} ${(PAD.top + innerH).toFixed(1)} Z`
    : '';

  const yTicks = [];
  for (let i = 0; i <= 3; i++) {
    const v = yMin + (yRange * i) / 3;
    yTicks.push({ v, y: yFor(v) });
  }

  const xLabels = [];
  if (data.length === 1) {
    xLabels.push({ date: data[0].date, x: xFor(data[0].date) });
  } else {
    xLabels.push({ date: data[0].date, x: xFor(data[0].date) });
    if (data.length > 3) {
      const mid = data[Math.floor(data.length / 2)];
      xLabels.push({ date: mid.date, x: xFor(mid.date) });
    }
    xLabels.push({
      date: data[data.length - 1].date,
      x: xFor(data[data.length - 1].date),
    });
  }

  const hasTarget = target !== null && target !== undefined && Number.isFinite(target);
  const targetY = hasTarget ? yFor(target) : null;
  const gradientId = `lc-grad-${color || 'default'}-${data.length}`;

  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' });
  const fmtDate = (iso) => {
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? iso : dateFmt.format(d);
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" role="img" aria-hidden="true">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
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
            stroke={stroke}
            strokeWidth="1.5"
            strokeDasharray="4,4"
            opacity="0.6"
          />
          <text
            x={W - PAD.right - 4}
            y={targetY - 4}
            textAnchor="end"
            fill={stroke}
            fontSize="11"
            fontWeight="500"
            opacity="0.85"
          >
            {formatMeasurementValue(target, decimals, locale)}{unitSymbol(unit)}
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
          {formatMeasurementValue(t.v, decimals, locale)}
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
      <path
        d={pathD}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {data.map((d) => (
        <circle
          key={d.id || `${d.date}-${d.value}`}
          cx={xFor(d.date)}
          cy={yFor(d.value)}
          r="4"
          fill="white"
          stroke={stroke}
          strokeWidth="2"
        />
      ))}
    </svg>
  );
}
