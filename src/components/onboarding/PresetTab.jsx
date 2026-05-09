import React, { useMemo } from 'react';
import { Check } from 'lucide-react';
import { ICON_OPTIONS } from '../../utils/icons';
import { Sparkles } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { getOnboardingPresets } from '../../utils/onboardingPresets';

// Eenvoudige aanvink-lijst — uitklap-paneel volgt in commit 5.
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
        {presets.map(preset => {
          const Icon = ICON_OPTIONS[preset.icon] || Sparkles;
          const enabled = !!state.selectedPresetIds[preset.__key];
          const name = preset.nameKey ? t(preset.nameKey) : preset.name;
          return (
            <button
              key={preset.__key}
              onClick={() => toggle(preset)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                enabled
                  ? `border-${preset.color}-400 bg-${preset.color}-50 ${darkMode ? 'bg-opacity-10' : ''}`
                  : `${theme.border} ${theme.cardSecondary}`
              }`}
            >
              <Icon className={`w-5 h-5 ${enabled ? `text-${preset.color}-500` : theme.textMuted}`} />
              <div className="flex-1 text-left">
                <div className={`font-medium text-sm ${enabled ? theme.textSecondary : theme.textMuted}`}>
                  {name}
                </div>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                enabled ? `bg-${preset.color}-500 border-${preset.color}-500` : 'border-slate-300'
              }`}>
                {enabled && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
