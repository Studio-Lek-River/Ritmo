import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Activity, Sparkles } from 'lucide-react';
import { ICON_OPTIONS } from '../utils/icons';
import { getColorClasses } from '../utils/colors';
import { injectableMeds } from '../utils/bodymap';
import { useTranslation, getLocale, resolveModuleName } from '../i18n/useTranslation';
import { useToast } from '../hooks/useToast';
import { ModuleDetail } from './MeasurementsView';
import { MedicationModuleCard } from './MedicationView';
import { BodymapModuleCard } from './BodymapView';
import { InjectionScheduleModuleCard } from './InjectionScheduleView';

const HEALTH_TYPES = ['measurements', 'medication', 'bodymap', 'injectionSchedule'];

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
  if (mod.type === 'injectionSchedule') {
    return t('modules.summary.injectionSchedule', { count: (mod.entries || []).length });
  }
  return '';
}

// Eén gezondheids-tab die metingen-, medicatie-, priklocatie- en
// prikschema-modules samen in één lijst toont. Tikken opent het
// type-specifieke detail.
export default function HealthView({
  modules,
  onUpdateMeasurementsModule,
  onAddModule,
  onEditModule,
  onSetupWeightLoss,
  onAddMed,
  onUpdateMed,
  onDeleteMed,
  onOrderMed,
  onLogInjection,
  onRemoveInjection,
  onSetHeatWindow,
  onAddScheduleEntry,
  onUpdateScheduleEntry,
  onDeleteScheduleEntry,
  topContent,
  theme,
}) {
  const { t } = useTranslation();
  const locale = getLocale();
  const { showToast } = useToast();
  const [selectedId, setSelectedId] = useState(null);
  const [openMetricId, setOpenMetricId] = useState(null);

  const healthModules = modules.filter(
    (m) => m.enabled && HEALTH_TYPES.includes(m.type)
  );
  const meds = injectableMeds(modules);

  const selected = selectedId
    ? healthModules.find((m) => m.id === selectedId) || null
    : null;

  const backToList = () => {
    setSelectedId(null);
    setOpenMetricId(null);
  };

  const handleSetupWeightLoss = () => {
    onSetupWeightLoss?.();
    showToast({ message: t('modules.measurements.weightLossSetupToast') });
  };

  // Detailweergave van de gekozen module.
  if (selected) {
    if (selected.type === 'measurements') {
      return (
        <ModuleDetail
          module={selected}
          canGoBack
          onBack={backToList}
          onUpdateModule={onUpdateMeasurementsModule}
          onEditModule={onEditModule}
          openMetricId={openMetricId}
          setOpenMetricId={setOpenMetricId}
          theme={theme}
          t={t}
          locale={locale}
        />
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
            onSetHeatWindow={onSetHeatWindow}
            onEditModule={onEditModule}
            theme={theme}
          />
        )}
        {selected.type === 'injectionSchedule' && (
          <InjectionScheduleModuleCard
            module={selected}
            meds={meds}
            iconOptions={ICON_OPTIONS}
            onAddEntry={onAddScheduleEntry}
            onUpdateEntry={onUpdateScheduleEntry}
            onDeleteEntry={onDeleteScheduleEntry}
            onEditModule={onEditModule}
            theme={theme}
          />
        )}
      </div>
    );
  }

  // Lijstweergave: alle gezondheidsmodules door elkaar. In health mode wordt
  // hierboven het dagelijkse dashboard (Today) getoond via topContent.
  return (
    <div className="slide-in">
      {topContent}
      <div className="flex items-center justify-between mb-4 gap-2">
        <h1 className={`text-xl font-semibold ${theme.text}`}>{t('nav.measurements')}</h1>
        <div className="flex gap-2">
          {onSetupWeightLoss && (
            <button
              type="button"
              onClick={handleSetupWeightLoss}
              className={`flex items-center gap-1.5 px-3 py-1.5 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-lg text-sm font-medium`}
            >
              <Sparkles className="w-4 h-4" />
              {t('modules.measurements.weightLossSetup')}
            </button>
          )}
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
    </div>
  );
}
