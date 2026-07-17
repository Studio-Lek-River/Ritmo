import React from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { PRIORITY_LEVELS, DEFAULT_PRIORITY } from '../utils/dayTimeline';

// Klein herbruikbaar prioriteit-dropdown (hoog/normaal/laag) voor de
// `priority`-voorkeur op customTasks en project-subgoals. Vrijwel identieke
// kloon van DagdeelSelect.jsx: geen segmented control, de rij gebruikt al
// `<select>` voor `window`.
export default function PrioritySelect({ value, onChange, theme, disabled = false, className = '' }) {
  const { t } = useTranslation();
  return (
    <select
      value={value || DEFAULT_PRIORITY}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t('planner.priority.label')}
      className={`px-2 py-1.5 ${theme.input} rounded-lg text-sm disabled:opacity-60 ${className}`}
    >
      {PRIORITY_LEVELS.map(level => (
        <option key={level} value={level}>{t(`planner.priority.${level}`)}</option>
      ))}
    </select>
  );
}
