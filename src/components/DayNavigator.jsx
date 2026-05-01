import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { isToday, isFuture, addDays } from '../utils/dates';

export default function DayNavigator({ currentDate, onChange, title, subtitle, t }) {
  const atToday = isToday(currentDate);

  const handlePrev = () => onChange(addDays(currentDate, -1));
  const handleNext = () => {
    const next = addDays(currentDate, 1);
    if (!isFuture(next)) onChange(next);
  };
  const handleBackToToday = () => onChange(new Date());

  return (
    <div className="mb-3">
      <div className={`flex items-center justify-between gap-2 ${t.card} rounded-2xl p-2 shadow-sm`}>
        <button
          onClick={handlePrev}
          aria-label="Vorige dag"
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.hover} ${t.textSecondary} transition`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <div className={`text-base font-semibold ${t.textSecondary}`}>{title}</div>
          {subtitle && <div className={`text-xs ${t.textMuted}`}>{subtitle}</div>}
        </div>
        <button
          onClick={handleNext}
          disabled={atToday}
          aria-label="Volgende dag"
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.hover} ${t.textSecondary} transition disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
      {!atToday && (
        <button
          onClick={handleBackToToday}
          className={`block mx-auto mt-2 text-xs px-3 py-1.5 rounded-md ${t.cardSecondary} ${t.textMuted} ${t.hover} transition`}
        >
          Terug naar vandaag
        </button>
      )}
    </div>
  );
}
