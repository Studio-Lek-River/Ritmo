import React, { useState } from 'react';
import { Check, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { ICON_OPTIONS } from '../../utils/icons';
import { useTranslation } from '../../i18n/useTranslation';
import PresetItemEditor from './PresetItemEditor';

// Eén preset-rij: aanvinkbare kaart met optioneel uitklapbaar item-paneel.
// Voor niet-expandable presets (counter/measurements/sleep) tonen we alleen
// de kaart zelf zonder chevron.
export default function PresetCard({ preset, enabled, labels, onToggle, onLabelsChange, theme, darkMode }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const Icon = ICON_OPTIONS[preset.icon] || Sparkles;
  const name = preset.nameKey ? t(preset.nameKey) : preset.name;
  const expandable = preset.__expandable && enabled;
  const count = labels?.length ?? 0;
  const itemLabel = t(preset.__itemLabel);

  return (
    <div
      className={`rounded-xl border-2 transition ${
        enabled
          ? `border-${preset.color}-400 bg-${preset.color}-50 ${darkMode ? 'bg-opacity-10' : ''}`
          : `${theme.border} ${theme.cardSecondary}`
      }`}
    >
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={onToggle}
          className="flex items-center gap-3 flex-1 text-left"
        >
          <Icon className={`w-5 h-5 ${enabled ? `text-${preset.color}-500` : theme.textMuted}`} />
          <div className="flex-1">
            <div className={`font-medium text-sm ${enabled ? theme.textSecondary : theme.textMuted}`}>
              {name}
            </div>
            {enabled && expandable && (
              <div className={`text-xs ${theme.textMuted}`}>
                {count} {itemLabel}
              </div>
            )}
          </div>
          <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
            enabled ? `bg-${preset.color}-500 border-${preset.color}-500` : 'border-slate-300'
          }`}>
            {enabled && <Check className="w-3 h-3 text-white" />}
          </div>
        </button>
        {expandable && (
          <button
            onClick={() => setOpen(o => !o)}
            className={`p-1 rounded-lg ${theme.hover} ${theme.textMuted}`}
            aria-label={open ? t('common.collapse') : t('common.expand')}
          >
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {expandable && open && (
        <div className="px-3 pb-3">
          <PresetItemEditor
            labels={labels || []}
            setLabels={onLabelsChange}
            itemLabelKey={preset.__itemLabel}
            color={preset.color}
            theme={theme}
          />
        </div>
      )}
    </div>
  );
}
