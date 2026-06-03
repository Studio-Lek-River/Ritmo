import React, { useId } from 'react';
import LiquidGlass from './LiquidGlass';
import { getColorHex, glassFill } from '../utils/colors';

// Eén component die de voortgang van een counter visueel toont. Weet niets van
// storage of module-config; alles komt via props binnen. De gebruiker kiest per
// counter de weergave (`displayStyle`); de weergave staat los van de unit.
//
// props:
//   displayStyle  een sleutel uit DISPLAY_STYLE_KEYS; valt terug op de default
//   value         huidige waarde
//   goal          dagdoel (0/leeg => lege vorm)
//   colorKey      module-kleur-key (uit COLOR_OPTIONS); onbekend/undefined => grijs
//   size          nominale breedte in px (default 100)

// Vaste volgorde voor de kiezer. De drie vul-vormen delen de LiquidGlass-renderer.
export const DISPLAY_STYLE_KEYS = [
  'glass', 'bottle', 'drop', 'plant', 'ring', 'gauge', 'segments', 'bar',
];

// Gelijk aan wat de counter al toonde voordat er gekozen kon worden.
export const DEFAULT_DISPLAY_STYLE = 'bar';

// glas/fles/druppel lopen via LiquidGlass; 'glass' gebruikt de tumbler-vorm.
const FILL_SHAPE = { glass: 'tumbler', bottle: 'bottle', drop: 'drop' };

function clampPct(value, goal) {
  if (!goal || goal <= 0) return 0;
  return Math.max(0, Math.min(1, value / goal));
}

function RingShape({ pct, color, size }) {
  const r = 42, c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img"
         aria-label={`${Math.round(pct * 100)}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9" opacity="0.12" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
        transform="rotate(-90 50 50)"
        style={{ transition: 'stroke-dashoffset 0.65s cubic-bezier(0.22,1,0.36,1)' }} />
    </svg>
  );
}

// Meter: 270-graden boog, opening onderaan.
function GaugeShape({ pct, color, size }) {
  const r = 40, c = 2 * Math.PI * r, arc = 0.75 * c;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} role="img"
         aria-label={`${Math.round(pct * 100)}%`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeLinecap="round" strokeDasharray={`${arc} ${c}`} opacity="0.12"
        transform="rotate(135 50 50)" />
      <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="9"
        strokeLinecap="round" strokeDasharray={`${arc} ${c}`}
        strokeDashoffset={arc * (1 - pct)} transform="rotate(135 50 50)"
        style={{ transition: 'stroke-dashoffset 0.65s cubic-bezier(0.22,1,0.36,1)' }} />
    </svg>
  );
}

// Segmenten: 12 vakjes die van onder naar boven vollopen.
function SegmentsShape({ pct, color, size }) {
  const cols = 4, rows = 3, total = cols * rows, filled = pct * total;
  const cells = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const i = (rows - 1 - row) * cols + col;
      let opacity = 0.12;
      if (i + 1 <= filled) opacity = 1;
      else if (i < filled) opacity = 0.12 + 0.88 * (filled - i);
      const w = 19, h = 25, gap = 6;
      cells.push(
        <rect key={`${row}-${col}`} x={col * (w + gap) + 4} y={row * (h + gap) + 4}
          width={w} height={h} rx="5" fill={color} opacity={opacity}
          style={{ transition: 'opacity 0.5s ease' }} />
      );
    }
  }
  return (
    <svg viewBox="0 0 100 97" width={size} height={size * 0.97} role="img"
         aria-label={`${Math.round(pct * 100)}%`}>{cells}</svg>
  );
}

// Plant: groeit van onderaf omhoog (mask-reveal), bloesem verschijnt bovenin.
function PlantShape({ pct, color, size }) {
  const uid = useId().replace(/:/g, '');
  const maskId = `ritmo-mask-${uid}`;
  const offset = (1 - pct) * 118;
  return (
    <svg viewBox="0 0 100 120" width={size} height={size * 1.2} role="img"
         aria-label={`${Math.round(pct * 100)}%`}>
      <defs>
        <mask id={maskId}>
          <rect x="-10" y="0" width="120" height="240" fill="white"
            style={{ transform: `translateY(${offset}px)`,
                     transition: 'transform 0.65s cubic-bezier(0.22,1,0.36,1)' }} />
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path d="M50,118 C50,92 45,72 52,52 C56,40 50,30 50,24" fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round" />
        <path d="M50,86 C36,82 27,90 25,101 C39,101 47,96 50,86 Z" fill={color} opacity="0.85" />
        <path d="M51,64 C65,59 74,67 76,78 C62,78 53,74 51,64 Z" fill={color} opacity="0.85" />
        <circle cx="50" cy="20" r="9" fill={color} />
        <circle cx="50" cy="20" r="3.5" fill="#fff" opacity="0.75" />
      </g>
    </svg>
  );
}

// Balk: alleen voor de mini-preview in de kiezer. De hoofd-balk in de
// counter-module blijft de bestaande inline-balk (met groen-bij-doel).
function BarShape({ pct, color, size }) {
  return (
    <div style={{ width: size }} className="flex flex-col justify-center">
      <div className="h-3 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${color}1f` }}>
        <div className="h-full rounded-full"
          style={{ width: `${pct * 100}%`, backgroundColor: color,
                   transition: 'width 0.65s cubic-bezier(0.22,1,0.36,1)' }} />
      </div>
    </div>
  );
}

export default function CounterDisplay({ displayStyle, value, goal, colorKey, size = 100 }) {
  const key = DISPLAY_STYLE_KEYS.includes(displayStyle) ? displayStyle : DEFAULT_DISPLAY_STYLE;
  const pct = clampPct(value, goal);
  const color = getColorHex(colorKey);

  if (FILL_SHAPE[key]) {
    const { base, light } = glassFill(colorKey);
    return (
      <LiquidGlass
        pct={pct}
        baseColor={base}
        lightColor={light}
        shape={FILL_SHAPE[key]}
        size={size}
        label={`${Math.round(pct * 100)}%`}
      />
    );
  }
  if (key === 'plant') return <PlantShape pct={pct} color={color} size={size} />;
  if (key === 'ring') return <RingShape pct={pct} color={color} size={size} />;
  if (key === 'gauge') return <GaugeShape pct={pct} color={color} size={size} />;
  if (key === 'segments') return <SegmentsShape pct={pct} color={color} size={size} />;
  return <BarShape pct={pct} color={color} size={size} />;
}
