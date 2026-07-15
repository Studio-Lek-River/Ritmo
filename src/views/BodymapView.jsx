import React, { useState, useRef } from 'react';
import { Pencil, Syringe, Trash2, RotateCcw } from 'lucide-react';
import { getColorHex } from '../utils/colors';
import {
  INJECTION_ZONES,
  suggestNextZone,
  DEFAULT_HEAT_WINDOW,
  ZONE_ANCHORS,
  VIEW_W,
  VIEW_H,
  zoneFor,
  makeInjectionId,
  normalizeInjectionEvent,
} from '../utils/bodymap';
import { parseDateKey, formatRelativeDate } from '../utils/dates';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';
import { useTranslation, resolveModuleName } from '../i18n/useTranslation';

// Neutrale, theme-agnostische tinten voor het silhouet: 8-cijferig hex met alpha
// zodat ze zowel op een lichte als donkere kaart leesbaar blijven (geen darkMode-prop
// nodig) en de SVG-kleuren consequent hex zijn.
const SILHOUETTE_FILL = '#94a3b829'; // slate-400 @ 16%
const SILHOUETTE_STROKE = '#94a3b880'; // slate-400 @ 50%

// H12: elke prik is een losse stip, gekleurd op ouderdom (vers -> oud) i.p.v.
// een per-zone heat-vulling. Gedeeld met de legenda zodat figuur en uitleg
// dezelfde kleuren tonen.
const RECENCY_FILL = ['#e11d48', '#fb7185', '#94a3b8']; // 0-30d, 30-90d, 90+d
const DOT_STROKE = '#ffffff';

// De buik is een 3x3 raster (kolommen x 80/100/120, rijen y 82/112/142, 20px
// resp. 30px uit elkaar); de suggestie-ring is daarom kleiner in de buik zodat
// hij niet over naastliggende buik-ankers heen valt.
const ABDOMEN_RING_RADIUS = 11;
const DEFAULT_RING_RADIUS = 16.5;
const DOT_RADIUS = 4;
const DOT_HIT_RADIUS = 10; // ruime, onzichtbare raakzone rond elke stip
const SELECTED_RING_RADIUS = 7;
const MOVE_THRESHOLD = 0.5; // viewBox-eenheden; onder deze afstand telt een sleep als een tik

function isAbdomenZone(zoneId) {
  return zoneId.startsWith('abdomen');
}

function daysAgo(dateKey) {
  const parsed = parseDateKey(dateKey);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.round((startOfToday - parsed) / 86400000);
}

