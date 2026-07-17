import { useCallback } from 'react';
import { useToast } from './useToast';
import { useTranslation } from '../i18n/useTranslation';

// Dunne wrapper om useToast().showToast voor de undo-toast. Legt de
// terugkerende bedrading (actionLabel + duur) op één plek vast zodat V02
// (de toast-wachtrij) straks één seam heeft om te fixen in plaats van
// twintig aanroepplaatsen. De caller geeft alleen een bericht en een
// herstel-callback mee; de snapshot blijft in de closure van de caller.
export function useUndoToast() {
  const { showToast } = useToast();
  const { t } = useTranslation();

  return useCallback((message, onAction) => {
    showToast({
      message,
      actionLabel: t('common.undo'),
      onAction,
    });
  }, [showToast, t]);
}
