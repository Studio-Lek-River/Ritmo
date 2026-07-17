import React from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { COLOR_OPTIONS, getColorClasses } from '../utils/colors';
import { PRIORITY_LEVELS } from '../utils/dayTimeline';
import { getPriorityColor } from '../utils/priorityPrefs';

// De drie afstembare voorkeuren van S06: energie per dagdeel, gewenste
// diepwerk-vensters, en de rustbuffer tussen auto-geplaatste taken. Leeg/
// neutraal (de default) verandert niets aan planDay t.o.v. S05 (principe 2).
// Segmented-control-render volgt het PLAN_MODE_OPTIONS-patroon (App.jsx),
// maar gebruikt de theme-accenttokens i.p.v. een hardcoded kleur.
//
// Sectie "Prioriteit" (S03b): geen afstem-voorkeur voor de indeler (die
// blijft ongewijzigd), maar een puur visuele instelling — welke kleur elk
// prioriteitsniveau krijgt in de takenpool-chips. Zelfde kleurkiezer-patroon
// als SourcesPanel.jsx:112-129 (COLOR_OPTIONS.map + getColorClasses().bar,
// ring-2 op de actieve keuze) en dezelfde patch-merge-setter als
// SourcesPanel.jsx:31-36.
const ENERGY_LEVELS = ['high', 'neutral', 'low'];
const REST_LEVELS = ['none', 'light', 'ample'];
const DAGDELEN = ['ochtend', 'middag', 'avond'];

export default function PlanPreferencesPanel({ planPrefs, setPlanPrefs, priorityPrefs, setPriorityPrefs, theme }) {
  const { t } = useTranslation();
  const energy = planPrefs?.energy || {};
  const deepWorkWindows = planPrefs?.deepWorkWindows || [];
  const rest = planPrefs?.rest || 'none';

  const setPriorityColor = (level, color) => {
    setPriorityPrefs?.(prev => ({ ...prev, [level]: color }));
  };

  const setEnergy = (dagdeel, level) => {
    setPlanPrefs?.(prev => ({
      ...prev,
      energy: { ...prev?.energy, [dagdeel]: level },
    }));
  };

  const toggleDeepWorkWindow = (dagdeel) => {
    setPlanPrefs?.(prev => {
      const windows = prev?.deepWorkWindows || [];
      const next = windows.includes(dagdeel)
        ? windows.filter(w => w !== dagdeel)
        : [...windows, dagdeel];
      return { ...prev, deepWorkWindows: next };
    });
  };

  const setRest = (level) => {
    setPlanPrefs?.(prev => ({ ...prev, rest: level }));
  };

  return (
    <div className={`${theme.card} ${theme.radiusCard} ${theme.padRow} space-y-6`}>
      <div>
        <h2 className={`text-lg font-semibold ${theme.text}`}>{t('planPrefs.title')}</h2>
        <p className={`text-sm ${theme.textMuted} mt-1`}>{t('planPrefs.hint')}</p>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{t('planPrefs.energy.title')}</h3>
          <p className={`text-xs ${theme.textMuted}`}>{t('planPrefs.energy.hint')}</p>
        </div>
        <div className="space-y-2">
          {DAGDELEN.map(dagdeel => (
            <div key={dagdeel} className="flex items-center gap-3 flex-wrap">
              <span className={`text-sm ${theme.textSecondary} w-16 shrink-0`}>
                {t(`productivity.dagdelen.${dagdeel}`)}
              </span>
              <div className={`flex gap-1 p-1 ${theme.cardSecondary} ${theme.radiusControl}`}>
                {ENERGY_LEVELS.map(level => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setEnergy(dagdeel, level)}
                    aria-pressed={(energy[dagdeel] || 'neutral') === level}
                    className={`px-3 py-1.5 ${theme.radiusControl} text-xs font-medium transition ${
                      (energy[dagdeel] || 'neutral') === level ? `${theme.accentBg} shadow` : `${theme.textMuted} ${theme.hover}`
                    }`}
                  >
                    {t(`planPrefs.energy.${level}`)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{t('planPrefs.deepWork.title')}</h3>
          <p className={`text-xs ${theme.textMuted}`}>{t('planPrefs.deepWork.hint')}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {DAGDELEN.map(dagdeel => (
            <label
              key={dagdeel}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${theme.radiusControl} text-xs font-medium cursor-pointer transition ${
                deepWorkWindows.includes(dagdeel) ? `${theme.accentBg} shadow` : `${theme.cardSecondary} ${theme.textMuted}`
              }`}
            >
              <input
                type="checkbox"
                checked={deepWorkWindows.includes(dagdeel)}
                onChange={() => toggleDeepWorkWindow(dagdeel)}
                className="w-3.5 h-3.5"
              />
              {t(`productivity.dagdelen.${dagdeel}`)}
            </label>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{t('planPrefs.rest.title')}</h3>
          <p className={`text-xs ${theme.textMuted}`}>{t('planPrefs.rest.hint')}</p>
        </div>
        <div className={`flex gap-1 p-1 ${theme.cardSecondary} ${theme.radiusControl} w-fit`}>
          {REST_LEVELS.map(level => (
            <button
              key={level}
              type="button"
              onClick={() => setRest(level)}
              aria-pressed={rest === level}
              className={`px-3 py-1.5 ${theme.radiusControl} text-xs font-medium transition ${
                rest === level ? `${theme.accentBg} shadow` : `${theme.textMuted} ${theme.hover}`
              }`}
            >
              {t(`planPrefs.rest.${level}`)}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <div>
          <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{t('planPrefs.priority.title')}</h3>
          <p className={`text-xs ${theme.textMuted}`}>{t('planPrefs.priority.hint')}</p>
        </div>
        <div className="space-y-2">
          {PRIORITY_LEVELS.map(level => {
            const activeColor = getPriorityColor(priorityPrefs, level);
            return (
              <div key={level} className="flex items-center gap-3 flex-wrap">
                <span className={`text-sm ${theme.textSecondary} w-16 shrink-0`}>
                  {t(`planner.priority.${level}`)}
                </span>
                <div className="flex gap-1.5 flex-wrap">
                  {COLOR_OPTIONS.map(color => {
                    const swatch = getColorClasses(color);
                    return (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setPriorityColor(level, color)}
                        aria-label={t('planPrefs.priority.colorAria', { color: t(`colors.${color}`), priority: t(`planner.priority.${level}`) })}
                        className={`w-5 h-5 rounded-full transition ${swatch.bar} ${
                          activeColor === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''
                        }`}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
