import React, { useState } from 'react';
import { Pencil, Syringe, Trash2, RotateCcw } from 'lucide-react';
import { getColorHex } from '../utils/colors';
import {
  INJECTION_ZONES,
  suggestNextZone,
  zoneLastUse,
  zoneInjectionCount,
  heatLevel,
  HEAT_WINDOWS,
  DEFAULT_HEAT_WINDOW,
  windowDaysFor,
} from '../utils/bodymap';
import { parseDateKey, formatRelativeDate } from '../utils/dates';
import ConfirmDialog from '../components/ConfirmDialog';
import { useToast } from '../hooks/useToast';
import { useTranslation, resolveModuleName } from '../i18n/useTranslation';

// Neutrale, theme-agnostische tinten voor het silhouet: alpha-gebaseerd zodat ze
// zowel op een lichte als donkere kaart leesbaar blijven (geen darkMode-prop nodig).
const SILHOUETTE_FILL = 'rgba(148,163,184,0.16)';
const SILHOUETTE_STROKE = 'rgba(148,163,184,0.5)';
const LAST_RING = '#f59e0b'; // amber: de zone waar je het laatst prikte

// Heat-schaal (0..3): ongebruikt neutraal, oplopend rose -> rood. Gedeeld met de
// legenda zodat de figuur en de uitleg dezelfde kleuren tonen.
const HEAT_FILL = ['rgba(148,163,184,0.3)', '#fecdd3', '#fb7185', '#e11d48'];
const HEAT_TEXT = ['#94a3b8', '#9f1239', '#ffffff', '#ffffff'];

// Klikbare zone-stippen op het silhouet. Coördinaten in de 200x320 viewBox.
// De buik kreeg in H09 drie rijen (boven/midden/onder) i.p.v. één rij; de
// torso-rect hieronder is iets verlengd zodat alle zes stippen erbinnen vallen.
const ZONE_DOTS = {
  abdomenUpperL: { cx: 88, cy: 82 },
  abdomenUpperR: { cx: 112, cy: 82 },
  abdomenMidL: { cx: 88, cy: 112 },
  abdomenMidR: { cx: 112, cy: 112 },
  abdomenLowerL: { cx: 88, cy: 142 },
  abdomenLowerR: { cx: 112, cy: 142 },
  armL: { cx: 52, cy: 92 },
  armR: { cx: 148, cy: 92 },
  thighL: { cx: 86, cy: 224 },
  thighR: { cx: 114, cy: 224 },
};

// De buik heeft nu drie rijen (cy 82/112/142, 30px uit elkaar) i.p.v. één; de
// buikstippen en -ringen zijn daarom iets kleiner dan de arm/dij-stippen zodat
// de suggestie- en laatste-prik-ringen van naastliggende rijen elkaar niet
// overlappen.
const ABDOMEN_DOT_RADIUS = 10;
const ABDOMEN_RING_RADIUS = 13;
const ABDOMEN_LAST_RING_RADIUS = 12;
const DEFAULT_DOT_RADIUS = 12;
const DEFAULT_RING_RADIUS = 16.5;
const DEFAULT_LAST_RING_RADIUS = 15.5;

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

