import { genId } from './genId';

export const METRIC_LIBRARY = [
  { key: 'weight',      nameKey: 'metricLibrary.weight',      unit: 'kg',      icon: 'Scale',    decimals: 1, lowerIsBetter: true  },
  { key: 'height',      nameKey: 'metricLibrary.height',      unit: 'cm',      icon: 'Ruler',    decimals: 0, lowerIsBetter: false },
  { key: 'bodyfat',     nameKey: 'metricLibrary.bodyFat',     unit: 'pct',     icon: 'Droplet',  decimals: 1, lowerIsBetter: true  },
  { key: 'muscle',      nameKey: 'metricLibrary.muscleMass',  unit: 'kg',      icon: 'Zap',      decimals: 1, lowerIsBetter: false },
  { key: 'waist',       nameKey: 'metricLibrary.waist',       unit: 'cm',      icon: 'Ruler',    decimals: 0, lowerIsBetter: true  },
  { key: 'leg',         nameKey: 'metricLibrary.leg',         unit: 'cm',      icon: 'Ruler',    decimals: 0, lowerIsBetter: true  },
  { key: 'arm',         nameKey: 'metricLibrary.arm',         unit: 'cm',      icon: 'Ruler',    decimals: 0, lowerIsBetter: true  },
  { key: 'heartrate',   nameKey: 'metricLibrary.restingHr',   unit: 'bpm',     icon: 'Activity', decimals: 0, lowerIsBetter: true  },
  { key: 'systolic',    nameKey: 'metricLibrary.systolic',    unit: 'mmHg',    icon: 'Activity', decimals: 0, lowerIsBetter: true  },
  { key: 'diastolic',   nameKey: 'metricLibrary.diastolic',   unit: 'mmHg',    icon: 'Activity', decimals: 0, lowerIsBetter: true  },
  { key: 'temperature', nameKey: 'metricLibrary.temperature', unit: 'celsius', icon: 'Activity', decimals: 1, lowerIsBetter: false },
  { key: 'glucose',     nameKey: 'metricLibrary.glucose',     unit: 'mmoll',   icon: 'Droplet',  decimals: 1, lowerIsBetter: true  },
];

export function instantiateMetric(libraryKey) {
  const entry = METRIC_LIBRARY.find(m => m.key === libraryKey);
  if (!entry) return null;
  return {
    id: genId('metric'),
    nameKey: entry.nameKey,
    unit: entry.unit,
    icon: entry.icon,
    decimals: entry.decimals,
    lowerIsBetter: entry.lowerIsBetter,
    target: null,
    events: [],
  };
}
