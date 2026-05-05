import React, { useEffect, useMemo, useState } from 'react';
import {
  Home, ChevronDown, ChevronUp,
  Plus, Trash2, Check, Star, AlertCircle, ChevronLeft, ChevronRight, Edit3, X,
  ShoppingCart, Coffee, Utensils, Zap, Droplet, Wifi, Phone, Car, Film, Music, Book, Heart, Gift, Dumbbell, Flame, Plane, Fuel, BadgeEuro, GraduationCap, Briefcase,
} from 'lucide-react';
import useStoredState from '../hooks/useStoredState';
import {
  toMonthly, isOverdue, daysUntilDue, formatRelativeDate, formatEuro, parseEuroInput,
  reconcileUtilitiesAuto, totalActualOf, autoSumOf,
  eventsForMonth, netForDay, netForMonth,
} from '../utils/household';
import { useTranslation, getLocale } from '../i18n/useTranslation';

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

const BUDGET_ICONS = {
  Home, ShoppingCart, Coffee, Utensils, Zap, Droplet, Wifi, Phone, Car, Film,
  Music, Book, Heart, Gift, Dumbbell, Flame, Plane, Fuel, BadgeEuro, GraduationCap, Briefcase,
};
const BUDGET_ICON_KEYS = Object.keys(BUDGET_ICONS);

const UTILITY_KEYS = ['water', 'electricity', 'gas'];
const UTILITY_ICON = { water: Droplet, electricity: Zap, gas: Flame };
const UTILITY_COLOR = { water: 'text-sky-500', electricity: 'text-amber-500', gas: 'text-orange-500' };

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

