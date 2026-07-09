import React from 'react';
import { Sparkles } from 'lucide-react';
import { ICON_OPTIONS } from '../../utils/icons';
import { resolveModuleName } from '../../i18n/useTranslation';

export default function InsightCardShell({ mod, summary, theme, darkMode, t, children }) {
  const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
  const iconColor = darkMode ? `text-${mod.color}-300` : `text-${mod.color}-600`;
  const iconBg = darkMode ? `bg-${mod.color}-900/30` : `bg-${mod.color}-50`;
  return (
    <div className={`${theme.card} ${theme.radiusCard} ${theme.padCard} shadow-sm mb-4 border ${theme.border}`}>
      <div className="flex items-center gap-3 mb-3">
        <div className={`${iconBg} ${theme.radiusControl} p-2`}>
          <Icon className={`w-5 h-5 ${iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className={`font-semibold ${theme.textSecondary} truncate`}>
            {resolveModuleName(mod, t)}
          </h3>
          {summary && (
            <p className={`text-sm ${theme.textMuted} truncate`}>{summary}</p>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
