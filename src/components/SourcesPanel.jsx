import React from 'react';
import { Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { CONNECTION_PROVIDERS } from '../sync/connections';
import { DEFAULT_SOURCE_PREFS, SOURCE_ICONS, getSourcePref } from '../utils/sourcePrefs';
import { COLOR_OPTIONS, getColorClasses } from '../utils/colors';
import { getLocale } from '../utils/dates';

// Koppelingen-blok onder de takenpool (S07c/S07d): per provider uit
// CONNECTION_PROVIDERS beheer je kleur + "meedoen in de planner". Een
// provider kan daarnaast een actieregel krijgen (vernieuw-knop + "bijgewerkt
// om") via de generieke `sourceActions`-map (provider -> { onRefresh,
// loading, shown, lastSyncedAt, panel }); een provider zonder entry (GitHub,
// nog niet echt gekoppeld) toont geen actieregel. `panel` (S08, optioneel,
// ReactNode) rendert onder die actieregel — de Trello-rij gebruikt dit voor
// de bord-kiezer (TrelloBoardPicker). Labels zijn provider-agnostisch
// (`planner.sources.*` met `{provider}`-interpolatie): geen provider-naam
// hardcoded in de UI-strings. Rendert de providerlijst dynamisch, dus een
// nieuwe provider verschijnt vanzelf zonder aanpassing hier — geen
// hardcoded providerlijst.
export default function SourcesPanel({
  connections = [],
  sourcePrefs = DEFAULT_SOURCE_PREFS,
  setSourcePrefs,
  sourceActions = {},
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
            // Sinds #120 kan een provider (Trello) meer dan één rij hebben:
            // een verbonden rij gaat altijd vóór, anders zou een tweede,
            // nog niet verbonden rij deze regel onterecht als losgekoppeld
            // tonen terwijl er al een werkende koppeling is.
            connection={
              connections.find(c => c.provider === provider && c.status === 'connected')
              || connections.find(c => c.provider === provider)
            }
            pref={getSourcePref(sourcePrefs, provider)}
            actions={sourceActions[provider]}
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

// "HH:MM" in de huidige locale, voor de "bijgewerkt om"-regel.
function formatSyncTime(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleTimeString(getLocale(), { hour: '2-digit', minute: '2-digit' });
}

function SourceRow({ provider, connection, pref, actions, onChange, onOpenConnections, theme, t }) {
  const status = connection?.status || 'disconnected';
  const isConnected = status === 'connected';
  const Icon = SOURCE_ICONS[provider];
  const c = getColorClasses(isConnected ? pref.color : undefined);
  const providerLabel = t(`connections.providers.${provider}`);
  const syncedTime = actions?.lastSyncedAt ? formatSyncTime(actions.lastSyncedAt) : null;

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

      {isConnected && actions && (
        <div className={`flex items-center justify-between gap-2 pt-2 border-t ${theme.border}`}>
          <span className={`text-xs ${theme.textMuted}`}>
            {syncedTime
              ? t('planner.sources.lastSynced', { time: syncedTime })
              : t('planner.sources.neverSynced')}
          </span>
          {actions.shown ? (
            // Vernieuwen is een terugkerende actie naast de "bijgewerkt om"-regel:
            // als tekstknop liep hij uit de rij, dus icoon + tooltip (`title` +
            // `aria-label`, hetzelfde patroon als elders — geen tooltip-component).
            <button
              type="button"
              onClick={actions.onRefresh}
              disabled={actions.loading}
              aria-label={t(actions.loading ? 'planner.sources.loading' : 'planner.sources.refresh', { provider: providerLabel })}
              title={t(actions.loading ? 'planner.sources.loading' : 'planner.sources.refresh', { provider: providerLabel })}
              className={`shrink-0 p-1.5 rounded transition ${theme.textMuted} ${theme.hover} disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {actions.loading
                ? <Loader2 className="w-4 h-4 animate-spin" />
                : <RefreshCw className="w-4 h-4" />}
            </button>
          ) : (
            // Importeren blijft een tekstknop: een eenmalige eerste actie moet
            // vindbaar zijn (principe 2), een naamloos icoon is dat niet.
            <button
              type="button"
              onClick={actions.onRefresh}
              disabled={actions.loading}
              aria-label={actions.loading ? t('planner.sources.loading', { provider: providerLabel }) : undefined}
              className={`flex items-center gap-1.5 text-xs font-medium shrink-0 ${theme.textMuted} hover:underline disabled:opacity-60 disabled:cursor-not-allowed`}
            >
              {actions.loading && <Loader2 className="w-3 h-3 animate-spin" />}
              {t('planner.sources.import', { provider: providerLabel })}
            </button>
          )}
        </div>
      )}

      {isConnected && actions?.panel}
    </div>
  );
}
