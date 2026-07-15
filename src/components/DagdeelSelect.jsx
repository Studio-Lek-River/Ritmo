import React from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { WINDOW_OPTIONS } from '../utils/dayTimeline';

// Klein herbruikbaar dagdeel-dropdown (ochtend/middag/avond/geen voorkeur)
// voor de `window`-voorkeur op customTasks, project-subgoals en
// recurringTasks. Hergebruikt de bestaande `productivity.dagdelen.*`-labels;
// alleen de "geen voorkeur"-optie (`window = ''`) is nieuw voor deze slice.
export default function DagdeelSelect({ value, onChange, theme, disabled = false, className = '' }) {
  const { t } = useTranslation();
  return (
    <select
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t('planner.window.label')}
      className={`px-2 py-1.5 ${theme.input} rounded-lg text-sm disabled:opacity-60 ${className}`}
    >
      {WINDOW_OPTIONS.map(opt => (
        <option key={opt.id} value={opt.id}>{t(opt.labelKey)}</option>
      ))}
    </select>
  );
}
