import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { getColorClasses } from '../utils/colors';
import { buildDayTimeline, groupDayTimelineByHour } from '../utils/dayTimeline';
import { formatDayTitle, formatDaySubtitle, fmtDateKey } from '../utils/dates';

// De dag als agenda per uur (00:00–23:00): losse taken en projecttaken in hun
// tijdslot, met taken zonder tijd apart bovenaan. De Planner toont uitsluitend
// taken en projecten — geen routines of activiteiten. Hergebruikt bestaande
// toggle-handlers uit App.jsx; dit component schrijft zelf niets naar opslag.
// `agendaByDate` (S07, optioneel) voegt read-only Outlook-afspraken van vandaag
// toe aan dezelfde tijdlijn — geen per-blok acties, geen sleep/toggle.
export default function DagView({
  modules,
  customTasks,
  onToggleTask,
  onToggleProjectSubgoal,
  agendaByDate,
  theme,
}) {
  const { t } = useTranslation();
  const today = new Date();
  const todayKey = fmtDateKey(today);

  const { untimed, hours } = useMemo(() => {
    const taskItems = buildDayTimeline({
      modules,
      customTasks,
      handlers: {
        onToggleTask,
        onToggleProjectSubgoal,
      },
    });
    const agendaItems = (agendaByDate?.[todayKey] || []).map((block, idx) => ({
      key: `agenda:${block.id}`,
      kind: 'agenda',
      label: block.title,
      time: block.start || '',
      duration: undefined,
      status: false,
      color: undefined,
      toggle: undefined,
      order: taskItems.length + idx,
    }));
    return groupDayTimelineByHour([...taskItems, ...agendaItems]);
  }, [modules, customTasks, onToggleTask, onToggleProjectSubgoal, agendaByDate, todayKey]);

  return (
    <div className={`${theme.card} ${theme.radiusCard} ${theme.padRow} space-y-3`}>
      <div className="flex items-baseline gap-2">
        <h2 className={`text-lg font-bold ${theme.text}`}>{formatDayTitle(today)}</h2>
        <span className={`text-sm ${theme.textMuted}`}>{formatDaySubtitle(today)}</span>
      </div>

      {untimed.length > 0 && (
        <section className={`${theme.cardSecondary} ${theme.radiusControl} ${theme.padRow} space-y-2`}>
          <h3 className={`text-xs font-semibold uppercase tracking-wide ${theme.textMuted}`}>
            {t('productivity.untimed')}
          </h3>
          {untimed.map(item => (
            <DagTimelineRow key={item.key} item={item} theme={theme} t={t} />
          ))}
        </section>
      )}

      <div className="max-h-[70vh] overflow-y-auto pr-1 divide-y divide-slate-200/60 dark:divide-slate-700/60">
        {hours.map(({ hour, items }) => (
          <div key={hour} className="flex items-start gap-3 py-1.5 min-h-[2.75rem]">
            <span className={`text-xs font-medium tabular-nums w-11 shrink-0 pt-1.5 ${theme.textMuted}`}>
              {String(hour).padStart(2, '0')}:00
            </span>
            <div className="flex-1 min-w-0 space-y-2">
              {items.map(item => (
                <DagTimelineRow key={item.key} item={item} theme={theme} t={t} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DagTimelineRow({ item, theme, t }) {
  const c = getColorClasses(item.color);
  // Agenda-rijen (S07, Outlook) zijn read-only: geen toggle, geen kleurstip
  // (de blokken hebben geen module-kleur), eigen r-block-agenda-styling i.p.v.
  // de gewone kaart-achtergrond.
  const isAgenda = item.kind === 'agenda';

  return (
    <div className={`flex items-center gap-3 ${theme.padRow} ${theme.radiusControl} ${isAgenda ? 'r-block-agenda' : theme.cardSecondary}`}>
      <span className={`text-xs font-medium tabular-nums w-11 shrink-0 ${theme.textMuted}`}>
        {isAgenda && !item.time ? t('planner.agenda.allDay') : (item.time || t('productivity.noTime'))}
      </span>
      {!isAgenda && <span className={`w-2 h-2 rounded-full shrink-0 ${c.bar}`} />}
      <div className="flex-1 min-w-0">
        <div className={`text-sm truncate ${item.status ? `line-through ${theme.textMuted}` : theme.textSecondary}`}>
          {item.label}
        </div>
        <div className={`text-xs ${theme.textMuted}`}>
          {t(`productivity.types.${item.kind}`)}
        </div>
      </div>

      {!isAgenda && (
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
