import React, { useId } from 'react';

// Puur presentationeel glas dat vult met vloeistof. Weet niets van storage of
// module-config; alles komt via props binnen.
//
// props:
//   pct        vulniveau 0..1 (value / dailyGoal); wordt intern geclamped
//   baseColor  hex voor de vollere golf vooraan
//   lightColor hex voor de lichtere golf erachter
//   shape      'tumbler' (default) of 'highball'
//   animate    golf- en niveau-animatie aan (default true)
//   label      vertaalde aria-label voor de <svg>

// Golf-parameters. De golf is een gevulde vorm met een golvende bovenrand,
// horizontaal getegeld zodat hij naadloos kan schuiven: de vorm is periodiek
// per WAVELENGTH, dus een schuif van precies WAVELENGTH ziet er identiek uit.
const WAVELENGTH = 40;
const WAVE_SPAN = 200; // pad loopt van -SPAN tot +SPAN in x, ruim breder dan het glas
const WAVE_DEPTH = 220; // hoe ver de vulling onder het oppervlak doorloopt

// Bouwt een naadloos golfpad: een rij cubic-segmenten van een halve golflengte,
// afwisselend kruin (omhoog) en dal (omlaag), met horizontale raaklijnen in de
// extrema. WAVELENGTH-periodiek, dus een translateX van WAVELENGTH is naadloos.
function buildWave(amp, startUp) {
  const half = WAVELENGTH / 2;
  let up = startUp;
  let x = -WAVE_SPAN;
  let d = `M ${x} ${up ? -amp : amp}`;
  while (x < WAVE_SPAN) {
    const nx = x + half;
    const y0 = up ? -amp : amp;
    const y1 = up ? amp : -amp;
    d += ` C ${x + half / 3} ${y0} ${nx - half / 3} ${y1} ${nx} ${y1}`;
    x = nx;
    up = !up;
  }
  d += ` L ${x} ${WAVE_DEPTH} L ${-WAVE_SPAN} ${WAVE_DEPTH} Z`;
  return d;
}

const WAVE_A = buildWave(5, true); // achterste golf, iets groter
const WAVE_B = buildWave(3.5, false); // voorste golf, kleiner en in tegenfase

// Glasvormen binnen een viewBox van 120 x 150. `cavity` is de binnenruimte
// (clip voor de vloeistof), `outline` is de zichtbare omtrek. yTop/yBottom
// begrenzen het vulbereik voor de oppervlakte-hoogte.
const SHAPES = {
  tumbler: {
    yTop: 18,
    yBottom: 138,
    cavity: 'M26 20 L94 20 L84 136 Q84 138 82 138 L38 138 Q36 138 36 136 Z',
    outline: 'M24 16 L96 16 L85 138 Q84 142 80 142 L40 142 Q36 142 35 138 Z',
  },
  highball: {
    yTop: 10,
    yBottom: 142,
    cavity: 'M42 12 L78 12 L75 140 Q75 142 73 142 L47 142 Q45 142 45 140 Z',
    outline: 'M40 8 L80 8 L77 142 Q76 146 72 146 L48 146 Q44 146 43 142 Z',
  },
};

export default function LiquidGlass({
  pct,
  baseColor,
  lightColor,
  shape = 'tumbler',
  animate = true,
  label,
}) {
  const id = useId().replace(/:/g, '');
  const clipId = `glass-clip-${id}`;
  const def = SHAPES[shape] || SHAPES.tumbler;

  const fill = Math.max(0, Math.min(1, Number.isFinite(pct) ? pct : 0));
  const surfaceY = def.yBottom - fill * (def.yBottom - def.yTop);

  const rootClass = `ritmo-glass${animate ? '' : ' ritmo-glass--still'}`;

  return (
    <div className={rootClass} style={{ display: 'flex', justifyContent: 'center' }}>
      <svg
        viewBox="0 0 120 150"
        role="img"
        aria-label={label}
        style={{ width: 96, height: 120 }}
      >
        <defs>
          <clipPath id={clipId}>
            <path d={def.cavity} />
          </clipPath>
        </defs>

        {/* Lege glasbodem: heel licht, binnen de cavity */}
        <path d={def.cavity} fill="currentColor" opacity="0.06" />

        {/* Vloeistof, geclipt op de binnenruimte. De surface-groep bepaalt de
            hoogte (animeert), de golf-groepen schuiven horizontaal. */}
        <g clipPath={`url(#${clipId})`}>
          <g
            className="ritmo-surface"
            style={{ transform: `translateY(${surfaceY}px)` }}
          >
            <path className="ritmo-wave-a" d={WAVE_A} fill={lightColor} opacity="0.7" />
            <path className="ritmo-wave-b" d={WAVE_B} fill={baseColor} />
          </g>
        </g>

        {/* Omtrek bovenop; currentColor volgt de tekstkleur van de kaart en
            blijft zo leesbaar in light en dark mode. */}
        <path
          d={def.outline}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.4"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>

      <style>{`
        .ritmo-surface {
          transition: transform 0.6s ease;
        }
        .ritmo-wave-a {
          animation: ritmo-wave-a 2.6s linear infinite;
        }
        .ritmo-wave-b {
          animation: ritmo-wave-b 1.8s linear infinite;
        }
        @keyframes ritmo-wave-a {
          from { transform: translateX(0); }
          to { transform: translateX(-${WAVELENGTH}px); }
        }
        @keyframes ritmo-wave-b {
          from { transform: translateX(0); }
          to { transform: translateX(${WAVELENGTH}px); }
        }
        .ritmo-glass--still .ritmo-surface { transition: none; }
        .ritmo-glass--still .ritmo-wave-a,
        .ritmo-glass--still .ritmo-wave-b { animation: none; }
        @media (prefers-reduced-motion: reduce) {
          .ritmo-wave-a, .ritmo-wave-b { animation: none; }
          .ritmo-surface { transition: none; }
        }
      `}</style>
    </div>
  );
}
