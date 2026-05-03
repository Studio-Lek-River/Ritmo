import React, { useState } from 'react';
import {
  Home, ChevronDown, ChevronUp,
  Plus, Trash2, Check, Star, AlertCircle, ChevronLeft, ChevronRight, Edit3, X,
  ShoppingCart, Coffee, Utensils, Zap, Droplet, Wifi, Phone, Car, Film, Music, Book, Heart, Gift, Dumbbell, Flame, Plane, Fuel, BadgeEuro, GraduationCap, Briefcase,
} from 'lucide-react';
import useStoredState from '../hooks/useStoredState';
import {
  toMonthly, isOverdue, daysUntilDue, formatRelativeDate, formatEuro, parseEuroInput,
} from '../utils/household';

const newId = () => (typeof crypto !== 'undefined' && crypto.randomUUID
  ? crypto.randomUUID()
  : `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

const BUDGET_ICONS = {
  Home, ShoppingCart, Coffee, Utensils, Zap, Droplet, Wifi, Phone, Car, Film,
  Music, Book, Heart, Gift, Dumbbell, Flame, Plane, Fuel, BadgeEuro, GraduationCap, Briefcase,
};
const BUDGET_ICON_KEYS = Object.keys(BUDGET_ICONS);

const UTILITY_KEYS = ['water', 'electricity', 'gas'];
const UTILITY_LABEL = { water: 'Water', electricity: 'Elektra', gas: 'Gas' };
const UTILITY_ICON = { water: Droplet, electricity: Zap, gas: Flame };
const UTILITY_COLOR = { water: 'text-sky-500', electricity: 'text-amber-500', gas: 'text-orange-500' };

const NL_MONTHS = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
const NL_MONTHS_SHORT = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
const DAY_LABELS = ['zondag', 'maandag', 'dinsdag', 'woensdag', 'donderdag', 'vrijdag', 'zaterdag'];

export default function HouseholdView({ t, darkMode }) {
  const [expanded, setExpanded] = useState({
    chores: true, groceries: false, budget: false, utilities: false,
  });
  const toggle = (key) => setExpanded(prev => ({ ...prev, [key]: !prev[key] }));

  const [chores, setChores] = useStoredState('household:chores', []);
  const [groceries, setGroceries] = useStoredState('household:groceries', { items: [], shopDay: null });
  const [budget, setBudget] = useStoredState('household:budget', { income: [], expenses: [] });
  const [utilities, setUtilities] = useStoredState('household:utilities', {});

  const overdueCount = chores.filter(isOverdue).length;
  const groceriesCount = (groceries.items || []).filter(i => !i.checked).length;
  const monthlyIncome = (budget.income || []).reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyExpenses = (budget.expenses || []).reduce((s, i) => s + toMonthly(i.amount, i.frequency), 0);
  const monthlyNet = monthlyIncome - monthlyExpenses;
  const utilitiesYearKey = String(new Date().getFullYear());
  const utilitiesYearActual = Object.entries(utilities)
    .filter(([k]) => k.startsWith(utilitiesYearKey + '-'))
    .reduce((s, [, m]) => s + UTILITY_KEYS.reduce((ms, uk) => ms + (m?.[uk]?.actual || 0), 0), 0);

  return (
    <div className="slide-in space-y-3">
      <Section
        t={t}
        icon={<Home className="w-4 h-4 text-blue-500" />}
        title="Klusjes"
        meta={overdueCount > 0 ? `${overdueCount} achterstallig` : `${chores.length} totaal`}
        expanded={expanded.chores}
        onToggle={() => toggle('chores')}
      >
        <ChoresSection chores={chores} setChores={setChores} t={t} />
      </Section>

      <Section
        t={t}
        icon={<ShoppingCart className="w-4 h-4 text-emerald-500" />}
        title="Boodschappen"
        meta={`${groceriesCount} open`}
        expanded={expanded.groceries}
        onToggle={() => toggle('groceries')}
      >
        <GroceriesSection groceries={groceries} setGroceries={setGroceries} t={t} />
      </Section>

      <Section
        t={t}
        icon={<BadgeEuro className="w-4 h-4 text-violet-500" />}
        title="Budget"
        meta={`netto ${formatEuro(monthlyNet)}/mnd`}
        expanded={expanded.budget}
        onToggle={() => toggle('budget')}
      >
        <BudgetSection budget={budget} setBudget={setBudget} t={t} darkMode={darkMode} />
      </Section>

      <Section
        t={t}
        icon={<Zap className="w-4 h-4 text-amber-500" />}
        title="Duurzaamheid"
        meta={`${formatEuro(utilitiesYearActual)} dit jaar`}
        expanded={expanded.utilities}
        onToggle={() => toggle('utilities')}
      >
        <UtilitiesSection utilities={utilities} setUtilities={setUtilities} t={t} darkMode={darkMode} />
      </Section>
    </div>
  );
}

function Section({ t, icon, title, meta, expanded, onToggle, children }) {
  return (
    <div className={`${t.card} rounded-2xl shadow-sm overflow-hidden`}>
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-3 p-4 ${t.hover} transition`}
      >
        <span className="flex items-center gap-2">
          {icon}
          <span className={`font-semibold ${t.text}`}>{title}</span>
        </span>
        <span className={`text-xs ${t.textMuted} ml-auto`}>{meta}</span>
        {expanded
          ? <ChevronUp className={`w-4 h-4 ${t.textMuted}`} />
          : <ChevronDown className={`w-4 h-4 ${t.textMuted}`} />}
      </button>
      {expanded && (
        <div className={`p-4 pt-0 border-t ${t.border}`}>
          <div className="pt-4">{children}</div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Klusjes
// ============================================================================

function ChoresSection({ chores, setChores, t }) {
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
      <div className={`${t.cardSecondary} rounded-xl p-3 space-y-2`}>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && add()}
          placeholder="Nieuwe klus"
          className={`w-full px-3 py-2 rounded-lg ${t.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
        />
        <div className="flex gap-2">
          <select
            value={recurrence}
            onChange={e => setRecurrence(e.target.value)}
            className={`px-2 py-2 rounded-lg ${t.input} text-sm flex-1 outline-none`}
          >
            <option value="once">Eenmalig</option>
            <option value="weekly">Wekelijks</option>
            <option value="monthly">Maandelijks</option>
            <option value="custom">Elke X dagen</option>
          </select>
          {recurrence === 'custom' && (
            <input
              type="number"
              min="1"
              value={customDays}
              onChange={e => setCustomDays(e.target.value)}
              className={`w-20 px-2 py-2 rounded-lg ${t.input} text-sm outline-none`}
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
        <p className={`text-sm ${t.textMuted} text-center py-4`}>Nog geen klusjes</p>
      )}

      <ul className="space-y-2">
        {sorted.map(chore => {
          const overdue = isOverdue(chore);
          const due = daysUntilDue(chore);
          return (
            <li
              key={chore.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${t.cardSecondary} ${overdue ? 'ring-1 ring-red-300' : ''}`}
            >
              <button
                onClick={() => complete(chore.id)}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition shrink-0 ${
                  overdue
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                aria-label="Markeer als gedaan"
              >
                <Check className="w-4 h-4" />
              </button>
              <div className="flex-1 min-w-0">
                <div className={`text-sm font-medium ${t.text} truncate`}>{chore.name}</div>
                <div className={`text-xs ${overdue ? 'text-red-500 font-medium' : t.textMuted}`}>
                  {choreStatus(chore, overdue, due)}
                </div>
              </div>
              <button
                onClick={() => remove(chore.id)}
                className={`p-1.5 rounded-lg ${t.textMuted} ${t.hover} transition`}
                aria-label="Verwijder"
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

function choreStatus(chore, overdue, due) {
  if (chore.recurrence === 'once') {
    return chore.lastCompletedAt ? `Gedaan ${formatRelativeDate(chore.lastCompletedAt)}` : 'Nog te doen';
  }
  if (!chore.lastCompletedAt) return 'Nog niet gedaan';
  if (overdue) {
    const elapsed = Math.abs(due);
    return elapsed === 0 ? 'Vandaag achterstallig' : `${elapsed} dagen achterstallig`;
  }
  if (due === 0) return 'Vandaag aan de beurt';
  if (due === 1) return 'Morgen aan de beurt';
  return `Over ${due} dagen`;
}

// ============================================================================
// Boodschappen
// ============================================================================

function GroceriesSection({ groceries, setGroceries, t }) {
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
      <div className={`${t.cardSecondary} rounded-xl p-3 space-y-2`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder="Nieuw item"
            className={`flex-1 px-3 py-2 rounded-lg ${t.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
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
          <span className={`text-xs ${t.textMuted}`}>Boodschapdag:</span>
          {DAY_LABELS.map((label, idx) => (
            <button
              key={idx}
              onClick={() => setShopDay(groceries.shopDay === idx ? null : idx)}
              className={`px-2 py-1 rounded-lg text-xs font-medium transition ${
                groceries.shopDay === idx
                  ? 'bg-blue-500 text-white'
                  : `${t.textMuted} ${t.hover}`
              }`}
            >
              {label.slice(0, 2)}
            </button>
          ))}
        </div>
      </div>

      {items.length === 0 && (
        <p className={`text-sm ${t.textMuted} text-center py-4`}>Lijst is leeg</p>
      )}

      <ul className="space-y-1">
        {sorted.map(item => (
          <li
            key={item.id}
            className={`flex items-center gap-2 p-2 rounded-lg ${t.cardSecondary}`}
          >
            <button
              onClick={() => toggle(item.id)}
              className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition shrink-0 ${
                item.checked
                  ? 'bg-blue-500 border-blue-500 text-white'
                  : `border-slate-300 ${t.hover}`
              }`}
              aria-label="Vink af"
            >
              {item.checked && <Check className="w-3.5 h-3.5" />}
            </button>
            <span className={`flex-1 text-sm ${t.text} ${item.checked ? 'line-through opacity-50' : ''}`}>
              {item.name}
            </span>
            <button
              onClick={() => toggleStaple(item.id)}
              className={`p-1 rounded transition ${item.isStaple ? 'text-amber-500' : t.textMuted}`}
              aria-label="Markeer als vast"
            >
              <Star className={`w-4 h-4 ${item.isStaple ? 'fill-amber-500' : ''}`} />
            </button>
            <button
              onClick={() => remove(item.id)}
              className={`p-1 rounded ${t.textMuted} ${t.hover} transition`}
              aria-label="Verwijder"
            >
              <X className="w-4 h-4" />
            </button>
          </li>
        ))}
      </ul>

      {items.some(i => i.checked || i.isStaple) && (
        <button
          onClick={cleanup}
          className={`w-full py-2 rounded-lg text-sm font-medium ${t.cardSecondary} ${t.textSecondary} ${t.hover} transition`}
        >
          Opruimen
        </button>
      )}
    </div>
  );
}

