import React, { useState, useRef } from 'react';
import { TrendingUp, TrendingDown, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation, getLocale } from '../../i18n/useTranslation';
import { useUndoToast } from '../../hooks/useUndoToast';
import ConfirmDialog from '../../components/ConfirmDialog';
import LineChart from '../../components/LineChart';
import { formatEuro } from '../../utils/household';
import { COLOR_OPTIONS } from '../../utils/colors';
import { todayKey } from '../../utils/dates';
import {
  parseAmount, activeSeries, buildTotalSeries, seriesStats, sortedAsc, newId,
} from '../../utils/investments';

// Euro-formatter zonder decimalen voor de grafiek-as (kale getallen zouden
// niet als bedrag leesbaar zijn). Stats en meta gebruiken het volledige
// formatEuro uit utils/household.
function euroAxis(v) {
  return new Intl.NumberFormat(getLocale(), {
    style: 'currency', currency: 'EUR', maximumFractionDigits: 0,
  }).format(v || 0);
}

function fmtDate(iso) {
  const [y, m, d] = (iso || '').split('-').map(Number);
  if (!y || !m || !d) return iso || '';
  return new Intl.DateTimeFormat(getLocale(), { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(y, m - 1, d));
}

// Laatst bekende waarde van een aandeel (chronologisch laatste event), of null.
function holdingCurrent(holding) {
  const evs = sortedAsc(holding?.events);
  return evs.length ? evs[evs.length - 1].amount : null;
}

function StatCard({ theme, label, value, accent, icon }) {
  return (
    <div className={`${theme.cardSecondary} rounded-xl p-3 text-center`}>
      <div className={`text-xs ${theme.textMuted} mb-1`}>{label}</div>
      <div className={`text-sm font-semibold ${accent} flex items-center justify-center gap-1`}>
        {icon}{value}
      </div>
    </div>
  );
}

export default function InvestmentsSection({ investments, setInvestments, theme }) {
  const { t } = useTranslation();
  const mode = investments?.mode || 'total';
  const [showHoldings, setShowHoldings] = useState(false);

  const points = activeSeries(investments);
  const stats = seriesStats(points);

  const setMode = (m) => setInvestments(prev => ({ ...(prev || {}), mode: m }));

  // Stats-cijfer met richting: stijgt = groen + TrendingUp, daalt = rood +
  // TrendingDown, gelijk = neutraal zonder icoon. Geen oordeel, alleen cijfers.
  const changeStat = (change) => {
    if (!change) {
      return { value: t('household.investments.unchanged'), accent: theme.textMuted, icon: null };
    }
    const up = change > 0;
    return {
      value: `${up ? '+' : '-'}${formatEuro(Math.abs(change))}`,
      accent: up ? 'text-emerald-500' : 'text-rose-500',
      icon: up
        ? <TrendingUp className="w-3.5 h-3.5" />
        : <TrendingDown className="w-3.5 h-3.5" />,
    };
  };

  const sinceFirst = stats ? changeStat(stats.changeAll) : null;
  const sincePrev = stats && stats.hasPrev
    ? changeStat(stats.changePrev)
    : { value: t('household.investments.notApplicable'), accent: theme.textMuted, icon: null };

  // Grafiek: in holdings-modus met "toon losse aandelen" een series-array
  // (totaal-lijn + lijn per aandeel), anders de enkele actieve reeks.
  const useSeries = mode === 'holdings' && showHoldings;
  const chartSeries = useSeries ? [
    { name: t('household.investments.statCurrent'), color: 'blue', events: buildTotalSeries(investments.holdings) },
    ...(investments.holdings || []).map(h => ({
      name: h.name,
      color: h.color,
      events: sortedAsc(h.events).map(e => ({ id: e.id, date: e.date, value: e.amount })),
    })),
  ] : null;

  return (
    <div className="space-y-4">
      {/* Modus-keuze */}
      <div>
        <div className={`text-xs ${theme.textMuted} mb-2`}>{t('household.investments.modeLabel')}</div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'total', label: t('household.investments.modeTotal'), hint: t('household.investments.modeTotalHint') },
            { id: 'holdings', label: t('household.investments.modeHoldings'), hint: t('household.investments.modeHoldingsHint') },
          ].map(opt => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              aria-pressed={mode === opt.id}
              className={`rounded-xl p-3 text-left transition ${
                mode === opt.id
                  ? 'bg-blue-500 text-white'
                  : `${theme.cardSecondary} ${theme.textSecondary} ${theme.hover}`
              }`}
            >
              <span className="block text-sm font-medium">{opt.label}</span>
              <span className={`block text-[11px] ${mode === opt.id ? 'text-blue-100' : theme.textMuted}`}>{opt.hint}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-2">
          <StatCard theme={theme} label={t('household.investments.statCurrent')} value={formatEuro(stats.current)} accent={theme.text} />
          <StatCard theme={theme} label={t('household.investments.statSinceFirst')} value={sinceFirst.value} accent={sinceFirst.accent} icon={sinceFirst.icon} />
          <StatCard theme={theme} label={t('household.investments.statSincePrev')} value={sincePrev.value} accent={sincePrev.accent} icon={sincePrev.icon} />
        </div>
      )}

      {/* Grafiek */}
      {points.length > 0 ? (
        <div className={`${theme.cardSecondary} rounded-xl p-3`}>
          {useSeries
            ? <LineChart series={chartSeries} formatValue={euroAxis} />
            : <LineChart events={points} color="blue" formatValue={euroAxis} />}
          {mode === 'holdings' && (investments.holdings || []).length > 0 && (
            <div className="flex justify-end mt-2">
              <button
                onClick={() => setShowHoldings(s => !s)}
                className={`text-xs font-medium ${theme.textSecondary} ${theme.hover} px-2 py-1 rounded-lg transition`}
              >
                {showHoldings ? t('household.investments.hideHoldings') : t('household.investments.showHoldings')}
              </button>
            </div>
          )}
        </div>
      ) : (
        <p className={`text-sm ${theme.textMuted} text-center py-4`}>{t('household.investments.chartEmpty')}</p>
      )}

      {/* Invoer */}
      {mode === 'total'
        ? <TotalInput investments={investments} setInvestments={setInvestments} theme={theme} />
        : <HoldingsInput investments={investments} setInvestments={setInvestments} theme={theme} />}
    </div>
  );
}

