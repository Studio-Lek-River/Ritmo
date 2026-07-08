import React, { useState } from 'react';
import { Plus, ChevronLeft, ChevronRight, Activity } from 'lucide-react';
import { ICON_OPTIONS } from '../utils/icons';
import { getColorClasses } from '../utils/colors';
import { injectableMeds } from '../utils/bodymap';
import { useTranslation, getLocale, resolveModuleName } from '../i18n/useTranslation';
import {
  ModuleDetail,
  PresetPickerModal,
  TargetPickerModal,
} from './MeasurementsView';
import { MedicationModuleCard } from './MedicationView';
import { BodymapModuleCard } from './BodymapView';

const HEALTH_TYPES = ['measurements', 'medication', 'bodymap'];

// Korte samenvatting per module, afhankelijk van het type.
function moduleSummary(mod, t) {
  if (mod.type === 'measurements') {
    const count = (mod.metrics || []).filter(Boolean).length;
    return t(count === 1 ? 'modules.measurements.metricCountOne' : 'modules.measurements.metricCount', { count });
  }
  if (mod.type === 'medication') {
    return t('modules.summary.medication', { count: (mod.meds || []).length });
  }
  if (mod.type === 'bodymap') {
    return t('modules.summary.bodymap', { count: (mod.log || []).length });
  }
  return '';
}

// Eén gezondheids-tab die metingen-, medicatie- en priklocatie-modules samen in
// één lijst toont. Tikken opent het type-specifieke detail.
export default function HealthView({
  modules,
  onUpdateMeasurementsModule,
  onCreateFromPreset,
  onAddModule,
  onEditModule,
  onAddMed,
  onUpdateMed,
  onDeleteMed,
  onOrderMed,
  onLogInjection,
  onRemoveInjection,
  theme,
}) {
  const { t } = useTranslation();
  const locale = getLocale();
  const [selectedId, setSelectedId] = useState(null);
  const [openMetricId, setOpenMetricId] = useState(null);
  const [presetPickerOpen, setPresetPickerOpen] = useState(false);
  const [pendingPreset, setPendingPreset] = useState(null);

  const healthModules = modules.filter(
    (m) => m.enabled && HEALTH_TYPES.includes(m.type)
  );
  const measurementModules = healthModules.filter((m) => m.type === 'measurements');
  const meds = injectableMeds(modules);

  const selected = selectedId
    ? healthModules.find((m) => m.id === selectedId) || null
    : null;

  const handlePresetPick = (preset) => {
    setPresetPickerOpen(false);
    if (measurementModules.length === 0) {
      onCreateFromPreset(preset, null);
      return;
    }
    setPendingPreset(preset);
  };

  const handleTargetPick = (targetModuleId) => {
    if (!pendingPreset) return;
    onCreateFromPreset(pendingPreset, targetModuleId);
    setPendingPreset(null);
    if (targetModuleId) setSelectedId(targetModuleId);
  };

  const backToList = () => {
    setSelectedId(null);
    setOpenMetricId(null);
  };

  const modals = (
    <>
      {presetPickerOpen && (
        <PresetPickerModal
          theme={theme}
          t={t}
          onClose={() => setPresetPickerOpen(false)}
          onPick={handlePresetPick}
        />
      )}
      {pendingPreset && (
        <TargetPickerModal
          preset={pendingPreset}
          modules={measurementModules}
          theme={theme}
          t={t}
          onClose={() => setPendingPreset(null)}
          onPick={handleTargetPick}
        />
      )}
    </>
  );

  // Detailweergave van de gekozen module.
  if (selected) {
    if (selected.type === 'measurements') {
      return (
        <>
          <ModuleDetail
            module={selected}
            canGoBack
            onBack={backToList}
            onUpdateModule={onUpdateMeasurementsModule}
            onEditModule={onEditModule}
            onOpenPresetPicker={() => setPresetPickerOpen(true)}
            openMetricId={openMetricId}
            setOpenMetricId={setOpenMetricId}
            theme={theme}
            t={t}
            locale={locale}
          />
          {modals}
        </>
      );
    }

    return (
      <div className="slide-in space-y-4">
        <button
          type="button"
          onClick={backToList}
          className={`w-9 h-9 rounded-full ${theme.hover} flex items-center justify-center ${theme.textSecondary}`}
          aria-label={t('common.back')}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        {selected.type === 'medication' && (
          <MedicationModuleCard
            module={selected}
            iconOptions={ICON_OPTIONS}
            onAddMed={onAddMed}
            onUpdateMed={onUpdateMed}
            onDeleteMed={onDeleteMed}
            onOrderMed={onOrderMed}
            onEditModule={onEditModule}
            theme={theme}
          />
        )}
        {selected.type === 'bodymap' && (
          <BodymapModuleCard
            module={selected}
            meds={meds}
            iconOptions={ICON_OPTIONS}
            onLogInjection={onLogInjection}
            onRemoveInjection={onRemoveInjection}
            onEditModule={onEditModule}
            theme={theme}
          />
        )}
      </div>
    );
  }

  // Lijstweergave: alle gezondheidsmodules door elkaar.
  return (
    <div className="slide-in">
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className={`text-xl font-semibold ${theme.text}`}>{t('nav.measurements')}</h1>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPresetPickerOpen(true)}
            className={`px-3 py-1.5 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-lg text-sm font-medium`}
          >
            {t('modules.measurements.addPresetShort')}
          </button>
          <button
            type="button"
            onClick={onAddModule}
            className="px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
          >
            {t('modules.measurements.addModuleShort')}
          </button>
        </div>
      </div>

      {healthModules.length === 0 ? (
        <div className={`${theme.card} rounded-2xl border ${theme.border} p-8 text-center`}>
          <Activity className={`w-10 h-10 ${theme.textMuted} mx-auto mb-3 opacity-60`} />
          <h3 className={`font-medium ${theme.text} mb-1`}>
            {t('modules.measurements.emptyState.title')}
          </h3>
          <p className={`text-sm ${theme.textMuted}`}>
            {t('modules.measurements.emptyState.description')}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {healthModules.map((mod) => {
            const IconComp = ICON_OPTIONS[mod.icon] || Activity;
            const colorCls = getColorClasses(mod.color);
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => { setSelectedId(mod.id); setOpenMetricId(null); }}
                className={`w-full flex items-center gap-3 ${theme.card} rounded-2xl border ${theme.border} p-4 hover:shadow-sm transition-all text-left`}
              >
                <div className={`w-10 h-10 rounded-xl ${colorCls.iconBg} flex items-center justify-center shrink-0`}>
                  <IconComp className={`w-5 h-5 ${colorCls.iconText}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium ${theme.text} truncate`}>{resolveModuleName(mod, t)}</p>
                  <p className={`text-xs ${theme.textMuted} mt-0.5`}>{moduleSummary(mod, t)}</p>
                </div>
                <ChevronRight className={`w-5 h-5 ${theme.textMuted}`} />
              </button>
            );
          })}
        </div>
      )}

      {modals}
    </div>
  );
}
