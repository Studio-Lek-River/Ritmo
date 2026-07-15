import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

// Klein herbruikbaar duur-invoercomponent (minuten, integer). Analoog aan
// TimeInput.jsx: `{ value, onChange, theme, disabled, className }`, optioneel
// veld, leeg blijft toegestaan ("geen duur ingesteld" — de latere indeler valt
// dan terug op een default, zie WeekView/TaskPoolPanel). Gebruikt op
// customTasks, project-subgoals en recurringTasks.
export default function DurationInput({ value, onChange, theme, disabled = false, className = '' }) {
  const { t } = useTranslation();
  return (
    <input
      type="number"
      min="0"
      step="5"
      value={value ?? ''}
      disabled={disabled}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') {
          onChange(undefined);
          return;
        }
        const parsed = parseInt(raw, 10);
        onChange(Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined);
      }}
      placeholder={t('planner.duration.placeholder')}
      aria-label={t('planner.duration.label')}
      className={`px-2 py-1.5 ${theme.input} rounded-lg text-sm disabled:opacity-60 ${className}`}
    />
  );
}
