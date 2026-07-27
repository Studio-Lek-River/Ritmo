// "Koppelingen"-sectie in het Account-scherm (S02). Toont Outlook, Trello en
// GitHub met een status-chip (stijl SyncStatusRow.jsx) en verbind/verbreek.
// Verbreken toont zich alleen bij een verbonden koppeling (status
// 'connected'), niet bij het enkel bestaan van een rij (S07b, issue #110).
// `handleConnect` is een switch per provider: Outlook en GitHub starten elk
// hun eigen OAuth-redirect (S07 resp. S09, zelfde vorm), Trello opent een
// twee-staps dialoog (S08, TrelloConnectDialog, key+token-flow).
// Alleen gerenderd door de aanroeper wanneer er een account is en sync aan
// staat (opt-in, principe 2).
//
// #120: een provider uit `MULTI_ACCOUNT_PROVIDERS` (nu alleen Trello) toont
// niet één rij maar één rij per verbonden account (label = de Trello-
// gebruikersnaam) met elk hun eigen "Verbreken", plus een altijd zichtbare
// "Account toevoegen"-knop — ook wanneer er al een account gekoppeld is. De
// andere providers (Outlook, GitHub) renderen exact zoals vandaag.
import { useState } from 'react';
import { Check, CloudOff, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useToast } from '../hooks/useToast';
import useConnections from '../hooks/useConnections';
import {
  CONNECTION_PROVIDERS,
  MULTI_ACCOUNT_PROVIDERS,
  startOutlookConnect,
  startGithubConnect,
  scanOutlookRitmoBlocks,
} from '../sync/connections';
import { runCalendarCleanup } from '../utils/calendarCleanup';
import TrelloConnectDialog from './TrelloConnectDialog';
import ConfirmDialog from './ConfirmDialog';

const STATUS_ICON = {
  connected: { Icon: Check, color: 'text-teal-500' },
  disconnected: { Icon: CloudOff, color: 'text-slate-400' },
  error: { Icon: AlertTriangle, color: 'text-red-500' },
};

// Expliciete allow-list: backend-`code` -> i18n-key (zelfde patroon als
// FeedbackForm.jsx). Bewust geen blinde `t('connections.errors.' + code)`.
// Named export zodat OAuthReturn.jsx (de terugkeer van een OAuth-redirect,
// S07/S09) dezelfde mapping hergebruikt in plaats van een tweede kopie te
// onderhouden.
export const ERROR_KEYS = {
  unauthenticated: 'connections.errors.unauthenticated',
  not_found: 'connections.errors.notFound',
  disconnect_failed: 'connections.errors.disconnectFailed',
  server_config: 'connections.errors.serverConfig',
  invalid_request: 'connections.errors.unexpected',
  unexpected: 'connections.errors.unexpected',
  // S07: OAuth-specifieke codes van api/connections/outlook/*.js.
  invalid_state: 'connections.errors.invalidState',
  ms_auth: 'connections.errors.msAuth',
  ms_rate_limit: 'connections.errors.msRateLimit',
  ms_error: 'connections.errors.msError',
  token_refresh_failed: 'connections.errors.tokenRefreshFailed',
  not_connected: 'connections.errors.notConnected',
  // S12: "Zet in agenda" (api/connections/outlook/write.js).
  scope_upgrade_required: 'connections.errors.scopeUpgradeRequired',
  tag_unsupported: 'connections.errors.tagUnsupported',
  // S08: Trello key+token-flow-codes van api/connections/trello/*.js.
  trello_auth: 'connections.errors.trelloAuth',
  trello_rate_limit: 'connections.errors.trelloRateLimit',
  trello_error: 'connections.errors.trelloError',
  invalid_token_format: 'connections.errors.invalidTokenFormat',
  rate_limited: 'connections.errors.rateLimited',
  // S09: GitHub-OAuth-codes van api/connections/github/*.js.
  github_auth: 'connections.errors.githubAuth',
  github_rate_limit: 'connections.errors.githubRateLimit',
  github_not_found: 'connections.errors.githubNotFound',
  github_error: 'connections.errors.githubError',
};

