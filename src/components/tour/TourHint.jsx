import React from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

// Kalme, sluitbare hint die in de moduledetail verschijnt wanneer de
// rondleiding je naar die module heeft gebracht. Naast de korte lead-in-zin
// toont die nu een "zo doe je het"-lijstje met concrete acties (toevoegen /
// wijzigen / verwijderen). Geen animatie die knippert, altijd weg te klikken.
export default function TourHint({ text, title, steps, theme, onDismiss }) {
  const { t } = useTranslation();
  const stepList = Array.isArray(steps) ? steps : [];
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-blue-500/10 border border-blue-500/20 p-3.5 mb-4 slide-in">
      <div className="w-7 h-7 rounded-full bg-blue-500 text-white flex items-center justify-center shrink-0">
        <Lightbulb className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        {text && <p className={`text-sm ${theme.text} leading-relaxed`}>{text}</p>}
        {stepList.length > 0 && (
          <>
            {title && (
              <p className={`text-[11px] font-bold uppercase tracking-wide ${theme.textMuted} ${text ? 'mt-2.5' : ''} mb-1`}>
                {title}
              </p>
            )}
            <ul className={`text-sm ${theme.text} leading-relaxed space-y-1`}>
              {stepList.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="text-blue-500 shrink-0" aria-hidden="true">•</span>
                  <span>{step}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
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
