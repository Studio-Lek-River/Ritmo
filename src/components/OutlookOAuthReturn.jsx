import { useEffect, useRef } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { useToast } from '../hooks/useToast';
import { ERROR_KEYS } from './ConnectionsSection';

// Vangt de terugkeer van de Outlook-OAuth-redirect op (S07): callback.js stuurt
// de browser terug naar `/?tab=account&outlook=connected|error[&reason=...]`.
// Los component (i.p.v. inline in App.jsx) omdat `useToast` een
// ToastProvider-context nodig heeft die pas bestaat in de boom die App.jsx
// zelf rendert — App.jsx's eigen functie-body zit daar niet onder (het is
// juist de component die de Provider rendert). Toont één keer een toast bij
// mount, roept `onConnected` aan (refresh van de connections-lijst) en ruimt
// de query-param op zodat een pagina-refresh niet nogmaals meldt.
export default function OutlookOAuthReturn({ onConnected }) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) return;
    handledRef.current = true;

    const params = new URLSearchParams(window.location.search);
    const outlookParam = params.get('outlook');
    if (!outlookParam) return;

    if (outlookParam === 'connected') {
      showToast({ message: t('connections.toast.outlookConnected') });
      if (typeof onConnected === 'function') onConnected();
    } else if (outlookParam === 'error') {
      const reason = params.get('reason');
      showToast({ message: t(ERROR_KEYS[reason] || 'connections.errors.unexpected') });
    }

    params.delete('outlook');
    params.delete('reason');
    const query = params.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', nextUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