// 0 = 0-30 dagen (vers), 1 = 30-90 dagen, 2 = 90+ dagen (oud).
function recencyBucket(dateKey) {
  const age = daysAgo(dateKey);
  if (age < 30) return 0;
  if (age < 90) return 1;
  return 2;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// Client- naar viewBox-coördinaten via de native SVG CTM: houdt correct
// rekening met letterboxing onder `preserveAspectRatio` (een lineaire map op
// getBoundingClientRect klopt daar niet bij).
function clientToViewBox(svg, clientX, clientY) {
  const pt = svg.createSVGPoint();
  pt.x = clientX;
  pt.y = clientY;
  const ctm = svg.getScreenCTM();
  if (!ctm) return null;
  const p = pt.matrixTransform(ctm.inverse());
  return { x: p.x, y: p.y };
}

// Silhouet met vrij plaatsbare, sleepbare stippen (voorkant, H12). Tikken op
// het silhouet plaatst een nieuwe prik; tikken op een stip selecteert hem;
// slepen (plaatsen-en-slepen of een bestaande stip bijstellen) stelt de
// positie bij. De zone wordt afgeleid uit het punt (`zoneFor`) en blijft
// intact voor suggestNextZone/zoneLastUse/heat.
function BodyMapSvg({
  mod,
  log, // genormaliseerde log (id/x/y/view altijd aanwezig)
  accentHex,
  suggestedZoneId,
  canInject,
  selectedMed,
  selectedId,
  onSelectId,
  onLogInjection,
  onMoveInjection,
  t,
}) {
  const svgRef = useRef(null);
  const { showToast } = useToast();
  const [drag, setDrag] = useState(null); // { id, x, y } | null

  const pointFromEvent = (e) => {
    const svg = svgRef.current;
    if (!svg) return null;
    const p = clientToViewBox(svg, e.clientX, e.clientY);
    if (!p) return null;
    return { x: clamp(p.x, 0, VIEW_W), y: clamp(p.y, 0, VIEW_H) };
  };

  const handleBackgroundPointerDown = (e) => {
    if (!canInject) return;
    const point = pointFromEvent(e);
    if (!point) return;
    const id = makeInjectionId();
    const zoneId = zoneFor(point.x, point.y, 'front');
    onLogInjection?.(mod.id, {
      id,
      x: point.x,
      y: point.y,
      view: 'front',
      zoneId,
      medId: selectedMed.id,
      medModuleId: selectedMed.medModuleId,
      medName: selectedMed.name,
    });
    showToast({ message: t('bodymap.logged') });
    onSelectId(id);
    // startX/startY volgen de oorspronkelijke plek zodat pointerUp alleen een
    // move-commit doet als er ook echt versleept is (zie handlePointerEnd).
    setDrag({ id, x: point.x, y: point.y, startX: point.x, startY: point.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handleDotPointerDown = (e, event) => {
    e.stopPropagation();
    onSelectId(event.id);
    setDrag({ id: event.id, x: event.x, y: event.y, startX: event.x, startY: event.y });
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (!drag) return;
    const point = pointFromEvent(e);
    if (!point) return;
    setDrag((d) => (d ? { ...d, x: point.x, y: point.y } : d));
  };

  // Committeert de nieuwe positie alleen als er daadwerkelijk versleept is
  // (afstand tot startpunt > MOVE_THRESHOLD); een zuivere tik-om-te-selecteren
  // (of een nieuwe plaatsing zonder sleep, al bewaard via onLogInjection) mag
  // geen extra settings-write veroorzaken.
  const handlePointerEnd = () => {
    if (!drag) return;
    const moved = Math.abs(drag.x - drag.startX) > MOVE_THRESHOLD || Math.abs(drag.y - drag.startY) > MOVE_THRESHOLD;
    if (moved) {
      onMoveInjection?.(mod.id, drag.id, { x: drag.x, y: drag.y, view: 'front' });
    }
    setDrag(null);
  };

  const suggestedAnchor = ZONE_ANCHORS.front.find((a) => a.id === suggestedZoneId);
  const suggestedRingRadius = suggestedZoneId && isAbdomenZone(suggestedZoneId)
    ? ABDOMEN_RING_RADIUS
    : DEFAULT_RING_RADIUS;

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      width="100%"
      height="280"
      role="group"
      aria-label={t('bodymap.title')}
      style={{ touchAction: 'none', cursor: canInject ? 'crosshair' : 'default' }}
      onPointerDown={handleBackgroundPointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerEnd}
      onPointerCancel={handlePointerEnd}
    >
      {/* Neutraal lichaamssilhouet: hoofd, torso, twee bovenarmen, taille, twee dijen. */}
      <g fill={SILHOUETTE_FILL} stroke={SILHOUETTE_STROKE} strokeWidth="2" aria-hidden="true">
        <circle cx="100" cy="30" r="20" />
        <rect x="68" y="54" width="64" height="104" rx="20" />
        <rect x="42" y="60" width="20" height="92" rx="10" />
        <rect x="138" y="60" width="20" height="92" rx="10" />
        <rect x="70" y="146" width="60" height="30" rx="12" />
        <rect x="74" y="172" width="24" height="120" rx="12" />
        <rect x="102" y="172" width="24" height="120" rx="12" />
      </g>

      {/* Volgende-suggestie: gestippelde ring in de medicijnkleur, de enige
          zone-highlight die nog op het silhouet blijft (heat-vulling uit). */}
      {suggestedAnchor && (
        <circle
          cx={suggestedAnchor.x}
          cy={suggestedAnchor.y}
          r={suggestedRingRadius}
          fill="none"
          stroke={accentHex}
          strokeWidth="2"
          strokeDasharray="3 3"
          aria-hidden="true"
        />
      )}

      {log.map((event) => {
        const isDragging = drag && drag.id === event.id;
        const x = isDragging ? drag.x : event.x;
        const y = isDragging ? drag.y : event.y;
        const bucket = recencyBucket(event.date);
        const isSelected = event.id === selectedId;

        return (
          <g
            key={event.id}
            onPointerDown={(e) => handleDotPointerDown(e, event)}
            aria-hidden="true"
            style={{ cursor: 'pointer' }}
          >
            {/* Ruime, onzichtbare raakzone rond elke stip (vingervriendelijk). Geen
                role/aria-label hier: puur visueel/pointer-only, geen tab-stop (er
                kunnen veel stippen zijn). De recente-prikken-lijst hieronder is het
                toetsenbord-/AT-pad voor selecteren en verwijderen. */}
            <circle cx={x} cy={y} r={DOT_HIT_RADIUS} fill="transparent" />
            {isSelected && (
              <circle cx={x} cy={y} r={SELECTED_RING_RADIUS} fill="none" stroke={accentHex} strokeWidth="2" />
            )}
            <circle cx={x} cy={y} r={DOT_RADIUS} fill={RECENCY_FILL[bucket]} stroke={DOT_STROKE} strokeWidth="1.25" />
          </g>
        );
      })}
    </svg>
  );
}

function LegendDot({ color, dashed, label }) {
  return (
    <span className="inline-flex items-center gap-1">
      <span
        className="w-3 h-3 rounded-full flex-shrink-0"
        style={
          dashed
            ? { border: `1.5px dashed ${color}` }
            : { backgroundColor: color }
        }
        aria-hidden="true"
      />
      {label}
    </span>
  );
}

// Zelfstandige kaart voor één priklocatie-module. `meds` zijn de injecteerbare
// medicijnen (via injectableMeds over alle modules) die de aanroeper meegeeft.
export function BodymapModuleCard({
  module: mod,
  meds,
  iconOptions,
  onLogInjection,
  onRemoveInjection,
  onMoveInjection,
  onSetHeatWindow,
  onEditModule,
  theme,
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [selectedMedId, setSelectedMedId] = useState(null);
  const [selectedId, setSelectedId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null); // { id, event }

  const Icon = iconOptions?.[mod.icon] || Syringe;
  const log = mod.log || [];
  // Lazy, niet-destructieve normalisatie (zie normalizeInjectionEvent): oude
  // prikken zonder x/y/view/id krijgen die on-the-fly, zonder de opgeslagen
  // data te herschrijven.
  const normLog = log.map((event, index) => normalizeInjectionEvent(event, index));
  const heatWindow = mod.heatWindow || DEFAULT_HEAT_WINDOW;
  const activeMedId = selectedMedId ?? meds[0]?.id ?? null;
  const selectedMed = meds.find((med) => med.id === activeMedId) || null;
  const accentHex = getColorHex(selectedMed?.color);
  const suggestedZoneId = suggestNextZone(log);
  const lastEvent = normLog[0] || null;
  const lastZoneId = lastEvent?.zoneId || null;
  const canInject = meds.length > 0 && !!selectedMed;
  const selectedEvent = selectedId ? normLog.find((e) => e.id === selectedId) || null : null;

  const lastZone = lastZoneId ? INJECTION_ZONES.find((z) => z.id === lastZoneId) : null;

  const handleRemoveConfirmed = () => {
    if (!confirmRemove) return;
    const { id, event } = confirmRemove;
    setConfirmRemove(null);
    onRemoveInjection?.(mod.id, id);
    if (selectedId === id) setSelectedId(null);
    showToast({
      message: t('bodymap.injectionRemoved'),
      actionLabel: t('common.undo'),
      onAction: () => {
        onLogInjection?.(mod.id, event);
      },
    });
  };

  // Ongedaan maken van de laatste prik (veilig en omkeerbaar, dus geen dialoog).
  const handleUndoLast = () => {
    const event = lastEvent;
    if (!event) return;
    onRemoveInjection?.(mod.id, event.id);
    if (selectedId === event.id) setSelectedId(null);
    showToast({
      message: t('bodymap.injectionRemoved'),
      actionLabel: t('common.undo'),
      onAction: () => {
        onLogInjection?.(mod.id, event);
      },
    });
  };

  return (
    <>
      <div className={`${theme.card} rounded-2xl shadow-sm overflow-hidden`}>
        <div className="flex items-center gap-3 p-4 pb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
            style={{ backgroundColor: getColorHex(mod.color) }}
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${theme.textSecondary} truncate`}>
              {resolveModuleName(mod, t)}
            </p>
          </div>
          {onEditModule && (
            <button
              type="button"
              onClick={() => onEditModule(mod)}
              className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition flex-shrink-0`}
              aria-label={t('medication.editModuleAria', { name: resolveModuleName(mod, t) })}
            >
              <Pencil className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="px-4 pb-2">
          <p className={`text-xs ${theme.textMuted} mb-1.5`}>{t('bodymap.chooseMed')}</p>
          {meds.length === 0 ? (
            <p className={`text-xs ${theme.textMuted}`}>{t('bodymap.noInjectableMeds')}</p>
          ) : (
            <div className="flex gap-1.5 flex-wrap">
              {meds.map((med) => (
                <button
                  key={med.id}
                  type="button"
                  onClick={() => setSelectedMedId(med.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    activeMedId === med.id ? 'text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                  }`}
                  style={activeMedId === med.id ? { backgroundColor: getColorHex(med.color) } : undefined}
                >
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: activeMedId === med.id ? '#fff' : getColorHex(med.color) }}
                    aria-hidden="true"
                  />
                  {med.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* H12: de heat-venster-knoppen (30d/14d/alles) sturen sinds deze slice
            niets meer aan op het silhouet (heat-vulling is uit; stippen kleuren op
            ouderdom). De onderliggende data/handlers (mod.heatWindow, onSetHeatWindow,
            HEAT_WINDOWS, windowDaysFor) blijven intact voor een toekomstige
            heat-feature; alleen de control wordt hier niet gerenderd. */}

        <div className="px-4 pb-2">
          {canInject && (
            <p className={`text-xs ${theme.textMuted} mb-1.5`}>{t('bodymap.placeHint')}</p>
          )}
          <BodyMapSvg
            mod={mod}
            log={normLog}
            accentHex={accentHex}
            suggestedZoneId={suggestedZoneId}
            canInject={canInject}
            selectedMed={selectedMed}
            selectedId={selectedId}
            onSelectId={setSelectedId}
            onLogInjection={onLogInjection}
            onMoveInjection={onMoveInjection}
            t={t}
          />

          {selectedEvent ? (
            <div className={`flex items-center gap-2 mt-1.5 ${theme.cardSecondary} rounded-xl px-3 py-2`}>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${theme.textSecondary} truncate`}>
                  {(() => {
                    const zone = INJECTION_ZONES.find((z) => z.id === selectedEvent.zoneId);
                    return zone ? t(zone.labelKey) : t('bodymap.outsideZone');
                  })()}
                </p>
                <p className={`text-xs ${theme.textMuted} truncate`}>
                  {selectedEvent.medName} &middot; {t('bodymap.lastUsed', { count: daysAgo(selectedEvent.date) })}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmRemove({ id: selectedEvent.id, event: selectedEvent })}
                className="min-h-[44px] px-3 inline-flex items-center gap-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0 text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                {t('bodymap.removeInjection')}
              </button>
            </div>
          ) : normLog.length > 0 ? (
            <p className={`text-xs ${theme.textMuted} mt-1`}>{t('bodymap.selectHint')}</p>
          ) : null}

          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-1.5 text-xs ${theme.textMuted}`}>
            <LegendDot color={RECENCY_FILL[0]} label={t('bodymap.recency0_30')} />
            <LegendDot color={RECENCY_FILL[1]} label={t('bodymap.recency30_90')} />
            <LegendDot color={RECENCY_FILL[2]} label={t('bodymap.recency90plus')} />
            <LegendDot color={accentHex} dashed label={t('bodymap.legendNext')} />
          </div>
        </div>

        {lastZone && lastEvent && (
          <div className="px-4 pb-2">
            <div className={`flex items-center gap-2 ${theme.cardSecondary} rounded-xl px-3 py-2`}>
              <span className="text-xs flex-1 min-w-0 truncate">
                <span className={theme.textMuted}>{t('bodymap.lastInjection')}: </span>
                <span className={`font-medium ${theme.textSecondary}`}>{t(lastZone.labelKey)}</span>
                <span className={theme.textMuted}> &middot; {lastEvent.medName}</span>
              </span>
              <button
                type="button"
                onClick={handleUndoLast}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${theme.card} ${theme.textMuted} ${theme.hover} transition flex-shrink-0`}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t('common.undo')}
              </button>
            </div>
          </div>
        )}

        {normLog.length > 0 && (
          <div className="px-4 pb-4 pt-2">
            <p className={`text-xs font-medium ${theme.textMuted} mb-1.5`}>
              {t('bodymap.recentInjections')}
            </p>
            <ul className="space-y-1">
              {normLog.map((event) => {
                const zone = INJECTION_ZONES.find((z) => z.id === event.zoneId);
                return (
                  <li
                    key={event.id}
                    className={`flex items-center gap-2.5 py-2 px-2 rounded-xl ${event.id === selectedId ? theme.cardSecondary : ''} ${theme.hover}`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedId(event.id)}
                      className="flex-1 min-w-0 text-left"
                    >
                      <p className={`text-sm ${theme.textSecondary} truncate`}>
                        {zone ? t(zone.labelKey) : t('bodymap.outsideZone')} &middot; {event.medName}
                      </p>
                      <p className={`text-xs ${theme.textMuted}`}>{formatRelativeDate(event.date)}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove({ id: event.id, event })}
                      className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
                      aria-label={t('bodymap.removeInjection')}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmRemove}
        title={t('bodymap.removeInjection')}
        description={t('bodymap.confirmRemove')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleRemoveConfirmed}
        onCancel={() => setConfirmRemove(null)}
        theme={theme}
      />
    </>
  );
}