export default function HouseholdView({ theme, darkMode }) {
  const { t, language } = useTranslation();
  const names = useMemo(() => buildLocalizedNames(language), [language]);
  const utilityLabel = (k) => k === 'water'
    ? t('household.utilities.water')
    : k === 'electricity'
      ? t('household.utilities.electricity')
      : t('household.utilities.gas');

  const [expanded, setExpanded] = useState({
    chores: true, groceries: false, budget: false, utilities: false,
  });
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const [chores, setChores] = useStoredState('household:chores', []);
  const [groceries, setGroceries] = useStoredState('household:groceries', { items: [], shopDay: null });
  const [budget, setBudget] = useStoredState('household:budget', { income: [], expenses: [] });
  const [utilities, setUtilities] = useStoredState('household:utilities', {});
  const [config, setConfig] = useStoredState('household:config', { energyCombined: false });

  // Reconcile auto-projection of utility-tagged budget items into the
  // utilities storage. reconcileUtilitiesAuto returns the same reference
  // when nothing changed, so listing utilities as a dep is safe — needed
  // to handle the case where utilities loads from storage after expenses.
  useEffect(() => {
    setUtilities(prev => reconcileUtilitiesAuto(prev, budget.expenses || []));
  }, [budget.expenses, utilities, setUtilities]);

  const overdueCount = chores.filter(isOverdue).length;
  const groceriesCount = (groceries.items || []).filter(i => !i.checked).length;
  const monthlyIncome = (budget.income || []).reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyExpenses = (budget.expenses || []).reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyNet = monthlyIncome - monthlyExpenses;
  const utilitiesYearKey = String(new Date().getFullYear());
  const utilitiesYearActual = Object.entries(utilities)
    .filter(([k]) => k.startsWith(utilitiesYearKey + '-'))
    .reduce((s, [, m]) => s + UTILITY_KEYS.reduce((ms, uk) => ms + totalActualOf(m?.[uk]), 0), 0);

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
        title={t('household.budget.title')}
        meta={t('household.budget.meta', { value: formatEuro(monthlyNet) })}
        expanded={expanded.budget}
        onToggle={() => toggle('budget')}
      >
        <BudgetSection budget={budget} setBudget={setBudget} config={config} theme={theme} darkMode={darkMode} monthsLong={names.monthsLong} monthsShort={names.monthsShort} dayLabels={names.dayLabels} />
      </Section>

      <Section
        theme={theme}
        icon={<Zap className="w-4 h-4 text-amber-500" />}
        title={t('household.utilities.title')}
        meta={t('household.utilities.yearMeta', { value: formatEuro(utilitiesYearActual) })}
        expanded={expanded.utilities}
        onToggle={() => toggle('utilities')}
      >
        <UtilitiesSection
          utilities={utilities}
          setUtilities={setUtilities}
          budget={budget}
          config={config}
          setConfig={setConfig}
          theme={theme}
          darkMode={darkMode}
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
// Budget
// ============================================================================

function BudgetSection({ budget, setBudget, config, theme, darkMode, monthsLong, monthsShort, dayLabels }) {
  const { t } = useTranslation();
  const [view, setView] = useState('list'); // 'list' | 'calendar'
  const [editing, setEditing] = useState(null); // { kind: 'income'|'expenses', item: { ... } }
  const [adding, setAdding] = useState(null); // 'income' | 'expenses' | null
  const [energyExpanded, setEnergyExpanded] = useState(false);

  const income = budget.income || [];
  const expenses = budget.expenses || [];
  const hasGas = expenses.some(x => x.isUtility === 'gas');
  const hasElectric = expenses.some(x => x.isUtility === 'electric');
  const energyCombined = !!config?.energyCombined && hasGas && hasElectric;

  const monthlyIncome = income.reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyExpenses = expenses.reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyNet = monthlyIncome - monthlyExpenses;

  const upsert = (kind, item) => {
    setBudget(prev => {
      const list = prev[kind] || [];
      const exists = list.some(x => x.id === item.id);
      const updated = exists
        ? list.map(x => x.id === item.id ? item : x)
        : [...list, item];
      return { ...prev, [kind]: updated };
    });
  };

  const remove = (kind, id) => {
    setBudget(prev => ({
      ...prev,
      [kind]: (prev[kind] || []).filter(x => x.id !== id),
    }));
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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat theme={theme} label={t('household.budget.income')} value={formatEuro(monthlyIncome)} accent="text-emerald-500" />
        <Stat theme={theme} label={t('household.budget.expenses')} value={formatEuro(monthlyExpenses)} accent="text-rose-500" />
        <Stat theme={theme} label={t('household.budget.net')} value={formatEuro(monthlyNet)} accent={monthlyNet < 0 ? 'text-amber-500' : 'text-blue-500'} />
      </div>

      <div className="flex gap-2">
        {tabBtn('list', t('household.budget.tabList'))}
        {tabBtn('calendar', t('household.budget.tabCalendar'))}
      </div>

      {view === 'list' && (
        <>
          <BudgetList
            title={t('household.budget.income')}
            items={income}
            kind="income"
            theme={theme}
            onEdit={(item) => setEditing({ kind: 'income', item })}
            onAdd={() => setAdding('income')}
            onDelete={(id) => remove('income', id)}
          />

          <BudgetList
            title={t('household.budget.expenses')}
            items={expenses}
            kind="expenses"
            theme={theme}
            onEdit={(item) => setEditing({ kind: 'expenses', item })}
            onAdd={() => setAdding('expenses')}
            onDelete={(id) => remove('expenses', id)}
            energyCombined={energyCombined}
            energyExpanded={energyExpanded}
            onToggleEnergy={() => setEnergyExpanded(v => !v)}
          />
        </>
      )}

      {view === 'calendar' && (
        <BudgetCalendarSection
          budget={budget}
          theme={theme}
          darkMode={darkMode}
          monthsLong={monthsLong}
          dayLabels={dayLabels}
          onPickItem={(item, kind) => setEditing({ kind, item })}
        />
      )}

      {(editing || adding) && (
        <BudgetEditor
          theme={theme}
          darkMode={darkMode}
          kind={editing?.kind || adding}
          initial={editing?.item}
          monthsLong={monthsLong}
          dayLabels={dayLabels}
          onCancel={() => { setEditing(null); setAdding(null); }}
          onSave={(item) => {
            const kind = editing?.kind || adding;
            upsert(kind, item);
            setEditing(null);
            setAdding(null);
          }}
        />
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

function BudgetList({
  title, items, theme, onEdit, onAdd, onDelete,
  energyCombined = false, energyExpanded = false, onToggleEnergy,
}) {
  const { t } = useTranslation();
  const energyItems = energyCombined
    ? items.filter(i => i.isUtility === 'gas' || i.isUtility === 'electric')
    : [];
  const otherItems = energyCombined
    ? items.filter(i => i.isUtility !== 'gas' && i.isUtility !== 'electric')
    : items;
  const energyMonthlyTotal = energyItems.reduce(
    (s, i) => s + toMonthly(i.amount, i.frequency), 0
  );

  const renderItem = (item, opts = {}) => {
    const Icon = BUDGET_ICONS[item.icon] || BadgeEuro;
    const monthly = toMonthly(item.amount, item.frequency);
    return (
      <li
        key={item.id}
        className={`flex items-center gap-3 p-3 rounded-xl ${opts.nested ? theme.card : theme.cardSecondary}`}
      >
        <Icon className={`w-5 h-5 ${theme.textSecondary} shrink-0`} />
        <div className="flex-1 min-w-0">
          <div className={`text-sm font-medium ${theme.text} truncate`}>{item.name}</div>
          <div className={`text-xs ${theme.textMuted}`}>
            {formatEuro(item.amount)} {freqLabel(item.frequency, t)}
            {item.frequency !== 'monthly' && (
              <> &middot; {t('household.budget.reserveSuffix', { value: formatEuro(monthly) })}</>
            )}
          </div>
        </div>
        <button
          onClick={() => onEdit(item)}
          className={`p-1.5 rounded-lg ${theme.textMuted} ${theme.hover} transition`}
          aria-label={t('household.budget.editAria')}
        >
          <Edit3 className="w-4 h-4" />
        </button>
        <button
          onClick={() => onDelete(item.id)}
          className={`p-1.5 rounded-lg ${theme.textMuted} ${theme.hover} transition`}
          aria-label={t('household.budget.removeAria')}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </li>
    );
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{title}</h3>
        <button
          onClick={onAdd}
          className="px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> {t('common.add')}
        </button>
      </div>
      {items.length === 0 ? (
        <p className={`text-xs ${theme.textMuted} text-center py-3`}>{t('household.budget.empty')}</p>
      ) : (
        <ul className="space-y-1">
          {energyCombined && energyItems.length > 0 && (
            <li className={`rounded-xl ${theme.cardSecondary}`}>
              <button
                onClick={onToggleEnergy}
                className="w-full flex items-center gap-3 p-3 text-left"
                aria-expanded={energyExpanded}
              >
                <Zap className={`w-5 h-5 text-orange-500 shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${theme.text}`}>{t('household.budget.energy')}</div>
                  <div className={`text-xs ${theme.textMuted}`}>
                    {t('household.budget.energyMonthlyDesc', { value: formatEuro(energyMonthlyTotal) })}
                  </div>
                </div>
                {energyExpanded
                  ? <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
                  : <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />}
              </button>
              {energyExpanded && (
                <ul className="px-2 pb-2 space-y-1">
                  {energyItems.map(item => renderItem(item, { nested: true }))}
                </ul>
              )}
            </li>
          )}
          {otherItems.map(item => renderItem(item))}
        </ul>
      )}
    </div>
  );
}

function freqLabel(f, t) {
  return f === 'weekly'
    ? t('household.budget.perWeek')
    : f === 'yearly'
      ? t('household.budget.perYear')
      : t('household.budget.perMonth');
}

function BudgetEditor({ theme, darkMode, kind, initial, monthsLong, dayLabels, onCancel, onSave }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || '');
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace('.', ',') : '');
  const [frequency, setFrequency] = useState(initial?.frequency || 'monthly');
  const [icon, setIcon] = useState(initial?.icon || (kind === 'income' ? 'BadgeEuro' : 'ShoppingCart'));
  const [isUtility, setIsUtility] = useState(initial?.isUtility || '');
  const [dueDay, setDueDay] = useState(
    initial?.dueDay != null ? String(initial.dueDay) : ''
  );
  const [dueMonth, setDueMonth] = useState(
    initial?.dueMonth != null ? String(initial.dueMonth) : ''
  );
  const [dueWeekday, setDueWeekday] = useState(
    initial?.dueWeekday != null ? String(initial.dueWeekday) : '1'
  );

  const isExpense = kind === 'expenses';
  const supportsAuto = isExpense && (frequency === 'monthly' || frequency === 'yearly');
  const isWeekly = frequency === 'weekly';

  // dayLabels is Sunday-first: index 0 = Sunday, 1..6 = Monday..Saturday.
  // ISO weekday is Monday-first: 1..7 = Monday..Sunday. Map ISO 7 → index 0.
  const isoDayLabel = (iso) => (dayLabels && dayLabels[iso === 7 ? 0 : iso]) || String(iso);

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedAmount = parseEuroInput(amount);
    const parsedDay = supportsAuto && dueDay !== ''
      ? Math.min(28, Math.max(1, parseInt(dueDay, 10) || 1))
      : null;
    const parsedMonth = supportsAuto && frequency === 'yearly' && dueMonth !== ''
      ? Math.min(12, Math.max(1, parseInt(dueMonth, 10) || 1))
      : null;
    const parsedWeekday = isWeekly
      ? Math.min(7, Math.max(1, parseInt(dueWeekday, 10) || 1))
      : null;
    onSave({
      id: initial?.id || newId(),
      name: trimmed,
      amount: parsedAmount,
      frequency,
      icon,
      ...(isExpense && isUtility ? { isUtility } : {}),
      ...(parsedDay != null ? { dueDay: parsedDay } : {}),
      ...(parsedMonth != null ? { dueMonth: parsedMonth } : {}),
      ...(parsedWeekday != null ? { dueWeekday: parsedWeekday } : {}),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`${theme.card} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme.border}`}>
          <h3 className={`font-semibold ${theme.text}`}>
            {initial ? t('household.budget.editor.editTitle') : t('household.budget.editor.addTitle')} &middot; {kind === 'income' ? t('household.budget.editor.incomeLabel') : t('household.budget.editor.expenseLabel')}
          </h3>
          <button onClick={onCancel} className={`p-1 rounded ${theme.hover}`}>
            <X className={`w-5 h-5 ${theme.textMuted}`} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('common.name')}</label>
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
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.budget.editor.amount')}</label>
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
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.budget.editor.frequency')}</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
              >
                <option value="weekly">{t('household.budget.editor.freqWeekly')}</option>
                <option value="monthly">{t('household.budget.editor.freqMonthly')}</option>
                <option value="yearly">{t('household.budget.editor.freqYearly')}</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('common.icon')}</label>
            <div className={`grid grid-cols-7 gap-1 max-h-36 overflow-y-auto p-2 rounded-lg ${theme.cardSecondary}`}>
              {BUDGET_ICON_KEYS.map(key => {
                const Icon = BUDGET_ICONS[key];
                const selected = icon === key;
                return (
                  <button
                    key={key}
                    onClick={() => setIcon(key)}
                    className={`aspect-square flex items-center justify-center rounded-lg transition ${
                      selected
                        ? 'bg-blue-500 text-white'
                        : `${theme.textSecondary} ${theme.hover}`
                    }`}
                    aria-label={key}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>
          {isExpense && (
            <div>
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.budget.editor.utilityCategory')}</label>
              <select
                value={isUtility}
                onChange={e => setIsUtility(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
              >
                <option value="">{t('household.budget.editor.utilityNone')}</option>
                <option value="gas">{t('household.budget.editor.utilityGas')}</option>
                <option value="electric">{t('household.budget.editor.utilityElectric')}</option>
                <option value="water">{t('household.budget.editor.utilityWater')}</option>
              </select>
              <p className={`text-[11px] ${theme.textMuted} mt-1`}>
                {t('household.budget.editor.utilityHint')}
              </p>
            </div>
          )}
          {supportsAuto && (
            <div className={frequency === 'yearly' ? 'grid grid-cols-2 gap-2' : ''}>
              <div>
                <label className={`text-xs ${theme.textMuted} block mb-1`}>
                  {frequency === 'yearly' ? t('household.budget.editor.dueDayYearly') : t('household.budget.editor.dueDayMonthly')}
                </label>
                <input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={28}
                  value={dueDay}
                  onChange={e => setDueDay(e.target.value)}
                  placeholder="1-28"
                  className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
                />
              </div>
              {frequency === 'yearly' && (
                <div>
                  <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.budget.editor.dueMonth')}</label>
                  <select
                    value={dueMonth}
                    onChange={e => setDueMonth(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
                  >
                    <option value="">{t('common.pickMonth')}</option>
                    {monthsLong.map((m, i) => (
                      <option key={i} value={i + 1}>{m}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
          {isWeekly && (
            <div>
              <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.budget.editor.dueWeekday')}</label>
              <select
                value={dueWeekday}
                onChange={e => setDueWeekday(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
              >
                {[1, 2, 3, 4, 5, 6, 7].map(iso => (
                  <option key={iso} value={iso}>{isoDayLabel(iso)}</option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className={`flex gap-2 p-4 border-t ${theme.border}`}>
          <button
            onClick={onCancel}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${theme.cardSecondary} ${theme.textSecondary} ${theme.hover} transition`}
          >
            {t('household.budget.editor.cancel')}
          </button>
          <button
            onClick={save}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
          >
            {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

function BudgetCalendarSection({ budget, theme, darkMode, monthsLong, dayLabels, onPickItem }) {
  const { t } = useTranslation();
  const today = new Date();
  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDay, setSelectedDay] = useState(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const eventsByDay = useMemo(() => eventsForMonth(budget, year, month), [budget, year, month]);
  const monthlyNet = useMemo(() => netForMonth(eventsByDay), [eventsByDay]);

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isCurrentMonth =
    today.getFullYear() === year && today.getMonth() === month;

  // Monday-first weekday header. dayLabels is Sunday-first (0..6 = Sun..Sat).
  // We want index ordering 1, 2, 3, 4, 5, 6, 0 → Mon, Tue, ..., Sun.
  const headerOrder = [1, 2, 3, 4, 5, 6, 0];

  const selectedEvents = selectedDay != null ? (eventsByDay[selectedDay] || []) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setCursor(new Date(year, month - 1, 1)); setSelectedDay(null); }}
          className={`p-2 rounded-lg ${theme.hover}`}
          aria-label={t('household.budget.calendar.prevMonthAria')}
        >
          <ChevronLeft className={`w-4 h-4 ${theme.textSecondary}`} />
        </button>
        <h4 className={`text-sm font-semibold ${theme.textSecondary}`}>
          {monthsLong[month]} {year}
        </h4>
        <button
          onClick={() => { setCursor(new Date(year, month + 1, 1)); setSelectedDay(null); }}
          className={`p-2 rounded-lg ${theme.hover}`}
          aria-label={t('household.budget.calendar.nextMonthAria')}
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
        <span className={`text-xs ${theme.textMuted}`}>{t('household.budget.netThisMonth')}</span>
        <span className={`text-sm font-semibold ${
          monthlyNet < 0 ? 'text-rose-500' : monthlyNet > 0 ? 'text-emerald-500' : theme.textSecondary
        }`}>
          {monthlyNet > 0 ? '+' : monthlyNet < 0 ? '−' : ''}{formatEuro(Math.abs(monthlyNet))}
        </span>
      </div>

      {selectedDay != null && (
        <div className={`p-3 rounded-xl ${theme.card} border ${theme.border} space-y-2`}>
          <div className={`text-xs ${theme.textMuted}`}>
            {selectedDay} {monthsLong[month]} {year}
          </div>
          {selectedEvents.length === 0 ? (
            <p className={`text-xs ${theme.textMuted}`}>{t('household.budget.noEventsThisDay')}</p>
          ) : (
            <ul className="space-y-1">
              {selectedEvents.map((e, idx) => {
                const Icon = BUDGET_ICONS[e.item.icon] || BadgeEuro;
                const sign = e.kind === 'income' ? 1 : -1;
                const amount = sign * (Number(e.item.amount) || 0);
                const itemKind = e.kind === 'income' ? 'income' : 'expenses';
                return (
                  <li
                    key={`${e.item.id}-${idx}`}
                    className={`flex items-center gap-2 p-2 rounded-lg ${theme.cardSecondary}`}
                  >
                    <Icon className={`w-4 h-4 ${e.kind === 'income' ? 'text-emerald-500' : theme.textSecondary} shrink-0`} />
                    <button
                      onClick={() => onPickItem?.(e.item, itemKind)}
                      className={`flex-1 text-left text-sm ${theme.text} truncate ${theme.hover} rounded px-1`}
                    >
                      {e.item.name}
                    </button>
                    <span className={`text-xs font-semibold ${
                      amount > 0 ? 'text-emerald-500' : 'text-rose-500'
                    }`}>
                      {amount > 0 ? '+' : '−'}{formatEuro(Math.abs(amount))}
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
// Duurzaamheid
// ============================================================================

function UtilitiesSection({ utilities, setUtilities, budget, config, setConfig, theme, darkMode, monthsLong, monthsShort, utilityLabel }) {
  const { t } = useTranslation();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [editingMonth, setEditingMonth] = useState(null); // 0-11 or null

  const isFutureMonth = (m) => year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth());

  const expenses = budget?.expenses || [];
  const hasGasBudget = expenses.some(x => x.isUtility === 'gas');
  const hasElectricBudget = expenses.some(x => x.isUtility === 'electric');
  const canCombine = hasGasBudget && hasElectricBudget;
  const energyCombined = !!config?.energyCombined && canCombine;

  const yearTotals = UTILITY_KEYS.reduce((acc, k) => {
    acc[k] = { actual: 0, budget: 0 };
    return acc;
  }, {});
  for (let m = 0; m < 12; m++) {
    const data = utilities[monthKey(year, m)] || {};
    UTILITY_KEYS.forEach(k => {
      yearTotals[k].actual += totalActualOf(data[k]);
      yearTotals[k].budget += data[k]?.budget || 0;
    });
  }
  const totalActual = UTILITY_KEYS.reduce((s, k) => s + yearTotals[k].actual, 0);
  const totalBudget = UTILITY_KEYS.reduce((s, k) => s + yearTotals[k].budget, 0);

  const displayKeys = energyCombined ? ['water', 'energy'] : UTILITY_KEYS;
  const totalsFor = (k) => k === 'energy'
    ? {
        actual: yearTotals.gas.actual + yearTotals.electricity.actual,
        budget: yearTotals.gas.budget + yearTotals.electricity.budget,
      }
    : yearTotals[k];
  const labelFor = (k) => k === 'energy' ? t('household.utilities.energyLabel') : utilityLabel(k);
  const iconFor = (k) => k === 'energy' ? Zap : UTILITY_ICON[k];
  const colorFor = (k) => k === 'energy' ? 'text-orange-500' : UTILITY_COLOR[k];

  const saveMonth = (m, data) => {
    const key = monthKey(year, m);
    const isEmpty = UTILITY_KEYS.every(k => {
      const v = data[k];
      return !v || ((!v.budget || v.budget === 0) && (!v.actual || v.actual === 0));
    });
    setUtilities(prev => {
      const next = { ...prev };
      if (isEmpty) {
        delete next[key];
      } else {
        next[key] = data;
      }
      return next;
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

      {canCombine && (
        <div className="flex justify-center">
          <button
            onClick={() => setConfig(prev => ({ ...(prev || {}), energyCombined: !energyCombined }))}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition ${
              energyCombined ? 'bg-orange-500 text-white' : `${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`
            }`}
            aria-pressed={energyCombined}
          >
            <Zap className="w-3.5 h-3.5" />
            {energyCombined ? t('household.utilities.combined') : t('household.utilities.separate')}
          </button>
        </div>
      )}

      <div className={`grid ${displayKeys.length === 2 ? 'grid-cols-2' : 'grid-cols-3'} gap-2`}>
        {displayKeys.map(k => {
          const Icon = iconFor(k);
          const totals = totalsFor(k);
          const a = totals.actual;
          const b = totals.budget;
          const diff = a - b;
          return (
            <div key={k} className={`${theme.cardSecondary} rounded-xl p-3`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-4 h-4 ${colorFor(k)}`} />
                <span className={`text-xs font-medium ${theme.textSecondary}`}>{labelFor(k)}</span>
              </div>
              <div className={`text-sm font-semibold ${theme.text}`}>{formatEuro(a)}</div>
              <div className={`text-xs ${diff > 0 ? 'text-red-500' : theme.textMuted}`}>
                {t('household.utilities.budgetedSummary', { value: formatEuro(b) })}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {monthsLong.map((mname, idx) => {
          const data = utilities[monthKey(year, idx)];
          const future = isFutureMonth(idx);
          const hasData = !!data;
          const monthActual = data ? UTILITY_KEYS.reduce((s, k) => s + totalActualOf(data[k]), 0) : 0;
          const monthBudget = data ? UTILITY_KEYS.reduce((s, k) => s + (data[k]?.budget || 0), 0) : 0;
          const over = hasData && monthActual > monthBudget && monthBudget > 0;
          const disabled = future && !hasData;
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
                {hasData ? formatEuro(monthActual) : ''}
              </div>
              {hasData && (
                <div className={`text-xs ${over ? 'text-red-500' : theme.textMuted}`}>
                  {t('household.utilities.monthBudget', { value: formatEuro(monthBudget) })}
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
          <span className={`text-xs ${theme.textMuted}`}>{t('household.utilities.budgetedSummary', { value: formatEuro(totalBudget) })}</span>
        </div>
      </div>

      {editingMonth !== null && (
        <UtilityMonthEditor
          theme={theme}
          year={year}
          month={editingMonth}
          data={utilities[monthKey(year, editingMonth)] || {}}
          monthsLong={monthsLong}
          utilityLabel={utilityLabel}
          onCancel={() => setEditingMonth(null)}
          onSave={(d) => { saveMonth(editingMonth, d); setEditingMonth(null); }}
        />
      )}
    </div>
  );
}

function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function UtilityMonthEditor({ theme, year, month, data, monthsLong, utilityLabel, onCancel, onSave }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState(() => {
    const out = {};
    UTILITY_KEYS.forEach(k => {
      out[k] = {
        budget: data[k]?.budget != null ? String(data[k].budget).replace('.', ',') : '',
        actual: data[k]?.actual != null ? String(data[k].actual).replace('.', ',') : '',
      };
    });
    return out;
  });

  const update = (k, field, val) => {
    setDraft(prev => ({ ...prev, [k]: { ...prev[k], [field]: val } }));
  };

  const save = () => {
    const out = {};
    UTILITY_KEYS.forEach(k => {
      const b = parseEuroInput(draft[k].budget);
      const a = parseEuroInput(draft[k].actual);
      const auto = data[k]?.autoFromBudget;
      const hasAuto = auto && Object.keys(auto).length > 0;
      if (b > 0 || a > 0 || hasAuto) {
        out[k] = { budget: b, actual: a, ...(hasAuto ? { autoFromBudget: auto } : {}) };
      }
    });
    onSave(out);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`${theme.card} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl`}>
        <div className={`flex items-center justify-between p-4 border-b ${theme.border}`}>
          <h3 className={`font-semibold ${theme.text} capitalize`}>
            {monthsLong[month]} {year}
          </h3>
          <button onClick={onCancel} className={`p-1 rounded ${theme.hover}`}>
            <X className={`w-5 h-5 ${theme.textMuted}`} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {UTILITY_KEYS.map(k => {
            const Icon = UTILITY_ICON[k];
            const b = parseEuroInput(draft[k].budget);
            const a = parseEuroInput(draft[k].actual);
            const auto = autoSumOf(data[k]);
            const total = a + auto;
            const over = total > b && b > 0;
            return (
              <div key={k} className={`${theme.cardSecondary} rounded-xl p-3 ${over ? 'ring-2 ring-red-400' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${UTILITY_COLOR[k]}`} />
                  <span className={`text-sm font-medium ${theme.textSecondary}`}>{utilityLabel(k)}</span>
                  {over && <span className="ml-auto text-xs text-red-500 font-medium">{t('household.utilities.overBudget')}</span>}
                </div>
                {auto > 0 && (
                  <div className={`text-xs ${theme.textMuted} mb-2`}>
                    {t('household.utilities.autoFromBudget')} <span className={`font-semibold ${theme.textSecondary}`}>{formatEuro(auto)}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${theme.textMuted} block mb-1`}>{t('household.utilities.budget')}</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft[k].budget}
                      onChange={e => update(k, 'budget', e.target.value)}
                      placeholder="0,00"
                      className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${theme.textMuted} block mb-1`}>
                      {auto > 0 ? t('household.utilities.extraActual') : t('household.utilities.actual')}
                    </label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft[k].actual}
                      onChange={e => update(k, 'actual', e.target.value)}
                      placeholder="0,00"
                      className={`w-full px-3 py-2 rounded-lg ${theme.input} outline-none text-sm ${over ? 'text-red-500 font-semibold' : ''}`}
                    />
                  </div>
                </div>
                {auto > 0 && (
                  <div className={`text-xs ${theme.textMuted} mt-2`}>
                    {t('household.utilities.totalActual')} <span className={`font-semibold ${over ? 'text-red-500' : theme.textSecondary}`}>{formatEuro(total)}</span>
                  </div>
                )}
              </div>
            );
          })}
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
