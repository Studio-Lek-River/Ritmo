import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { fetchTrelloAuthorizeUrl, saveTrelloToken } from '../sync/connections';
import { ERROR_KEYS } from './ConnectionsSection';

// Twee-staps koppel-dialoog voor Trello (S08, key+token-flow, geen OAuth):
// stap 1 opent Trello's toestemmingspagina in een nieuw tabblad (zonder
// `return_url`, dus Trello toont het token daar zelf), stap 2 laat de
// gebruiker dat token plakken. De frontend POST't het token naar de server
// (token.js), die het pas na validatie tegen Trello in de Vault zet — het
// token zelf raakt hier nooit `window.location` of de historie, alleen dit
// component-eigen state totdat de POST is voltooid.
export default function TrelloConnectDialog({ open, onClose, onConnected, theme }) {
  const { t } = useTranslation();
  const [step, setStep] = useState('link');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  if (!open) return null;

  const reset = () => {
    setStep('link');
    setToken('');
    setBusy(false);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose?.();
  };

  const handleOpenAuthorize = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await fetchTrelloAuthorizeUrl();
      if (data?.authorizeUrl) {
        window.open(data.authorizeUrl, '_blank', 'noopener,noreferrer');
        setStep('token');
      }
    } catch (err) {
      setError(err.code || 'unexpected');
    } finally {
      setBusy(false);
    }
  };

  const handleSubmitToken = async () => {
    const trimmed = token.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    try {
      const data = await saveTrelloToken(trimmed);
      onConnected?.(data?.account);
      handleClose();
    } catch (err) {
      setError(err.code || 'unexpected');
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div
        className={`${theme.card} rounded-2xl p-5 shadow-lg max-w-sm w-full slide-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className={`text-base font-semibold ${theme.textSecondary} mb-2`}>
          {t('connections.trello.title')}
        </h3>

        {step === 'link' ? (
          <>
            <p className={`text-sm ${theme.textMuted} mb-4`}>
              {t('connections.trello.linkDescription')}
            </p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className={`px-3 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} transition`}
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleOpenAuthorize}
                disabled={busy}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition disabled:opacity-60"
              >
                {t('connections.trello.openAuthorize')}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className={`text-sm ${theme.textMuted} mb-3`}>
              {t('connections.trello.tokenDescription')}
            </p>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmitToken()}
              placeholder={t('connections.trello.tokenPlaceholder')}
              autoComplete="off"
              spellCheck={false}
              className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm font-mono mb-3`}
            />
            <div className="flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleOpenAuthorize}
                disabled={busy}
                className={`text-xs font-medium ${theme.textMuted} hover:underline disabled:opacity-60`}
              >
                {t('connections.trello.reopenAuthorize')}
              </button>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className={`px-3 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} transition`}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleSubmitToken}
                  disabled={busy || !token.trim()}
                  className="px-3 py-2 rounded-lg text-sm font-medium bg-blue-500 hover:bg-blue-600 text-white transition disabled:opacity-60"
                >
                  {t('connections.connect')}
                </button>
              </div>
            </div>
          </>
        )}

        {error && (
          <p className="text-xs text-red-500 mt-3">{t(ERROR_KEYS[error] || 'connections.errors.unexpected')}</p>
        )}
      </div>
    </div>
  );
}
