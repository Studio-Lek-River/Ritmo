import React, { useState } from 'react';
import { UtensilsCrossed } from 'lucide-react';
import NutritionLogModal from '../components/nutrition/NutritionLogModal';
import { useTranslation } from '../i18n/useTranslation';

// Alleen de knop "Voeding loggen" plus de open/dicht-state van de modal
// (#141). Losgetrokken van CounterUI zodat (a) CounterUI vrij blijft van
// nutrition-imports en (b) een receptvariant (#142) hier zijn eigen chips
// kan ophangen zonder CounterUI opnieuw aan te raken.
export default function CounterNutritionPanel({ colorKey, theme, onLog }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const handleSubmit = (log) => {
    onLog(log);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full mb-3 inline-flex items-center justify-center gap-2 py-2 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-lg text-sm font-medium transition`}
      >
        <UtensilsCrossed className={`w-4 h-4 text-${colorKey}-500`} />
        {t('nutrition.log.title')}
      </button>
      {open && (
        <NutritionLogModal
          onSubmit={handleSubmit}
          onClose={() => setOpen(false)}
          theme={theme}
        />
      )}
    </>
  );
}
