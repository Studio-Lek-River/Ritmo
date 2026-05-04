import React from 'react';
import { Settings } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import { getColorClasses } from '../utils/colors';
import { projectProgress } from '../utils/projects';
import { useTranslation } from '../i18n/useTranslation';

export default function ProjectsModule({ module: mod, Icon, onOpen, onEdit, theme }) {
  const { t } = useTranslation();
  const { done, total, pct } = projectProgress(mod);
  const c = getColorClasses(mod.color);
  const meta = total === 0
    ? t('projects.subgoalsEmptyMeta')
    : t('projects.subgoalsCount', { done, total });

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen?.(mod.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen?.(mod.id); } }}
      className={`w-full text-left ${theme.card} rounded-2xl p-5 shadow-sm mb-4 ${theme.hover} transition cursor-pointer`}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className={`${c.iconBg} ${c.iconText} w-9 h-9 rounded-xl flex items-center justify-center`}>
          {Icon ? <Icon className="w-5 h-5" /> : null}
        </div>
        <div className="flex-1 min-w-0">
          <h2 className={`font-semibold ${theme.textSecondary} truncate`}>{mod.name}</h2>
          <p className={`text-xs ${theme.textMuted}`}>{meta}</p>
        </div>
        {onEdit && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
            title={t('modules.settingsTitle')}
            aria-label={t('modules.settingsAria', { name: mod.name })}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>
      <ProgressBar value={pct} colorKey={mod.color} label={`${pct}%`} />
    </div>
  );
}
