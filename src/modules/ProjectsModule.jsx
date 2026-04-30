import React from 'react';
import ProgressBar from '../components/ProgressBar';
import { getColorClasses } from '../utils/colors';
import { projectProgress } from '../utils/projects';

export default function ProjectsModule({ module: mod, Icon, onOpen, t }) {
  const { done, total, pct } = projectProgress(mod);
  const c = getColorClasses(mod.color);
  const meta = total === 0
    ? '0 / 0 subdoelen — voeg een vak toe'
    : `${done} / ${total} subdoelen`;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(mod.id)}
      className={`w-full text-left ${t.card} rounded-2xl p-5 shadow-sm mb-4 ${t.hover} transition`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`${c.iconBg} ${c.iconText} w-9 h-9 rounded-xl flex items-center justify-center`}>
          {Icon ? <Icon className="w-5 h-5" /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`font-semibold ${t.textSecondary} truncate`}>{mod.name}</h2>
          <p className={`text-xs ${t.textMuted}`}>{meta}</p>
        </div>
      </div>
      <ProgressBar value={pct} colorKey={mod.color} label={`${pct}%`} />
    </button>
  );
}
