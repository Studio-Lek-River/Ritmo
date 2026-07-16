import { useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useToast } from '../hooks/useToast';
import { CONNECTION_PROVIDERS } from '../sync/connections';
import { ERROR_KEYS } from './ConnectionsSection';

// Vangt de terugkeer van een OAuth-redirect op, voor elke provider met een
// echte OAuth-flow (S07: Outlook, S09: GitHub; Trello heeft geen redirect,
// zie TrelloConnectDialog — de key+token-flow plakt het token direct in
// Ritmo). callback.js van elke provider stuurt de browser terug naar
// `/?tab=account&<provider>=connected|error[&reason=...]`; dit component
// loopt over CONNECTION_PROVIDERS en leest `params.get(provider)` in plaats
// van een provider hardcoded te checken (S09, was OutlookOAuthReturn.jsx),
// zodat een volgende OAuth-provider hier vanzelf wordt opgevangen. Het
// redirect-contract zelf verandert niet: de Outlook-tak gedraagt zich exact
// als voorheen.
//
// Los component (i.p.v. inline in App.jsx) omdat useToast een
// ToastProvider-context nodig heeft die pas bestaat in de boom die App.jsx
// zelf rendert. Toont één keer een toast bij mount, roept `onConnected` aan
// (refresh van de connections-lijst — geeft de verse rijen terug, zodat de
// GitHub-toast het `label` (de login) kan tonen zonder dat er ooit een
// identifier in de redirect-URL zelf heeft gestaan, zie AC2) en ruimt de
// query-param op zodat een pagina-refresh niet nogmaals meldt.
export default function OAuthReturn({ onConnected }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const provider = CONNECTION_PROVIDERS.find((p) => params.get(p));
    if (!provider) return;

    const value = params.get(provider);

    if (value === 'connected') {
      if (provider === 'github') {
        Promise.resolve(onConnected?.()).then((rows) => {
          const connection = (rows || []).find((c) => c.provider === 'github');
          showToast({ message: t('connections.toast.githubConnected', { login: connection?.label || '' }) });
        });
      } else {
        showToast({ message: t(`connections.toast.${provider}Connected`) });
        onConnected?.();
      }
    } else if (value === 'error') {
      const reason = params.get('reason');
      showToast({ message: t(ERROR_KEYS[reason] || 'connections.errors.unexpected') });
    }

    params.delete(provider);
    params.delete('reason');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
