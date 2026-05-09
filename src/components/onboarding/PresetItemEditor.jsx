import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';

// Inline lijst van sub-items voor een aangevinkt preset.
// `labels` is een lijst strings; setLabels updatet de hele lijst.
export default function PresetItemEditor({ labels, setLabels, itemLabelKey, color, theme }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');

  const add = () => {
    const v = draft.trim();
    if (!v) return;
    setLabels(prev => [...prev, v]);
    setDraft('');
  };

  const removeAt = (idx) => setLabels(prev => prev.filter((_, i) => i !== idx));

  const itemLabel = t(itemLabelKey);

  return (
    <div
      className={`mt-2 p-3 rounded-xl ${theme.cardSecondary} border ${theme.border}`}
      onClick={(e) => e.stopPropagation()}
    >
      {labels.length === 0 ? (
        <p className={`${theme.textMuted} text-xs mb-2`}>
          {t('onboarding.presetTab.empty', { default: '' }) || ''}
        </p>
      ) : (
        <div className="space-y-1.5 mb-2">
          {labels.map((label, idx) => (
            <div
              key={`${label}-${idx}`}
              className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${theme.card}`}
            >
              <span className={`flex-1 text-sm ${theme.text}`}>{label}</span>
              <button
                onClick={() => removeAt(idx)}
                className={`p-0.5 ${theme.hover} rounded ${theme.textMuted}`}
                aria-label={t('common.delete')}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={`+ ${itemLabel}`}
          className={`flex-1 px-2.5 py-1.5 text-sm rounded-lg ${theme.input} border ${theme.border}`}
        />
        <button
          onClick={add}
          disabled={!draft.trim()}
          className={`p-1.5 rounded-lg transition ${
            draft.trim()
              ? `bg-${color}-500 hover:bg-${color}-600 text-white`
              : 'bg-slate-300 text-slate-500 cursor-not-allowed'
          }`}
          aria-label={t('common.add')}
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
