import React from 'react';
import { ChevronRight } from 'lucide-react';

export default function HelpItemRow({ icon: Icon, title, description, onClick, theme }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 ${theme.cardSecondary} ${theme.hover} rounded-lg text-left transition`}
    >
      <div className={`p-2 rounded-lg bg-blue-50 text-blue-500 flex-shrink-0`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <div className={`text-sm font-medium ${theme.text}`}>{title}</div>
        {description && (
          <div className={`text-xs ${theme.textMuted} mt-0.5`}>{description}</div>
        )}
      </div>
      <ChevronRight className={`w-4 h-4 ${theme.textMuted} flex-shrink-0`} />
    </button>
  );
}
