import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Home, ChevronDown, ChevronUp,
  Plus, Trash2, Check, Star, ChevronLeft, ChevronRight, Edit3, X, Info, Lightbulb,
  ShoppingCart, Coffee, Utensils, Zap, Droplet, Wifi, Phone, Car, Film, Music, Book, Heart, Gift, Dumbbell, Flame, Plane, Fuel, BadgeEuro, GraduationCap, Briefcase,
} from 'lucide-react';
import useStoredState from '../hooks/useStoredState';
import { STORAGE_KEYS } from '../storage';
import {
  isOverdue, daysUntilDue, formatRelativeDate, formatEuro, parseEuroInput,
  defaultStartDate, endDateBefore, isActiveInMonth,
  activeUtilityTypesAt, disabledUtilityTypes, conflictingUtilityExpenses,
  monthlyAmountForType, monthlyIncomeTotal, monthlyExpenseTotal,
  yearActualTotal,
  eventsForMonth, netForDay, netForMonth,
  UTILITY_TYPES,
} from '../utils/household';
import { migrateHousehold } from '../utils/migrate';
import { useTranslation, getLocale } from '../i18n/useTranslation';
import ConfirmDialog from '../components/ConfirmDialog';

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

const BUDGET_ICONS = {
  Home, ShoppingCart, Coffee, Utensils, Zap, Droplet, Wifi, Phone, Car, Film,
  Music, Book, Heart, Gift, Dumbbell, Flame, Plane, Fuel, BadgeEuro, GraduationCap, Briefcase,
};
const BUDGET_ICON_KEYS = Object.keys(BUDGET_ICONS);

const UTILITY_ICON = { water: Droplet, elektra: Zap, gas: Flame, energie: Lightbulb };
const UTILITY_COLOR = { water: 'text-sky-500', elektra: 'text-amber-500', gas: 'text-orange-500', energie: 'text-violet-500' };

function buildLocalizedNames(language) {
  // Re-runs whenever language changes; uses Intl with the resolved locale.
  const locale = getLocale();
  const monthsLong = [...Array(12)].map((_, i) =>
    new Intl.DateTimeFormat(locale, { month: 'long' }).format(new Date(2024, i, 1))
  );
  const monthsShort = [...Array(12)].map((_, i) =>
    new Intl.DateTimeFormat(locale, { month: 'short' }).format(new Date(2024, i, 1)).replace('.', '')
  );
  // Sunday-first weekday labels: index 0 = Sunday, ..., 6 = Saturday
  const dayLabels = [...Array(7)].map((_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2024, 0, 7 + i))
  );
  return { monthsLong, monthsShort, dayLabels };
}