function BodyMapSvg({
  log,
  windowDays,
  accentHex,
  suggestedZoneId,
  lastZoneId,
  disabled,
  onZoneClick,
  t,
}) {
  return (
    <svg viewBox="0 0 200 320" width="100%" height="280" role="group" aria-label={t('bodymap.title')}>
      {/* Neutraal lichaamssilhouet: hoofd, torso, twee bovenarmen, taille, twee dijen. */}
      <g fill={SILHOUETTE_FILL} stroke={SILHOUETTE_STROKE} strokeWidth="2" aria-hidden="true">
        <circle cx="100" cy="30" r="20" />
        <rect x="72" y="54" width="56" height="104" rx="20" />
        <rect x="42" y="60" width="20" height="92" rx="10" />
        <rect x="138" y="60" width="20" height="92" rx="10" />
        <rect x="72" y="146" width="56" height="30" rx="12" />
        <rect x="74" y="172" width="24" height="120" rx="12" />
        <rect x="102" y="172" width="24" height="120" rx="12" />
      </g>

      {INJECTION_ZONES.map((zone) => {
        const dot = ZONE_DOTS[zone.id];
        const count = zoneInjectionCount(log, zone.id, windowDays);
        const level = heatLevel(count);
        const isLast = zone.id === lastZoneId;
        const isNext = zone.id === suggestedZoneId;
        const isAbdomen = isAbdomenZone(zone.id);
        const dotRadius = isAbdomen ? ABDOMEN_DOT_RADIUS : DEFAULT_DOT_RADIUS;
        const ringRadius = isAbdomen ? ABDOMEN_RING_RADIUS : DEFAULT_RING_RADIUS;
        const lastRingRadius = isAbdomen ? ABDOMEN_LAST_RING_RADIUS : DEFAULT_LAST_RING_RADIUS;
        const fontSize = isAbdomen ? '10' : '12';

        const lastUse = zoneLastUse(log, zone.id);
        const dAgo = lastUse ? daysAgo(lastUse) : null;
        const statusLabel = dAgo != null ? t('bodymap.lastUsed', { count: dAgo }) : t('bodymap.neverUsed');
        const zoneLabel = t(zone.labelKey);
        const ariaLabel = [
          zoneLabel,
          statusLabel,
          isLast ? t('bodymap.legendLast') : null,
          isNext ? t('bodymap.suggestedZone') : null,
        ]
          .filter(Boolean)
          .join(' · ');

        return (
          <g
            key={zone.id}
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label={ariaLabel}
            onClick={() => { if (!disabled) onZoneClick(zone.id); }}
            onKeyDown={(e) => {
              if (disabled) return;
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onZoneClick(zone.id);
              }
            }}
            style={{ cursor: disabled ? 'default' : 'pointer' }}
          >
            {/* Volgende-suggestie: gestippelde ring in de medicijnkleur. */}
            {isNext && (
              <circle cx={dot.cx} cy={dot.cy} r={ringRadius} fill="none" stroke={accentHex} strokeWidth="2" strokeDasharray="3 3" />
            )}
            {/* Laatste prik: massieve amber ring. */}
            {isLast && (
              <circle cx={dot.cx} cy={dot.cy} r={lastRingRadius} fill="none" stroke={LAST_RING} strokeWidth="2.5" />
            )}
            <circle cx={dot.cx} cy={dot.cy} r={dotRadius} fill={HEAT_FILL[level]} stroke="#ffffff" strokeWidth="1.5" />
            {count > 0 && (
              <text
                x={dot.cx}
                y={dot.cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={fontSize}
                fontWeight="700"
                fill={HEAT_TEXT[level]}
              >
                {count}
              </text>
            )}
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
  onSetHeatWindow,
  onEditModule,
  theme,
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [selectedMedId, setSelectedMedId] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(null); // { index, event }

  const handleRemoveConfirmed = () => {
    if (!confirmRemove) return;
    const { index, event } = confirmRemove;
    setConfirmRemove(null);
    onRemoveInjection?.(mod.id, index);
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
    const event = log[0];
    if (!event) return;
    onRemoveInjection?.(mod.id, 0);
    showToast({
      message: t('bodymap.injectionRemoved'),
      actionLabel: t('common.undo'),
      onAction: () => {
        onLogInjection?.(mod.id, event);
      },
    });
  };

  const Icon = iconOptions?.[mod.icon] || Syringe;
  const log = mod.log || [];
  const heatWindow = mod.heatWindow || DEFAULT_HEAT_WINDOW;
  const windowDays = windowDaysFor(heatWindow);
  const activeMedId = selectedMedId ?? meds[0]?.id ?? null;
  const selectedMed = meds.find((med) => med.id === activeMedId) || null;
  const accentHex = getColorHex(selectedMed?.color);
  const suggestedZoneId = suggestNextZone(log);
  const lastZoneId = log[0]?.zoneId || null;
  const canInject = meds.length > 0 && !!selectedMed;

  const lastZone = lastZoneId ? INJECTION_ZONES.find((z) => z.id === lastZoneId) : null;

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

        {/* Heat-venster: over welke periode de cijfers/kleuren tellen. */}
        <div className="px-4 pb-1 flex items-center gap-2">
          <span className={`text-xs ${theme.textMuted}`}>{t('bodymap.heatWindowLabel')}</span>
          <div className={`inline-flex rounded-lg p-0.5 ${theme.cardSecondary}`}>
            {HEAT_WINDOWS.map((w) => (
              <button
                key={w.id}
                type="button"
                onClick={() => onSetHeatWindow?.(mod.id, w.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                  heatWindow === w.id ? `${theme.card} ${theme.text} shadow-sm` : theme.textMuted
                }`}
                aria-pressed={heatWindow === w.id}
              >
                {t(w.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div className="px-4 pb-2">
          <BodyMapSvg
            log={log}
            windowDays={windowDays}
            accentHex={accentHex}
            suggestedZoneId={suggestedZoneId}
            lastZoneId={lastZoneId}
            disabled={!canInject}
            t={t}
            onZoneClick={(zoneId) => {
              if (!canInject) return;
              onLogInjection?.(mod.id, {
                zoneId,
                medId: selectedMed.id,
                medModuleId: selectedMed.medModuleId,
                medName: selectedMed.name,
              });
              showToast({ message: t('bodymap.logged') });
            }}
          />
          <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs ${theme.textMuted}`}>
            <LegendDot color={HEAT_FILL[1]} label={t('bodymap.legendFew')} />
            <LegendDot color={HEAT_FILL[3]} label={t('bodymap.legendOften')} />
            <LegendDot color={LAST_RING} label={t('bodymap.legendLast')} />
            <LegendDot color={accentHex} dashed label={t('bodymap.legendNext')} />
          </div>
        </div>

        {lastZone && (
          <div className="px-4 pb-2">
            <div className={`flex items-center gap-2 ${theme.cardSecondary} rounded-xl px-3 py-2`}>
              <span className="text-xs flex-1 min-w-0 truncate">
                <span className={theme.textMuted}>{t('bodymap.lastInjection')}: </span>
                <span className={`font-medium ${theme.textSecondary}`}>{t(lastZone.labelKey)}</span>
                <span className={theme.textMuted}> &middot; {log[0].medName}</span>
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

        {log.length > 0 && (
          <div className="px-4 pb-4 pt-2">
            <p className={`text-xs font-medium ${theme.textMuted} mb-1.5`}>
              {t('bodymap.recentInjections')}
            </p>
            <ul className="space-y-1">
              {log.map((event, index) => {
                const zone = INJECTION_ZONES.find((z) => z.id === event.zoneId);
                return (
                  <li
                    key={`${event.date}-${index}`}
                    className={`flex items-center gap-2.5 py-2 px-2 rounded-xl ${theme.hover}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm ${theme.textSecondary} truncate`}>
                        {zone ? t(zone.labelKey) : event.zoneId} &middot; {event.medName}
                      </p>
                      <p className={`text-xs ${theme.textMuted}`}>{formatRelativeDate(event.date)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setConfirmRemove({ index, event })}
                      className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition flex-shrink-0"
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
