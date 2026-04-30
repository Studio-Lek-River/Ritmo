import React from 'react';
import { getColorClasses } from '../utils/colors';

export default function ProgressBar({
  value,
  colorKey,
  label,
  showPercentage = false,
  size = 'md',
}) {
  const pct = Math.max(0, Math.min(100, Number(value) || 0));
  const { bar } = getColorClasses(colorKey);
  const heightClass = size === 'sm' ? 'h-1' : 'h-1.5';
  const displayLabel = label ?? (showPercentage ? `${Math.round(pct)}%` : null);

  return (
    <div className="flex items-center gap-2 w-full">
      <div className={`flex-1 ${heightClass} rounded-full bg-zinc-200 dark:bg-zinc-800 overflow-hidden`}>
        <div
          className={`${heightClass} ${bar} rounded-full transition-all duration-300`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {displayLabel !== null && (
        <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums shrink-0">
          {displayLabel}
        </span>
      )}
    </div>
  );
}