export default function ConnectionsSection({ theme, accountId, onCalendarCleaned }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { connections, busyId, error, disconnect, refresh } = useConnections(accountId);
  // Outlook en GitHub delen hun OAuth-redirect-busy/error-state (beide
  // navigeren de hele pagina weg bij succes), Trello heeft een eigen dialoog:
  // alle drie dus buiten de hook om (`busyId` blijft voorbehouden aan
  // `disconnect` hierboven).
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [showTrelloDialog, setShowTrelloDialog] = useState(false);

  // #160: vraagt bij het verbreken van Outlook eerst om de Ritmo-blokken op
  // te ruimen — de enige koppeling die iets naar buiten schrijft (Poort-0 1).
  // `disconnect` zelf (useConnections) blijft de laatste stap van deze flow,
  // niet de flow zelf: de orkestratie zit hier.
  // cleanupStage: null | 'scanning' | 'cleaning' — voor het voortgangslabel en
  // de disabled/aria-busy-staat van de Verbreken-knop tijdens beide stappen.
  const [cleanupStage, setCleanupStage] = useState(null);
  // pendingDisconnect: { connectionId, count, atLeast } (blokken gevonden) of
  // { connectionId, unknown: true } (scan mislukt, Poort-0 4) — bepaalt welke
  // variant van de dialoog open staat. null = dialoog dicht.
  const [pendingDisconnect, setPendingDisconnect] = useState(null);

  function reportCleanupError(err) {
    // Zelfde ERROR_KEYS-mapping als de opruimknop in Instellingen
    // (CalendarCleanupSection), maar bewust zonder de "opnieuw koppelen"-actie
    // bij scope_upgrade_required: die actie is tegenstrijdig in een
    // verbreek-flow.
    const key = ERROR_KEYS[err?.code] || 'connections.errors.unexpected';
    showToast({ message: `${t('settings.calendarCleanupFailed')} ${t(key)}` });
  }

  async function handleDisconnectClick(provider, connection) {
    if (provider !== 'outlook') {
      // Trello en GitHub schrijven niets naar buiten (Poort-0 1): verbreken
      // blijft exact zoals vandaag, geen scan, geen dialoog (AC8).
      disconnect(connection.id);
      return;
    }
    setCleanupStage('scanning');
    try {
      const result = await scanOutlookRitmoBlocks();
      setCleanupStage(null);
      if (!result?.count) {
        // Geen blokken → geen dialoog (Poort-0 2, AC6): direct verbreken,
        // precies zoals vóór deze slice.
        disconnect(connection.id);
        return;
      }
      setPendingDisconnect({ connectionId: connection.id, count: result.count, atLeast: !!result.atLeast });
    } catch {
      // Scan mislukt → geen opruim-aanbod, wel verbreken (Poort-0 4, AC7):
      // de "we konden het niet nagaan"-variant van de dialoog.
      setCleanupStage(null);
      setPendingDisconnect({ connectionId: connection.id, unknown: true });
    }
  }

  function handleCancelDisconnect() {
    setPendingDisconnect(null);
  }

  function handleDisconnectOnly() {
    // "Alleen verbreken" (blokken gevonden) of "Toch verbreken" (scan
    // mislukt) — verbreekt zonder één Graph-delete (AC2).
    const target = pendingDisconnect;
    setPendingDisconnect(null);
    if (target?.connectionId) disconnect(target.connectionId);
  }

  async function handleConfirmCleanup() {
    const target = pendingDisconnect;
    setPendingDisconnect(null);
    setCleanupStage('cleaning');
    try {
      const result = await runCalendarCleanup();
      setCleanupStage(null);
      if (result.deleted > 0) onCalendarCleaned?.();
      if (result.failed === 0 && !result.capped) {
        // Schone ronde: alles opgeruimd, nu pas verbreken (AC4).
        await disconnect(target.connectionId);
        showToast({ message: t('connections.toast.outlookDisconnectedCleaned') });
      } else if (result.failed > 0) {
        // Onvolledig opruimen → koppeling blijft staan (Poort-0 3, AC5).
        showToast({ message: t('settings.calendarCleanupPartial', { deleted: result.deleted, failed: result.failed }) });
      } else if (result.capped) {
        showToast({ message: t('settings.calendarCleanupMore') });
      }
    } catch (err) {
      // Mislukte opruiming → koppeling blijft staan (Poort-0 3, AC5); wat er
      // al is opgeruimd telt wel mee voor de agendaweergave.
      setCleanupStage(null);
      if (err.deleted > 0) onCalendarCleaned?.();
      reportCleanupError(err);
    }
  }

  const handleConnect = async (provider) => {
    switch (provider) {
      case 'outlook':
      case 'github':
        setConnectBusy(true);
        setConnectError(null);
        try {
          await (provider === 'outlook' ? startOutlookConnect() : startGithubConnect());
          // Bij succes navigeert de browser weg (window.location.assign); er
          // volgt dan geen render meer die connectBusy hoeft te resetten.
        } catch (err) {
          setConnectError(err.code || 'unexpected');
          setConnectBusy(false);
        }
        return;
      case 'trello':
        setConnectError(null);
        setShowTrelloDialog(true);
        return;
      default:
        return;
    }
  };

  const handleTrelloConnected = (account) => {
    refresh();
    showToast({ message: t('connections.toast.trelloConnected', { username: account?.username || '' }) });
  };

  const displayError = connectError || error;

  return (
    <div className="space-y-3">
      <h3 className={`font-semibold ${theme.textSecondary}`}>{t('connections.title')}</h3>
      <p className={`text-xs ${theme.textMuted}`}>{t('connections.intro')}</p>

      <div className="space-y-2">
        {CONNECTION_PROVIDERS.map((provider) => {
          if (MULTI_ACCOUNT_PROVIDERS.includes(provider)) {
            const providerConnections = connections.filter((c) => c.provider === provider && c.status === 'connected');
            return (
              <div key={provider} className="space-y-2">
                {providerConnections.map((connection) => (
                  <div
                    key={connection.id}
                    className={`${theme.cardSecondary} rounded-2xl p-3 flex items-center justify-between gap-3`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Check size={18} className="text-teal-500 shrink-0" />
                      <div className="min-w-0">
                        <p className={`text-sm font-medium ${theme.text} truncate`}>
                          {connection.label || t(`connections.providers.${provider}`)}
                        </p>
                        <p className={`text-xs ${theme.textMuted} truncate`}>
                          {t('connections.status.connected')}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => disconnect(connection.id)}
                      disabled={busyId === connection.id}
                      className="text-xs font-medium shrink-0 text-red-500 hover:underline disabled:opacity-50"
                    >
                      {t('connections.disconnect')}
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => handleConnect(provider)}
                  className={`w-full ${theme.cardSecondary} rounded-2xl p-3 text-xs font-medium ${theme.textMuted} hover:underline`}
                >
                  {t('connections.addAccount')}
                </button>
              </div>
            );
          }

          const connection = connections.find((c) => c.provider === provider);
          const status = connection?.status || 'disconnected';
          const isConnected = status === 'connected';
          const { Icon, color } = STATUS_ICON[status] || STATUS_ICON.disconnected;
          const connectingBusy = (provider === 'outlook' || provider === 'github')
            ? connectBusy
            : !!(connection && busyId === connection.id);
          // #160: bij Outlook telt ook cleanupStage (scannen/opruimen vóór
          // verbreken) en de eigenlijke disconnect()-call mee als "bezig" —
          // Trello/GitHub blijven exact zoals voorheen (AC8).
          const disconnectingBusy = provider === 'outlook'
            ? connectBusy || cleanupStage !== null || !!(connection && busyId === connection.id)
            : connectingBusy;
          const disconnectLabel = provider === 'outlook' && cleanupStage
            ? t(`connections.disconnectCleanup.${cleanupStage === 'scanning' ? 'scanning' : 'busy'}`)
            : t('connections.disconnect');

          return (
            <div
              key={provider}
              className={`${theme.cardSecondary} rounded-2xl p-3 flex items-center justify-between gap-3`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <Icon size={18} className={`${color} shrink-0`} />
                <div className="min-w-0">
                  <p className={`text-sm font-medium ${theme.text} truncate`}>
                    {t(`connections.providers.${provider}`)}
                  </p>
                  <p className={`text-xs ${theme.textMuted} truncate`}>
                    {t(`connections.status.${status}`)}
                  </p>
                </div>
              </div>

              {connection && isConnected ? (
                <button
                  type="button"
                  onClick={() => handleDisconnectClick(provider, connection)}
                  disabled={disconnectingBusy}
                  aria-busy={disconnectingBusy}
                  className="text-xs font-medium shrink-0 text-red-500 hover:underline disabled:opacity-50"
                >
                  {disconnectLabel}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnect(provider)}
                  disabled={connectingBusy}
                  className={`text-xs font-medium shrink-0 ${theme.textMuted} hover:underline disabled:opacity-50`}
                >
                  {t('connections.connect')}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {displayError && (
        <p className="text-xs text-red-500">{t(ERROR_KEYS[displayError] || 'connections.errors.unexpected')}</p>
      )}

      <ConfirmDialog
        open={!!pendingDisconnect}
        variant="danger"
        title={t('connections.disconnectCleanup.title')}
        description={
          pendingDisconnect?.unknown
            ? t('connections.disconnectCleanup.bodyUnknown')
            : t(
                pendingDisconnect?.atLeast
                  ? 'connections.disconnectCleanup.bodyAtLeast'
                  : 'connections.disconnectCleanup.body',
                { count: pendingDisconnect?.count ?? 0 }
              )
        }
        confirmLabel={
          pendingDisconnect?.unknown
            ? t('connections.disconnectCleanup.confirmAnyway')
            : t('connections.disconnectCleanup.confirmCleanup')
        }
        secondaryLabel={pendingDisconnect?.unknown ? undefined : t('connections.disconnectCleanup.confirmOnly')}
        onConfirm={pendingDisconnect?.unknown ? handleDisconnectOnly : handleConfirmCleanup}
        onSecondary={pendingDisconnect?.unknown ? undefined : handleDisconnectOnly}
        onCancel={handleCancelDisconnect}
        theme={theme}
      />

      <TrelloConnectDialog
        open={showTrelloDialog}
        onClose={() => setShowTrelloDialog(false)}
        onConnected={handleTrelloConnected}
        theme={theme}
      />
    </div>
  );
}
