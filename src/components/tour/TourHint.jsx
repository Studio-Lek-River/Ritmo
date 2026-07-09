import React from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

// Kalme, sluitbare hint die in de moduledetail verschijnt wanneer de
// rondleiding je naar die module heeft gebracht. Vertelt in één korte zin waar
// je iets toevoegt. Geen animatie die knippert, altijd weg te klikken.
export default function TourHint({ text, theme, onDismiss }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3.5 mb-4 slide-in">
      <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
        <Lightbulb className="w-4 h-4" />
      </div>
      <p className={`flex-1 text-sm ${theme.text} leading-relaxed`}>{text}</p>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`w-7 h-7 rounded-full ${theme.hover} ${theme.textMuted} flex items-center justify-center shrink-0`}
          aria-label={t('tour.hintClose')}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
