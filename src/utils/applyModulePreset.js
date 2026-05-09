import { genId } from './genId';

// Past een MODULE_PRESETS-entry toe op een module-shell (`prev`).
// Identiek aan de logica in ModuleEditor.applyPreset, maar pure — geen state.
export function applyModulePreset(prev, preset) {
  const merged = { ...prev, ...preset };
  if (preset.nameKey && !prev.name) delete merged.name;
  if (preset.items && merged.type !== 'collection') {
    merged.items = preset.items.map(label => ({ id: genId('items'), label }));
  }
  if (preset.options) {
    merged.options = preset.options.map(label => ({ id: genId('options'), label }));
  }
  if (preset.metrics && merged.type === 'measurements') {
    merged.metrics = preset.metrics.map(metric => ({
      ...metric,
      id: genId('metric'),
      events: [],
    }));
  }
  return merged;
}
