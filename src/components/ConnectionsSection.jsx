// "Koppelingen"-sectie in het Account-scherm (S02). Toont Outlook, Trello en
// GitHub met een status-chip (stijl SyncStatusRow.jsx) en verbind/verbreek.
// Verbreken toont zich alleen bij een verbonden koppeling (status
// 'connected'), niet bij het enkel bestaan van een rij (S07b, issue #110).
// `handleConnect` is een switch per provider: Outlook start zijn eigen
// OAuth-redirect (S07), Trello opent een twee-staps dialoog (S08,
// TrelloConnectDialog, key+token-flow). GitHub heeft in deze opruiming nog
// geen eigen tak (die landt in de S09-feat-commit); de dode connect-stub die
// hij tot dan toe gebruikte is hier al weg.
// Alleen gerenderd door de aanroeper wanneer er een account is en sync aan
// staat (opt-in, principe 2).
import { useState } from 'react';
import { Check, CloudOff, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { useToast } from '../hooks/useToast';
import useConnections from '../hooks/useConnections';
import { CONNECTION_PROVIDERS, startOutlookConnect } from '../sync/connections';
import TrelloConnectDialog from './TrelloConnectDialog';

const STATUS_ICON = {
  connected: { Icon: Check, color: 'text-teal-500' },
  disconnected: { Icon: CloudOff, color: 'text-slate-400' },
  error: { Icon: AlertTriangle, color: 'text-red-500' },
};

// Expliciete allow-list: backend-`code` -> i18n-key (zelfde patroon als
// FeedbackForm.jsx). Bewust geen blinde `t('connections.errors.' + code)`.
// Named export zodat OutlookOAuthReturn.jsx (de terugkeer van de
// OAuth-redirect, S07) dezelfde mapping hergebruikt in plaats van een tweede
// kopie te onderhouden.
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
  // S08: Trello key+token-flow-codes van api/connections/trello/*.js.
  trello_auth: 'connections.errors.trelloAuth',
  trello_rate_limit: 'connections.errors.trelloRateLimit',
  trello_error: 'connections.errors.trelloError',
  invalid_token_format: 'connections.errors.invalidTokenFormat',
  rate_limited: 'connections.errors.rateLimited',
};

export default function ConnectionsSection({ theme, accountId }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { connections, busyId, error, disconnect, refresh } = useConnections(accountId);
  // Outlook start zijn eigen OAuth-redirect, Trello een eigen dialoog: beide
  // hebben dus provider-agnostische busy/error-state buiten de hook om. Een
  // provider zonder eigen `case` in `handleConnect` doet simpelweg niets bij
  // een klik (`busyId` blijft voorbehouden aan `disconnect` hierboven).
  const [connectBusy, setConnectBusy] = useState(false);
  const [connectError, setConnectError] = useState(null);
  const [showTrelloDialog, setShowTrelloDialog] = useState(false);

  const handleConnect = async (provider) => {
    switch (provider) {
      case 'outlook':
        setConnectBusy(true);
        setConnectError(null);
        try {
          await startOutlookConnect();
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
          const connection = connections.find((c) => c.provider === provider);
          const status = connection?.status || 'disconnected';
          const isConnected = status === 'connected';
          const { Icon, color } = STATUS_ICON[status] || STATUS_ICON.disconnected;
          const busy = provider === 'outlook'
            ? connectBusy
            : !!(connection && busyId === connection.id);

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
                  onClick={() => disconnect(connection.id)}
                  disabled={busy}
                  className="text-xs font-medium shrink-0 text-red-500 hover:underline disabled:opacity-50"
                >
                  {t('connections.disconnect')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleConnect(provider)}
                  disabled={busy}
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

      <TrelloConnectDialog
        open={showTrelloDialog}
        onClose={() => setShowTrelloDialog(false)}
        onConnected={handleTrelloConnected}
        theme={theme}
      />
    </div>
  );
}
