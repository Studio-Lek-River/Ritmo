import React from 'react';
import { Eye } from 'lucide-react';

export default function ReadOnlyBanner({ t }) {
  return (
    <div className={`flex items-center gap-2 ${t.cardSecondary} rounded-md px-3 py-2 text-xs ${t.textMuted} mb-4`}>
      <Eye className="w-3.5 h-3.5 shrink-0" />
      <span>Alleen-lezen. Bewerken kan tot één dag terug.</span>
    </div>
  );
}
