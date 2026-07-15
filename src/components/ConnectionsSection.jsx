// "Koppelingen"-sectie in het Account-scherm (S02). Toont Outlook, Trello en
// GitHub met een status-chip (stijl SyncStatusRow.jsx) en verbind/verbreek.
// Verbreken werkt end-to-end tegen een bestaande connection-rij; verbinden
// roept de stub aan tot de echte OAuth-handshake per provider landt (S03-S05).
// Alleen gerenderd door de aanroeper wanneer er een account is en sync aan
// staat (opt-in, principe 2).
import { Check, CloudOff, AlertTriangle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import useConnections from '../hooks/useConnections';
import { CONNECTION_PROVIDERS } from '../sync/connections';

const STATUS_ICON = {
  connected: { Icon: Check, color: 'text-teal-500' },
  disconnected: { Icon: CloudOff, color: 'text-slate-400' },
  error: { Icon: AlertTriangle, color: 'text-red-500' },
};

// Expliciete allow-list: backend-`code` -> i18n-key (zelfde patroon als
// FeedbackForm.jsx). Bewust geen blinde `t('connections.errors.' + code)`.
const ERROR_KEYS = {
  unauthenticated: 'connections.errors.unauthenticated',
  not_found: 'connections.errors.notFound',
  disconnect_failed: 'connections.errors.disconnectFailed',
  not_implemented: 'connections.errors.notImplemented',
  server_config: 'connections.errors.serverConfig',
  invalid_request: 'connections.errors.unexpected',
  unexpected: 'connections.errors.unexpected',
};

export default function ConnectionsSection({ theme, accountId }) {
  const { t } = useTranslation();
  const { connections, busyId, error, disconnect, connect } = useConnections(accountId);

  return (
    <div className="space-y-3">
      <h3 className={`font-semibold ${theme.textSecondary}`}>{t('connections.title')}</h3>
      <p className={`text-xs ${theme.textMuted}`}>{t('connections.intro')}</p>

      <div className="space-y-2">
        {CONNECTION_PROVIDERS.map((provider) => {
          const connection = connections.find((c) => c.provider === provider);
          const status = connection?.status || 'disconnected';
          const { Icon, color } = STATUS_ICON[status] || STATUS_ICON.disconnected;
          const busy = busyId === provider || (connection && busyId === connection.id);

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

              {connection ? (
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
                  onClick={() => connect(provider)}
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

      {error && (
        <p className="text-xs text-red-500">{t(ERROR_KEYS[error] || 'connections.errors.unexpected')}</p>
      )}
    </div>
  );
}
