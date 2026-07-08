import React, { useMemo, useState } from 'react';
import { Pencil, Syringe, Trash2 } from 'lucide-react';
import { getColorHex } from '../utils/colors';
import {
  INJECTION_ZONES,
  suggestNextZone,
  zoneLastUse,
  injectableMeds,
} from '../utils/bodymap';
import { parseDateKey, formatRelativeDate } from '../utils/dates';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import { useToast } from '../hooks/useToast';
import { useTranslation, resolveModuleName } from '../i18n/useTranslation';

// Eenvoudige, niet-anatomische layout: torso met twee buikvlakken, twee
// bovenarmen en twee dijen. Coördinaten in een 200x320 viewBox.
const ZONE_LAYOUT = {
  abdomenL: { x: 64, y: 58, w: 34, h: 78, rx: 10 },
  abdomenR: { x: 102, y: 58, w: 34, h: 78, rx: 10 },
  armL: { x: 18, y: 58, w: 32, h: 116, rx: 14 },
  armR: { x: 150, y: 58, w: 32, h: 116, rx: 14 },
  thighL: { x: 54, y: 156, w: 40, h: 118, rx: 14 },
  thighR: { x: 106, y: 156, w: 40, h: 118, rx: 14 },
};

const NEUTRAL_STROKE = '#a1a1aa';

function daysAgo(dateKey) {
  const parsed = parseDateKey(dateKey);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  parsed.setHours(0, 0, 0, 0);
  return Math.round((startOfToday - parsed) / 86400000);
}

function BodyMapSvg({ log, accentHex, suggestedZoneId, disabled, onZoneClick, t }) {
  return (
    <svg viewBox="0 0 200 320" width="100%" height="280" role="group" aria-label={t('bodymap.title')}>
      {/* Decoratief hoofd, geen zone. */}
      <circle cx="100" cy="26" r="18" fill="none" stroke={NEUTRAL_STROKE} strokeWidth="2" opacity="0.5" aria-hidden="true" />
      {/* Decoratieve torso-omtrek onder de buikvlakken. */}
      <rect x="60" y="54" width="80" height="86" rx="16" fill="none" stroke={NEUTRAL_STROKE} strokeWidth="1.5" opacity="0.35" aria-hidden="true" />

      {INJECTION_ZONES.map((zone) => {
        const layout = ZONE_LAYOUT[zone.id];
        const isSuggested = zone.id === suggestedZoneId;
        const lastUse = zoneLastUse(log, zone.id);
        const dAgo = lastUse ? daysAgo(lastUse) : null;
        const statusLabel = dAgo != null ? t('bodymap.lastUsed', { count: dAgo }) : t('bodymap.neverUsed');
        const fill = isSuggested ? `${accentHex}1f` : 'transparent';
        const stroke = isSuggested ? accentHex : NEUTRAL_STROKE;
        const zoneLabel = t(zone.labelKey);
        const ariaLabel = `${zoneLabel}${isSuggested ? ` · ${t('bodymap.suggestedZone')}` : ''} · ${statusLabel}`;

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
            <rect
              x={layout.x}
              y={layout.y}
              width={layout.w}
              height={layout.h}
              rx={layout.rx}
              fill={fill}
              stroke={stroke}
              strokeWidth={isSuggested ? 2.5 : 1.5}
            />
            <text
              x={layout.x + layout.w / 2}
              y={layout.y + 16}
              textAnchor="middle"
              fontSize="8"
              fontWeight="600"
              fill={isSuggested ? accentHex : NEUTRAL_STROKE}
            >
              {zoneLabel}
            </text>
            <text
              x={layout.x + layout.w / 2}
              y={layout.y + 28}
              textAnchor="middle"
              fontSize="6.5"
              fill={isSuggested ? accentHex : NEUTRAL_STROKE}
            >
              {statusLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function BodymapView({
  modules,
  iconOptions,
  onLogInjection,
  onRemoveInjection,
  onCreate,
  onEditModule,
  theme,
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const bodymapModules = useMemo(
    () => modules.filter((m) => m.type === 'bodymap' && m.enabled),
    [modules]
  );
  const meds = useMemo(() => injectableMeds(modules), [modules]);

  const [selectedMedByModule, setSelectedMedByModule] = useState({});
  const [confirmRemove, setConfirmRemove] = useState(null); // { moduleId, index, event }

  if (bodymapModules.length === 0) {
    return (
      <EmptyState
        icon={Syringe}
        title={t('bodymap.emptyTitle')}
        description={t('bodymap.emptyDesc')}
        buttonLabel={onCreate ? t('bodymap.emptyButton') : null}
        onClick={onCreate}
        theme={theme}
      />
    );
  }

  const handleRemoveConfirmed = () => {
    if (!confirmRemove) return;
    const { moduleId, index, event } = confirmRemove;
    setConfirmRemove(null);
    onRemoveInjection?.(moduleId, index);
    showToast({
      message: t('bodymap.injectionRemoved'),
      actionLabel: t('common.undo'),
      onAction: () => {
        onLogInjection?.(moduleId, event);
      },
    });
  };

  return (
    <div className="slide-in space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className={`text-base font-semibold ${theme.textSecondary}`}>
          {t('bodymap.title')}
        </h2>
        {onCreate && (
          <button
            type="button"
            onClick={onCreate}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
            aria-label={t('bodymap.newModuleAria')}
          >
            <Syringe className="w-4 h-4" />
            {t('bodymap.newModuleLabel')}
          </button>
        )}
      </div>

      {bodymapModules.map((mod) => {
        const Icon = iconOptions?.[mod.icon] || Syringe;
        const log = mod.log || [];
        const selectedMedId = selectedMedByModule[mod.id] ?? meds[0]?.id ?? null;
        const selectedMed = meds.find((med) => med.id === selectedMedId) || null;
        const accentHex = getColorHex(selectedMed?.color);
        const suggestedZoneId = suggestNextZone(log);
        const canInject = meds.length > 0 && !!selectedMed;

        return (
          <div key={mod.id} className={`${theme.card} rounded-2xl shadow-sm overflow-hidden`}>
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
                      onClick={() => setSelectedMedByModule((prev) => ({ ...prev, [mod.id]: med.id }))}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                        selectedMedId === med.id ? 'text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                      }`}
                      style={selectedMedId === med.id ? { backgroundColor: getColorHex(med.color) } : undefined}
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: selectedMedId === med.id ? '#fff' : getColorHex(med.color) }}
                        aria-hidden="true"
                      />
                      {med.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="px-4 pb-2">
              <BodyMapSvg
                log={log}
                accentHex={accentHex}
                suggestedZoneId={suggestedZoneId}
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
              <div className="flex items-center gap-1.5 mt-1">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: accentHex }}
                  aria-hidden="true"
                />
                <span className={`text-xs ${theme.textMuted}`}>{t('bodymap.legendSuggested')}</span>
              </div>
            </div>

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
                          onClick={() => setConfirmRemove({ moduleId: mod.id, index, event })}
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
        );
      })}

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
    </div>
  );
}