// ── Totaal-modus ────────────────────────────────────────────────────────────

function TotalInput({ investments, setInvestments, theme }) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState('');

  const events = investments.total?.events || [];
  const sortedDesc = [...events].sort((a, b) => b.date.localeCompare(a.date));

  const add = () => {
    const val = parseAmount(amount);
    if (val === null || !date) return;
    setInvestments(prev => ({
      ...prev,
      total: {
        ...(prev.total || {}),
        events: [...(prev.total?.events || []), { id: newId(), date, amount: val }],
      },
    }));
    setAmount('');
  };

  // Undo-flow (V11, #134): snapshot de meting vóórdat hij verdwijnt, undo zet
  // hem idempotent terug (geen dubbele meting als undo twee keer vuurt).
  const remove = (id) => {
    const snapshot = events.find(e => e.id === id);
    setInvestments(prev => ({
      ...prev,
      total: { ...(prev.total || {}), events: (prev.total?.events || []).filter(e => e.id !== id) },
    }));
    if (!snapshot) return;
    showUndoToast(t('toast.investmentMeasurementDeleted'), () => {
      setInvestments(prev => {
        const evs = prev.total?.events || [];
        return evs.some(e => e.id === snapshot.id)
          ? prev
          : { ...prev, total: { ...(prev.total || {}), events: [...evs, snapshot] } };
      });
    });
  };

  // Waarde inline bewerken (V11, #134): een meting is een los waarde-punt,
  // dus de waarde zetten volstaat — geen herberekening elders. Ongeldige
  // invoer wordt genegeerd, de oude waarde blijft staan.
  const editAmount = (id, valStr) => {
    const val = parseAmount(valStr);
    if (val === null) return;
    setInvestments(prev => ({
      ...prev,
      total: {
        ...(prev.total || {}),
        events: (prev.total?.events || []).map(e => e.id === id ? { ...e, amount: val } : e),
      },
    }));
  };

  return (
    <div className="space-y-3">
      <div className={`${theme.cardSecondary} rounded-xl p-3 space-y-2`}>
        <div className={`text-xs font-medium ${theme.textSecondary}`}>{t('household.investments.newTotalLabel')}</div>
        <div className="flex gap-2">
          <input
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            aria-label={t('household.investments.fieldDate')}
            className={`flex-1 min-w-0 px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
          />
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && add()}
            placeholder={t('household.investments.fieldAmountTotal')}
            aria-label={t('household.investments.fieldAmountTotal')}
            className={`w-28 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
          />
          <button
            onClick={add}
            disabled={parseAmount(amount) === null}
            aria-label={t('household.investments.addMeasurement')}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <MeasurementList events={sortedDesc} onRemove={remove} onEditValue={editAmount} theme={theme} />
    </div>
  );
}

