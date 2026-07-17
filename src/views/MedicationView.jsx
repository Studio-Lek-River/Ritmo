import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, Pill, Clock } from 'lucide-react';
import { getColorHex, COLOR_OPTIONS } from '../utils/colors';
import {
  createMed, medDaysLeft, medIsLow, medScheduleForDay,
  FREQUENCY_OPTIONS, FREQUENCY_LABEL_KEYS,
} from '../utils/medication';
import { fmtDateKey } from '../utils/dates';
import TimeInput from '../components/TimeInput';
import ConfirmDialog from '../components/ConfirmDialog';
import { useUndoToast } from '../hooks/useUndoToast';
import { useTranslation, resolveModuleName } from '../i18n/useTranslation';

function closestFrequencyId(perWeek) {
  if (perWeek == null) return null;
  let best = null;
  let bestDiff = Infinity;
  for (const opt of FREQUENCY_OPTIONS) {
    const diff = Math.abs(opt.perWeek - perWeek);
    if (diff < bestDiff) {
      bestDiff = diff;
      best = opt.id;
    }
  }
  return bestDiff < 0.01 ? best : null;
}

export function MedFormModal({ open, mode = 'edit', module: mod, med, onClose, onSave, onDelete, theme }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => createMed(''));
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setDraft(mode === 'edit' && med ? med : createMed(''));
    setConfirmDelete(false);
  }, [open, mode, med]);

  if (!open || !mod) return null;

  const canSave = (draft.name || '').trim().length > 0;
  const selectedFreqId = closestFrequencyId(draft.perWeek);

  const save = () => {
    if (!canSave) return;
    onSave?.({ ...draft, name: draft.name.trim() });
    onClose?.();
  };

  const confirmDeleteAction = () => {
    setConfirmDelete(false);
    onDelete?.();
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className={`${theme.card} rounded-2xl p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto my-4 shadow-xl slide-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-base font-semibold ${theme.textSecondary}`}>
            {mode === 'add' ? t('medication.newMed') : t('medication.editMed')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.medName')}</p>
          <input
            type="text"
            value={draft.name}
            autoFocus={mode === 'add'}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            placeholder={t('medication.medNamePlaceholder')}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.medDose')}</p>
            <input
              type="number"
              value={draft.dose}
              min="0"
              step="any"
              onChange={(e) => setDraft({ ...draft, dose: Number(e.target.value) || 0 })}
              className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
          <div>
            <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.medUnit')}</p>
            <input
              type="text"
              value={draft.unit}
              onChange={(e) => setDraft({ ...draft, unit: e.target.value })}
              placeholder={t('medication.medUnitPlaceholder')}
              className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.medSupply')}</p>
          <input
            type="number"
            value={draft.supply}
            min="0"
            step="any"
            onChange={(e) => setDraft({ ...draft, supply: Number(e.target.value) || 0 })}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.frequency')}</p>
          <div className="flex gap-1.5 flex-wrap">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDraft({ ...draft, perWeek: opt.perWeek })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedFreqId === opt.id ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                }`}
              >
                {t(`medication.${FREQUENCY_LABEL_KEYS[opt.id]}`)}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.freqCustomLabel')}</p>
            <input
              type="number"
              min="0"
              step="any"
              value={draft.perWeek > 0 ? Math.round((7 / draft.perWeek) * 100) / 100 : ''}
              onChange={(e) => {
                const days = Number(e.target.value);
                setDraft({ ...draft, perWeek: days > 0 ? 7 / days : 0 });
              }}
              placeholder={t('medication.freqCustomPlaceholder')}
              className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            />
          </div>
        </div>

        <label className={`flex items-center gap-2 text-sm ${theme.textSecondary} mb-4`}>
          <input
            type="checkbox"
            checked={!!draft.injectable}
            onChange={(e) => setDraft({ ...draft, injectable: e.target.checked })}
          />
          {t('medication.injectable')}
        </label>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.schedule')}</p>
          <label className={`flex items-center gap-2 text-sm ${theme.textSecondary} mb-2`}>
            <input
              type="checkbox"
              checked={!!draft.scheduleEnabled}
              onChange={(e) => setDraft({ ...draft, scheduleEnabled: e.target.checked })}
            />
            {t('medication.scheduleEnable')}
          </label>
          {draft.scheduleEnabled && (
            <div className="grid grid-cols-3 gap-3">
              <div>
                <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.startTime')}</p>
                <TimeInput
                  value={draft.startTime}
                  onChange={(value) => setDraft({ ...draft, startTime: value })}
                  theme={theme}
                  className="w-full"
                />
              </div>
              <div>
                <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.interval')}</p>
                <input
                  type="number"
                  value={draft.intervalHours}
                  min="0"
                  step="0.5"
                  onChange={(e) => setDraft({ ...draft, intervalHours: Number(e.target.value) || 0 })}
                  className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
              <div>
                <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.dosesPerDay')}</p>
                <input
                  type="number"
                  value={draft.dosesPerDay}
                  min="1"
                  step="1"
                  onChange={(e) => setDraft({ ...draft, dosesPerDay: Math.max(1, Number(e.target.value) || 1) })}
                  className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.color')}</p>
          <div className="flex gap-2 flex-wrap">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setDraft({ ...draft, color: c })}
                style={{ backgroundColor: getColorHex(c) }}
                aria-label={t(`colors.${c}`)}
                className={`w-8 h-8 rounded-lg transition ${
                  draft.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5">
          {mode === 'edit' && (
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition"
              aria-label={t('common.delete')}
              title={t('common.delete')}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-2 ${theme.cardSecondary} ${theme.textSecondary} rounded-lg text-sm font-medium transition`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={save}
            disabled={!canSave}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
          >
            {mode === 'add' ? t('medication.submitAdd') : t('common.save')}
          </button>
        </div>

        <ConfirmDialog
          open={confirmDelete}
          title={med ? t('medication.deleteMedTitle', { name: med.name }) : ''}
          description={t('medication.deleteMedDesc')}
          confirmLabel={t('common.delete')}
          variant="danger"
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(false)}
          theme={theme}
        />
      </div>
    </div>
  );
}

function OrderModal({ open, module: mod, med, onClose, onConfirm, theme }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState('');

  useEffect(() => {
    if (open) setAmount('');
  }, [open, med]);

  if (!open || !mod || !med) return null;

  const value = Number(amount);
  const canConfirm = amount !== '' && value > 0;

  const confirm = () => {
    if (!canConfirm) return;
    onConfirm?.(value);
    onClose?.();
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className={`${theme.card} rounded-2xl p-5 max-w-sm w-full shadow-xl slide-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-base font-semibold ${theme.textSecondary}`}>
            {t('medication.orderTitle')}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className={`p-2 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
            aria-label={t('common.close')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className={`text-xs ${theme.textMuted} mb-3`}>
          {t('medication.orderCurrentSupply', { name: med.name, count: med.supply || 0 })}
        </p>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.orderAmountLabel')}</p>
          <input
            type="number"
            value={amount}
            autoFocus
            min="0"
            step="any"
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirm();
            }}
            placeholder={t('medication.orderAmountPlaceholder')}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div className="flex items-center gap-2 mt-5">
          <div className="flex-1" />
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-2 ${theme.cardSecondary} ${theme.textSecondary} rounded-lg text-sm font-medium transition`}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition"
          >
            {t('medication.orderSubmit')}
          </button>
        </div>
      </div>
    </div>
  );
}

// Zelfstandige kaart voor één medicatie-module. Beheert eigen add/edit/order-
// state, zodat de kaart zowel in de Gezondheid-lijst als los herbruikbaar is.
export function MedicationModuleCard({
  module: mod,
  iconOptions,
  onAddMed,
  onUpdateMed,
  onDeleteMed,
  onOrderMed,
  onEditModule,
  theme,
}) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();

  const [adding, setAdding] = useState(false);
  const [editingMed, setEditingMed] = useState(null); // med
  const [orderingMed, setOrderingMed] = useState(null); // med

  const handleDeleteEditingMed = () => {
    if (!editingMed) return;
    const med = editingMed;
    onDeleteMed?.(mod.id, med.id);
    setEditingMed(null);
    showUndoToast(t('medication.toastDeleted'), () => {
      onAddMed?.(mod.id, med);
    });
  };

  const Icon = iconOptions?.[mod.icon] || Pill;
  const meds = mod.meds || [];

  return (
    <>
      <div className={`${theme.card} rounded-2xl shadow-sm overflow-hidden`}>
            <div className="flex items-center gap-3 p-4 pb-3">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
                style={{ backgroundColor: getColorHex(mod.color) }}
              >
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${theme.textSecondary} truncate`}>
                  {resolveModuleName(mod, t)}
                </p>
                <p className={`text-xs ${theme.textMuted}`}>
                  {t('medication.medCount', { count: meds.length })}
                </p>
              </div>
              {onEditModule && (
                <button
                  type="button"
                  onClick={() => onEditModule(mod)}
                  className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition flex-shrink-0`}
                  aria-label={t('medication.editModuleAria', { name: resolveModuleName(mod, t) })}
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            {meds.length > 0 && (
              <ul className="px-2 pb-1">
                {meds.map((med) => {
                  const daysLeft = medDaysLeft(med);
                  const low = medIsLow(med);
                  return (
                    <li key={med.id}>
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setEditingMed(med)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setEditingMed(med);
                          }
                        }}
                        className={`flex items-center gap-2.5 py-2.5 px-2 rounded-xl ${theme.hover} cursor-pointer`}
                      >
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getColorHex(med.color) }}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <span className={`text-sm font-medium truncate ${theme.textSecondary}`}>
                              {med.name}
                            </span>
                            {low && (
                              <span className="text-xs px-2 py-0.5 rounded-full flex-shrink-0 bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300">
                                {t('medication.low')}
                              </span>
                            )}
                          </div>
                          <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                            {med.dose} {med.unit}
                            {daysLeft != null && ` · ${t('medication.daysLeft', { count: daysLeft })}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOrderingMed(med);
                          }}
                          className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${theme.cardSecondary} ${theme.textSecondary} transition`}
                        >
                          {t('medication.order')}
                        </button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="px-4 pb-4 pt-1">
              <button
                type="button"
                onClick={() => setAdding(true)}
                className={`text-sm ${theme.textMuted} ${theme.hover} px-2 py-1.5 rounded-lg transition flex items-center gap-1.5 w-full`}
              >
                <Plus className="w-3.5 h-3.5" />
                {t('medication.addMed')}
              </button>
            </div>
      </div>

      <MedFormModal
        open={adding}
        mode="add"
        module={mod}
        onClose={() => setAdding(false)}
        onSave={(med) => onAddMed?.(mod.id, med)}
        theme={theme}
      />

      <MedFormModal
        open={!!editingMed}
        mode="edit"
        module={mod}
        med={editingMed}
        onClose={() => setEditingMed(null)}
        onSave={(updated) => {
          if (editingMed) onUpdateMed?.(mod.id, editingMed.id, updated);
        }}
        onDelete={handleDeleteEditingMed}
        theme={theme}
      />

      <OrderModal
        open={!!orderingMed}
        module={mod}
        med={orderingMed}
        onClose={() => setOrderingMed(null)}
        onConfirm={(amount) => {
          if (!orderingMed) return;
          const result = onOrderMed?.(mod.id, orderingMed.id, amount);
          showUndoToast(t('toast.orderUndone'), () => result?.undo?.());
        }}
        theme={theme}
      />
    </>
  );
}

// i18n-key per medScheduleForDay-status, gedeeld tussen de dosis-chips.
const DOSE_STATUS_LABEL_KEYS = {
  taken: 'doseStatusTaken',
  next: 'doseStatusNext',
  upcoming: 'doseStatusUpcoming',
};

const DOSE_STATUS_CHIP_CLASSES = {
  taken: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  next: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  upcoming: '',
};

function nowAsTime() {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
}

// H10: dagelijkse dagrooster-kaart voor "Vandaag"/"Gezondheid". Scant alle
// enabled medication-modules op meds met scheduleEnabled en toont per
// medicijn de doses van vandaag (medScheduleForDay), de eerstvolgende tijd en
// een "Ingenomen"-knop die de huidige kloktijd logt. Rendert niets als er
// geen enkel rooster-medicijn is (opt-in per medicijn, principe 2).
export function MedicationScheduleCard({ modules, onLogIntake, onRemoveIntake, theme }) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();
  const todayKey = fmtDateKey(new Date());

  const scheduledMeds = [];
  (modules || []).forEach((mod) => {
    if (!mod.enabled || mod.type !== 'medication') return;
    (mod.meds || []).forEach((med) => {
      if (med.scheduleEnabled) scheduledMeds.push({ moduleId: mod.id, med });
    });
  });

  if (scheduledMeds.length === 0) return null;

  const handleTake = (moduleId, med) => {
    const result = onLogIntake?.(moduleId, med.id, nowAsTime());
    showUndoToast(t('medication.doseLogged'), () => result?.undo?.());
  };

  // V09: draait een als "ingenomen" gemarkeerde dosis van vandaag terug.
  // medScheduleForDay levert 'taken'-slots alleen op met tijden uit
  // medIntakesForDay(med, todayKey), dus dit raakt nooit een historische
  // inname van een andere dag.
  const handleRemove = (moduleId, med, time) => {
    const result = onRemoveIntake?.(moduleId, med.id, todayKey, time);
    showUndoToast(t('toast.intakeRemoved'), () => result?.undo?.());
  };

  return (
    <div className={`${theme.card} rounded-2xl p-4 shadow-sm mb-4`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-blue-500" />
        <h2 className={`font-semibold ${theme.textSecondary} text-sm`}>{t('medication.schedule')}</h2>
      </div>
      <div className="space-y-3">
        {scheduledMeds.map(({ moduleId, med }) => {
          const schedule = medScheduleForDay(med, todayKey);
          const takenCount = schedule.filter((slot) => slot.status === 'taken').length;
          const total = schedule.length;
          const nextSlot = schedule.find((s) => s.status === 'next');
          const nextDue = nextSlot?.time ?? null;
          const overdue = !!nextDue && !nextSlot?.nextDay && nextDue < nowAsTime();

          return (
            <div key={med.id} className={`${theme.cardSecondary} rounded-xl p-3`}>
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-sm font-medium truncate ${theme.textSecondary}`}>{med.name}</span>
                <span className={`text-xs flex-shrink-0 ${theme.textMuted}`}>
                  {t('medication.takenCount', { count: takenCount, total })}
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-2">
                {schedule.map((slot) => {
                  const isTaken = slot.status === 'taken';
                  const label = isTaken
                    ? t('medication.undoIntakeAria', { time: slot.time })
                    : t(`medication.${DOSE_STATUS_LABEL_KEYS[slot.status]}`, { time: slot.time });
                  const chipClasses = `text-xs px-2 py-1 rounded-full ${
                    DOSE_STATUS_CHIP_CLASSES[slot.status] || `${theme.card} ${theme.textMuted}`
                  } ${isTaken ? 'cursor-pointer hover:opacity-80 transition' : ''}`;
                  const content = (
                    <>
                      {slot.time}
                      {slot.nextDay && (
                        <span className="ml-1 opacity-70">{t('medication.tomorrow')}</span>
                      )}
                    </>
                  );
                  return isTaken ? (
                    <button
                      key={slot.index}
                      type="button"
                      onClick={() => handleRemove(moduleId, med, slot.time)}
                      title={label}
                      aria-label={label}
                      className={chipClasses}
                    >
                      {content}
                    </button>
                  ) : (
                    <span key={slot.index} title={label} className={chipClasses}>
                      {content}
                    </span>
                  );
                })}
              </div>

              <div className="flex items-center justify-between gap-2">
                {nextDue ? (
                  <span className={`text-xs ${overdue ? 'text-red-500 font-medium' : theme.textMuted}`}>
                    {overdue
                      ? t('medication.overdue')
                      : nextSlot?.nextDay
                        ? t('medication.nextDoseTomorrow', { time: nextDue })
                        : t('medication.nextDose', { time: nextDue })}
                  </span>
                ) : <span />}
                {nextDue && (
                  <button
                    type="button"
                    onClick={() => handleTake(moduleId, med)}
                    className="text-xs px-3 py-1.5 rounded-full bg-blue-500 hover:bg-blue-600 text-white font-medium transition flex-shrink-0"
                  >
                    {t('medication.takeNow')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
