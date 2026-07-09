import React, { useMemo } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { getColorClasses } from '../utils/colors';
import { buildDayTimeline, groupDayTimelineByDagdeel, DAGDEEL_ORDER } from '../utils/dayTimeline';

// De dag in tijdvolgorde, gegroepeerd per dagdeel: routines, activiteiten,
// losse taken en projecttaken naast elkaar. Hergebruikt uitsluitend bestaande
// toggle-handlers uit App.jsx; dit component schrijft zelf niets naar opslag.
export default function DagView({
  modules,
  moduleData,
  customTasks,
  onChecklistToggle,
  onChoiceOptionSet,
  onToggleTask,
  onToggleProjectSubgoal,
  setView,
  theme,
}) {
  const { t } = useTranslation();

  const grouped = useMemo(() => {
    const items = buildDayTimeline({
      modules,
      moduleData,
      customTasks,
      handlers: {
        onChecklistToggle,
        onChoiceOptionSet,
        onToggleTask,
        onToggleProjectSubgoal,
        onNavigateToday: () => setView?.('today'),
      },
    });
    return groupDayTimelineByDagdeel(items);
  }, [modules, moduleData, customTasks, onChecklistToggle, onChoiceOptionSet, onToggleTask, onToggleProjectSubgoal, setView]);

  const hasAnyItems = DAGDEEL_ORDER.some(key => grouped[key].length > 0);

  if (!hasAnyItems) {
    return (
      <div className={`${theme.card} rounded-2xl p-8 text-center text-sm ${theme.textMuted}`}>
        {t('productivity.empty')}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {DAGDEEL_ORDER.map(dagdeel => {
        const items = grouped[dagdeel];
        if (items.length === 0) return null;
        return (
          <section key={dagdeel}>
            <h2 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${theme.textMuted}`}>
              {t(`productivity.dagdelen.${dagdeel}`)}
            </h2>
            <div className="space-y-2">
              {items.map(item => (
                <DagTimelineRow key={item.key} item={item} theme={theme} t={t} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function DagTimelineRow({ item, theme, t }) {
  const c = getColorClasses(item.color);
  const isActivity = item.kind === 'activiteit';

  return (
    <div className={`flex items-center gap-3 p-3 ${theme.cardSecondary} rounded-lg`}>
      <span className={`text-xs font-medium tabular-nums w-11 shrink-0 ${theme.textMuted}`}>
        {item.time || t('productivity.noTime')}
      </span>
      <span className={`w-2 h-2 rounded-full shrink-0 ${c.bar}`} />
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${item.status ? `line-through ${theme.textMuted}` : theme.textSecondary}`}>
          {item.label}
        </div>
        <div className={`text-xs ${theme.textMuted}`}>
          {t(`productivity.types.${item.kind}`)}
        </div>
      </div>

      {isActivity ? (
        <>
          <span
            className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
              item.status ? `${c.bar} border-transparent` : `${theme.border} bg-transparent`
            }`}
          >
            {item.status && <Check className="w-3.5 h-3.5 text-white" />}
          </span>
          <button
            type="button"
            onClick={item.toggle}
            disabled={!item.toggle}
            aria-label={t('productivity.goToToday')}
            className={`p-1.5 rounded-lg transition shrink-0 ${theme.hover} ${theme.textMuted} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={item.toggle}
          disabled={!item.toggle}
          aria-label={t('productivity.toggleAria', { label: item.label })}
          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
            item.status ? `${c.bar} border-transparent` : `${theme.border} bg-transparent`
          }`}
        >
          {item.status && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
      )}
    </div>
  );
}
