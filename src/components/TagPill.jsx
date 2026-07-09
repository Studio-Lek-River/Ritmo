import React from 'react';
import { getColorClasses } from '../utils/colors';
import { resolveTagLabel } from '../utils/collections';
import { useTranslation } from '../i18n/useTranslation';

export default function TagPill({ tag, onClick, active = false }) {
  const { t } = useTranslation();
  const c = getColorClasses(tag.color);
  const clickable = typeof onClick === 'function';
  const base = 'inline-flex items-center px-2 py-0.5 r-chip text-xs font-medium transition select-none';
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
      {resolveTagLabel(tag, t)}
    </span>
  );
}
