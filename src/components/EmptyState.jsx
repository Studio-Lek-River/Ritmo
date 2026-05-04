import React from 'react';
import { Plus } from 'lucide-react';

export default function EmptyState({ icon: Icon, title, description, buttonLabel, onClick, theme }) {
  return (
    <div className={`${theme.card} rounded-2xl p-8 shadow-sm text-center slide-in`}>
      <Icon className={`w-12 h-12 mx-auto mb-3 ${theme.textMuted}`} />
      <h3 className={`font-semibold ${theme.textSecondary} mb-2`}>{title}</h3>
      <p className={`text-sm ${theme.textMuted} mb-5 max-w-xs mx-auto`}>{description}</p>
      {buttonLabel && onClick && (
        <button
          onClick={onClick}
          className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg px-4 py-2 font-medium text-sm transition"
        >
          <Plus className="w-4 h-4" />
          {buttonLabel}
        </button>
      )}
    </div>
  );
}
