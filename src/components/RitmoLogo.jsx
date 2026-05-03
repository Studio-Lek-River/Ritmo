import React from 'react';

/**
 * Ritmo Logo - "R-Loop" met optioneel roterende accent-stip.
 *
 * De stip staat statisch op zijn eindpositie (rechtsboven, in de gap van de cirkel).
 * Bij animatie draait hij rond het centrum van de R en eindigt weer op zijn startpositie.
 *
 * Props:
 *   size       - pixel-grootte (default 80)
 *   variant    - 'dark' | 'light' | 'mono' (default 'dark')
 *                'mono' gebruikt currentColor zodat het zich aanpast aan tekstkleur
 *   accent     - hex of CSS-kleur voor de stip (override van variant-default)
 *   animated   - 'splash' | 'spin' | false (default false)
 *                'splash' = stip gaat één keer rond en stopt op startpositie
 *                'spin'   = stip blijft draaien (loading-state)
 *   speed      - duration in seconden voor één rotatie (default 1.8 voor splash, 2.4 voor spin)
 *   className  - extra Tailwind-klassen
 *   ariaLabel  - toegankelijk label (default 'Ritmo logo')
 *
 * Voorbeelden:
 *   <RitmoLogo />
 *   <RitmoLogo size={140} animated="splash" />
 *   <RitmoLogo size={32} animated="spin" />
 *   <RitmoLogo variant="mono" className="text-stone-600" />
 */
export default function RitmoLogo({
  size = 80,
  variant = 'dark',
  accent,
  animated = false,
  speed,
  className = '',
  ariaLabel = 'Ritmo logo',
}) {
  const inkColor =
    variant === 'light' ? '#fafaf9' :
    variant === 'mono'  ? 'currentColor' :
                          '#1c1917';

  const accentColor =
    accent !== undefined ? accent :
    variant === 'light'  ? '#2dd4bf' :
    variant === 'mono'   ? 'currentColor' :
                           '#0d9488';

  const defaultSpeed = animated === 'splash' ? 1.8 : 2.4;
  const duration = speed ?? defaultSpeed;

  // Unieke ID voorkomt botsende keyframe-namen als er meerdere logo's op de pagina staan
  const animId = React.useId().replace(/:/g, '');

  const animationStyle = animated
    ? {
        transformOrigin: '40px 40px',
        animation: animated === 'splash'
          ? `ritmo-spin-${animId} ${duration}s cubic-bezier(0.4, 0, 0.2, 1) 1`
          : `ritmo-spin-${animId} ${duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
      }
    : undefined;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 80 80"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={ariaLabel}
    >
      <path
        d="M 67.76 36.35 A 28 28 0 1 0 50.72 65.87"
        stroke={inkColor}
        strokeWidth="5"
        fill="none"
        strokeLinecap="round"
      />
      <text
        x="40"
        y="53"
        textAnchor="middle"
        fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif"
        fontSize="40"
        fontWeight="700"
        fill={inkColor}
        letterSpacing="-1"
      >
        R
      </text>
      <g style={animationStyle}>
        <circle cx="64" cy="26" r="5" fill={accentColor} />
      </g>
      {animated && (
        <style>{`
          @keyframes ritmo-spin-${animId} {
            from { transform: rotate(0deg); }
            to   { transform: rotate(360deg); }
          }
        `}</style>
      )}
    </svg>
  );
}
