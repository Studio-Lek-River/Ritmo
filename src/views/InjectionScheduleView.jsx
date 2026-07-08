import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, X, CalendarClock } from 'lucide-react';
import { getColorHex } from '../utils/colors';
import { INJECTION_ZONES } from '../utils/bodymap';
import { FREQUENCY_OPTIONS, FREQUENCY_LABEL_KEYS } from '../utils/medication';
import { createScheduleEntry, scheduleEntryMed } from '../utils/injectionSchedule';
import ConfirmDialog from '../components/ConfirmDialog';
import { useTranslation, resolveModuleName } from '../i18n/useTranslation';

// Formulier voor één geplande prik: medicijn, zone en frequentie. Mirror van
// MedFormModal (medicatie) / de zone-kiezer uit BodymapView.
function ScheduleEntryFormModal({ open, mode = 'edit', meds, entry, onClose, onSave, onDelete, theme }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => createScheduleEntry());
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && entry) {
      setDraft(entry);
    } else {
      const firstMed = meds?.[0] || null;
      setDraft(createScheduleEntry({
        medId: firstMed?.id ?? null,
        medModuleId: firstMed?.medModuleId ?? null,
      }));
    }
    setConfirmDelete(false);
  }, [open, mode, entry, meds]);

  if (!open) return null;

  const canSave = !!draft.medId && !!draft.medModuleId && !!draft.zone;

  const save = () => {
    if (!canSave) return;
    onSave?.(draft);
    onClose?.();
  };

  const confirmDeleteAction = () => {
    setConfirmDelete(false);
    onDelete?.();
    onClose?.();
  };

  const handleMedChange = (value) => {
    const [medModuleId, medId] = value.split('::');
    setDraft({ ...draft, medId, medModuleId });
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
            {mode === 'add' ? t('injectionSchedule.newEntry') : t('injectionSchedule.editEntry')}
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

        {meds.length === 0 ? (
          <p className={`text-sm ${theme.textMuted} mb-4`}>{t('bodymap.noInjectableMeds')}</p>
        ) : (
          <div className="mb-4">
            <p className={`text-xs ${theme.textMuted} mb-1`}>{t('injectionSchedule.chooseMed')}</p>
            <select
              value={draft.medId && draft.medModuleId ? `${draft.medModuleId}::${draft.medId}` : ''}
              onChange={(e) => handleMedChange(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="" disabled>{t('injectionSchedule.chooseMedPlaceholder')}</option>
              {meds.map((med) => (
                <option key={`${med.medModuleId}::${med.id}`} value={`${med.medModuleId}::${med.id}`}>
                  {med.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('injectionSchedule.chooseZone')}</p>
          <select
            value={draft.zone || ''}
            onChange={(e) => setDraft({ ...draft, zone: e.target.value })}
            className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} ${theme.textSecondary} focus:outline-none focus:ring-2 focus:ring-blue-500`}
          >
            <option value="" disabled>{t('injectionSchedule.chooseZonePlaceholder')}</option>
            {INJECTION_ZONES.map((zone) => (
              <option key={zone.id} value={zone.id}>{t(zone.labelKey)}</option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <p className={`text-xs ${theme.textMuted} mb-1`}>{t('medication.frequency')}</p>
          <div className="flex gap-1.5 flex-wrap">
            {FREQUENCY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setDraft({ ...draft, frequencyId: opt.id })}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  draft.frequencyId === opt.id ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                }`}
              >
                {t(`medication.${FREQUENCY_LABEL_KEYS[opt.id]}`)}
              </button>
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
            {mode === 'add' ? t('injectionSchedule.submitAdd') : t('common.save')}
          </button>
        </div>

        <ConfirmDialog
          open={confirmDelete}
          title={t('injectionSchedule.deleteEntryTitle')}
          description={t('injectionSchedule.deleteEntryDesc')}
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

// Zelfstandige kaart voor één prikschema-module. `meds` zijn de injecteerbare
// medicijnen (via injectableMeds over alle modules) die de aanroeper meegeeft.
export function InjectionScheduleModuleCard({
  module: mod,
  meds,
  iconOptions,
  onAddEntry,
  onUpdateEntry,
  onDeleteEntry,
  onEditModule,
  theme,
}) {
  const { t } = useTranslation();

  const [adding, setAdding] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);

  const Icon = iconOptions?.[mod.icon] || CalendarClock;
  const entries = mod.entries || [];

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
              {t('injectionSchedule.entryCount', { count: entries.length })}
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

        {entries.length > 0 && (
          <ul className="px-2 pb-1">
            {entries.map((entry) => {
              const med = scheduleEntryMed(entry, meds);
              const zone = INJECTION_ZONES.find((z) => z.id === entry.zone);
              return (
                <li key={entry.id}>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => setEditingEntry(entry)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setEditingEntry(entry);
                      }
                    }}
                    className={`flex items-center gap-2.5 py-2.5 px-2 rounded-xl ${theme.hover} cursor-pointer`}
                  >
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getColorHex(med?.color) }}
                      aria-hidden="true"
                    />
                    <div className="flex-1 min-w-0">
                      <span className={`text-sm font-medium truncate ${theme.textSecondary}`}>
                        {med?.name || t('injectionSchedule.unknownMed')}
                      </span>
                      <p className={`text-xs ${theme.textMuted} mt-0.5`}>
                        {zone ? t(zone.labelKey) : entry.zone}
                        {' · '}
                        {t(`medication.${FREQUENCY_LABEL_KEYS[entry.frequencyId] || FREQUENCY_LABEL_KEYS.weekly}`)}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {entries.length === 0 && (
          <p className={`px-4 pb-2 text-xs ${theme.textMuted}`}>
            {t('injectionSchedule.emptyEntries')}
          </p>
        )}

        <div className="px-4 pb-4 pt-1">
          <button
            type="button"
            onClick={() => setAdding(true)}
            className={`text-sm ${theme.textMuted} ${theme.hover} px-2 py-1.5 rounded-lg transition flex items-center gap-1.5 w-full`}
          >
            <Plus className="w-3.5 h-3.5" />
            {t('injectionSchedule.addEntry')}
          </button>
        </div>
      </div>

      <ScheduleEntryFormModal
        open={adding}
        mode="add"
        meds={meds}
        onClose={() => setAdding(false)}
        onSave={(entry) => onAddEntry?.(mod.id, entry)}
        theme={theme}
      />

      <ScheduleEntryFormModal
        open={!!editingEntry}
        mode="edit"
        meds={meds}
        entry={editingEntry}
        onClose={() => setEditingEntry(null)}
        onSave={(updated) => {
          if (editingEntry) onUpdateEntry?.(mod.id, editingEntry.id, updated);
        }}
        onDelete={() => {
          if (editingEntry) onDeleteEntry?.(mod.id, editingEntry.id);
        }}
        theme={theme}
      />
    </>
  );
}
