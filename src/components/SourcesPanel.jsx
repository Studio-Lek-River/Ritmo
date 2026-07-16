import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { CONNECTION_PROVIDERS } from '../sync/connections';
import { DEFAULT_SOURCE_PREFS, SOURCE_ICONS, getSourcePref } from '../utils/sourcePrefs';
import { COLOR_OPTIONS, getColorClasses } from '../utils/colors';

// Koppelingen-blok onder de takenpool (S07c): per provider uit
// CONNECTION_PROVIDERS beheer je kleur + "meedoen in de planner", geen
// actielijst. Rendert de providerlijst dynamisch, dus een nieuwe provider
// (bv. na een migratie) verschijnt vanzelf zonder aanpassing hier.
export default function SourcesPanel({
  connections = [],
  sourcePrefs = DEFAULT_SOURCE_PREFS,
  setSourcePrefs,
  onOpenConnections,
  theme,
}) {
  const { t } = useTranslation();

  const updatePref = (provider, patch) => {
    setSourcePrefs(prev => ({
      ...prev,
      [provider]: { ...getSourcePref(prev, provider), ...patch },
    }));
  };

  return (
    <div className={`${theme.card} ${theme.radiusCard} ${theme.padRow} space-y-3`}>
      <div>
        <h2 className={`text-xs font-semibold uppercase tracking-wide ${theme.textMuted}`}>
          {t('planner.sources.title')}
        </h2>
        <p className={`text-xs ${theme.textMuted} mt-0.5`}>{t('planner.sources.hint')}</p>
      </div>

      <div className="space-y-2">
        {CONNECTION_PROVIDERS.map(provider => (
          <SourceRow
            key={provider}
            provider={provider}
            connection={connections.find(c => c.provider === provider)}
            pref={getSourcePref(sourcePrefs, provider)}
            onChange={(patch) => updatePref(provider, patch)}
            onOpenConnections={onOpenConnections}
            theme={theme}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}

function SourceRow({ provider, connection, pref, onChange, onOpenConnections, theme, t }) {
  const status = connection?.status || 'disconnected';
  const isConnected = status === 'connected';
  const Icon = SOURCE_ICONS[provider];
  const c = getColorClasses(isConnected ? pref.color : undefined);
  const providerLabel = t(`connections.providers.${provider}`);

  return (
    <div className={`${theme.cardSecondary} ${theme.radiusControl} ${theme.padRow} space-y-2 ${isConnected ? '' : 'opacity-60'}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          {Icon && <Icon className={`w-4 h-4 shrink-0 ${isConnected ? c.iconText : theme.textMuted}`} />}
          <div className="min-w-0">
            <p className={`text-sm font-medium ${theme.text} truncate`}>{providerLabel}</p>
            <p className={`text-xs ${theme.textMuted} truncate`}>{t(`connections.status.${status}`)}</p>
          </div>
        </div>

        {isConnected ? (
          <button
            type="button"
            onClick={() => onChange({ visible: !pref.visible })}
            aria-label={t(pref.visible ? 'planner.sources.eyeHideAria' : 'planner.sources.eyeShowAria', { provider: providerLabel })}
            className={`shrink-0 p-1.5 rounded transition ${pref.visible ? c.iconText : theme.textMuted}`}
          >
            {pref.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenConnections}
            className={`text-xs font-medium shrink-0 ${theme.textMuted} hover:underline`}
          >
            {t('planner.sources.connectButton')}
          </button>
        )}
      </div>

      {isConnected && (
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_OPTIONS.map(color => {
            const swatch = getColorClasses(color);
            return (
              <button
                key={color}
                type="button"
                onClick={() => onChange({ color })}
                aria-label={t('planner.sources.colorAria', { color: t(`colors.${color}`), provider: providerLabel })}
                className={`w-5 h-5 rounded-full transition ${swatch.bar} ${
                  pref.color === color ? 'ring-2 ring-offset-1 ring-slate-400' : ''
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
