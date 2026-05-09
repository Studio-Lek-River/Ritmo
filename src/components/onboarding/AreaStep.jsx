import React from 'react';
import StepHeader from './StepHeader';
import TabSwitcher from './TabSwitcher';
import PresetTab from './PresetTab';
import CustomTab from './CustomTab';
import SkipTab from './SkipTab';
import { useTranslation } from '../../i18n/useTranslation';

export default function AreaStep({
  area, current, total, title, subtitle,
  state, setState,
  onBack, onNext, onSkipAll,
  theme, darkMode,
}) {
  const { t } = useTranslation();
  const tab = state?.tab || 'presets';

  // Tabs renderen met display:hidden i.p.v. unmount, zodat scroll en
  // toekomstige uitklap-state behouden blijven bij tab-switch.
  return (
    <div>
      <StepHeader
        current={current}
        total={total}
        title={title}
        onSkipAll={onSkipAll}
        theme={theme}
      />
      {subtitle && (
        <p className={`${theme.textMuted} text-sm mb-4`}>{subtitle}</p>
      )}

      <TabSwitcher
        value={tab}
        onChange={(next) => setState(prev => ({ ...prev, tab: next }))}
        theme={theme}
      />

      <div className="mb-5">
        <div className={tab === 'presets' ? '' : 'hidden'}>
          <PresetTab
            area={area}
            state={state}
            setState={setState}
            theme={theme}
            darkMode={darkMode}
          />
        </div>
        <div className={tab === 'custom' ? '' : 'hidden'}>
          <CustomTab
            area={area}
            items={state.custom}
            setItems={(updater) => setState(prev => ({
              ...prev,
              custom: typeof updater === 'function' ? updater(prev.custom) : updater,
            }))}
            theme={theme}
          />
        </div>
        <div className={tab === 'skip' ? '' : 'hidden'}>
          <SkipTab theme={theme} />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={onBack}
          className={`px-4 py-3 ${theme.cardSecondary} ${theme.textSecondary} rounded-xl font-medium transition`}
        >
          {t('common.back')}
        </button>
        <button
          onClick={onNext}
          className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition"
        >
          {t('common.next')}
        </button>
      </div>
    </div>
  );
}
