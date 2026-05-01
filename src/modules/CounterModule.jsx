import React, { useState, useMemo } from 'react';
import { Sparkles, AlertCircle, Trash2, Settings } from 'lucide-react';
import { formatAmount } from '../utils/format';
import ReminderBanner from '../components/ReminderBanner';

export default function CounterModule({
  module: mod,
  Icon,
  data,
  weekDates,
  history,
  today,
  editable = true,
  onIncrementCounter,
  onResetCounter,
  onAddEntry,
  onRemoveEntry,
  onDismissReminder,
  onEdit,
  t,
  darkMode,
}) {
  const Glyph = Icon || Sparkles;
  const colorClass = `text-${mod.color}-500`;
  const unit = mod.unit || 'minutes';
  const dailyGoal = mod.dailyGoal ?? 0;
  const presets = mod.presets || [];
  const categoriesEnabled = !!mod.categoriesEnabled;
  const categories = mod.categories || [];
  const total = data?.total ?? data?.minutes ?? 0;
  const entries = data?.entries || [];
  const useEntries = categoriesEnabled || unit !== 'minutes';

  const isMinutesLegacyMode = unit === 'minutes' && !categoriesEnabled;

  // === Minutes-only path: behoudt de oude Timer-UX 1:1 ===
  if (isMinutesLegacyMode) {
    const goalMinutes = dailyGoal || 120;
    const weekMinutes = (weekDates || []).reduce((sum, date) => {
      return sum + (history?.[date]?.moduleData?.[mod.id]?.total || history?.[date]?.moduleData?.[mod.id]?.minutes || 0);
    }, 0);
    const weekMax = mod.weeklyMax ?? mod.weeklyMaxMinutes;
    const weekHours = (weekMinutes / 60).toFixed(1);
    const weekPct = weekMax ? Math.min((weekMinutes / weekMax) * 100, 100) : 0;
    const minutesPresets = presets.length > 0 ? presets : [15, 30, 45, 60];

    return (
      <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Glyph className={`w-5 h-5 ${colorClass}`} />
          <h2 className={`font-semibold ${t.textSecondary}`}>{mod.name}</h2>
          {onEdit && (
            <button
              onClick={onEdit}
              className={`ml-auto p-1.5 ${t.hover} rounded-lg ${t.textMuted} transition`}
              title="Module-instellingen"
              aria-label={`Instellingen voor ${mod.name}`}
            >
              <Settings className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className={`${darkMode ? `bg-${mod.color}-900/30` : `bg-${mod.color}-50`} rounded-xl p-4 mb-3`}>
          <div className={`text-3xl font-bold ${darkMode ? `text-${mod.color}-300` : `text-${mod.color}-600`} mb-1`}>
            {(total / 60).toFixed(1)} uur
          </div>
          <p className={`text-xs ${darkMode ? `text-${mod.color}-400` : `text-${mod.color}-500`}`}>
            vandaag (doel: {(goalMinutes / 60).toFixed(1)} uur)
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {minutesPresets.slice(0, 4).map(min => (
            <button
              key={min}
              onClick={() => onIncrementCounter(min)}
              disabled={!editable}
              className={`py-2 ${darkMode ? `bg-${mod.color}-900/30 hover:bg-${mod.color}-900/50 text-${mod.color}-300` : `bg-${mod.color}-50 hover:bg-${mod.color}-100 text-${mod.color}-700`} rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              +{min}m
            </button>
          ))}
        </div>
        {editable && (
          <button
            onClick={onResetCounter}
            className={`w-full py-2 ${t.cardSecondary} ${t.hover} ${t.textMuted} rounded-lg text-sm transition`}
          >
            Reset vandaag
          </button>
        )}

        {weekMax && (
          <div className={`mt-4 pt-4 border-t ${t.border}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${t.textSecondary}`}>Deze week</span>
              <span className={`text-sm font-bold ${weekMinutes >= weekMax ? 'text-red-500' : weekMinutes >= weekMax * 0.83 ? 'text-amber-500' : 'text-green-600'}`}>
                {weekHours} / {(weekMax / 60).toFixed(0)} uur
              </span>
            </div>
            <div className={`w-full ${t.progressBg} rounded-full h-2`}>
              <div
                className={`h-2 rounded-full transition-all duration-700 ${
                  weekPct >= 100 ? 'bg-red-500' : weekPct >= 83 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${weekPct}%` }}
              />
            </div>
            {weekMinutes >= weekMax && (
              <div className={`flex items-start gap-2 mt-3 p-2 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded-lg`}>
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Weeklimiet bereikt!</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // === Counter-modus (drinken, lezen, etc.) ===
  return (
    <CounterUI
      mod={mod}
      Glyph={Glyph}
      colorClass={colorClass}
      unit={unit}
      dailyGoal={dailyGoal}
      presets={presets}
      categoriesEnabled={categoriesEnabled}
      categories={categories}
      total={total}
      entries={entries}
      useEntries={useEntries}
      data={data}
      today={today}
      editable={editable}
      onIncrementCounter={onIncrementCounter}
      onAddEntry={onAddEntry}
      onRemoveEntry={onRemoveEntry}
      onDismissReminder={onDismissReminder}
      onEdit={onEdit}
      t={t}
      darkMode={darkMode}
    />
  );
}

function CounterUI({
  mod,
  Glyph,
  colorClass,
  unit,
  dailyGoal,
  presets,
  categoriesEnabled,
  categories,
  total,
  entries,
  useEntries,
  data,
  today,
  editable = true,
  onIncrementCounter,
  onAddEntry,
  onRemoveEntry,
  onDismissReminder,
  onEdit,
  t,
  darkMode,
}) {
  const initialCategory = categoriesEnabled && categories.length ? categories[0] : null;
  const [activeCategory, setActiveCategory] = useState(initialCategory);
  const [manualAmount, setManualAmount] = useState('');
  const [manualCategory, setManualCategory] = useState(initialCategory);

  const pct = dailyGoal > 0 ? Math.min(100, (total / dailyGoal) * 100) : 0;
  const reachedGoal = dailyGoal > 0 && total >= dailyGoal;

  const showReminder = useMemo(() => {
    if (!categoriesEnabled || categories.length === 0) return false;
    const hasUncategorized = (entries || []).some(e => !e.category);
    return hasUncategorized && data?.reminderShownDate !== today;
  }, [categoriesEnabled, categories, entries, data, today]);

  const handleAdd = (amount, category) => {
    if (!amount || amount <= 0) return;
    if (useEntries) {
      onAddEntry(amount, category || null);
    } else {
      onIncrementCounter(amount);
    }
  };

  const submitManual = () => {
    const parsed = parseFloat(manualAmount);
    if (!parsed || parsed <= 0) return;
    handleAdd(parsed, manualCategory);
    setManualAmount('');
  };

  const goalLabel = dailyGoal > 0
    ? `${formatAmount(total, unit)} / ${formatAmount(dailyGoal, unit)}`
    : formatAmount(total, unit);

  const barColor = reachedGoal
    ? 'bg-green-500'
    : darkMode ? `bg-${mod.color}-400` : `bg-${mod.color}-500`;

  return (
    <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
      <div className="flex items-center gap-2 mb-4">
        <Glyph className={`w-5 h-5 ${colorClass}`} />
        <h2 className={`font-semibold ${t.textSecondary}`}>{mod.name}</h2>
        {onEdit && (
          <button
            onClick={onEdit}
            className={`ml-auto p-1.5 ${t.hover} rounded-lg ${t.textMuted} transition`}
            title="Module-instellingen"
            aria-label={`Instellingen voor ${mod.name}`}
          >
            <Settings className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className={`${darkMode ? `bg-${mod.color}-900/30` : `bg-${mod.color}-50`} rounded-xl p-4 mb-3`}>
        <div className={`text-2xl font-bold ${reachedGoal ? (darkMode ? 'text-green-300' : 'text-green-600') : (darkMode ? `text-${mod.color}-300` : `text-${mod.color}-600`)} mb-2`}>
          {goalLabel}
        </div>
        <div className={`w-full ${t.progressBg} rounded-full h-2 overflow-hidden`}>
          <div
            className={`h-2 rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {showReminder && (
        <ReminderBanner
          message="Tip: kies bovenaan welke categorie het is, dan kun je later zien wat je vooral toevoegt."
          onDismiss={onDismissReminder}
        />
      )}

      {categoriesEnabled && categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map(cat => {
            const active = cat === activeCategory;
            return (
              <button
                key={cat}
                onClick={() => {
                  setActiveCategory(cat);
                  setManualCategory(cat);
                }}
                className={`px-3 py-1 rounded-full text-xs font-medium transition ${
                  active
                    ? `bg-${mod.color}-500 text-white`
                    : `${t.cardSecondary} ${t.textSecondary} ${t.hover}`
                }`}
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {presets.length > 0 && (
        <div className={`grid gap-2 mb-3 ${presets.length <= 3 ? 'grid-cols-3' : 'grid-cols-4'}`}>
          {presets.map((amount, i) => (
            <button
              key={`${amount}-${i}`}
              onClick={() => handleAdd(amount, activeCategory)}
              disabled={!editable}
              className={`py-2 ${darkMode ? `bg-${mod.color}-900/30 hover:bg-${mod.color}-900/50 text-${mod.color}-300` : `bg-${mod.color}-50 hover:bg-${mod.color}-100 text-${mod.color}-700`} rounded-lg text-sm font-medium transition disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              + {formatAmount(amount, unit)}
            </button>
          ))}
        </div>
      )}

      {editable && (
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            inputMode="decimal"
            value={manualAmount}
            onChange={(e) => setManualAmount(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submitManual()}
            placeholder={`Aantal (${unit})`}
            className={`flex-1 min-w-0 px-3 py-2 ${t.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${mod.color}-300`}
          />
          {categoriesEnabled && categories.length > 0 && (
            <select
              value={manualCategory ?? ''}
              onChange={(e) => setManualCategory(e.target.value || null)}
              className={`px-2 py-2 ${t.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${mod.color}-300`}
            >
              <option value="">geen</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          )}
          <button
            onClick={submitManual}
            className={`px-3 py-2 bg-${mod.color}-500 hover:bg-${mod.color}-600 text-white rounded-lg text-sm font-medium transition`}
          >
            Toevoegen
          </button>
        </div>
      )}

      {useEntries && entries.length > 0 && (
        <div className={`pt-3 mt-2 border-t ${t.border} space-y-1`}>
          {[...entries].reverse().map(entry => (
            <div
              key={entry.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${t.cardSecondary} text-sm`}
            >
              <span className={`font-medium ${t.textSecondary}`}>
                {formatAmount(entry.amount, unit)}
              </span>
              {entry.category && (
                <span className={`px-2 py-0.5 rounded-full text-xs ${darkMode ? `bg-${mod.color}-900/40 text-${mod.color}-300` : `bg-${mod.color}-100 text-${mod.color}-700`}`}>
                  {entry.category}
                </span>
              )}
              <span className={`text-xs ${t.textMuted} ml-auto`}>{entry.time}</span>
              {editable && (
                <button
                  onClick={() => onRemoveEntry(entry.id)}
                  aria-label="Verwijderen"
                  className={`p-1 rounded ${t.hover} ${t.textMuted} hover:text-red-500 transition`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