// ── Per-aandeel-modus ───────────────────────────────────────────────────────

function HoldingsInput({ investments, setInvestments, theme }) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();
  const [expandedId, setExpandedId] = useState(null);
  const [newName, setNewName] = useState('');
  const [confirmDeleteHolding, setConfirmDeleteHolding] = useState(null);
  const [editingHoldingId, setEditingHoldingId] = useState(null);
  const [holdingDraft, setHoldingDraft] = useState('');
  // Zelfde Escape-dan-blur-guard als src/components/TaskListPanel.jsx (V04,
  // #127): Escape sluit de input terwijl hij focus heeft, maar sommige
  // browsers vuren daarna alsnog een blur-event op de node die al aan het
  // wegrenderen is. `editSessionRef` volgt buiten React-state om welke
  // holding-id nog actief bewerkt wordt.
  const justCancelledRef = useRef(false);
  const editSessionRef = useRef(null);

  const holdings = investments.holdings || [];

  const addHolding = () => {
    const name = newName.trim();
    if (!name) return;
    setInvestments(prev => {
      const list = prev.holdings || [];
      const used = new Set(list.map(h => h.color));
      const color = COLOR_OPTIONS.find(c => !used.has(c)) || COLOR_OPTIONS[list.length % COLOR_OPTIONS.length];
      return { ...prev, holdings: [...list, { id: newId(), name, color, events: [] }] };
    });
    setNewName('');
  };

  // Naam hernoemen (V11, #134). Lege naam wordt genegeerd, de oude naam
  // blijft staan.
  const renameHolding = (id, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    setInvestments(prev => ({
      ...prev,
      holdings: (prev.holdings || []).map(h => h.id === id ? { ...h, name: trimmed } : h),
    }));
  };

  const startEditHolding = (holding) => {
    justCancelledRef.current = false;
    editSessionRef.current = holding.id;
    setHoldingDraft(holding.name);
    setEditingHoldingId(holding.id);
  };
  const commitEditHolding = (id) => {
    if (justCancelledRef.current) {
      justCancelledRef.current = false;
      return;
    }
    if (editSessionRef.current !== id) return;
    editSessionRef.current = null;
    renameHolding(id, holdingDraft);
    setEditingHoldingId(null);
  };
  const cancelEditHolding = () => {
    justCancelledRef.current = true;
    editSessionRef.current = null;
    setEditingHoldingId(null);
    setHoldingDraft('');
  };

  const removeHolding = (id) => setInvestments(prev => ({
    ...prev,
    holdings: (prev.holdings || []).filter(h => h.id !== id),
  }));

  // Verwijderen wist het aandeel én al zijn metingen in één keer — een
  // cascade in historische meetdata (V11, #134). Vraagt daarom eerst een
  // bevestiging (ConfirmDialog, variant danger) en snapshot het volledige
  // holding-object (incl. events) voor een idempotente undo.
  const handleConfirmDeleteHolding = () => {
    if (!confirmDeleteHolding) return;
    const snapshot = confirmDeleteHolding;
    removeHolding(snapshot.id);
    setConfirmDeleteHolding(null);
    setExpandedId(prev => prev === snapshot.id ? null : prev);
    showUndoToast(t('toast.holdingDeleted'), () => {
      setInvestments(prev => (prev.holdings || []).some(h => h.id === snapshot.id)
        ? prev
        : { ...prev, holdings: [...(prev.holdings || []), snapshot] });
    });
  };

  const addEvent = (hid, date, val) => setInvestments(prev => ({
    ...prev,
    holdings: (prev.holdings || []).map(h => h.id === hid
      ? { ...h, events: [...(h.events || []), { id: newId(), date, amount: val }] }
      : h),
  }));

  // Undo-flow voor een losse meting (V11, #134): licht genoeg voor undo-only,
  // geen bevestigingsdialoog nodig.
  const removeEvent = (hid, eid) => {
    const holding = holdings.find(h => h.id === hid);
    const snapshot = holding?.events?.find(e => e.id === eid);
    setInvestments(prev => ({
      ...prev,
      holdings: (prev.holdings || []).map(h => h.id === hid
        ? { ...h, events: (h.events || []).filter(e => e.id !== eid) }
        : h),
    }));
    if (!snapshot) return;
    showUndoToast(t('toast.investmentMeasurementDeleted'), () => {
      setInvestments(prev => ({
        ...prev,
        holdings: (prev.holdings || []).map(h => {
          if (h.id !== hid) return h;
          return (h.events || []).some(e => e.id === snapshot.id)
            ? h
            : { ...h, events: [...(h.events || []), snapshot] };
        }),
      }));
    });
  };

  // Waarde inline bewerken (V11, #134): de waarde zetten volstaat, geen
  // herberekening elders. Ongeldige invoer wordt genegeerd.
  const editEventAmount = (hid, eid, valStr) => {
    const val = parseAmount(valStr);
    if (val === null) return;
    setInvestments(prev => ({
      ...prev,
      holdings: (prev.holdings || []).map(h => h.id === hid
        ? { ...h, events: (h.events || []).map(e => e.id === eid ? { ...e, amount: val } : e) }
        : h),
    }));
  };

  return (
    <div className="space-y-3">
      <h3 className={`text-sm font-semibold ${theme.textSecondary}`}>{t('household.investments.holdingsHeading')}</h3>

      <ul className="space-y-2">
        {holdings.map(h => {
          const current = holdingCurrent(h);
          const open = expandedId === h.id;
          return (
            <li key={h.id} className={`rounded-xl ${theme.cardSecondary} overflow-hidden`}>
              <div className={`w-full flex items-center gap-3 p-3 ${theme.hover} transition`}>
                {editingHoldingId === h.id ? (
                  <input
                    type="text"
                    autoFocus
                    value={holdingDraft}
                    onChange={e => setHoldingDraft(e.target.value)}
                    onBlur={() => commitEditHolding(h.id)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') commitEditHolding(h.id);
                      if (e.key === 'Escape') cancelEditHolding();
                    }}
                    onClick={e => e.stopPropagation()}
                    aria-label={t('household.investments.renameHoldingAria')}
                    className={`flex-1 min-w-0 text-sm font-medium px-1 py-0.5 ${theme.input} rounded focus:outline-none focus:ring-2 focus:ring-blue-300`}
                  />
                ) : (
                  <span
                    onClick={() => startEditHolding(h)}
                    className={`text-sm font-medium ${theme.text} truncate flex-1 text-left cursor-text`}
                  >
                    {h.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setExpandedId(open ? null : h.id)}
                  aria-label={open ? t('common.collapse') : t('common.expand')}
                  className="flex items-center gap-2 shrink-0"
                >
                  <span className={`text-sm ${current === null ? theme.textMuted : theme.textSecondary}`}>
                    {current === null ? t('household.investments.holdingNoValue') : formatEuro(current)}
                  </span>
                  {open
                    ? <ChevronUp className={`w-4 h-4 ${theme.textMuted}`} />
                    : <ChevronDown className={`w-4 h-4 ${theme.textMuted}`} />}
                </button>
              </div>
              {open && (
                <div className={`p-3 pt-0 space-y-3`}>
                  <HoldingEventInput onAdd={(date, val) => addEvent(h.id, date, val)} theme={theme} />
                  <MeasurementList
                    events={[...(h.events || [])].sort((a, b) => b.date.localeCompare(a.date))}
                    onRemove={(eid) => removeEvent(h.id, eid)}
                    onEditValue={(eid, val) => editEventAmount(h.id, eid, val)}
                    theme={theme}
                  />
                  <button
                    onClick={() => setConfirmDeleteHolding(h)}
                    className={`w-full py-2 rounded-lg text-sm font-medium text-rose-500 ${theme.hover} transition flex items-center justify-center gap-1.5`}
                  >
                    <Trash2 className="w-4 h-4" /> {t('household.investments.removeHolding')}
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <div className={`${theme.cardSecondary} rounded-xl p-3`}>
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addHolding()}
            placeholder={t('household.investments.newHoldingPlaceholder')}
            className={`flex-1 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
          />
          <button
            onClick={addHolding}
            disabled={!newName.trim()}
            className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" /> {t('household.investments.addHolding')}
          </button>
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteHolding}
        title={confirmDeleteHolding ? t('household.investments.deleteHoldingTitle', { name: confirmDeleteHolding.name }) : ''}
        description={confirmDeleteHolding ? t('household.investments.deleteHoldingDesc', { count: (confirmDeleteHolding.events || []).length }) : ''}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleConfirmDeleteHolding}
        onCancel={() => setConfirmDeleteHolding(null)}
        theme={theme}
      />
    </div>
  );
}

function HoldingEventInput({ onAdd, theme }) {
  const { t } = useTranslation();
  const [date, setDate] = useState(todayKey());
  const [amount, setAmount] = useState('');

  const add = () => {
    const val = parseAmount(amount);
    if (val === null || !date) return;
    onAdd(date, val);
    setAmount('');
  };

  return (
    <div className="flex gap-2">
      <input
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        aria-label={t('household.investments.fieldDate')}
        className={`flex-1 min-w-0 px-3 py-2 rounded-lg ${theme.input} outline-none text-sm`}
      />
      <input
        type="text"
        inputMode="decimal"
        value={amount}
        onChange={e => setAmount(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && add()}
        placeholder={t('household.investments.fieldAmountHolding')}
        aria-label={t('household.investments.fieldAmountHolding')}
        className={`w-28 px-3 py-2 rounded-lg ${theme.input} outline-none focus:ring-2 focus:ring-blue-300 text-sm`}
      />
      <button
        onClick={add}
        disabled={parseAmount(amount) === null}
        aria-label={t('household.investments.addMeasurement')}
        className="px-3 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium disabled:opacity-40 hover:bg-blue-600 transition"
      >
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

// Waarde inline bewerken (V11, #134): dezelfde Escape-dan-blur-guard als
// src/components/TaskListPanel.jsx. Alleen de waarde is bewerkbaar; de datum
// blijft read-only (zie issue #134, "kleine follow-up"). Lege/ongeldige
// invoer wordt door de aanroeper (onEditValue) genegeerd.
function MeasurementList({ events, onRemove, onEditValue, theme }) {
  const { t } = useTranslation();
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState('');
  const justCancelledRef = useRef(false);
  const editSessionRef = useRef(null);

  const startEdit = (e) => {
    justCancelledRef.current = false;
    editSessionRef.current = e.id;
    setDraft(String(e.amount));
    setEditingId(e.id);
  };
  const commitEdit = (id) => {
    if (justCancelledRef.current) {
      justCancelledRef.current = false;
      return;
    }
    if (editSessionRef.current !== id) return;
    editSessionRef.current = null;
    onEditValue?.(id, draft);
    setEditingId(null);
  };
  const cancelEdit = () => {
    justCancelledRef.current = true;
    editSessionRef.current = null;
    setEditingId(null);
    setDraft('');
  };

  if (!events || events.length === 0) return null;
  return (
    <ul className="space-y-1">
      {events.map(e => (
        <li key={e.id} className={`flex items-center gap-3 p-2 rounded-lg ${theme.card}`}>
          <span className={`text-xs ${theme.textMuted} flex-1`}>{fmtDate(e.date)}</span>
          {editingId === e.id ? (
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={draft}
              onChange={ev => setDraft(ev.target.value)}
              onBlur={() => commitEdit(e.id)}
              onKeyDown={ev => {
                if (ev.key === 'Enter') commitEdit(e.id);
                if (ev.key === 'Escape') cancelEdit();
              }}
              aria-label={t('household.investments.editMeasurementAria')}
              className={`w-24 text-sm font-medium px-1 py-0.5 ${theme.input} rounded focus:outline-none focus:ring-2 focus:ring-blue-300`}
            />
          ) : (
            <span
              onClick={() => startEdit(e)}
              className={`text-sm font-medium ${theme.text} cursor-text`}
            >
              {formatEuro(e.amount)}
            </span>
          )}
          <button
            onClick={() => onRemove(e.id)}
            aria-label={t('household.investments.removeMeasurementAria')}
            className={`p-1 rounded ${theme.textMuted} ${theme.hover} transition`}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </li>
      ))}
    </ul>
  );
}
