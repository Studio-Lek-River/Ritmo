import React, { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatAmount } from '../utils/format';
import { parseMeasurementInput } from '../utils/measurements';
import { useTranslation, getLocale } from '../i18n/useTranslation';
import { useUndoToast } from '../hooks/useUndoToast';

// Eén gelogde teller-regel, geëxtraheerd uit CounterModule.jsx (V10, #133) —
// nul gedragswijziging bij de extractie zelf (#141). Per-rij state (i.p.v.
// gedeeld op CounterUI-niveau) is hier correcter: er kan door focus toch
// maar één rij tegelijk in bewerkmodus staan. Het escape/blur-guard-patroon
// (cancelledRef) blijft nodig: Escape sluit de input terwijl hij focus
// heeft, en sommige browsers vuren daarna alsnog een blur op de al
// wegrenderende node — die late blur moet genegeerd worden.
//
// Twee renderpaden op één guard (`entry.source`, #141):
// - afwezig  ⇒ de bestaande rauwe-kcal-regel; tap bewerkt via onSetAmount
//   (parseFloat + type="number", ongewijzigd — komma-support is beperkt tot
//   de nieuwe voedings-UI).
// - aanwezig ⇒ voedingsregel "Havermout · 60 g — 222 kcal · 08:14"; tap op de
//   hoeveelheid bewerkt via onSetQuantity (parseMeasurementInput, komma OF
//   punt). Naam en kcal zijn niet tapbaar.
export default function CounterEntryRow({
  entry,
  unit,
  mod,
  editable,
  onRemoveEntry,
  onSetAmount,
  onSetQuantity,
  theme,
  darkMode,
}) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const cancelledRef = useRef(false);
  const sessionRef = useRef(false);

  const hasSource = !!entry.source;

  const startEdit = () => {
    if (!editable) return;
    cancelledRef.current = false;
    sessionRef.current = true;
    setDraft(hasSource ? String(entry.source.quantity) : String(entry.amount));
    setEditing(true);
  };

  const cancelEdit = () => {
    cancelledRef.current = true;
    sessionRef.current = false;
    setEditing(false);
    setDraft('');
  };

  const commitEdit = () => {
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    // Enter commit al; de blur die sommige browsers daarna alsnog op de
    // wegrenderende node vuren mag niet nogmaals schrijven — dat zou een
    // identieke moduleData opleveren en dus een day:*-write en sync-push
    // voor niets.
    if (!sessionRef.current) return;
    sessionRef.current = false;
    setEditing(false);
    if (hasSource) {
      const parsed = parseMeasurementInput(draft);
      if (parsed !== null && parsed > 0) onSetQuantity?.(entry.id, parsed);
    } else {
      const parsed = parseFloat(draft);
      if (parsed > 0) onSetAmount?.(entry.id, parsed);
    }
  };

  const handleRemove = () => {
    const result = onRemoveEntry?.(entry.id);
    showUndoToast(t('toast.counterEntryDeleted'), () => result?.undo?.());
  };

  // Een receptregel (#142) heeft geen door de gebruiker gekozen portie-label
  // (source.unitLabel is bewust null, zie buildRecipeLog): zonder fallback
  // zou de regel een leeg label renderen. De fallback is een live vertaling
  // i.p.v. "portie" te bevriezen in de bron — een bevroren systeemwoord zou
  // na een taalwissel stale Nederlandse tekst tonen op oude regels. Een
  // item-regel in portie-modus heeft altijd al wél een unitLabel, dus die
  // verandert hier niets.
  const unitLabelText = hasSource
    ? (entry.source.unit === 'serving'
      ? (entry.source.unitLabel || t('nutrition.recipe.servingUnit'))
      : t(`modules.units.${entry.source.unit}`))
    : null;

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${theme.cardSecondary} text-sm`}>
      {hasSource ? (
        <>
          <span className={`font-medium ${theme.textSecondary} truncate`}>{entry.source.name}</span>
          <span className={theme.textMuted}>·</span>
          {editing ? (
            <input
              type="text"
              inputMode="decimal"
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitEdit();
                if (e.key === 'Escape') cancelEdit();
              }}
              aria-label={t('nutrition.entry.editQuantityAria')}
              className={`w-16 min-w-0 px-2 py-1 text-sm ${theme.input} rounded focus:outline-none focus:ring-2 focus:ring-${mod.color}-300`}
            />
          ) : (
            <span
              onClick={startEdit}
              className={`${theme.textSecondary} ${editable ? 'cursor-text' : ''}`}
            >
              {formatQuantity(entry.source.quantity)} {unitLabelText}
            </span>
          )}
          <span className={theme.textMuted}>—</span>
          <span className={`font-medium ${theme.textSecondary}`}>
            {entry.amount} {t('modules.units.kcal')}
          </span>
        </>
      ) : (
        editing ? (
          <input
            type="number"
            inputMode="decimal"
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') cancelEdit();
            }}
            aria-label={t('modules.counterEntryEditAria')}
            className={`w-20 min-w-0 px-2 py-1 text-sm ${theme.input} rounded focus:outline-none focus:ring-2 focus:ring-${mod.color}-300`}
          />
        ) : (
          <span
            onClick={startEdit}
            className={`font-medium ${theme.textSecondary} ${editable ? 'cursor-text' : ''}`}
          >
            {formatAmount(entry.amount, unit)}
          </span>
        )
      )}
      {entry.category && (
        <span className={`px-2 py-0.5 rounded-full text-xs ${darkMode ? `bg-${mod.color}-900/40 text-${mod.color}-300` : `bg-${mod.color}-100 text-${mod.color}-700`}`}>
          {entry.category}
        </span>
      )}
      <span className={`text-xs ${theme.textMuted} ml-auto`}>{entry.time}</span>
      {editable && (
        <button
          onClick={handleRemove}
          aria-label={t('common.delete')}
          className={`p-1 rounded ${theme.hover} ${theme.textMuted} hover:text-red-500 transition`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// Locale-bewuste hoeveelheidweergave (niet formatAmount — die rondt af en
// zou 60,5 als "61 g" tonen terwijl de inline-edit 60,5 voorvult).
function formatQuantity(value) {
  try {
    return new Intl.NumberFormat(getLocale(), { maximumFractionDigits: 2 }).format(value);
  } catch {
    return String(value);
  }
}
