import React, { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { COLOR_OPTIONS, getColorClasses, getColorHex } from '../utils/colors';
import { SOURCE_ICONS, getSourcePref } from '../utils/sourcePrefs';
import { buildDayTimeline, DEFAULT_BLOCK_MINUTES } from '../utils/dayTimeline';
import { formatWeekRange, formatWeekTitle, isToday, shortWeekdayLabelsMondayFirst } from '../utils/dates';
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
const MIN_BLOCK_HEIGHT = 16; // px — ondergrens zodat een blok altijd klikbaar blijft
const ALL_DAY_ROW_HEIGHT = 26; // px — rij met all-day-chips boven de uurrijen

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
//
// Begin én eind worden op het zichtbare venster (HOUR_START-HOUR_END) geklemd,
// niet alleen het begin: een agendablok kan langer duren dan het venster toont
// (een meerdaagse Outlook-afspraak wordt per dag op 00:00-23:59 geknipt, zie
// utils/outlookEvents.js). Zonder de eind-klem leverde dat een negatieve `top`
// en een hoogte die de hele kolom overdekte — het blok liep dan zichtbaar door
// het rooster heen. MIN_BLOCK_HEIGHT houdt een blok dat maar net binnen het
// venster valt aanklikbaar in plaats van tot 0px samengevallen.
function blockStyle(time, duration) {
  const rangeStart = HOUR_START * 60;
  const rangeEnd = (HOUR_END + 1) * 60;
  const minutes = timeToMinutesLocal(time) ?? rangeStart;
  const durationMinutes = Number.isFinite(duration) && duration > 0 ? duration : DEFAULT_BLOCK_MINUTES;
  const start = Math.min(Math.max(minutes, rangeStart), rangeEnd);
  const end = Math.min(Math.max(minutes + durationMinutes, start), rangeEnd);
  const gridHeight = ((rangeEnd - rangeStart) / 60) * ROW_HEIGHT;
  const height = Math.max(((end - start) / 60) * ROW_HEIGHT, MIN_BLOCK_HEIGHT);
  const top = ((start - rangeStart) / 60) * ROW_HEIGHT;
  return {
    top: Math.min(top, gridHeight - height),
    height,
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

// Agendablok-uiterlijk (S07d): dekkend `.r-block`-kaartje met de bronkleur
// alleen als strip links, plus het provider-icoontje in diezelfde kleur als
// merkje. Dat merkje is bewust het enige onderscheid met een eigen taak
// (S07c gebruikte nog een tint + volledige rand over het hele blok); een
// onbekende bron (geen kleur uit COLOR_OPTIONS, bv. een provider zonder
// default) valt terug op de neutrale `.r-block-agenda`-stijl van vóór S07d.
function agendaBlockAppearance(block, sourcePrefs, theme) {
  const provider = block.source?.provider;
  const pref = getSourcePref(sourcePrefs, provider);
  const Icon = SOURCE_ICONS[provider] || null;
  if (!COLOR_OPTIONS.includes(pref.color)) {
    return { className: `r-block-agenda ${theme.textSecondary}`, style: {}, Icon, iconClassName: theme.textMuted };
  }
  const c = getColorClasses(pref.color);
  return {
    className: `r-block ${theme.text}`,
    style: { borderLeft: `4px solid ${getColorHex(pref.color)}` },
    Icon,
    iconClassName: c.iconText,
  };
}

export default function WeekView({
  weekDays,
  weekOffset = 0,
  onWeekOffsetChange,
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
  includedAgendaIds = [],
  onToggleAgendaBlock,
  sourcePrefs,
  theme,
}) {
  const { t } = useTranslation();
  const [viewMode, setViewMode] = useState('week');
  // Lichte UI-voorkeur, net als `viewMode` hierboven: bewust niet persistent,
  // zodat het rooster na een herlaad altijd alles laat zien. Standaard uit —
  // de meenemen-selectie is opt-in (leeg = niets telt mee, zie
  // utils/agendaSelection.js), dus aan-als-default zou bij een verse agenda een
  // leeg rooster geven.
  const [hideExcludedAgenda, setHideExcludedAgenda] = useState(false);

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

  // Twee filters bepalen welke agendablokken in het rooster staan. Het oog uit
  // in het Koppelingen-blok (SourcesPanel) betekent "deze bron telt niet mee":
  // die blokken verdwijnen hier (planDay.js filtert diezelfde bron al vóór de
  // aanroep in App.jsx, zodat "deel mijn dag in" er ook overheen plant). De
  // verbergknop hierboven werkt daarbinnen per afspraak: een afspraak zonder
  // vinkje telt niet mee bij het indelen en mag dus ook uit beeld.
  const agendaColumns = useMemo(() => {
    const map = {};
    columns.forEach(day => {
      const blocks = (agendaByDate?.[day.dateKey] || [])
        .filter(b => getSourcePref(sourcePrefs, b.source?.provider).visible)
        .filter(b => !hideExcludedAgenda || includedAgendaIds.includes(b.id));
      map[day.dateKey] = {
        allDay: blocks.filter(b => b.allDay),
        timed: blocks.filter(b => !b.allDay),
      };
    });
    return map;
  }, [columns, agendaByDate, sourcePrefs, hideExcludedAgenda, includedAgendaIds]);

  // De all-day-rij reserveert zijn hoogte in álle kolommen zodra één kolom een
  // all-day-afspraak heeft (en in de tijdbalk links). Anders zou alleen die ene
  // kolom omlaag schuiven en niet meer met de uurlabels ernaast kloppen.
  const allDayRowHeight = Object.values(agendaColumns).some(c => c.allDay.length > 0)
    ? ALL_DAY_ROW_HEIGHT
    : 0;

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
      <WeekNav
        weekStart={weekDays?.[0]?.date}
        weekOffset={weekOffset}
        onWeekOffsetChange={onWeekOffsetChange}
        theme={theme}
        t={t}
      />

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
        <div className="flex items-center gap-3 flex-wrap">
          <label className={`flex items-center gap-1.5 text-xs cursor-pointer ${theme.textMuted}`}>
            <input
              type="checkbox"
              checked={hideExcludedAgenda}
              onChange={(e) => setHideExcludedAgenda(e.target.checked)}
              className="w-3.5 h-3.5 cursor-pointer"
            />
            {t('planner.agenda.hideExcluded')}
          </label>
          <Legend theme={theme} t={t} />
        </div>
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

      {viewMode === 'dag' && (
        <DayStrip
          weekDays={weekDays || []}
          shortLabels={shortLabels}
          selectedDateKey={selectedDateKey}
          onSelectDate={onSelectDate}
          theme={theme}
          t={t}
        />
      )}

      <div className="overflow-x-auto">
        <div style={{ minWidth: columns.length > 1 ? '48rem' : undefined }}>
          {viewMode === 'week' && (
            <DayStrip
              weekDays={weekDays || []}
              shortLabels={shortLabels}
              selectedDateKey={selectedDateKey}
              onSelectDate={onSelectDate}
              theme={theme}
              t={t}
              aligned
            />
          )}

          <div className="flex">
            <div className="shrink-0 w-12">
              {allDayRowHeight > 0 && <div style={{ height: allDayRowHeight }} />}
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

            {columns.map((day) => {
            const isSelected = day.dateKey === selectedDateKey;
            const { allDay: allDayAgendaBlocks, timed: timedAgendaBlocks } = agendaColumns[day.dateKey];

            return (
              <div key={day.dateKey} className={`flex-1 min-w-[140px] border-l ${theme.border}`}>
                {allDayRowHeight > 0 && (
                  <div className="flex gap-1 px-1 py-0.5 overflow-hidden" style={{ height: allDayRowHeight }}>
                    {allDayAgendaBlocks.map(block => {
                      const { className, style, Icon, iconClassName } = agendaBlockAppearance(block, sourcePrefs, theme);
                      return (
                        <span
                          key={`agenda-allday:${block.id}`}
                          title={block.title}
                          style={style}
                          className={`text-[10px] px-1.5 py-0.5 rounded truncate max-w-full flex items-center gap-1 ${className}`}
                        >
                          {Icon && <Icon className={`w-2.5 h-2.5 shrink-0 ${iconClassName}`} />}
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
                    const { className, style, Icon, iconClassName } = agendaBlockAppearance(block, sourcePrefs, theme);
                    const included = includedAgendaIds.includes(block.id);
                    return (
                      <div
                        key={`agenda:${block.id}`}
                        style={{ top, height, ...style }}
                        title={block.title}
                        className={`absolute left-1 right-1 px-1.5 py-1 text-[11px] overflow-hidden flex flex-col gap-0.5 ${
                          included ? '' : 'opacity-60'
                        } ${className}`}
                      >
                        <div className="flex items-start gap-1">
                          <button
                            type="button"
                            onClick={() => onToggleAgendaBlock?.(block.id)}
                            disabled={!onToggleAgendaBlock}
                            aria-pressed={included}
                            aria-label={t(included ? 'planner.agenda.excludeAria' : 'planner.agenda.includeAria', { title: block.title })}
                            title={t(included ? 'planner.agenda.excludeAria' : 'planner.agenda.includeAria', { title: block.title })}
                            className={`w-3.5 h-3.5 mt-px rounded-full border flex items-center justify-center shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${
                              included ? `${getColorClasses(getSourcePref(sourcePrefs, block.source?.provider).color).bar} border-transparent` : `${theme.border} bg-transparent`
                            }`}
                          >
                            {included && <Check className="w-2.5 h-2.5 text-white" />}
                          </button>
                          {Icon && <Icon className={`w-3 h-3 mt-px shrink-0 ${iconClassName}`} />}
                          <span className="truncate flex-1">{block.title}</span>
                        </div>
                        {/* Titel bovenaan, tijd eronder. De tijdregel valt weg zodra
                            het blok te laag is (< 30 min), anders drukt hij de titel
                            weg. Puur cijfers, dus geen i18n-key nodig. */}
                        {height >= 34 && (
                          <span className={`text-[10px] truncate ${theme.textMuted}`}>
                            {block.start} - {block.end}
                          </span>
                        )}
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
                        style={{ top, height, borderLeft: `4px solid ${getColorHex(item.color)}` }}
                        className={`absolute left-1 right-1 r-block px-1.5 py-1 text-[11px] overflow-hidden cursor-grab active:cursor-grabbing ${theme.text}`}
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
                        style={{ top, height, borderLeft: `4px solid ${getColorHex(item.color)}` }}
                        className={`absolute left-1 right-1 px-1.5 py-1 text-[11px] overflow-hidden ${
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
    </div>
  );
}

// Weeknavigatie boven het rooster: pijltjes voor vorige/volgende week plus een
// weg-terug naar deze week. Onbegrensd in beide richtingen — een week buiten
// het bewaarvenster van de agendacache blijft gevuld omdat mergeEventsByDate de
// zojuist opgehaalde dagen niet meer wegsnoeit (utils/agendaCache.js).
//
// Titel en datumbereik komen van formatWeekTitle/formatWeekRange (utils/dates.js),
// die "Deze week"/"Vorige week"/"Week van {datum}" al afhandelen; de aria-labels
// hergebruiken de bestaande dates.*-keys. Verzet bewust alleen `weekOffset` en
// nooit de actieve dag: die blijft vandaag, zie de toelichting in App.jsx.
function WeekNav({ weekStart, weekOffset, onWeekOffsetChange, theme, t }) {
  if (!weekStart || !onWeekOffsetChange) return null;
  const navButton = `p-1.5 ${theme.radiusControl} ${theme.textMuted} ${theme.hover} transition`;
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => onWeekOffsetChange(weekOffset - 1)}
        aria-label={t('dates.previousWeekAria')}
        title={t('dates.previousWeekAria')}
        className={navButton}
      >
        <ChevronLeft className="w-4 h-4" />
      </button>
      <button
        type="button"
        onClick={() => onWeekOffsetChange(weekOffset + 1)}
        aria-label={t('dates.nextWeekAria')}
        title={t('dates.nextWeekAria')}
        className={navButton}
      >
        <ChevronRight className="w-4 h-4" />
      </button>
      <div className="flex items-baseline gap-2 min-w-0">
        <span className={`text-sm font-medium truncate ${theme.text}`}>{formatWeekTitle(weekStart)}</span>
        <span className={`text-xs truncate ${theme.textMuted}`}>{formatWeekRange(weekStart)}</span>
      </div>
      {weekOffset !== 0 && (
        <button
          type="button"
          onClick={() => onWeekOffsetChange(0)}
          className={`ml-auto px-3 py-1.5 ${theme.radiusControl} text-xs font-medium transition ${theme.cardSecondary} ${theme.textMuted} ${theme.hover}`}
        >
          {t('dates.thisWeek')}
        </button>
      )}
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
// manier is om van dag te wisselen (principe 2). Sinds de dagkoppen uit het
// rooster zelf verdwenen zijn, is dit ook de enige plek waar de dagnaam en het
// datumnummer staan — vandaar het "Vandaag"-label, dat eerst in die kop zat.
//
// `aligned` (Week-stand) geeft de rij exact dezelfde opbouw als de roosterrij
// eronder: eerst een spacer ter breedte van de tijdbalk, daarna per dag een
// knop met dezelfde flex-basis als de kolom. Zonder die spacer schoof elke knop
// een fractie van de 48px tijdbalk naar links en stond een blok op Vr visueel
// onder de Za-knop. In Dag-stand toont het rooster maar één kolom terwijl deze
// rij alle zeven dagen houdt, dus daar valt er niets uit te lijnen en blijft de
// rij een eigen grid over de volle breedte.
function DayStrip({ weekDays, shortLabels, selectedDateKey, onSelectDate, theme, t, aligned = false }) {
  return (
    <div className={aligned ? 'flex' : 'grid grid-cols-7 gap-1'}>
      {aligned && <div className="shrink-0 w-12" />}
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
            className={`flex flex-col items-center justify-center py-1.5 ${theme.radiusControl} text-xs font-medium transition ${
              aligned ? 'flex-1 min-w-[140px]' : ''
            } ${
              selected
                ? `${theme.accentBg} shadow`
                : todayCol
                  ? `${theme.accentWeak} ${theme.textSecondary}`
                  : `${theme.cardSecondary} ${theme.textMuted} ${theme.hover}`
            }`}
          >
            <span>{shortLabels[idx]} {day.date.getDate()}</span>
            {todayCol && <span className="text-[10px]">{t('common.today')}</span>}
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
  // Het "Agenda"-swatje krijgt hetzelfde icoontje-in-de-bronkleur-patroon als
  // de echte agendablokken hierboven (agendaBlockAppearance); zonder actieve
  // koppeling is er geen bronkleur om te tonen, dus de swatch blijft neutraal
  // en toont alleen het generieke agenda-icoontje. Alle drie de swatjes delen
  // sinds S07d dezelfde kaart-plus-strip-vorm als de echte blokken: een
  // dekkend vlakje met de kleur alleen als strip links.
  const AgendaIcon = SOURCE_ICONS.outlook;
  const items = [
    { key: 'ingepland', className: 'r-block', barClassName: theme.accentBg },
    { key: 'agenda', className: 'r-block-agenda', Icon: AgendaIcon },
    { key: 'voorstel', className: 'r-block-proposal' },
  ];
  return (
    <div className="flex items-center gap-3">
      {items.map(({ key, className, barClassName, Icon }) => (
        <span key={key} className="flex items-center gap-1.5">
          <span className={`relative inline-flex items-center justify-center w-3 h-3 r-radius-control overflow-hidden ${className}`}>
            {barClassName && <span className={`absolute inset-y-0 left-0 w-1 ${barClassName}`} />}
            {Icon && <Icon className="w-2 h-2" />}
          </span>
          <span className={`text-xs ${theme.textMuted}`}>{t(`planner.legend.${key}`)}</span>
        </span>
      ))}
    </div>
  );
}
