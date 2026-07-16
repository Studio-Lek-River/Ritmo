import React, { useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { COLOR_OPTIONS, getColorClasses, getColorHex } from '../utils/colors';
import { SOURCE_ICONS, getSourcePref } from '../utils/sourcePrefs';
import { buildDayTimeline, DEFAULT_BLOCK_MINUTES } from '../utils/dayTimeline';
import { isToday, shortWeekdayLabelsMondayFirst } from '../utils/dates';
import { encodeDragPayload, decodeDragPayload } from '../utils/dragPayload';

// Weekrooster in Outlook-vorm voor de Planner: 7 dagkolommen (ma-zo van de
// huidige week) met uur-rijen, plus een interne Dag/Week-toggle (Dag toont
// alleen de geselecteerde kolom). Blokken zijn absoluut gepositioneerd op hun
// `time` met een vaste default-hoogte (30 min); `buildDayTimeline` wordt per
// dag aangeroepen met die dag als `referenceDate` (hergebruik, ongewijzigd).
// Slepen (native HTML5 DnD, zonder library) zet/verandert de tijd en de dag
// van een item via `onMoveItem`; elk blok heeft ook een niet-sleep-alternatief
// (het kruisje "terug naar takenpool") zodat slepen nooit de enige weg is
// (principe 2).
const HOUR_START = 7;
const HOUR_END = 22;
const ROW_HEIGHT = 64; // px per uur
const HEADER_HEIGHT = 44; // px

// Eigen dataTransfer-type voor het slepen van een pending (propose/concept)
// blok, los van de bestaande "text/plain"-payload (dragPayload.js) van echte
// items. Zo kan handleColumnDrop de twee soorten drags uit elkaar houden
// zonder het gedeelde encode/decode-formaat aan te passen: een concept-drag
// verandert alleen de ephemere tijd in pendingPlan (onMovePendingItem), nooit
// de echte opslag.
const PENDING_DRAG_MIME = 'application/x-ritmo-pending-key';

function timeToMinutesLocal(time) {
  if (!time || typeof time !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// Duur (minuten) tussen twee kloktijden voor een agenda-blok (S07); valt
// terug op `DEFAULT_BLOCK_MINUTES` bij ontbrekende/omgekeerde tijden, net als
// `blockStyle` hieronder voor een ontbrekende `duration`.
function agendaDurationMinutes(start, end) {
  const startMin = timeToMinutesLocal(start);
  const endMin = timeToMinutesLocal(end);
  if (startMin == null || endMin == null || endMin <= startMin) return DEFAULT_BLOCK_MINUTES;
  return endMin - startMin;
}

// `duration` (minuten) bepaalt de bloks-hoogte; ontbrekende/ongeldige duur
// valt terug op `DEFAULT_BLOCK_MINUTES` (ook de drag-snap-granulariteit,
// hieronder ongewijzigd).
function blockStyle(time, duration) {
  const rangeStart = HOUR_START * 60;
  const rangeEnd = (HOUR_END + 1) * 60;
  const minutes = timeToMinutesLocal(time) ?? rangeStart;
  const durationMinutes = Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_BLOCK_MINUTES;
  const clamped = Math.min(Math.max(minutes, rangeStart), rangeEnd - durationMinutes);
  return {
    top: ((clamped - rangeStart) / 60) * ROW_HEIGHT,
    height: (durationMinutes / 60) * ROW_HEIGHT,
  };
}

function timeFromOffset(offsetY) {
  const totalRangeMinutes = (HOUR_END - HOUR_START + 1) * 60;
  const totalHeight = (HOUR_END - HOUR_START + 1) * ROW_HEIGHT;
  const raw = (Math.max(0, offsetY) / totalHeight) * totalRangeMinutes;
  const snapped = Math.round(raw / DEFAULT_BLOCK_MINUTES) * DEFAULT_BLOCK_MINUTES;
  const clamped = Math.min(Math.max(snapped, 0), totalRangeMinutes - DEFAULT_BLOCK_MINUTES);
  const totalMinutes = HOUR_START * 60 + clamped;
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

// Agendablok-uiterlijk (S07c): tint + volledige rand + provider-icoontje in
// de bronkleur, zodat een extern blok herkenbaar anders blijft dan een
// gevulde eigen taak (die alleen een linkerrand in de modulekleur heeft).
// Een onbekende bron (geen kleur uit COLOR_OPTIONS, bv. een provider zonder
// default) valt terug op de neutrale `.r-block-agenda`-stijl van vóór deze
// slice.
function agendaBlockAppearance(block, sourcePrefs, theme) {
  const provider = block.source?.provider;
  const pref = getSourcePref(sourcePrefs, provider);
  if (!COLOR_OPTIONS.includes(pref.color)) {
    return { className: `r-block-agenda ${theme.textSecondary}`, style: {}, Icon: null };
  }
  const c = getColorClasses(pref.color);
  return {
    className: `border ${c.iconBg} ${c.iconText}`,
    style: { borderColor: getColorHex(pref.color) },
    Icon: SOURCE_ICONS[provider] || null,
  };
}

export default function WeekView({
  weekDays,
  modules,
  selectedDateKey,
  onSelectDate,
  onToggleTask,
  onToggleProjectSubgoal,
  onMoveItem,
  pendingPlan,
  onAcceptPendingItem,
  onDiscardPendingItem,
  onAcceptAllPending,
  onDiscardAllPending,
  onMovePendingItem,
  agendaByDate,
  sourcePrefs,
  theme,
}) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('week');

  const shortLabels = useMemo(() => shortWeekdayLabelsMondayFirst(), []);

  const dayTimelines = useMemo(() => {
    const map = {};
    (weekDays || []).forEach(day => {
      const raw = buildDayTimeline({
        modules,
        customTasks: day.customTasks,
        referenceDate: day.date,
        handlers: {
          onToggleTask: (id) => onToggleTask(day.dateKey, id),
          onToggleProjectSubgoal,
        },
      });
      // Een nog niet gematerialiseerde recurring-instantie mag je nog niet
      // afvinken (die "taak" bestaat pas echt zodra hij geplaatst is).
      map[day.dateKey] = raw.map(item => (
        item.key.startsWith('task:virtual:') ? { ...item, toggle: undefined } : item
      ));
    });
    return map;
  }, [weekDays, modules, onToggleTask, onToggleProjectSubgoal]);

  const columns = viewMode === 'dag'
    ? (weekDays || []).filter(d => d.dateKey === selectedDateKey)
    : (weekDays || []);

  const hours = [];
  for (let h = HOUR_START; h <= HOUR_END; h++) hours.push(h);

  // De payload draagt de brondag mee (`<dateKey>|<itemKey>`), want het
  // gesleepte item kan ook uit de takenpool komen (een ander component) — de
  // brondag kan dus niet in lokale state van deze kolom leven.
  const handleColumnDrop = (dateKey) => (e) => {
    e.preventDefault();
    const pendingKey = e.dataTransfer.getData(PENDING_DRAG_MIME);
    if (pendingKey) {
      if (dateKey === pendingPlan?.dateKey && onMovePendingItem) {
        const rect = e.currentTarget.getBoundingClientRect();
        const time = timeFromOffset(e.clientY - rect.top);
        onMovePendingItem(pendingKey, time);
      }
      return;
    }
    const { key, sourceDateKey } = decodeDragPayload(e.dataTransfer.getData('text/plain'));
    if (!key || !sourceDateKey) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const time = timeFromOffset(e.clientY - rect.top);
    onMoveItem(key, sourceDateKey, dateKey, time);
  };

  return (
    <div className={`${theme.card} ${theme.radiusCard} ${theme.padRow} space-y-3`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className={`flex gap-1 p-1 ${theme.cardSecondary} ${theme.radiusControl}`}>
          {[
            { id: 'dag', labelKey: 'planner.week.viewDag' },
            { id: 'week', labelKey: 'planner.week.viewWeek' },
          ].map(({ id, labelKey }) => (
            <button
              key={id}
              type="button"
              onClick={() => setViewMode(id)}
              aria-pressed={viewMode === id}
              className={`px-3 py-1.5 ${theme.radiusControl} text-xs font-medium transition ${
                viewMode === id ? `${theme.accentBg} shadow` : `${theme.textMuted} ${theme.hover}`
              }`}
            >
              {t(labelKey)}
            </button>
          ))}
        </div>
        <Legend theme={theme} t={t} />
      </div>

      {pendingPlan && pendingPlan.items.length > 0 && (
        <PendingPlanBar
          pendingPlan={pendingPlan}
          onAcceptAllPending={onAcceptAllPending}
          onDiscardAllPending={onDiscardAllPending}
          theme={theme}
          t={t}
        />
      )}

      <DayStrip
        weekDays={weekDays || []}
        shortLabels={shortLabels}
        selectedDateKey={selectedDateKey}
        onSelectDate={onSelectDate}
        theme={theme}
      />

      <div className="overflow-x-auto">
        <div className="flex" style={{ minWidth: columns.length > 1 ? '48rem' : undefined }}>
          <div className="shrink-0 w-12">
            <div style={{ height: HEADER_HEIGHT }} />
            {hours.map(hour => (
              <div
                key={hour}
                style={{ height: ROW_HEIGHT }}
                className={`text-[11px] ${theme.textMuted} pr-1 text-right`}
              >
                {String(hour).padStart(2, '0')}:00
              </div>
            ))}
          </div>

          {columns.map((day, idx) => {
            const weekdayIndex = (weekDays || []).findIndex(d => d.dateKey === day.dateKey);
            const label = shortLabels[weekdayIndex >= 0 ? weekdayIndex : idx];
            const isSelected = day.dateKey === selectedDateKey;
            const isTodayCol = isToday(day.date);
            // Het oog uit in het Koppelingen-blok (SourcesPanel) betekent
            // "deze bron telt niet mee": de blokken verdwijnen hier uit het
            // rooster (planDay.js filtert diezelfde bron al vóór de aanroep
            // in App.jsx, zodat "deel mijn dag in" er ook overheen plant).
            const dayAgendaBlocks = (agendaByDate?.[day.dateKey] || [])
              .filter(b => getSourcePref(sourcePrefs, b.source?.provider).visible);
            const allDayAgendaBlocks = dayAgendaBlocks.filter(b => b.allDay);
            const timedAgendaBlocks = dayAgendaBlocks.filter(b => !b.allDay);

            return (
              <div key={day.dateKey} className={`flex-1 min-w-[140px] border-l ${theme.border}`}>
                <div
                  style={{ height: HEADER_HEIGHT }}
                  className={`flex flex-col items-center justify-center text-xs font-medium ${
                    isSelected ? `${theme.accentWeak} ${theme.textSecondary}` : theme.textMuted
                  }`}
                >
                  <span>{label} {day.date.getDate()}</span>
                  {isTodayCol && <span className="text-[10px]">{t('common.today')}</span>}
                </div>

                {allDayAgendaBlocks.length > 0 && (
                  <div className="flex flex-wrap gap-1 px-1 py-1">
                    {allDayAgendaBlocks.map(block => {
                      const { className, style, Icon } = agendaBlockAppearance(block, sourcePrefs, theme);
                      return (
                        <span
                          key={`agenda-allday:${block.id}`}
                          title={block.title}
                          style={style}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate max-w-full flex items-center gap-1 ${className}`}
                        >
                          {Icon && <Icon className="w-2.5 h-2.5 shrink-0" />}
                          <span className="truncate">{t('planner.agenda.allDay')}: {block.title}</span>
                        </span>
                      );
                    })}
                  </div>
                )}

                <div
                  className={`relative ${theme.cardSecondary} ${isSelected ? `ring-2 ${theme.accentRing}` : ''}`}
                  style={{ height: hours.length * ROW_HEIGHT }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleColumnDrop(day.dateKey)}
                >
                  {hours.map((hour, hourIdx) => (
                    <div
                      key={hour}
                      className={`absolute left-0 right-0 border-t ${theme.border}`}
                      style={{ top: hourIdx * ROW_HEIGHT }}
                    />
                  ))}

                  {timedAgendaBlocks.map(block => {
                    const duration = agendaDurationMinutes(block.start, block.end);
                    const { top, height } = blockStyle(block.start, duration);
                    const { className, style, Icon } = agendaBlockAppearance(block, sourcePrefs, theme);
                    return (
                      <div
                        key={`agenda:${block.id}`}
                        style={{ top, height, ...style }}
                        title={block.title}
                        className={`absolute left-1 right-1 rounded-md px-1.5 py-1 text-[11px] overflow-hidden flex items-center gap-1 ${className}`}
                      >
                        {Icon && <Icon className="w-3 h-3 shrink-0" />}
                        <span className="truncate block flex-1">{block.title}</span>
                      </div>
                    );
                  })}

                  {(dayTimelines[day.dateKey] || []).filter(item => item.time).map(item => {
                    const { top, height } = blockStyle(item.time, item.duration);
                    const c = getColorClasses(item.color);
                    return (
                      <div
                        key={item.key}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', encodeDragPayload(day.dateKey, item.key));
                        }}
                        style={{ top, height, borderLeft: `3px solid ${getColorHex(item.color)}` }}
                        className={`absolute left-1 right-1 rounded-md px-1.5 py-1 text-[11px] overflow-hidden cursor-grab active:cursor-grabbing ${c.iconBg} ${c.iconText}`}
                        title={item.label}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={item.toggle}
                            disabled={!item.toggle}
                            aria-label={t('productivity.toggleAria', { label: item.label })}
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                              item.status ? `${c.bar} border-transparent` : `${theme.border} bg-transparent`
                            }`}
                          >
                            {item.status && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>
                          <span className={`truncate flex-1 ${item.status ? 'line-through' : ''}`}>
                            {item.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => onMoveItem(item.key, day.dateKey, day.dateKey, '')}
                            aria-label={t('planner.week.unschedule')}
                            className="shrink-0 opacity-60 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {pendingPlan?.dateKey === day.dateKey && pendingPlan.items.map(item => {
                    const { top, height } = blockStyle(item.time, item.duration);
                    const c = getColorClasses(item.color);
                    const isConcept = pendingPlan.mode === 'concept';
                    return (
                      <div
                        key={`pending:${item.key}`}
                        draggable={isConcept}
                        onDragStart={isConcept ? (e) => {
                          e.dataTransfer.setData(PENDING_DRAG_MIME, item.key);
                        } : undefined}
                        style={{ top, height, borderColor: getColorHex(item.color) }}
                        className={`absolute left-1 right-1 rounded-md px-1.5 py-1 text-[11px] overflow-hidden ${
                          isConcept ? 'r-block-draft cursor-grab active:cursor-grabbing' : 'r-block-proposal'
                        }`}
                        title={item.label}
                      >
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => onAcceptPendingItem(item.key)}
                            aria-label={isConcept ? t('planner.actions.confirm') : t('planner.actions.accept')}
                            title={isConcept ? t('planner.actions.confirm') : t('planner.actions.accept')}
                            className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center shrink-0 r-plan-accept ${c.bar} border-transparent`}
                          >
                            <Check className="w-2.5 h-2.5 text-white" />
                          </button>
                          <span className={`truncate flex-1 ${theme.textSecondary}`}>
                            {item.label}
                          </span>
                          <button
                            type="button"
                            onClick={() => onDiscardPendingItem(item.key)}
                            aria-label={t('planner.actions.discard')}
                            title={t('planner.actions.discard')}
                            className="shrink-0 opacity-60 hover:opacity-100"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Ephemere balk boven het rooster wanneer een propose-/concept-plan actief
// is: toont de bulk-"alles overnemen" (alleen propose, zie S05-spec — concept
// blijft per-blok "vastzetten") en een generieke "alles weggooien"-uitgang
// voor beide standen (principe 2: nooit vastzitten aan een voorstel).
function PendingPlanBar({ pendingPlan, onAcceptAllPending, onDiscardAllPending, theme, t }) {
  const isConcept = pendingPlan.mode === 'concept';
  return (
    <div className={`flex items-center justify-between gap-3 flex-wrap ${theme.cardSecondary} ${theme.radiusControl} ${theme.padRow}`}>
      <span className={`text-xs ${theme.textMuted}`}>
        {t(isConcept ? 'settings.planModeConcept' : 'settings.planModePropose')}
      </span>
      <div className="flex items-center gap-2">
        {!isConcept && (
          <button
            type="button"
            onClick={onAcceptAllPending}
            className={`px-3 py-1.5 ${theme.radiusControl} text-xs font-medium transition ${theme.accentBg} shadow`}
          >
            {t('planner.actions.acceptAll')}
          </button>
        )}
        <button
          type="button"
          onClick={onDiscardAllPending}
          className={`px-3 py-1.5 ${theme.radiusControl} text-xs font-medium transition ${theme.cardSecondary} ${theme.textMuted} ${theme.hover}`}
        >
          {t('planner.actions.discard')}
        </button>
      </div>
    </div>
  );
}

// Rij van 7 dagknoppen: de enige plek waar de geselecteerde dag verandert
// (zowel in Dag- als Week-stand), zodat er altijd een expliciete, niet-sleep
// manier is om van dag te wisselen (principe 2).
function DayStrip({ weekDays, shortLabels, selectedDateKey, onSelectDate, theme }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-7 gap-1">
      {weekDays.map((day, idx) => {
        const selected = day.dateKey === selectedDateKey;
        const todayCol = isToday(day.date);
        return (
          <button
            key={day.dateKey}
            type="button"
            onClick={() => onSelectDate(day.dateKey)}
            aria-pressed={selected}
            aria-label={t('planner.week.selectDayAria', { day: `${shortLabels[idx]} ${day.date.getDate()}` })}
            className={`flex flex-col items-center py-1.5 ${theme.radiusControl} text-xs font-medium transition ${
              selected
                ? `${theme.accentBg} shadow`
                : todayCol
                  ? `${theme.accentWeak} ${theme.textSecondary}`
                  : `${theme.cardSecondary} ${theme.textMuted} ${theme.hover}`
            }`}
          >
            <span>{shortLabels[idx]}</span>
            <span className="text-[11px]">{day.date.getDate()}</span>
          </button>
        );
      })}
    </div>
  );
}

// Legenda: Agenda (extern gesynchroniseerd, haak voor latere koppelingen) /
// Ingepland (de kleur-blokken die deze slice al toont) / Voorstel (haak voor
// de latere indeler). De agenda- en voorstel-stijlklassen bestaan al zodat
// een volgende slice ze meteen kan hergebruiken op echte blokken.
function Legend({ theme, t }) {
  // Het "Agenda"-swatje krijgt hetzelfde icoontje-in-tint-in-rand-patroon als
  // de echte agendablokken hierboven (agendaBlockAppearance); zonder actieve
  // koppeling is er geen bronkleur om te tonen, dus de swatch blijft neutraal
  // en toont alleen het generieke agenda-icoontje.
  const AgendaIcon = SOURCE_ICONS.outlook;
  const items = [
    { key: 'ingepland', className: theme.accentBg },
    { key: 'agenda', className: 'r-block-agenda', Icon: AgendaIcon },
    { key: 'voorstel', className: 'r-block-proposal' },
  ];
  return (
    <div className="flex items-center gap-3">
      {items.map(({ key, className, Icon }) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className={`inline-flex items-center justify-center w-3 h-3 rounded ${className}`}>
            {Icon && <Icon className="w-2 h-2" />}
          </span>
          <span className={`text-xs ${theme.textMuted}`}>{t(`planner.legend.${key}`)}</span>
        </span>
      ))}
    </div>
  );
}
