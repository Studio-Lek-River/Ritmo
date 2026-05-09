import React, { useMemo } from 'react';
import PresetCard from './PresetCard';
import { useTranslation } from '../../i18n/useTranslation';
import { getOnboardingPresets } from '../../utils/onboardingPresets';

export default function PresetTab({ area, state, setState, theme, darkMode }) {
  const { t } = useTranslation();
  const presets = useMemo(() => getOnboardingPresets(area, t), [area, t]);

  const toggle = (preset) => {
    const key = preset.__key;
    setState(prev => {
      const wasOn = !!prev.selectedPresetIds[key];
      const nextSelected = { ...prev.selectedPresetIds };
      const nextItems = { ...prev.presetItems };
      if (wasOn) {
        delete nextSelected[key];
      } else {
        nextSelected[key] = true;
        if (nextItems[key] === undefined) {
          nextItems[key] = [...preset.__defaultLabels];
        }
      }
      return { ...prev, selectedPresetIds: nextSelected, presetItems: nextItems };
    });
  };

  const setLabels = (key) => (updater) => {
    setState(prev => ({
      ...prev,
      presetItems: {
        ...prev.presetItems,
        [key]: typeof updater === 'function' ? updater(prev.presetItems[key] || []) : updater,
      },
    }));
  };

  if (presets.length === 0) {
    return (
      <p className={`${theme.textMuted} text-sm text-center py-4`}>
        {t('onboarding.presetTab.empty')}
      </p>
    );
  }

  return (
    <div>
      <p className={`${theme.textMuted} text-sm mb-3`}>
        {t('onboarding.presetTab.description')}
      </p>
      <div className="space-y-2">
        {presets.map(preset => (
          <PresetCard
            key={preset.__key}
            preset={preset}
            enabled={!!state.selectedPresetIds[preset.__key]}
            labels={state.presetItems[preset.__key] || preset.__defaultLabels}
            onToggle={() => toggle(preset)}
            onLabelsChange={setLabels(preset.__key)}
            theme={theme}
            darkMode={darkMode}
          />
        ))}
      </div>
    </div>
  );
}
