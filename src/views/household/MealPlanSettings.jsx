import React, { useState } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import ConfirmDialog from '../../components/ConfirmDialog';
import { CURRENT_USER_ID, generateMemberId } from '../../utils/mealplan';

// Beschikbare kleuren voor huisgenoten
export const COLOR_OPTIONS = ['amber', 'rose', 'blue', 'emerald', 'violet', 'sky', 'orange', 'pink'];

const COLOR_BG = {
  amber:   'bg-amber-500',
  rose:    'bg-rose-500',
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  violet:  'bg-violet-500',
  sky:     'bg-sky-500',
  orange:  'bg-orange-500',
  pink:    'bg-pink-500',
};

export function getMemberBg(color) {
  return COLOR_BG[color] ?? 'bg-slate-400';
}

export default function MealPlanSettings({ theme, config, setConfig, members, setMembers, onClose }) {
  const { t } = useTranslation();

  const [draftConfig, setDraftConfig] = useState({ ...config });
  const [draftMembers, setDraftMembers] = useState(members.map(m => ({ ...m })));
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('rose');
  const [pendingRemove, setPendingRemove] = useState(null);

  function save() {
    setConfig(draftConfig);
    setMembers(draftMembers);
    onClose();
  }

  function updateSelfName(name) {
    setDraftMembers(prev => prev.map(m => m.id === CURRENT_USER_ID ? { ...m, name } : m));
  }

  function addMember() {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setDraftMembers(prev => [...prev, {
      id: generateMemberId(),
      name: trimmed,
      role: 'member',
      color: newColor,
    }]);
    setNewName('');
    setNewColor(COLOR_OPTIONS[(draftMembers.length) % COLOR_OPTIONS.length]);
  }

  function removeMember(id) {
    setDraftMembers(prev => prev.filter(m => m.id !== id));
    setPendingRemove(null);
  }

  const selfMember = draftMembers.find(m => m.id === CURRENT_USER_ID);
  const otherMembers = draftMembers.filter(m => m.id !== CURRENT_USER_ID);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className={`${theme.card} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl`}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${theme.border}`}>
          <h3 className={`font-semibold ${theme.text}`}>{t('household.mealPlan.settings.title')}</h3>
          <button onClick={onClose} className={`p-1 rounded ${theme.hover}`} aria-label={t('common.close')}>
            <X className={`w-5 h-5 ${theme.textMuted}`} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-5">
          {/* Huishouden-naam */}
          <div className="space-y-1.5">
            <label className={`text-sm font-medium ${theme.textSecondary}`}>
              {t('household.mealPlan.settings.householdNameLabel')}
            </label>
            <input
              type="text"
              value={draftConfig.householdName}
              onChange={e => setDraftConfig(c => ({ ...c, householdName: e.target.value }))}
              placeholder={t('household.mealPlan.settings.householdNamePlaceholder')}
              className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} border ${theme.border} outline-none`}
            />
          </div>

          {/* Jouw naam */}
          {selfMember && (
            <div className="space-y-1.5">
              <label className={`text-sm font-medium ${theme.textSecondary}`}>
                {t('household.mealPlan.settings.youSuffix')}
              </label>
              <input
                type="text"
                value={selfMember.name}
                onChange={e => updateSelfName(e.target.value)}
                placeholder={t('household.mealPlan.settings.yourNamePlaceholder')}
                className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} border ${theme.border} outline-none`}
              />
            </div>
          )}

          {/* Default-status */}
          <div className="space-y-1.5">
            <label className={`text-sm font-medium ${theme.textSecondary}`}>
              {t('household.mealPlan.settings.defaultStatusLabel')}
            </label>
            <p className={`text-xs ${theme.textMuted}`}>{t('household.mealPlan.settings.defaultStatusHelp')}</p>
            <div className="flex gap-2">
              {['yes', 'no'].map(val => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setDraftConfig(c => ({ ...c, defaultStatus: val }))}
                  className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                    draftConfig.defaultStatus === val
                      ? 'bg-amber-500 text-white'
                      : `${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`
                  }`}
                >
                  {t(`household.mealPlan.settings.defaultStatus${val === 'yes' ? 'Yes' : 'No'}`)}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={`text-sm font-medium ${theme.textSecondary}`}>
                {t('household.mealPlan.settings.deadlineEnabledLabel')}
              </label>
              <button
                type="button"
                role="switch"
                aria-checked={draftConfig.deadlineEnabled}
                onClick={() => setDraftConfig(c => ({ ...c, deadlineEnabled: !c.deadlineEnabled }))}
                className={`w-10 h-6 rounded-full transition-colors ${draftConfig.deadlineEnabled ? 'bg-amber-500' : `${theme.progressBg}`}`}
              >
                <span
                  className={`block w-4 h-4 bg-white rounded-full shadow transition-transform mx-1 ${draftConfig.deadlineEnabled ? 'translate-x-4' : 'translate-x-0'}`}
                />
              </button>
            </div>
            {draftConfig.deadlineEnabled && (
              <div className="space-y-1.5">
                <label className={`text-xs ${theme.textMuted}`}>{t('household.mealPlan.settings.deadlineTimeLabel')}</label>
                <input
                  type="time"
                  value={draftConfig.deadlineTime}
                  onChange={e => setDraftConfig(c => ({ ...c, deadlineTime: e.target.value }))}
                  className={`px-3 py-2 rounded-lg text-sm ${theme.input} border ${theme.border} outline-none`}
                />
                <p className={`text-xs ${theme.textMuted}`}>{t('household.mealPlan.settings.deadlineHelp')}</p>
              </div>
            )}
          </div>

          {/* Huisgenoten */}
          <div className="space-y-2">
            <label className={`text-sm font-medium ${theme.textSecondary}`}>
              {t('household.mealPlan.settings.membersLabel')}
            </label>
            <div className="space-y-1.5">
              {otherMembers.map(member => (
                <div key={member.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg ${theme.cardSecondary}`}>
                  <span className={`w-3 h-3 rounded-full flex-shrink-0 ${getMemberBg(member.color)}`} />
                  <span className={`flex-1 text-sm ${theme.text}`}>{member.name}</span>
                  <span className={`text-xs ${theme.textMuted}`}>
                    {t(`household.mealPlan.settings.role${member.role === 'admin' ? 'Admin' : 'Member'}`)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPendingRemove(member)}
                    className={`p-1 rounded ${theme.hover}`}
                    aria-label={t('household.mealPlan.settings.removeMemberAria')}
                  >
                    <Trash2 className={`w-4 h-4 ${theme.textMuted}`} />
                  </button>
                </div>
              ))}
            </div>

            {/* Nieuw lid toevoegen */}
            <div className="flex gap-2">
              <div className="flex gap-1 flex-shrink-0">
                {COLOR_OPTIONS.slice(0, 4).map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setNewColor(c)}
                    className={`w-5 h-5 rounded-full ${getMemberBg(c)} ${newColor === c ? 'ring-2 ring-offset-1 ring-amber-500' : ''}`}
                    aria-label={c}
                  />
                ))}
              </div>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addMember(); } }}
                placeholder={t('household.mealPlan.settings.memberNamePlaceholder')}
                className={`flex-1 px-3 py-1.5 rounded-lg text-sm ${theme.input} border ${theme.border} outline-none`}
              />
              <button
                type="button"
                onClick={addMember}
                disabled={!newName.trim()}
                className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-amber-600 transition"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={`flex gap-2 p-4 border-t ${theme.border}`}>
          <button
            type="button"
            onClick={onClose}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} ${theme.hover} transition`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            className="flex-1 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition"
          >
            {t('household.mealPlan.settings.save')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingRemove}
        theme={theme}
        variant="danger"
        title={t('household.mealPlan.settings.removeMemberConfirmTitle')}
        description={t('household.mealPlan.settings.removeMemberConfirmDesc', { name: pendingRemove?.name ?? '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => removeMember(pendingRemove.id)}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}