function monthKeyFor(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

// Locale-aware label voor een 'YYYY-MM' of 'YYYY-MM-DD' string.
function formatMonthLabel(monthIso, monthsLong) {
  if (!monthIso) return '';
  const [y, m] = monthIso.slice(0, 7).split('-').map(Number);
  if (!y || !m) return '';
  return `${monthsLong[m - 1]} ${y}`;
}

export default function HouseholdView({ theme, darkMode }) {
  const { t, language } = useTranslation();
  const names = useMemo(() => buildLocalizedNames(language), [language]);
  const utilityLabel = (k) => t(`household.utilities.types.${k}`);

  const [expanded, setExpanded] = useState({
    chores: true, groceries: false, fixedCosts: false, utilities: false,
  });
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const [chores, setChores] = useStoredState(STORAGE_KEYS.HOUSEHOLD_CHORES, []);
  const [groceries, setGroceries] = useStoredState(STORAGE_KEYS.HOUSEHOLD_GROCERIES, { items: [], shopDay: null });
  const [budget, setBudget] = useStoredState('household:budget', { income: [], expenses: [], oneTime: [] });
  const [utilities, setUtilities] = useStoredState('household:utilities', { actuals: {} });
  const [config, setConfig] = useStoredState('household:config', {});

  // Eenmalige migratie van oude isUtility/autoFromBudget-shape naar nieuw
  // vaste-lasten-model. Lezen via window.storage rechtstreeks om race-
  // condities met useStoredState's async load te vermijden. Idempotent.
  const migratedRef = useRef(false);
  useEffect(() => {
    if (migratedRef.current) return;
    migratedRef.current = true;
    let cancelled = false;
    (async () => {
      try {
        const [b, u, c] = await Promise.all([
          window.storage.get('household:budget'),
          window.storage.get('household:utilities'),
          window.storage.get('household:config'),
        ]);
        if (cancelled) return;
        const parseValue = (entry, fallback) => {
          if (!entry) return fallback;
          try { return JSON.parse(entry.value); } catch { return fallback; }
        };
        const result = migrateHousehold(
          parseValue(b, { income: [], expenses: [] }),
          parseValue(u, {}),
          parseValue(c, {}),
          new Date(),
        );
        if (cancelled || !result.changed) return;
        setBudget(result.budget);
        setUtilities(result.utilities);
        setConfig(result.config);
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('[migrate-household] failed', e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const overdueCount = chores.filter(isOverdue).length;
  const groceriesCount = (groceries.items || []).filter(i => !i.checked).length;
  const today = new Date();
  const currentMonthKey = monthKeyFor(today.getFullYear(), today.getMonth());
  const monthlyIncome = monthlyIncomeTotal(budget.income, currentMonthKey);
  const monthlyExpenses = monthlyExpenseTotal(budget.expenses, currentMonthKey);
  const monthlyNetValue = monthlyIncome - monthlyExpenses;
  const utilitiesYearActual = yearActualTotal(utilities.actuals, today.getFullYear());

  return (
    <div className="slide-in space-y-3">
      <Section
        theme={theme}
        icon={<Home className="w-4 h-4 text-blue-500" />}
        title={t('household.chores.title')}
        meta={overdueCount > 0
          ? t('household.chores.overdueMeta', { n: overdueCount })
          : t('household.chores.totalMeta', { n: chores.length })}
        expanded={expanded.chores}
        onToggle={() => toggle('chores')}
      >
        <ChoresSection chores={chores} setChores={setChores} theme={theme} />
      </Section>

      <Section
        theme={theme}
        icon={<ShoppingCart className="w-4 h-4 text-emerald-500" />}
        title={t('household.groceries.title')}
        meta={t('household.groceries.openMeta', { n: groceriesCount })}
        expanded={expanded.groceries}
        onToggle={() => toggle('groceries')}
      >
        <GroceriesSection groceries={groceries} setGroceries={setGroceries} theme={theme} dayLabels={names.dayLabels} />
      </Section>

      <Section
        theme={theme}
        icon={<BadgeEuro className="w-4 h-4 text-violet-500" />}
        title={t('household.fixedCosts.title')}
        meta={t('household.fixedCosts.meta', { value: formatEuro(monthlyNetValue) })}
        expanded={expanded.fixedCosts}
        onToggle={() => toggle('fixedCosts')}
      >
        <FixedCostsSection
          budget={budget}
          setBudget={setBudget}
          theme={theme}
          darkMode={darkMode}
          monthsLong={names.monthsLong}
          monthsShort={names.monthsShort}
          dayLabels={names.dayLabels}
          monthlyIncome={monthlyIncome}
          monthlyExpenses={monthlyExpenses}
          monthlyNetValue={monthlyNetValue}
        />
      </Section>

      <Section
        theme={theme}
        icon={<Zap className="w-4 h-4 text-amber-500" />}
        title={t('household.utilities.title')}
        meta={t('household.utilities.yearMeta', { value: formatEuro(utilitiesYearActual) })}
        expanded={expanded.utilities}
        onToggle={() => toggle('utilities')}
      >
        <UtilitiesActualsSection
          utilities={utilities}
          setUtilities={setUtilities}
          budget={budget}
          theme={theme}
          monthsLong={names.monthsLong}
          monthsShort={names.monthsShort}
          utilityLabel={utilityLabel}
        />
      </Section>
    </div>
  );
}

function Section({ theme, icon, title, meta, expanded, onToggle, children }) {
  return (
    <div className={`${theme.card} rounded-2xl shadow-sm overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-4 ${theme.hover} transition`}
      >
        <span className="flex items-center gap-2">
          {icon}
          <span className={`font-semibold ${theme.text}`}>{title}</span>
        </span>
        <span className={`text-xs ${theme.textMuted} ml-auto`}>{meta}</span>
        {expanded
          ? <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
          : <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />}
      </button>
      {expanded && (
        <div className={`p-4 pt-0 border-t ${theme.border}`}>
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

function Stat({ theme, label, value, accent }) {
  return (
    <div className={`${theme.cardSecondary} rounded-xl p-3 text-center`}>
      <div className={`text-xs ${theme.textMuted} mb-1`}>{label}</div>
      <div className={`text-sm font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

// ============================================================================
// Klusjes
// ============================================================================

function ChoresSection({ chores, setChores, theme }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [recurrence, setRecurrence] = useState('weekly');
  const [customDays, setCustomDays] = useState(14);

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const chore = {
      id: newId(),
      name: trimmed,
      recurrence,
      lastCompletedAt: null,
    };
    if (recurrence === 'custom') chore.customDays = Math.max(1, Number(customDays) || 1);
    setChores(prev => [...prev, chore]);
    setName('');
  };

  const complete = (id) => {
    setChores(prev => prev.map(c =>
      c.id === id ? { ...c, lastCompletedAt: new Date().toISOString() } : c
    ));
  };

  const remove = (id) => {
    setChores(prev => prev.filter(c => c.id !== id));
  };

  const sorted = [...chores].sort((a, b) => {
    const aOver = isOverdue(a) ? 0 : 1;
    const bOver = isOverdue(b) ? 0 : 1;
    if (aOver !== bOver) return aOver - bOver;
    const aDue = daysUntilDue(a);
    const bDue = daysUntilDue(b);
    if (aDue == null && bDue == null) return 0;
    if (aDue == null) return 1;
    if (bDue == null) return -1;
    return aDue - bDue;
  });

  return (
    <div className="space-y-3">
      <div className={`${theme.cardSecondary} rounded-xl p-3 space-y-2`}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder={t('household.chores.newPlaceholder')}
          className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
        />
        <div className="flex gap-2">
          <select
            value={recurrence}
            onChange={e => setRecurrence(e.target.value)}
            className={`px-2 py-2 rounded-lg ${theme.input} text-sm flex-1 outline-none`}
          >
            <option value="once">{t('household.chores.freq.once')}</option>
            <option value="weekly">{t('household.chores.freq.weekly')}</option>
            <option value="monthly">{t('household.chores.freq.monthly')}</option>
            <option value="custom">{t('household.chores.freq.custom')}</option>
          </select>
          {recurrence === 'custom' && (
            <input
              type="number"
              min="1"
              value={customDays}
              onChange={e => setCustomDays(e.target.value)}
              className={`w-20 px-2 py-2 rounded-lg ${theme.input} text-sm outline-none`}
            />
          )}
          <button
            onClick={add}
            disabled={!name.trim()}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {sorted.length === 0 && (
        <p className={`text-sm ${theme.textMuted} text-center py-4`}>{t('household.chores.empty')}</p>
      )}

      <ul className="space-y-2">
        {sorted.map(chore => {
          const overdue = isOverdue(chore);
          const due = daysUntilDue(chore);
          return (
            <li
              key={chore.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${theme.cardSecondary} ${overdue ? 'ring-1 ring-red-300' : ''}`}
            >
              <button
                onClick={() => complete(chore.id)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition shrink-0 ${
                  overdue
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                aria-label={t('household.chores.markDoneAria')}
              >
                <Check className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${theme.text} truncate`}>{chore.name}</div>
                <div className={`text-xs ${overdue ? 'text-red-500 font-medium' : theme.textMuted}`}>
                  {choreStatus(chore, overdue, due, t)}
                </div>
              </div>
              <button
                onClick={() => remove(chore.id)}
                className={`p-1.5 rounded-lg ${theme.textMuted} ${theme.hover} transition`}
                aria-label={t('household.chores.removeAria')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function choreStatus(chore, overdue, due, t) {
  if (chore.recurrence === 'once') {
    return chore.lastCompletedAt
      ? t('household.chores.status.doneRelative', { when: formatRelativeDate(chore.lastCompletedAt) })
      : t('household.chores.status.todo');
  }
  if (!chore.lastCompletedAt) return t('household.chores.status.notDoneYet');
  if (overdue) {
    const elapsed = Math.abs(due);
    return elapsed === 0
      ? t('household.chores.status.overdueToday')
      : t('household.chores.status.overdueDays', { n: elapsed });
  }
  if (due === 0) return t('household.chores.status.dueToday');
  if (due === 1) return t('household.chores.status.dueTomorrow');
  return t('household.chores.status.dueInDays', { n: due });
}

// ============================================================================
// Boodschappen
// ============================================================================

function GroceriesSection({ groceries, setGroceries, theme, dayLabels }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const items = groceries.items || [];

  const setItems = (updater) => {
    setGroceries(prev => ({
      ...prev,
      items: typeof updater === 'function' ? updater(prev.items || []) : updater,
    }));
  };

  const setShopDay = (day) => {
    setGroceries(prev => ({ ...prev, shopDay: day }));
  };

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setItems(prev => [...prev, { id: newId(), name: trimmed, checked: false, isStaple: false }]);
    setName('');
  };

  const toggle = (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const toggleStaple = (id) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, isStaple: !i.isStaple } : i));
  };

  const remove = (id) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const cleanup = () => {
    setItems(prev => prev
      .filter(i => i.isStaple || !i.checked)
      .map(i => i.isStaple ? { ...i, checked: false } : i)
    );
  };

  const sorted = [...items].sort((a, b) => {
    if (a.checked !== b.checked) return a.checked ? 1 : -1;
    if (a.isStaple !== b.isStaple) return a.isStaple ? -1 : 1;
    return 0;
  });

  return (
    <div className="space-y-3">
      <div className={`${theme.cardSecondary} rounded-xl p-3 space-y-2`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={t('household.groceries.newItemPlaceholder')}
            className={`flex-1 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
          />
          <button
            onClick={add}
            disabled={!name.trim()}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-xs ${theme.textMuted}`}>{t('household.groceries.shopDay')}</span>
          {dayLabels.map((label, idx) => (
            <button
              key={idx}
              onClick={() => setShopDay(groceries.shopDay === idx ? null : idx)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition ${
                groceries.shopDay === idx
                  ? 'bg-blue-500 text-white'
                  : `${theme.textMuted} ${theme.hover}`
              }`}
            >
              {label.slice(0, 2)}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <p className={`text-sm ${theme.textMuted} text-center py-4`}>{t('household.groceries.empty')}</p>
      )}

      <ul className="space-y-1">
        {sorted.map(item => (
          <li
            key={item.id}
            className={`flex items-center gap-2 p-2 rounded-lg ${theme.cardSecondary}`}
          >
            <button
              onClick={() => toggle(item.id)}
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition shrink-0 ${
                item.checked
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : `border-slate-300 ${theme.hover}`
              }`}
              aria-label={t('household.groceries.checkAria')}
            >
              {item.checked && <Check className="w-3.5 h-3.5" />}
            </button>
            <span className={`flex-1 text-sm ${theme.text} ${item.checked ? 'line-through opacity-50' : ''}`}>
              {item.name}
            </span>
            <button
              onClick={() => toggleStaple(item.id)}
              className={`p-1 rounded transition ${item.isStaple ? 'text-amber-500' : theme.textMuted}`}
              aria-label={t('household.groceries.stapleAria')}
            >
              <Star className={`w-4 h-4 ${item.isStaple ? 'fill-amber-500' : ''}`} />
            </button>
            <button
              onClick={() => remove(item.id)}
              className={`p-1 rounded ${theme.textMuted} ${theme.hover} transition`}
              aria-label={t('household.groceries.removeAria')}
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      {items.some(i => i.checked || i.isStaple) && (
        <button
          onClick={cleanup}
          className={`w-full py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} ${theme.hover} transition`}
        >
          {t('household.groceries.cleanup')}
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Vaste lasten
// ============================================================================

function FixedCostsSection({ budget, setBudget, theme, darkMode, monthsLong, monthsShort, dayLabels, monthlyIncome, monthlyExpenses, monthlyNetValue }) {
  const { t } = useTranslation();
  const [view, setView] = useState('recurring'); // 'recurring' | 'oneTime' | 'calendar'
  const [editing, setEditing] = useState(null); // { kind: 'income'|'expense'|'oneTime', item }
  const [adding, setAdding] = useState(null);   // 'income' | 'expense' | 'oneTime' | null
  const [pendingDelete, setPendingDelete] = useState(null);

  const income = budget.income || [];
  const expenses = budget.expenses || [];
  const oneTime = budget.oneTime || [];

  // Eén handler voor alle recurring saves: plaatst/vervangt het item en past
  // optionele cutoffs toe op andere items in dezelfde collectie.
  const handleRecurringSave = (kind, payload) => {
    const collectionKey = kind === 'income' ? 'income' : 'expenses';
    setBudget(prev => {
      const list = prev[collectionKey] || [];
      const cutMap = new Map((payload.cutoffs || []).map(c => [c.id, c.endDate]));
      const withCuts = list.map(x => cutMap.has(x.id) ? { ...x, endDate: cutMap.get(x.id) } : x);
      const idx = withCuts.findIndex(x => x.id === payload.item.id);
      const placed = idx >= 0
        ? withCuts.map((x, i) => i === idx ? payload.item : x)
        : [...withCuts, payload.item];
      return { ...prev, [collectionKey]: placed };
    });
    setEditing(null);
    setAdding(null);
  };

  const handleOneTimeSave = (item) => {
    setBudget(prev => {
      const list = prev.oneTime || [];
      const idx = list.findIndex(x => x.id === item.id);
      const placed = idx >= 0 ? list.map((x, i) => i === idx ? item : x) : [...list, item];
      return { ...prev, oneTime: placed };
    });
    setEditing(null);
    setAdding(null);
  };

  const removeRecurring = (kind, id) => {
    const collectionKey = kind === 'income' ? 'income' : 'expenses';
    setBudget(prev => ({
      ...prev,
      [collectionKey]: (prev[collectionKey] || []).filter(x => x.id !== id),
    }));
  };

  const removeOneTime = (id) => {
    setBudget(prev => ({ ...prev, oneTime: (prev.oneTime || []).filter(x => x.id !== id) }));
  };

  const handlePickItem = (item, kind) => {
    setEditing({ kind, item });
  };

  const tabBtn = (id, label) => (
    <button
      key={id}
      onClick={() => setView(id)}
      className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${
        view === id
          ? 'bg-blue-500 text-white'
          : `${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`
      }`}
      aria-pressed={view === id}
    >
      {label}
    </button>
  );

  const showRecurringEditor = (editing && (editing.kind === 'income' || editing.kind === 'expense'))
    || adding === 'income' || adding === 'expense';
  const showOneTimeEditor = editing?.kind === 'oneTime' || adding === 'oneTime';

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat theme={theme} label={t('household.fixedCosts.recurring.incomeGroupTitle')} value={formatEuro(monthlyIncome)} accent="text-emerald-500" />
        <Stat theme={theme} label={t('household.fixedCosts.recurring.expenseGroupTitle')} value={formatEuro(monthlyExpenses)} accent="text-rose-500" />
        <Stat theme={theme} label={t('household.fixedCosts.netLabel')} value={formatEuro(monthlyNetValue)} accent={monthlyNetValue < 0 ? 'text-amber-500' : 'text-blue-500'} />
      </div>

      <div className="flex gap-2">
        {tabBtn('recurring', t('household.fixedCosts.tabRecurring'))}
        {tabBtn('oneTime', t('household.fixedCosts.tabOneTime'))}
        {tabBtn('calendar', t('household.fixedCosts.tabCalendar'))}
      </div>

      {view === 'recurring' && (
        <RecurringList
          income={income}
          expenses={expenses}
          theme={theme}
          monthsLong={monthsLong}
          onEdit={(kind, item) => setEditing({ kind, item })}
          onAdd={(kind) => setAdding(kind)}
          onDelete={(kind, item) => setPendingDelete({ flow: 'recurring', kind, item })}
        />
      )}

      {view === 'oneTime' && (
        <OneTimeList
          items={oneTime}
          theme={theme}
          monthsLong={monthsLong}
          onEdit={(item) => setEditing({ kind: 'oneTime', item })}
          onAdd={() => setAdding('oneTime')}
          onDelete={(item) => setPendingDelete({ flow: 'oneTime', item })}
        />
      )}

      {view === 'calendar' && (
        <BudgetCalendarSection
          budget={budget}
          theme={theme}
          monthsLong={monthsLong}
          dayLabels={dayLabels}
          onPickItem={handlePickItem}
        />
      )}

      {showRecurringEditor && (
        <RecurringItemEditor
          theme={theme}
          kind={editing?.kind || adding}
          initial={editing?.item}
          expenses={expenses}
          monthsLong={monthsLong}
          onCancel={() => { setEditing(null); setAdding(null); }}
          onSave={(payload) => handleRecurringSave(editing?.kind || adding, payload)}
        />
      )}

      {showOneTimeEditor && (
        <OneTimeEditor
          theme={theme}
          initial={editing?.item}
          onCancel={() => { setEditing(null); setAdding(null); }}
          onSave={handleOneTimeSave}
        />
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        theme={theme}
        variant="danger"
        title={pendingDelete?.flow === 'oneTime'
          ? t('household.fixedCosts.oneTime.deleteTitle')
          : t('household.fixedCosts.recurring.deleteTitle')}
        description={pendingDelete?.flow === 'oneTime'
          ? t('household.fixedCosts.oneTime.deleteDescription', { name: pendingDelete?.item?.name || '' })
          : t('household.fixedCosts.recurring.deleteDescription', { name: pendingDelete?.item?.name || '' })}
        confirmLabel={t('common.delete')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => {
          if (!pendingDelete) return;
          if (pendingDelete.flow === 'oneTime') removeOneTime(pendingDelete.item.id);
          else removeRecurring(pendingDelete.kind, pendingDelete.item.id);
          setPendingDelete(null);
        }}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

function RecurringList({ income, expenses, theme, monthsLong, onEdit, onAdd, onDelete }) {
  const { t } = useTranslation();

  const sortItems = (list) => [...list].sort((a, b) => {
    const aActive = !a.endDate;
    const bActive = !b.endDate;
    if (aActive !== bActive) return aActive ? -1 : 1;
    return (a.name || '').localeCompare(b.name || '');
  });

  const renderItem = (item, kind) => {
    const Icon = BUDGET_ICONS[item.icon] || (kind === 'income' ? BadgeEuro : ShoppingCart);
    const ended = !!item.endDate;
    return (
      <li key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${theme.cardSecondary} ${ended ? 'opacity-60' : ''}`}>
        <Icon className={`w-5 h-5 ${theme.textSecondary} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${theme.text} truncate flex items-center gap-1.5`}>
            <span className="truncate">{item.name}</span>
            {item.utilityType && (
              <span className="inline-flex items-center text-[10px] font-medium text-sky-600 bg-sky-100 dark:text-sky-300 dark:bg-sky-900/40 px-1.5 py-0.5 rounded shrink-0">
                {t('household.fixedCosts.recurring.utilityBadge')}
              </span>
            )}
          </div>
          <div className={`text-xs ${theme.textMuted}`}>
            {formatEuro(item.amount)} · {t('household.fixedCosts.recurring.paymentDaySubtitle', { day: item.paymentDay })}
          </div>
          <div className={`text-[11px] ${theme.textMuted}`}>
            {t('household.fixedCosts.recurring.activeFrom', { month: formatMonthLabel(item.startDate, monthsLong) })}
            {ended && (
              <> · {t('household.fixedCosts.recurring.activeUntil', { month: formatMonthLabel(item.endDate, monthsLong) })}</>
            )}
          </div>
        </div>
        <button
          onClick={() => onEdit(kind, item)}
          className={`p-1.5 rounded-lg ${theme.textMuted} ${theme.hover} transition`}
          aria-label={t('household.fixedCosts.recurring.editAria')}
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(kind, item)}
          className={`p-1.5 rounded-lg ${theme.textMuted} ${theme.hover} transition`}
          aria-label={t('household.fixedCosts.recurring.removeAria')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </li>
    );
  };

  const renderGroup = (kind, items, title, addLabel) => (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{title}</h3>
        <button
          onClick={() => onAdd(kind)}
          className="px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> {addLabel}
        </button>
      </div>
      {items.length === 0 ? (
        <p className={`text-xs ${theme.textMuted} text-center py-3`}>{t('household.fixedCosts.recurring.empty')}</p>
      ) : (
        <ul className="space-y-1">
          {sortItems(items).map(item => renderItem(item, kind))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {renderGroup('income', income, t('household.fixedCosts.recurring.incomeGroupTitle'), t('household.fixedCosts.recurring.addIncome'))}
      {renderGroup('expense', expenses, t('household.fixedCosts.recurring.expenseGroupTitle'), t('household.fixedCosts.recurring.addExpense'))}
    </div>
  );
}

function pickConflictKind(newType, conflicts) {
  if (newType === 'energie' && conflicts.some(c => c.utilityType === 'gas' || c.utilityType === 'elektra')) {
    return 'energieReplaces';
  }
  if ((newType === 'gas' || newType === 'elektra') && conflicts.some(c => c.utilityType === 'energie')) {
    return 'lossReplacesEnergie';
  }
  return 'selfReplaces';
}

function RecurringItemEditor({ theme, kind, initial, expenses, monthsLong, onCancel, onSave }) {
  const { t } = useTranslation();
  const isExpense = kind === 'expense';
  const isEdit = !!initial;

  const [name, setName] = useState(initial?.name || '');
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace('.', ',') : '');
  const [paymentDay, setPaymentDay] = useState(initial?.paymentDay != null ? String(initial.paymentDay) : '');
  const [startMonth, setStartMonth] = useState(() => (initial?.startDate || defaultStartDate()).slice(0, 7));
  const [endEnabled, setEndEnabled] = useState(!!initial?.endDate);
  const [endMonth, setEndMonth] = useState(initial?.endDate ? initial.endDate.slice(0, 7) : '');
  const [icon, setIcon] = useState(initial?.icon || (kind === 'income' ? 'BadgeEuro' : 'ShoppingCart'));
  const [utilityType, setUtilityType] = useState(initial?.utilityType || '');

  const [editMode, setEditMode] = useState('correct'); // 'correct' | 'newRate' (alleen edit)
  const [newRateMonth, setNewRateMonth] = useState(() => defaultStartDate().slice(0, 7));

  const [pendingConflict, setPendingConflict] = useState(null);

  // Bij "nieuw tarief" rekenen we conflicten op de nieuwe startdatum, anders op de
  // gekozen startMonth. In edit-correct ignoreren we het eigen id zodat de bewerking
  // niet met zichzelf botst.
  const effectiveStartIso = (editMode === 'newRate' && isEdit) ? `${newRateMonth}-01` : `${startMonth}-01`;
  const ignoreId = isEdit && editMode === 'correct' ? initial.id : null;

  const activeTypes = useMemo(
    () => activeUtilityTypesAt(expenses.filter(e => !ignoreId || e.id !== ignoreId), effectiveStartIso),
    [expenses, effectiveStartIso, ignoreId],
  );
  const disabledMap = useMemo(() => disabledUtilityTypes(activeTypes), [activeTypes]);

  const buildItem = (overrideStartDate) => ({
    id: isEdit && editMode === 'correct' ? initial.id : newId(),
    name: name.trim(),
    amount: parseEuroInput(amount),
    paymentDay: Math.min(28, Math.max(1, parseInt(paymentDay, 10) || 1)),
    startDate: overrideStartDate || `${startMonth}-01`,
    endDate: endEnabled && endMonth ? `${endMonth}-01` : null,
    icon,
    ...(isExpense && utilityType ? { utilityType } : {}),
  });

  const validate = () => {
    if (!name.trim()) return false;
    if (!(parseEuroInput(amount) > 0)) return false;
    if (!paymentDay || isNaN(parseInt(paymentDay, 10))) return false;
    if (!startMonth) return false;
    if (endEnabled && (!endMonth || endMonth < startMonth)) return false;
    if (isEdit && editMode === 'newRate') {
      if (!newRateMonth) return false;
      if (newRateMonth <= (initial.startDate || '').slice(0, 7)) return false;
    }
    return true;
  };

  const save = () => {
    if (!validate()) return;

    const cutoffs = [];
    let item;

    if (isEdit && editMode === 'newRate') {
      const newStartIso = `${newRateMonth}-01`;
      item = buildItem(newStartIso);
      cutoffs.push({ id: initial.id, endDate: endDateBefore(newStartIso) });
    } else {
      item = buildItem();
    }

    if (isExpense && item.utilityType) {
      const conflicts = conflictingUtilityExpenses(expenses, item.utilityType, item.startDate, ignoreId);
      if (conflicts.length > 0) {
        const kindOfConflict = pickConflictKind(item.utilityType, conflicts);
        setPendingConflict({ kind: kindOfConflict, items: conflicts, item, baseCutoffs: cutoffs });
        return;
      }
    }

    onSave({ item, cutoffs });
  };

  const confirmConflict = () => {
    if (!pendingConflict) return;
    const cutoffEnd = endDateBefore(pendingConflict.item.startDate);
    const conflictCutoffs = pendingConflict.items.map(it => ({ id: it.id, endDate: cutoffEnd }));
    onSave({ item: pendingConflict.item, cutoffs: [...pendingConflict.baseCutoffs, ...conflictCutoffs] });
    setPendingConflict(null);
  };

  const titleKey = isEdit
    ? (kind === 'income' ? 'household.fixedCosts.recurring.editTitleIncome' : 'household.fixedCosts.recurring.editTitleExpense')
    : (kind === 'income' ? 'household.fixedCosts.recurring.addTitleIncome' : 'household.fixedCosts.recurring.addTitleExpense');

  const conflictTitle = pendingConflict
    ? (pendingConflict.kind === 'energieReplaces'
        ? t('household.fixedCosts.recurring.conflict.energieReplaces.title')
        : pendingConflict.kind === 'lossReplacesEnergie'
          ? t('household.fixedCosts.recurring.conflict.lossReplacesEnergie.title', { type: t(`household.utilities.types.${pendingConflict.item.utilityType}`) })
          : t('household.fixedCosts.recurring.conflict.selfReplaces.title', { type: t(`household.utilities.types.${pendingConflict.item.utilityType}`) }))
    : '';
  const conflictMessage = pendingConflict
    ? (pendingConflict.kind === 'energieReplaces'
        ? t('household.fixedCosts.recurring.conflict.energieReplaces.message', { month: formatMonthLabel(endDateBefore(pendingConflict.item.startDate), monthsLong) })
        : pendingConflict.kind === 'lossReplacesEnergie'
          ? t('household.fixedCosts.recurring.conflict.lossReplacesEnergie.message', { month: formatMonthLabel(endDateBefore(pendingConflict.item.startDate), monthsLong) })
          : t('household.fixedCosts.recurring.conflict.selfReplaces.message', { month: formatMonthLabel(endDateBefore(pendingConflict.item.startDate), monthsLong) }))
    : '';
  const conflictConfirm = pendingConflict
    ? (pendingConflict.kind === 'energieReplaces'
        ? t('household.fixedCosts.recurring.conflict.energieReplaces.confirm')
        : pendingConflict.kind === 'lossReplacesEnergie'
          ? t('household.fixedCosts.recurring.conflict.lossReplacesEnergie.confirm')
          : t('household.fixedCosts.recurring.conflict.selfReplaces.confirm'))
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`${theme.card} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme.border}`}>
          <h3 className={`font-semibold ${theme.text}`}>{t(titleKey)}</h3>
          <button onClick={onCancel} className={`p-1 rounded ${theme.hover}`}>
            <X className={`w-5 h-5 ${theme.textMuted}`} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {isEdit && (
            <div className={`${theme.cardSecondary} rounded-xl p-3 space-y-2`}>
              <div className={`text-xs font-medium ${theme.textSecondary}`}>{t('household.fixedCosts.recurring.editMode.label')}</div>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="editMode" checked={editMode === 'correct'} onChange={() => setEditMode('correct')} className="mt-1" />
                <span>
                  <span className={`block ${theme.text}`}>{t('household.fixedCosts.recurring.editMode.correct')}</span>
                  <span className={`block text-[11px] ${theme.textMuted}`}>{t('household.fixedCosts.recurring.editMode.correctDescription')}</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm">
                <input type="radio" name="editMode" checked={editMode === 'newRate'} onChange={() => setEditMode('newRate')} className="mt-1" />
                <span className="flex-1">
                  <span className={`block ${theme.text}`}>{t('household.fixedCosts.recurring.editMode.newRate')}</span>
                  <span className={`block text-[11px] ${theme.textMuted}`}>{t('household.fixedCosts.recurring.editMode.newRateDescription')}</span>
                  {editMode === 'newRate' && (
                    <input
                      type="month"
                      value={newRateMonth}
                      onChange={e => setNewRateMonth(e.target.value)}
                      className={`mt-2 w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
                    />
                  )}
                </span>
              </label>
            </div>
          )}

          <div>
            <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.recurring.name')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.recurring.amount')}</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
              />
              <p className={`text-[10px] ${theme.textMuted} mt-0.5`}>{t('household.fixedCosts.recurring.amountHint')}</p>
            </div>
            <div>
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.recurring.paymentDay')}</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={28}
                value={paymentDay}
                onChange={e => setPaymentDay(e.target.value)}
                placeholder="1-28"
                className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
              />
              <p className={`text-[10px] ${theme.textMuted} mt-0.5`}>{t('household.fixedCosts.recurring.paymentDayHint')}</p>
            </div>
          </div>

          {(!isEdit || editMode === 'correct') && (
            <div>
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.recurring.startDate')}</label>
              <input
                type="month"
                value={startMonth}
                onChange={e => setStartMonth(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
              />
            </div>
          )}

          {isEdit && editMode === 'correct' && (
            <div className={`${theme.cardSecondary} rounded-xl p-3`}>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={endEnabled} onChange={e => setEndEnabled(e.target.checked)} />
                <span className={theme.text}>{t('household.fixedCosts.recurring.endDateToggle')}</span>
              </label>
              {endEnabled && (
                <input
                  type="month"
                  value={endMonth}
                  onChange={e => setEndMonth(e.target.value)}
                  className={`mt-2 w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
                />
              )}
            </div>
          )}

          {isExpense && (
            <div>
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.recurring.utilityType')}</label>
              <select
                value={utilityType}
                onChange={e => setUtilityType(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
              >
                <option value="">{t('household.fixedCosts.recurring.utilityNone')}</option>
                {UTILITY_TYPES.map(type => {
                  const isCurrent = utilityType === type;
                  const isDisabled = !isCurrent && disabledMap[type];
                  return (
                    <option key={type} value={type} disabled={isDisabled}>
                      {t(`household.fixedCosts.recurring.types.${type}`)}
                      {isDisabled ? ` — ${t('household.fixedCosts.recurring.typeAlreadyActive')}` : ''}
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div>
            <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.recurring.icon')}</label>
            <div className={`grid grid-cols-7 gap-1 max-h-36 overflow-y-auto p-2 rounded-lg ${theme.cardSecondary}`}>
              {BUDGET_ICON_KEYS.map(key => {
                const Icon = BUDGET_ICONS[key];
                const selected = icon === key;
                return (
                  <button
                    key={key}
                    onClick={() => setIcon(key)}
                    className={`aspect-square flex items-center justify-center rounded-lg transition ${
                      selected ? 'bg-blue-500 text-white' : `${theme.textSecondary} ${theme.hover}`
                    }`}
                    aria-label={key}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className={`flex gap-2 p-4 border-t ${theme.border}`}>
          <button
            onClick={onCancel}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} ${theme.hover} transition`}
          >
            {t('household.fixedCosts.recurring.cancel')}
          </button>
          <button
            onClick={save}
            disabled={!validate()}
            className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
          >
            {t('household.fixedCosts.recurring.save')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!pendingConflict}
        theme={theme}
        variant="default"
        title={conflictTitle}
        description={conflictMessage}
        confirmLabel={conflictConfirm}
        cancelLabel={t('common.cancel')}
        onConfirm={confirmConflict}
        onCancel={() => setPendingConflict(null)}
      />
    </div>
  );
}

function OneTimeList({ items, theme, monthsLong, onEdit, onAdd, onDelete }) {
  const { t } = useTranslation();

  const grouped = useMemo(() => {
    const map = new Map();
    for (const item of items) {
      if (!item.date) continue;
      const monthKey = item.date.slice(0, 7);
      if (!map.has(monthKey)) map.set(monthKey, []);
      map.get(monthKey).push(item);
    }
    const monthKeys = [...map.keys()].sort().reverse();
    return monthKeys.map(monthKey => ({
      monthKey,
      items: map.get(monthKey).sort((a, b) => (b.date || '').localeCompare(a.date || '')),
    }));
  }, [items]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{t('household.fixedCosts.oneTime.groupTitle')}</h3>
        <button
          onClick={onAdd}
          className="px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> {t('household.fixedCosts.oneTime.addItem')}
        </button>
      </div>

      {grouped.length === 0 ? (
        <p className={`text-xs ${theme.textMuted} text-center py-3`}>{t('household.fixedCosts.oneTime.empty')}</p>
      ) : (
        grouped.map(group => {
          const [yearStr, monthStr] = group.monthKey.split('-');
          const monthLabel = monthsLong[Number(monthStr) - 1] || '';
          return (
            <div key={group.monthKey}>
              <div className={`text-xs font-medium ${theme.textMuted} mb-1 capitalize`}>
                {t('household.fixedCosts.oneTime.monthGroupHeader', { month: monthLabel, year: yearStr })}
              </div>
              <ul className="space-y-1">
                {group.items.map(item => {
                  const Icon = BUDGET_ICONS[item.icon] || ShoppingCart;
                  const dayPart = item.date ? Number(item.date.slice(8, 10)) : '';
                  return (
                    <li key={item.id} className={`flex items-center gap-3 p-3 rounded-xl ${theme.cardSecondary}`}>
                      <Icon className={`w-5 h-5 ${theme.textSecondary} shrink-0`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${theme.text} truncate`}>{item.name}</div>
                        <div className={`text-xs ${theme.textMuted}`}>
                          {formatEuro(item.amount)} · {dayPart} {monthLabel}
                        </div>
                      </div>
                      <button
                        onClick={() => onEdit(item)}
                        className={`p-1.5 rounded-lg ${theme.textMuted} ${theme.hover} transition`}
                        aria-label={t('household.fixedCosts.oneTime.editAria')}
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(item)}
                        className={`p-1.5 rounded-lg ${theme.textMuted} ${theme.hover} transition`}
                        aria-label={t('household.fixedCosts.oneTime.removeAria')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}
    </div>
  );
}

function OneTimeEditor({ theme, initial, onCancel, onSave }) {
  const { t } = useTranslation();
  const isEdit = !!initial;
  const todayIso = new Date().toISOString().slice(0, 10);

  const [name, setName] = useState(initial?.name || '');
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace('.', ',') : '');
  const [date, setDate] = useState(initial?.date || todayIso);
  const [icon, setIcon] = useState(initial?.icon || 'ShoppingCart');

  const validate = () => {
    if (!name.trim()) return false;
    if (!(parseEuroInput(amount) > 0)) return false;
    if (!date) return false;
    return true;
  };

  const save = () => {
    if (!validate()) return;
    onSave({
      id: initial?.id || newId(),
      name: name.trim(),
      amount: parseEuroInput(amount),
      date,
      kind: 'expense',
      icon,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`${theme.card} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme.border}`}>
          <h3 className={`font-semibold ${theme.text}`}>
            {isEdit ? t('household.fixedCosts.oneTime.editTitle') : t('household.fixedCosts.oneTime.addTitle')}
          </h3>
          <button onClick={onCancel} className={`p-1 rounded ${theme.hover}`}>
            <X className={`w-5 h-5 ${theme.textMuted}`} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.oneTime.name')}</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.oneTime.amount')}</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
              />
            </div>
            <div>
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.oneTime.date')}</label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
              />
            </div>
          </div>
          <div>
            <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.fixedCosts.oneTime.icon')}</label>
            <div className={`grid grid-cols-7 gap-1 max-h-36 overflow-y-auto p-2 rounded-lg ${theme.cardSecondary}`}>
              {BUDGET_ICON_KEYS.map(key => {
                const Icon = BUDGET_ICONS[key];
                const selected = icon === key;
                return (
                  <button
                    key={key}
                    onClick={() => setIcon(key)}
                    className={`aspect-square flex items-center justify-center rounded-lg transition ${
                      selected ? 'bg-blue-500 text-white' : `${theme.textSecondary} ${theme.hover}`
                    }`}
                    aria-label={key}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className={`flex gap-2 p-4 border-t ${theme.border}`}>
          <button
            onClick={onCancel}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} ${theme.hover} transition`}
          >
            {t('household.fixedCosts.oneTime.cancel')}
          </button>
          <button
            onClick={save}
            disabled={!validate()}
            className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
          >
            {t('household.fixedCosts.oneTime.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetCalendarSection({ budget, theme, monthsLong, dayLabels, onPickItem }) {
  const { t } = useTranslation();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const eventsByDay = useMemo(() => eventsForMonth(budget, year, month), [budget, year, month]);
  const monthlyNetVal = useMemo(() => netForMonth(eventsByDay), [eventsByDay]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;

  const headerOrder = [1, 2, 3, 4, 5, 6, 0];
  const selectedEvents = selectedDay != null ? (eventsByDay[selectedDay] || []) : [];

  const eventToEditorKind = (kind) => {
    if (kind === 'income') return 'income';
    if (kind === 'oneTime') return 'oneTime';
    return 'expense';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDay(null); }}
          className={`p-2 rounded-lg ${theme.hover}`}
          aria-label={t('household.fixedCosts.calendar.prevMonthAria')}
        >
          <ChevronLeft className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
        <h4 className={`text-sm font-semibold ${theme.textSecondary}`}>
          {monthsLong[month]} {year}
        </h4>
        <button
          onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null); }}
          className={`p-2 rounded-lg ${theme.hover}`}
          aria-label={t('household.fixedCosts.calendar.nextMonthAria')}
        >
          <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {headerOrder.map(idx => (
          <div key={idx} className={`text-center text-[10px] font-medium ${theme.textMuted} py-1`}>
            {dayLabels?.[idx]?.slice(0, 2) ?? ''}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((day, i) => {
          if (day == null) return <div key={`empty-${i}`} />;
          const events = eventsByDay[day] || [];
          const net = netForDay(events);
          const isToday = isCurrentMonth && today.getDate() === day;
          const isSelected = selectedDay === day;
          const iconCount = events.length;
          const visibleIcons = iconCount <= 3 ? events : events.slice(0, 2);
          const hasOverflow = iconCount > 3;
          return (
            <button
              key={day}
              onClick={() => setSelectedDay(prev => prev === day ? null : day)}
              className={`min-h-[3.25rem] p-1 rounded-md flex flex-col items-stretch text-left transition ${
                isSelected
                  ? 'ring-2 ring-blue-500 bg-blue-500/10'
                  : `${theme.cardSecondary} ${theme.hover}`
              } ${isToday ? 'ring-1 ring-blue-300' : ''}`}
              aria-pressed={isSelected}
            >
              <span className={`text-[10px] font-medium ${theme.textSecondary} leading-none`}>{day}</span>
              {net !== 0 && (
                <span className={`text-[10px] font-semibold leading-tight mt-0.5 ${
                  net > 0 ? 'text-emerald-500' : 'text-rose-500'
                }`}>
                  {net > 0 ? '+' : '−'}{formatEuro(Math.abs(net))}
                </span>
              )}
              {iconCount > 0 && (
                <span className="flex items-center gap-0.5 mt-auto">
                  {visibleIcons.map((e, idx) => {
                    const Icon = BUDGET_ICONS[e.item.icon] || BadgeEuro;
                    return (
                      <Icon
                        key={`${e.item.id}-${idx}`}
                        className={`w-3 h-3 ${
                          e.kind === 'income' ? 'text-emerald-500' : theme.textMuted
                        }`}
                      />
                    );
                  })}
                  {hasOverflow && (
                    <span className={`text-[9px] ${theme.textMuted}`}>…</span>
                  )}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className={`flex items-center justify-between p-3 rounded-xl ${theme.cardSecondary}`}>
        <span className={`text-xs ${theme.textMuted}`}>{t('household.fixedCosts.netThisMonth')}</span>
        <span className={`text-sm font-semibold ${
          monthlyNetVal < 0 ? 'text-rose-500' : monthlyNetVal > 0 ? 'text-emerald-500' : theme.textSecondary
        }`}>
          {monthlyNetVal > 0 ? '+' : monthlyNetVal < 0 ? '−' : ''}{formatEuro(Math.abs(monthlyNetVal))}
        </span>
      </div>

      {selectedDay != null && (
        <div className={`p-3 rounded-xl ${theme.card} border ${theme.border} space-y-2`}>
          <div className={`text-xs ${theme.textMuted}`}>
            {selectedDay} {monthsLong[month]} {year}
          </div>
          {selectedEvents.length === 0 ? (
            <p className={`text-xs ${theme.textMuted}`}>{t('household.fixedCosts.noEventsThisDay')}</p>
          ) : (
            <ul className="space-y-1">
              {selectedEvents.map((e, idx) => {
                const Icon = BUDGET_ICONS[e.item.icon] || BadgeEuro;
                const sign = e.kind === 'income' ? 1 : -1;
                const amt = sign * (Number(e.item.amount) || 0);
                return (
                  <li
                    key={`${e.item.id}-${idx}`}
                    className={`flex items-center gap-2 p-2 rounded-lg ${theme.cardSecondary}`}
                  >
                    <Icon className={`w-4 h-4 ${e.kind === 'income' ? 'text-emerald-500' : theme.textSecondary} shrink-0`} />
                    <button
                      onClick={() => onPickItem?.(e.item, eventToEditorKind(e.kind))}
                      className={`flex-1 text-left text-sm ${theme.text} truncate ${theme.hover} rounded px-1`}
                    >
                      {e.item.name}
                    </button>
                    <span className={`text-xs font-semibold ${
                      amt > 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {amt > 0 ? '+' : '−'}{formatEuro(Math.abs(amt))}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Duurzaamheid (utilities.actuals)
// ============================================================================

function UtilitiesActualsSection({ utilities, setUtilities, budget, theme, monthsLong, monthsShort, utilityLabel }) {
  const { t } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [editingMonth, setEditingMonth] = useState(null);

  const expenses = budget?.expenses || [];
  const actuals = utilities?.actuals || {};

  const isFutureMonth = (m) => year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth());

  const yearTotalsActual = UTILITY_TYPES.reduce((acc, k) => { acc[k] = 0; return acc; }, {});
  const yearTotalsBudget = UTILITY_TYPES.reduce((acc, k) => { acc[k] = 0; return acc; }, {});
  for (let m = 0; m < 12; m++) {
    const mk = monthKeyFor(year, m);
    UTILITY_TYPES.forEach(k => {
      yearTotalsActual[k] += Number(actuals?.[mk]?.[k]) || 0;
      yearTotalsBudget[k] += monthlyAmountForType(expenses, mk, k);
    });
  }
  const visibleTypes = UTILITY_TYPES.filter(k => yearTotalsActual[k] > 0 || yearTotalsBudget[k] > 0);
  const totalActual = visibleTypes.reduce((s, k) => s + yearTotalsActual[k], 0);
  const totalBudget = visibleTypes.reduce((s, k) => s + yearTotalsBudget[k], 0);

  const saveMonth = (m, data) => {
    const key = monthKeyFor(year, m);
    const isEmpty = UTILITY_TYPES.every(k => data[k] == null);
    setUtilities(prev => {
      const nextActuals = { ...(prev?.actuals || {}) };
      if (isEmpty) delete nextActuals[key];
      else nextActuals[key] = data;
      return { ...prev, actuals: nextActuals };
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setYear(y => y - 1)}
          className={`p-2 rounded-lg ${theme.cardSecondary} ${theme.hover} transition`}
          aria-label={t('household.utilities.prevYearAria')}
        >
          <ChevronLeft className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
        <span className={`font-semibold ${theme.text}`}>{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          disabled={year >= now.getFullYear()}
          className={`p-2 rounded-lg ${theme.cardSecondary} ${theme.hover} transition disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label={t('household.utilities.nextYearAria')}
        >
          <ChevronRight className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
      </div>

      {visibleTypes.length === 0 ? (
        <div className={`${theme.cardSecondary} rounded-xl p-4 text-center text-sm ${theme.textMuted}`}>
          {t('household.utilities.monthEditor.empty')}
        </div>
      ) : (
        <div className={`grid ${visibleTypes.length === 1 ? 'grid-cols-1' : visibleTypes.length === 2 ? 'grid-cols-2' : visibleTypes.length === 3 ? 'grid-cols-3' : 'grid-cols-2 sm:grid-cols-4'} gap-2`}>
          {visibleTypes.map(k => {
            const Icon = UTILITY_ICON[k];
            const a = yearTotalsActual[k];
            const b = yearTotalsBudget[k];
            const diff = a - b;
            const noContract = b === 0 && a > 0;
            return (
              <div key={k} className={`${theme.cardSecondary} rounded-xl p-3`}>
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-4 h-4 ${UTILITY_COLOR[k]}`} />
                  <span className={`text-xs font-medium ${theme.textSecondary}`}>{utilityLabel(k)}</span>
                  {noContract && (
                    <span className="ml-auto" title={t('household.utilities.noContract')}>
                      <Info className={`w-3 h-3 ${theme.textMuted}`} />
                    </span>
                  )}
                </div>
                <div className={`text-sm font-semibold ${theme.text}`}>{formatEuro(a)}</div>
                <div className={`text-xs ${diff > 0 && b > 0 ? 'text-red-500' : theme.textMuted}`}>
                  {t('household.utilities.budgeted', { value: formatEuro(b) })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {monthsLong.map((mname, idx) => {
          const mk = monthKeyFor(year, idx);
          const monthActuals = actuals[mk];
          const monthHasContracts = expenses.some(e => e.utilityType && isActiveInMonth(e, mk));
          const monthActualSum = UTILITY_TYPES.reduce((s, k) => s + (Number(monthActuals?.[k]) || 0), 0);
          const monthBudgetSum = UTILITY_TYPES.reduce((s, k) => s + monthlyAmountForType(expenses, mk, k), 0);
          const hasData = !!monthActuals || monthHasContracts;
          const future = isFutureMonth(idx);
          const over = monthActualSum > monthBudgetSum && monthBudgetSum > 0;
          const disabled = future && !monthActuals && !monthHasContracts;
          return (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => setEditingMonth(idx)}
              className={`text-left p-3 rounded-xl transition ${theme.cardSecondary} ${
                disabled ? 'opacity-30 cursor-not-allowed' : theme.hover
              } ${over ? 'ring-2 ring-red-400' : ''}`}
            >
              <div className={`text-xs ${theme.textMuted} capitalize`}>{monthsShort[idx]}</div>
              <div className={`text-sm font-semibold ${over ? 'text-red-500' : theme.text}`}>
                {monthActualSum > 0 ? formatEuro(monthActualSum) : ''}
              </div>
              {hasData && monthBudgetSum > 0 && (
                <div className={`text-xs ${over ? 'text-red-500' : theme.textMuted}`}>
                  {t('household.utilities.budgeted', { value: formatEuro(monthBudgetSum) })}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className={`${theme.cardSecondary} rounded-xl p-3`}>
        <div className={`text-xs ${theme.textMuted} mb-1`}>{t('household.utilities.yearTotal')}</div>
        <div className="flex items-baseline justify-between">
          <span className={`text-lg font-semibold ${theme.text}`}>{formatEuro(totalActual)}</span>
          <span className={`text-xs ${theme.textMuted}`}>{t('household.utilities.budgeted', { value: formatEuro(totalBudget) })}</span>
        </div>
      </div>

      {editingMonth !== null && (
        <UtilityActualsMonthEditor
          theme={theme}
          year={year}
          month={editingMonth}
          monthData={actuals[monthKeyFor(year, editingMonth)] || {}}
          expenses={expenses}
          monthsLong={monthsLong}
          utilityLabel={utilityLabel}
          onCancel={() => setEditingMonth(null)}
          onSave={(d) => { saveMonth(editingMonth, d); setEditingMonth(null); }}
        />
      )}
    </div>
  );
}

function UtilityActualsMonthEditor({ theme, year, month, monthData, expenses, monthsLong, utilityLabel, onCancel, onSave }) {
  const { t } = useTranslation();
  const monthKey = monthKeyFor(year, month);

  const [draft, setDraft] = useState(() => {
    const out = {};
    UTILITY_TYPES.forEach(k => {
      out[k] = monthData?.[k] != null ? String(monthData[k]).replace('.', ',') : '';
    });
    return out;
  });

  const update = (k, val) => setDraft(prev => ({ ...prev, [k]: val }));

  const visibleTypes = UTILITY_TYPES.filter(k => {
    const hasContract = expenses.some(e => e.utilityType === k && isActiveInMonth(e, monthKey));
    const hasActual = monthData?.[k] != null;
    return hasContract || hasActual;
  });

  const save = () => {
    const out = {};
    UTILITY_TYPES.forEach(k => {
      const trimmed = (draft[k] || '').trim();
      if (trimmed === '') {
        out[k] = null;
      } else {
        const n = parseEuroInput(trimmed);
        out[k] = Number.isFinite(n) ? n : null;
      }
    });
    onSave(out);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`${theme.card} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme.border}`}>
          <div>
            <h3 className={`font-semibold ${theme.text} capitalize`}>{monthsLong[month]} {year}</h3>
            <div className={`text-xs ${theme.textMuted}`}>{t('household.utilities.monthEditor.subtitle')}</div>
          </div>
          <button onClick={onCancel} className={`p-1 rounded ${theme.hover}`}>
            <X className={`w-5 h-5 ${theme.textMuted}`} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          {visibleTypes.length === 0 ? (
            <p className={`text-sm ${theme.textMuted} text-center py-4`}>{t('household.utilities.monthEditor.empty')}</p>
          ) : (
            visibleTypes.map(k => {
              const Icon = UTILITY_ICON[k];
              const budgetValue = monthlyAmountForType(expenses, monthKey, k);
              const activeContracts = expenses.filter(e => e.utilityType === k && isActiveInMonth(e, monthKey));
              const actualValue = parseEuroInput(draft[k] || '');
              const over = budgetValue > 0 && actualValue > budgetValue;
              const noContract = budgetValue === 0;
              return (
                <div key={k} className={`${theme.cardSecondary} rounded-xl p-3 ${over ? 'ring-2 ring-red-400' : ''}`}>
                  <div className="flex items-center gap-2 mb-2">
                    <Icon className={`w-4 h-4 ${UTILITY_COLOR[k]}`} />
                    <span className={`text-sm font-medium ${theme.textSecondary}`}>{utilityLabel(k)}</span>
                    {noContract && (
                      <span className={`text-[10px] ${theme.textMuted} ml-auto`}>{t('household.utilities.noContract')}</span>
                    )}
                    {over && <span className="ml-auto text-xs text-red-500 font-medium">{t('household.utilities.over')}</span>}
                  </div>
                  {budgetValue > 0 && (
                    <div className={`text-xs ${theme.textMuted} mb-1`}>
                      {t('household.utilities.budgeted', { value: formatEuro(budgetValue) })}
                    </div>
                  )}
                  {activeContracts.length > 0 && (
                    <ul className="space-y-1 mb-2">
                      {activeContracts.map(c => (
                        <li key={c.id} className={`flex items-center gap-2 text-xs px-2 py-1 rounded ${theme.card}`}>
                          <span className={`flex-1 truncate ${theme.textSecondary}`}>{c.name}</span>
                          <span className={`font-semibold ${theme.textSecondary}`}>{formatEuro(c.amount)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={draft[k]}
                    onChange={e => update(k, e.target.value)}
                    placeholder="0,00"
                    className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm ${over ? 'text-red-500 font-semibold' : ''}`}
                  />
                </div>
              );
            })
          )}
        </div>
        <div className={`flex gap-2 p-4 border-t ${theme.border}`}>
          <button
            onClick={onCancel}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} ${theme.hover} transition`}
          >
            {t('household.utilities.cancel')}
          </button>
          <button
            onClick={save}
            className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
