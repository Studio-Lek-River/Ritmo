import React, { useMemo, useState } from 'react';
import { ClipboardPaste } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import ConfirmDialog from '../../components/ConfirmDialog';
import { MENU_DAYS, MENU_SLOTS, normalizeWeekMenu, parseWeekMenuText } from '../../utils/mealplan';
import { WEEKDAY_KEYS, weekdayKeyForDate, weekdayLabelLong, shortWeekdayLabelsMondayFirst } from '../../utils/dates';

// Elke slot-id gebruikt één van deze vier labels (de drie snack-slots delen
// hetzelfde 'snack'-label; hun positie in de lijst maakt het moment duidelijk).
const SLOT_LABEL_KEY = {
  breakfast: 'breakfast',
  snack1: 'snack',
  lunch: 'lunch',
  snack2: 'snack',
  dinner: 'dinner',
  snack3: 'snack',
};

function defaultSelectedDay() {
  const idx = WEEKDAY_KEYS.indexOf(weekdayKeyForDate(new Date()));
  return MENU_DAYS[idx >= 0 ? idx : 0];
}

export default function MealPlanSection({ theme, menu, setMenu }) {
  const { t } = useTranslation();

  const [selectedDay, setSelectedDay] = useState(defaultSelectedDay);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [pendingParse, setPendingParse] = useState(null);

  const safeMenu = useMemo(() => normalizeWeekMenu(menu), [menu]);
  const dayShortLabels = useMemo(() => shortWeekdayLabelsMondayFirst(), []);
  const selectedDayIndex = MENU_DAYS.indexOf(selectedDay);
  const selectedDayLabel = weekdayLabelLong(WEEKDAY_KEYS[selectedDayIndex >= 0 ? selectedDayIndex : 0]);
  const totalSlots = MENU_DAYS.length * MENU_SLOTS.length;

  function updateSlot(slotId, value) {
    setMenu(prev => {
      const base = normalizeWeekMenu(prev);
      return {
        ...base,
        [selectedDay]: { ...base[selectedDay], [slotId]: value },
      };
    });
  }

  function handleParse() {
    if (!pasteText.trim()) return;
    setPendingParse(parseWeekMenuText(pasteText));
  }

  function confirmParse() {
    if (!pendingParse) return;
    setMenu(pendingParse.menu);
    setPendingParse(null);
    setPasteText('');
    setPasteOpen(false);
  }

  return (
    <div className="space-y-4">
      {/* Dag-kiezer */}
      <div className="grid grid-cols-7 gap-1">
        {MENU_DAYS.map((day, idx) => {
          const isSelected = day === selectedDay;
          return (
            <button
              key={day}
              type="button"
              onClick={() => setSelectedDay(day)}
              className={`py-2 rounded-lg text-xs font-medium transition ${
                isSelected
                  ? 'bg-amber-500 text-white'
                  : `${theme.cardSecondary} ${theme.textMuted} ${theme.hover}`
              }`}
            >
              {dayShortLabels[idx]}
            </button>
          );
        })}
      </div>

      {/* Geselecteerde dag: 6 slots */}
      <div className="space-y-2">
        <div className={`text-sm font-semibold ${theme.text}`}>{selectedDayLabel}</div>
        {MENU_SLOTS.map(slot => (
          <div key={slot.id} className="space-y-1">
            <label className={`text-xs font-medium ${theme.textMuted}`}>
              {t(`household.mealPlan.slots.${SLOT_LABEL_KEY[slot.id]}`)}
            </label>
            <input
              type="text"
              value={safeMenu[selectedDay][slot.id]}
              onChange={e => updateSlot(slot.id, e.target.value)}
              placeholder={t('household.mealPlan.slotPlaceholder')}
              className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} border ${theme.border} outline-none`}
            />
          </div>
        ))}
      </div>

      {/* Tekst plakken */}
      <div className={`pt-3 border-t ${theme.border}`}>
        <button
          type="button"
          onClick={() => setPasteOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition border ${theme.border} ${theme.textSecondary} ${theme.hover}`}
        >
          <ClipboardPaste className="w-3.5 h-3.5" />
          {pasteOpen ? t('common.close') : t('household.mealPlan.pasteToggle')}
        </button>

        {pasteOpen && (
          <div className="mt-2 space-y-2">
            <textarea
              value={pasteText}
              onChange={e => setPasteText(e.target.value)}
              placeholder={t('household.mealPlan.pasteTextareaPlaceholder')}
              rows={6}
              className={`w-full px-3 py-2 rounded-lg text-sm ${theme.input} border ${theme.border} outline-none`}
            />
            <button
              type="button"
              onClick={handleParse}
              disabled={!pasteText.trim()}
              className="px-3 py-1.5 rounded-lg bg-amber-500 text-white text-xs font-medium disabled:opacity-40 hover:bg-amber-600 transition"
            >
              {t('household.mealPlan.pasteButton')}
            </button>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!pendingParse}
        theme={theme}
        title={t('household.mealPlan.pasteConfirmTitle')}
        description={pendingParse && pendingParse.filledCount > 0
          ? t('household.mealPlan.pasteConfirmDescription', { n: pendingParse.filledCount, total: totalSlots })
          : t('household.mealPlan.pasteConfirmDescriptionNone')}
        confirmLabel={t('household.mealPlan.pasteConfirmConfirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmParse}
        onCancel={() => setPendingParse(null)}
      />
    </div>
  );
}
