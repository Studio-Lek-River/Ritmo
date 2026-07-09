import React from 'react';
import { useTranslation } from '../i18n/useTranslation';

// Klein herbruikbaar tijd-invoercomponent (patroon <input type="time"> uit
// SleepModule.jsx). Gebruikt op customTasks, recurringTasks, checklist-items,
// choice/counter-modules en project-subgoals: een optioneel kloktijd-veld dat
// de Dag-view (Productivity Suite) gebruikt om items in een dagdeel te plaatsen.
// Leeg blijft toegestaan — ontbrekende tijd betekent "Ongepland".
export default function TimeInput({ value, onChange, theme, disabled = false, className = '' }) {
  const { t } = useTranslation();
  return (
    <input
      type="time"
      value={value || ''}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
      aria-label={t('productivity.time')}
      className={`px-2 py-1.5 ${theme.input} rounded-lg text-sm disabled:opacity-60 ${className}`}
    />
  );
}
