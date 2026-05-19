import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Settings2, Plus, X, Check, Users } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import ConfirmDialog from '../../components/ConfirmDialog';
import MealPlanSettings, { getMemberBg } from './MealPlanSettings';
import {
  CURRENT_USER_ID,
  DEFAULT_MEALPLAN_CONFIG,
  createSelfMember,
  effectiveStatus,
  countForDay,
  isDeadlinePassed,
  canEditMember,
  generateGuestId,
} from '../../utils/mealplan';
import {
  fmtDateKey,
  todayKey,
  addDays,
  startOfWeek,
  weekdayNameShort,
  formatDayTitle,
  formatDaySubtitle,
  sameDay,
} from '../../utils/dates';

export default function MealPlanSection({ theme, config, setConfig, members, setMembers, plan, setPlan, sharedMode, householdId, currentUserId }) {
  const { t } = useTranslation();

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showSettings, setShowSettings] = useState(false);
  const [pendingSkip, setPendingSkip] = useState(null);
  const [guestInputs, setGuestInputs] = useState({});

  const effectiveUserId = (sharedMode && currentUserId) ? currentUserId : CURRENT_USER_ID;
  const selfMember = members.find(m => m.id === effectiveUserId) ?? createSelfMember();
  const selfRole = selfMember.role;
  const isActive = sharedMode ? true : !!config.householdName;

  const today = new Date();
  const weekStart = startOfWeek(addDays(today, weekOffset * 7));
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const selectedKey = fmtDateKey(selectedDate);
  const planForSelected = plan[selectedKey] ?? {};
  const deadlinePassed = isDeadlinePassed(selectedKey, config.deadlineTime, config.deadlineEnabled);

  // Helpers voor plan-mutaties
  function updateEntry(dateKey, memberId, patch) {
    // In shared mode: write to cloud storage for own entries
    if (sharedMode && memberId === effectiveUserId && householdId) {
      const current = plan[dateKey]?.[memberId] ?? { status: null, guests: [] };
      const newEntry = { ...current, ...patch };
      window.storage.set(`shared:${householdId}:mealplan:${memberId}:${dateKey}`, JSON.stringify(newEntry));
    }
    setPlan(prev => {
      const dayData = prev[dateKey] ?? {};
      const memberEntry = dayData[memberId] ?? { status: null, guests: [] };
      return {
        ...prev,
        [dateKey]: {
          ...dayData,
          [memberId]: { ...memberEntry, ...patch },
        },
      };
    });
  }

  function setStatus(memberId, status) {
    const entry = planForSelected[memberId] ?? { status: null, guests: [] };
    const hasGuests = (entry.guests?.length ?? 0) > 0;
    if (status === 'no' && hasGuests) {
      setPendingSkip({ memberId, dateKey: selectedKey });
      return;
    }
    updateEntry(selectedKey, memberId, { status });
  }

  function confirmSkipRemoveGuests() {
    if (!pendingSkip) return;
    updateEntry(pendingSkip.dateKey, pendingSkip.memberId, { status: 'no', guests: [] });
    setPendingSkip(null);
  }

  function confirmSkipKeepGuests() {
    if (!pendingSkip) return;
    updateEntry(pendingSkip.dateKey, pendingSkip.memberId, { status: 'no' });
    setPendingSkip(null);
  }

  function addGuest(memberId) {
    const name = (guestInputs[memberId] ?? '').trim();
    if (!name) return;
    const entry = planForSelected[memberId] ?? { status: null, guests: [] };
    const newGuest = { id: generateGuestId(), name };
    updateEntry(selectedKey, memberId, { guests: [...(entry.guests ?? []), newGuest] });
    setGuestInputs(prev => ({ ...prev, [memberId]: '' }));
  }

  function removeGuest(memberId, guestId) {
    const entry = planForSelected[memberId] ?? { status: null, guests: [] };
    updateEntry(selectedKey, memberId, { guests: (entry.guests ?? []).filter(g => g.id !== guestId) });
  }

  // Lege staat: nog geen naam ingesteld
  if (!isActive) {
    return (
      <div className="text-center py-6 space-y-3">
        <div className={`text-sm font-medium ${theme.text}`}>{t('household.mealPlan.emptyTitle')}</div>
        <p className={`text-xs ${theme.textMuted}`}>{t('household.mealPlan.emptyDescription')}</p>
        <button
          type="button"
          onClick={() => setShowSettings(true)}
          className="px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium hover:bg-amber-600 transition"
        >
          {t('household.mealPlan.emptyCta')}
        </button>
        {showSettings && (
          <MealPlanSettings
            theme={theme}
            config={config}
            setConfig={setConfig}
            members={members}
            setMembers={setMembers}
            onClose={() => setShowSettings(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week-strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setWeekOffset(w => w - 1)}
            className={`p-1 rounded ${theme.hover}`}
            aria-label={t('household.mealPlan.prevWeek')}
          >
            <ChevronLeft className={`w-4 h-4 ${theme.textMuted}`} />
          </button>
          <span className={`text-xs font-medium ${theme.textMuted}`}>
            {weekDays[0].getDate()} {weekDays[0].toLocaleString(undefined, { month: 'short' })}
            {' '}&ndash;{' '}
            {weekDays[6].getDate()} {weekDays[6].toLocaleString(undefined, { month: 'short' })}
          </span>
          <button
            type="button"
            onClick={() => setWeekOffset(w => w + 1)}
            className={`p-1 rounded ${theme.hover}`}
            aria-label={t('household.mealPlan.nextWeek')}
          >
            <ChevronRight className={`w-4 h-4 ${theme.textMuted}`} />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {weekDays.map(day => {
            const key = fmtDateKey(day);
            const count = countForDay(plan[key], members, config.defaultStatus);
            const isSelected = sameDay(day, selectedDate);
            const isToday = sameDay(day, today);
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDate(day)}
                className={`flex flex-col items-center py-2 px-1 rounded-xl text-xs transition ${
                  isSelected
                    ? 'bg-amber-500 text-white'
                    : `${theme.cardSecondary} ${isToday ? `ring-1 ring-amber-400` : ''} ${theme.hover}`
                }`}
              >
                <span className={`font-medium ${isSelected ? 'text-white' : theme.textMuted}`}>
                  {weekdayNameShort(day).slice(0, 2).toUpperCase()}
                </span>
                <span className={`font-bold text-sm ${isSelected ? 'text-white' : theme.text}`}>
                  {day.getDate()}
                </span>
                {count > 0 && (
                  <span className={`text-xs ${isSelected ? 'text-amber-100' : 'text-amber-500'}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Dag-detail header */}
      <div className="flex items-center justify-between">
        <div>
          <div className={`font-semibold text-sm ${theme.text}`}>{formatDayTitle(selectedDate)}</div>
          <div className={`text-xs ${theme.textMuted}`}>{formatDaySubtitle(selectedDate)}</div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs ${theme.textMuted}`}>
            {(() => {
              const total = countForDay(planForSelected, members, config.defaultStatus);
              return total > 0
                ? t('household.mealPlan.eatingTotal', { n: total })
                : t('household.mealPlan.eatingTotalNone');
            })()}
          </span>
          <button
            type="button"
            onClick={() => setShowSettings(true)}
            className={`p-1 rounded ${theme.hover}`}
            aria-label={t('household.mealPlan.manageHousehold')}
          >
            <Settings2 className={`w-4 h-4 ${theme.textMuted}`} />
          </button>
        </div>
      </div>

      {/* Deadline-banner */}
      {deadlinePassed && (
        <div className={`text-xs px-3 py-2 rounded-lg ${theme.cardSecondary} ${selfRole === 'admin' ? 'text-amber-500' : theme.textMuted}`}>
          {selfRole === 'admin'
            ? t('household.mealPlan.deadlinePassedAdmin', { time: config.deadlineTime })
            : t('household.mealPlan.deadlinePassedMember', { time: config.deadlineTime })}
        </div>
      )}

      {/* Leden-rijen */}
      <div className="space-y-2">
        {members.map(member => {
          const entry = planForSelected[member.id] ?? { status: null, guests: [] };
          const effective = effectiveStatus(entry.status, config.defaultStatus);
          const canEdit = canEditMember({
            userId: effectiveUserId,
            userRole: selfRole,
            memberId: member.id,
            deadlinePassed,
          });
          const guestVal = guestInputs[member.id] ?? '';
          const canAddGuest = canEdit && (member.id === effectiveUserId || selfRole === 'admin');

          return (
            <div key={member.id} className={`${theme.cardSecondary} rounded-xl p-3 space-y-2`}>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full flex-shrink-0 ${getMemberBg(member.color)}`} />
                <span className={`flex-1 text-sm font-medium ${theme.text}`}>
                  {member.name || (member.id === CURRENT_USER_ID ? t('household.mealPlan.settings.yourNamePlaceholder') : member.id)}
                  {member.id === CURRENT_USER_ID && (
                    <span className={`ml-1 text-xs font-normal ${theme.textMuted}`}>
                      {t('household.mealPlan.settings.youSuffix')}
                    </span>
                  )}
                </span>

                {/* Status-knoppen */}
                <div className="flex gap-1">
                  <button
                    type="button"
                    disabled={!canEdit}
                    aria-pressed={effective === 'yes'}
                    onClick={() => setStatus(member.id, effective === 'yes' ? null : 'yes')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      effective === 'yes'
                        ? 'bg-emerald-500 text-white'
                        : `${theme.card} ${theme.textMuted} ${canEdit ? theme.hover : 'opacity-40 cursor-not-allowed'}`
                    }`}
                  >
                    <Check className="w-3 h-3" />
                    {t('household.mealPlan.statusEat')}
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    aria-pressed={entry.status === 'no'}
                    onClick={() => setStatus(member.id, entry.status === 'no' ? null : 'no')}
                    className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      entry.status === 'no'
                        ? 'bg-slate-500 text-white'
                        : `${theme.card} ${theme.textMuted} ${canEdit ? theme.hover : 'opacity-40 cursor-not-allowed'}`
                    }`}
                  >
                    <X className="w-3 h-3" />
                    {t('household.mealPlan.statusSkip')}
                  </button>
                </div>
              </div>

              {/* Default-hint als status null is */}
              {entry.status === null && (
                <p className={`text-xs ${theme.textMuted} pl-5`}>
                  {config.defaultStatus === 'yes'
                    ? t('household.mealPlan.defaultYes')
                    : t('household.mealPlan.defaultNo')}
                </p>
              )}

              {/* Gasten */}
              {(entry.guests?.length > 0 || canAddGuest) && effective === 'yes' && (
                <div className="pl-5 space-y-1.5">
                  {(entry.guests ?? []).map(guest => (
                    <div key={guest.id} className="flex items-center gap-1.5">
                      <Users className={`w-3 h-3 ${theme.textMuted}`} />
                      <span className={`flex-1 text-xs ${theme.textSecondary}`}>{guest.name}</span>
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => removeGuest(member.id, guest.id)}
                          className={`p-0.5 rounded ${theme.hover}`}
                          aria-label={t('household.mealPlan.removeGuestAria')}
                        >
                          <X className={`w-3 h-3 ${theme.textMuted}`} />
                        </button>
                      )}
                    </div>
                  ))}
                  {canAddGuest && (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        value={guestVal}
                        onChange={e => setGuestInputs(prev => ({ ...prev, [member.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addGuest(member.id); } }}
                        placeholder={t('household.mealPlan.guestNamePlaceholder')}
                        className={`flex-1 px-2 py-1 rounded-lg text-xs ${theme.input} border ${theme.border} outline-none`}
                      />
                      <button
                        type="button"
                        onClick={() => addGuest(member.id)}
                        disabled={!guestVal.trim()}
                        className="px-2 py-1 rounded-lg bg-amber-500 text-white text-xs disabled:opacity-40 hover:bg-amber-600 transition"
                        aria-label={t('household.mealPlan.addGuest')}
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settings modal */}
      {showSettings && (
        <MealPlanSettings
          theme={theme}
          config={config}
          setConfig={setConfig}
          members={members}
          setMembers={setMembers}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Bevestig-dialoog: afmelden met gasten */}
      <ConfirmDialog
        open={!!pendingSkip}
        theme={theme}
        title={t('household.mealPlan.confirmSkipTitle')}
        description={t('household.mealPlan.confirmSkipDescription', {
          n: pendingSkip ? (planForSelected[pendingSkip.memberId]?.guests?.length ?? 0) : 0,
        })}
        confirmLabel={t('household.mealPlan.confirmSkipRemove')}
        cancelLabel={t('household.mealPlan.confirmSkipKeep')}
        onConfirm={confirmSkipRemoveGuests}
        onCancel={confirmSkipKeepGuests}
      />
    </div>
  );
}
