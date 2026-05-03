import React from 'react';
import { getColorClasses } from '../utils/colors';

export default function TagPill({ tag, onClick, active = false }) {
  const c = getColorClasses(tag.color);
  const clickable = typeof onClick === 'function';
  const base = 'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium transition select-none';
  const styleClasses = active
    ? `${c.bar} text-white`
    : `${c.pillBg} ${c.pillText}`;
  const hover = clickable ? 'cursor-pointer hover:opacity-80' : '';
  return (
    <span
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? onClick : undefined}
      onKeyDown={clickable ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } } : undefined}
      className={`${base} ${styleClasses} ${hover}`}
    >
      {tag.label}
    </span>
  );
}