// ============================================================================
// Budget
// ============================================================================

function BudgetSection({ budget, setBudget, t, darkMode }) {
  const [editing, setEditing] = useState(null); // { kind: 'income'|'expenses', item: { ... } }
  const [adding, setAdding] = useState(null); // 'income' | 'expenses' | null

  const income = budget.income || [];
  const expenses = budget.expenses || [];

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

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2">
        <Stat t={t} label="Inkomsten" value={formatEuro(monthlyIncome)} accent="text-emerald-500" />
        <Stat t={t} label="Uitgaven" value={formatEuro(monthlyExpenses)} accent="text-rose-500" />
        <Stat t={t} label="Netto" value={formatEuro(monthlyNet)} accent={monthlyNet < 0 ? 'text-amber-500' : 'text-blue-500'} />
      </div>

      <BudgetList
        title="Inkomsten"
        items={income}
        kind="income"
        t={t}
        onEdit={(item) => setEditing({ kind: 'income', item })}
        onAdd={() => setAdding('income')}
        onDelete={(id) => remove('income', id)}
      />

      <BudgetList
        title="Uitgaven"
        items={expenses}
        kind="expenses"
        t={t}
        onEdit={(item) => setEditing({ kind: 'expenses', item })}
        onAdd={() => setAdding('expenses')}
        onDelete={(id) => remove('expenses', id)}
      />

      {(editing || adding) && (
        <BudgetEditor
          t={t}
          darkMode={darkMode}
          kind={editing?.kind || adding}
          initial={editing?.item}
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

function Stat({ t, label, value, accent }) {
  return (
    <div className={`${t.cardSecondary} rounded-xl p-3 text-center`}>
      <div className={`text-xs ${t.textMuted} mb-1`}>{label}</div>
      <div className={`text-sm font-semibold ${accent}`}>{value}</div>
    </div>
  );
}

function BudgetList({ title, items, t, onEdit, onAdd, onDelete }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <h3 className={`text-sm font-semibold ${t.textSecondary}`}>{title}</h3>
        <button
          onClick={onAdd}
          className="px-2 py-1 rounded-lg bg-blue-500 text-white text-xs font-medium hover:bg-blue-600 transition flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Toevoegen
        </button>
      </div>
      {items.length === 0 ? (
        <p className={`text-xs ${t.textMuted} text-center py-3`}>Nog niets toegevoegd</p>
      ) : (
        <ul className="space-y-1">
          {items.map(item => {
            const Icon = BUDGET_ICONS[item.icon] || BadgeEuro;
            const monthly = toMonthly(item.amount, item.frequency);
            return (
              <li
                key={item.id}
                className={`flex items-center gap-3 p-3 rounded-xl ${t.cardSecondary}`}
              >
                <Icon className={`w-5 h-5 ${t.textSecondary} shrink-0`} />
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${t.text} truncate`}>{item.name}</div>
                  <div className={`text-xs ${t.textMuted}`}>
                    {formatEuro(item.amount)} {freqLabel(item.frequency)}
                    {item.frequency !== 'monthly' && (
                      <> &middot; reserveer {formatEuro(monthly)}/mnd</>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => onEdit(item)}
                  className={`p-1.5 rounded-lg ${t.textMuted} ${t.hover} transition`}
                  aria-label="Bewerk"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(item.id)}
                  className={`p-1.5 rounded-lg ${t.textMuted} ${t.hover} transition`}
                  aria-label="Verwijder"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function freqLabel(f) {
  return f === 'weekly' ? 'per week' : f === 'yearly' ? 'per jaar' : 'per maand';
}

function BudgetEditor({ t, darkMode, kind, initial, onCancel, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [amount, setAmount] = useState(initial ? String(initial.amount).replace('.', ',') : '');
  const [frequency, setFrequency] = useState(initial?.frequency || 'monthly');
  const [icon, setIcon] = useState(initial?.icon || (kind === 'income' ? 'BadgeEuro' : 'ShoppingCart'));

  const save = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const parsedAmount = parseEuroInput(amount);
    onSave({
      id: initial?.id || newId(),
      name: trimmed,
      amount: parsedAmount,
      frequency,
      icon,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`${t.card} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl`}>
        <div className={`flex items-center justify-between p-4 border-b ${t.border}`}>
          <h3 className={`font-semibold ${t.text}`}>
            {initial ? 'Bewerken' : 'Toevoegen'} &middot; {kind === 'income' ? 'Inkomst' : 'Uitgave'}
          </h3>
          <button onClick={onCancel} className={`p-1 rounded ${t.hover}`}>
            <X className={`w-5 h-5 ${t.textMuted}`} />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div>
            <label className={`text-xs ${t.textMuted} block mb-1`}>Naam</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className={`w-full px-3 py-2 rounded-lg ${t.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className={`text-xs ${t.textMuted} block mb-1`}>Bedrag</label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0,00"
                className={`w-full px-3 py-2 rounded-lg ${t.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
              />
            </div>
            <div>
              <label className={`text-xs ${t.textMuted} block mb-1`}>Frequentie</label>
              <select
                value={frequency}
                onChange={e => setFrequency(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg ${t.input} outline-none text-sm`}
              >
                <option value="weekly">Per week</option>
                <option value="monthly">Per maand</option>
                <option value="yearly">Per jaar</option>
              </select>
            </div>
          </div>
          <div>
            <label className={`text-xs ${t.textMuted} block mb-1`}>Icoon</label>
            <div className={`grid grid-cols-7 gap-1 max-h-36 overflow-y-auto p-2 rounded-lg ${t.cardSecondary}`}>
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
                        : `${t.textSecondary} ${t.hover}`
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
        <div className={`flex gap-2 p-4 border-t ${t.border}`}>
          <button
            onClick={onCancel}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${t.cardSecondary} ${t.textSecondary} ${t.hover} transition`}
          >
            Annuleer
          </button>
          <button
            onClick={save}
            disabled={!name.trim()}
            className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Duurzaamheid
// ============================================================================

function UtilitiesSection({ utilities, setUtilities, t, darkMode }) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [editingMonth, setEditingMonth] = useState(null); // 0-11 or null

  const isFutureMonth = (m) => year > now.getFullYear() || (year === now.getFullYear() && m > now.getMonth());

  const yearTotals = UTILITY_KEYS.reduce((acc, k) => {
    acc[k] = { actual: 0, budget: 0 };
    return acc;
  }, {});
  for (let m = 0; m < 12; m++) {
    const data = utilities[monthKey(year, m)] || {};
    UTILITY_KEYS.forEach(k => {
      yearTotals[k].actual += data[k]?.actual || 0;
      yearTotals[k].budget += data[k]?.budget || 0;
    });
  }
  const totalActual = UTILITY_KEYS.reduce((s, k) => s + yearTotals[k].actual, 0);
  const totalBudget = UTILITY_KEYS.reduce((s, k) => s + yearTotals[k].budget, 0);

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
          className={`p-2 rounded-lg ${t.cardSecondary} ${t.hover} transition`}
          aria-label="Vorig jaar"
        >
          <ChevronLeft className={`w-4 h-4 ${t.textSecondary}`} />
        </button>
        <span className={`font-semibold ${t.text}`}>{year}</span>
        <button
          onClick={() => setYear(y => y + 1)}
          disabled={year >= now.getFullYear()}
          className={`p-2 rounded-lg ${t.cardSecondary} ${t.hover} transition disabled:opacity-30 disabled:cursor-not-allowed`}
          aria-label="Volgend jaar"
        >
          <ChevronRight className={`w-4 h-4 ${t.textSecondary}`} />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {UTILITY_KEYS.map(k => {
          const Icon = UTILITY_ICON[k];
          const a = yearTotals[k].actual;
          const b = yearTotals[k].budget;
          const diff = a - b;
          return (
            <div key={k} className={`${t.cardSecondary} rounded-xl p-3`}>
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className={`w-4 h-4 ${UTILITY_COLOR[k]}`} />
                <span className={`text-xs font-medium ${t.textSecondary}`}>{UTILITY_LABEL[k]}</span>
              </div>
              <div className={`text-sm font-semibold ${t.text}`}>{formatEuro(a)}</div>
              <div className={`text-xs ${diff > 0 ? 'text-red-500' : t.textMuted}`}>
                begroot {formatEuro(b)}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {NL_MONTHS.map((mname, idx) => {
          const data = utilities[monthKey(year, idx)];
          const future = isFutureMonth(idx);
          const hasData = !!data;
          const monthActual = data ? UTILITY_KEYS.reduce((s, k) => s + (data[k]?.actual || 0), 0) : 0;
          const monthBudget = data ? UTILITY_KEYS.reduce((s, k) => s + (data[k]?.budget || 0), 0) : 0;
          const over = hasData && monthActual > monthBudget && monthBudget > 0;
          const disabled = future && !hasData;
          return (
            <button
              key={idx}
              disabled={disabled}
              onClick={() => setEditingMonth(idx)}
              className={`text-left p-3 rounded-xl transition ${t.cardSecondary} ${
                disabled ? 'opacity-30 cursor-not-allowed' : t.hover
              } ${over ? 'ring-2 ring-red-400' : ''}`}
            >
              <div className={`text-xs ${t.textMuted} capitalize`}>{NL_MONTHS_SHORT[idx]}</div>
              <div className={`text-sm font-semibold ${over ? 'text-red-500' : t.text}`}>
                {hasData ? formatEuro(monthActual) : ''}
              </div>
              {hasData && (
                <div className={`text-xs ${over ? 'text-red-500' : t.textMuted}`}>
                  van {formatEuro(monthBudget)}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className={`${t.cardSecondary} rounded-xl p-3`}>
        <div className={`text-xs ${t.textMuted} mb-1`}>Jaartotaal</div>
        <div className="flex items-baseline justify-between">
          <span className={`text-lg font-semibold ${t.text}`}>{formatEuro(totalActual)}</span>
          <span className={`text-xs ${t.textMuted}`}>begroot {formatEuro(totalBudget)}</span>
        </div>
      </div>

      {editingMonth !== null && (
        <UtilityMonthEditor
          t={t}
          year={year}
          month={editingMonth}
          data={utilities[monthKey(year, editingMonth)] || {}}
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

function UtilityMonthEditor({ t, year, month, data, onCancel, onSave }) {
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
      if (b > 0 || a > 0) out[k] = { budget: b, actual: a };
    });
    onSave(out);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className={`${t.card} rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto shadow-xl`}>
        <div className={`flex items-center justify-between p-4 border-b ${t.border}`}>
          <h3 className={`font-semibold ${t.text} capitalize`}>
            {NL_MONTHS[month]} {year}
          </h3>
          <button onClick={onCancel} className={`p-1 rounded ${t.hover}`}>
            <X className={`w-5 h-5 ${t.textMuted}`} />
          </button>
        </div>
        <div className="p-4 space-y-4">
          {UTILITY_KEYS.map(k => {
            const Icon = UTILITY_ICON[k];
            const b = parseEuroInput(draft[k].budget);
            const a = parseEuroInput(draft[k].actual);
            const over = a > b && b > 0;
            return (
              <div key={k} className={`${t.cardSecondary} rounded-xl p-3 ${over ? 'ring-2 ring-red-400' : ''}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className={`w-4 h-4 ${UTILITY_COLOR[k]}`} />
                  <span className={`text-sm font-medium ${t.textSecondary}`}>{UTILITY_LABEL[k]}</span>
                  {over && <span className="ml-auto text-xs text-red-500 font-medium">over budget</span>}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className={`text-xs ${t.textMuted} block mb-1`}>Begroot</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft[k].budget}
                      onChange={e => update(k, 'budget', e.target.value)}
                      placeholder="0,00"
                      className={`w-full px-3 py-2 rounded-lg ${t.input} outline-none text-sm`}
                    />
                  </div>
                  <div>
                    <label className={`text-xs ${t.textMuted} block mb-1`}>Werkelijk</label>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={draft[k].actual}
                      onChange={e => update(k, 'actual', e.target.value)}
                      placeholder="0,00"
                      className={`w-full px-3 py-2 rounded-lg ${t.input} outline-none text-sm ${over ? 'text-red-500 font-semibold' : ''}`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className={`flex gap-2 p-4 border-t ${t.border}`}>
          <button
            onClick={onCancel}
            className={`flex-1 py-2 rounded-lg text-sm font-medium ${t.cardSecondary} ${t.textSecondary} ${t.hover} transition`}
          >
            Annuleer
          </button>
          <button
            onClick={save}
            className="flex-1 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}
