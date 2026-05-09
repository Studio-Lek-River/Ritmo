import React, { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { genId } from '../../utils/genId';
import { CUSTOM_MODULE_TYPES } from '../../utils/onboardingPresets';

// Vrije items-lijst. `withTypePicker` toont een type-dropdown per item
// (gebruikt op de Modules-stap zodat user kan kiezen tussen checklist/choice/etc.).
export default function CustomList({ items, setItems, withTypePicker, area, theme }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [draftType, setDraftType] = useState('checklist');

  const add = () => {
    const name = draft.trim();
    if (!name) return;
    const next = withTypePicker
      ? { id: genId('cust'), name, type: draftType }
      : { id: genId('cust'), name };
    setItems(prev => [...prev, next]);
    setDraft('');
  };

  const remove = (id) => setItems(prev => prev.filter(i => i.id !== id));

  return (
    <div className="space-y-2">
      {items.length === 0 && (
        <p className={`${theme.textMuted} text-sm text-center py-4`}>
          {t('onboarding.customTab.empty')}
        </p>
      )}
      {items.map(item => (
        <div
          key={item.id}
          className={`flex items-center gap-2 p-2.5 rounded-xl ${theme.cardSecondary}`}
        >
          <span className={`flex-1 text-sm ${theme.text}`}>{item.name}</span>
          {withTypePicker && (
            <span className={`text-xs ${theme.textMuted}`}>
              {t(`modules.types.${item.type}`)}
            </span>
          )}
          <button
            onClick={() => remove(item.id)}
            className={`p-1 ${theme.hover} rounded-lg ${theme.textMuted}`}
            aria-label={t('common.delete')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}

      <div className="flex gap-2 pt-1">
        <input
          type="text"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
          placeholder={t(`onboarding.customTab.placeholder.${area}`)}
          className={`flex-1 px-3 py-2 text-sm rounded-xl ${theme.input} border ${theme.border}`}
        />
        {withTypePicker && (
          <select
            value={draftType}
            onChange={e => setDraftType(e.target.value)}
            className={`px-2 py-2 text-sm rounded-xl ${theme.input} border ${theme.border}`}
          >
            {CUSTOM_MODULE_TYPES.map(type => (
              <option key={type} value={type}>{t(`modules.types.${type}`)}</option>
            ))}
          </select>
        )}
        <button
          onClick={add}
          disabled={!draft.trim()}
          className={`p-2 rounded-xl transition ${
            draft.trim()
              ? 'bg-blue-500 hover:bg-blue-600 text-white'
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
