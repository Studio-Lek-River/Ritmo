import React, { useRef, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { formatAmount } from '../utils/format';
import { parseMeasurementInput } from '../utils/measurements';
import { useTranslation, getLocale } from '../i18n/useTranslation';
import { useUndoToast } from '../hooks/useUndoToast';

// Systeemfallback voor het unit-label van een gelogde voedingsregel zonder
// zelfgekozen unitLabel (#147, AC6): lookup op `source.unit`, nooit op
// `source.kind` — zo blijven `kind: 'recipe'`-regels van vóór deze slice
// (unit: 'serving') ongewijzigd renderen naast de nieuwe waarden
// 'portion'/'meal'. Op module-niveau i.p.v. per render, want de map is
// statisch.
const FALLBACK_UNIT_KEYS = {
  serving: ['nutrition.recipe.servingUnit', 'nutrition.recipe.servingUnitPlural'],
  portion: ['nutrition.portion.unit', 'nutrition.portion.unitPlural'],
  meal: ['nutrition.meal.unit', 'nutrition.meal.unitPlural'],
};

// Eén gelogde teller-regel, geëxtraheerd uit CounterModule.jsx (V10, #133) —
// nul gedragswijziging bij de extractie zelf (#141). Per-rij state (i.p.v.
// gedeeld op CounterUI-niveau) is hier correcter: er kan door focus toch
// maar één rij tegelijk in bewerkmodus staan. Het escape/blur-guard-patroon
// (cancelledRef) blijft nodig: Escape sluit de input terwijl hij focus
// heeft, en sommige browsers vuren daarna alsnog een blur op de al
// wegrenderende node — die late blur moet genegeerd worden.
//
// Drie renderpaden:
// - `entry.linkedTo` (#143) ⇒ de drinkkant van een gekoppelde voedingsregel:
//   "Melk — 200 ml". Bewust niet inline bewerkbaar: de hoeveelheid hoort bij
//   de kcal-kant (die de perUnit bevat), dus hier de ml wijzigen zou het paar
//   stil laten desynchroniseren. Verwijderen kan er wél, symmetrisch.
// - `entry.source` (#141) ⇒ voedingsregel "Havermout · 60 g — 222 kcal ·
//   08:14"; tap op de hoeveelheid bewerkt via onSetQuantity
//   (parseMeasurementInput, komma OF punt). Naam en kcal zijn niet tapbaar.
// - geen van beide ⇒ de bestaande rauwe-kcal-regel; tap bewerkt via
//   onSetAmount (parseFloat + type="number", ongewijzigd — komma-support is
//   beperkt tot de nieuwe voedings-UI).
export default function CounterEntryRow({
  entry,
  unit,
  mod,
  editable,
  onRemoveEntry,
  onSetAmount,
  onSetQuantity,
  // #151: alleen aan op de kcal-kant van een samengevoegde kaart. Optioneel
  // (standaard uit) zodat de standalone drinkkaart en niet-samengevoegde
  // voedingskaarten ongewijzigd blijven renderen.
  showDrinkSuffix = false,
  theme,
  darkMode,
}) {
  const { t } = useTranslation();
  const showUndoToast = useUndoToast();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const cancelledRef = useRef(false);
  const sessionRef = useRef(false);

  const linkedTo = entry.linkedTo || null;
  const hasSource = !!entry.source;

  const startEdit = () => {
    if (!editable || linkedTo) return;
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

  // Bij een gekoppelde regel (#143) verdwijnen er twee regels tegelijk;
  // `result.pair` is alleen gevuld als dat ook echt gebeurd is (de
  // tegenhanger kan al weg zijn). Zonder die tekst zou de dubbele
  // verwijdering een verrassing zijn.
  const handleRemove = () => {
    const result = onRemoveEntry?.(entry.id);
    const pair = result?.pair;
    const message = pair
      ? t('nutrition.toast.pairDeleted', { name: pair.name, kcal: pair.kcal, ml: pair.ml })
      : t('toast.counterEntryDeleted');
    showUndoToast(message, () => result?.undo?.());
  };

  // Een portie-, maaltijd- of (oude) receptregel heeft geen door de gebruiker
  // gekozen unit-label (source.unitLabel is bewust null, zie
  // buildPortionLog/buildMealLog en het vervallen buildRecipeLog): zonder
  // fallback zou de regel een leeg label renderen. De fallback is een live
  // vertaling i.p.v. het woord te bevriezen in de bron — een bevroren
  // systeemwoord zou na een taalwissel stale Nederlandse tekst tonen op oude
  // regels. Bewust géén schakeling op `source.kind` (AC6, #147): de lookup
  // gaat op `source.unit`, zodat regels van vóór deze slice (kind: 'recipe',
  // unit: 'serving') ongewijzigd blijven renderen naast de nieuwe
  // unit-waarden 'portion'/'meal'. Een item-regel in portie-modus heeft
  // altijd al wél een unitLabel, dus die verandert hier niets.
  //
  // Alleen de systeemfallback buigt mee met het aantal ("2 porties"); een
  // zelfgekozen portie-label blijft staan zoals de gebruiker het typte —
  // diens woord vervoegen we niet.
  const fallbackKeys = hasSource ? FALLBACK_UNIT_KEYS[entry.source.unit] : null;
  const unitLabelText = hasSource
    ? (fallbackKeys
      ? (entry.source.unitLabel || t(entry.source.quantity === 1 ? fallbackKeys[0] : fallbackKeys[1]))
      : t(`modules.units.${entry.source.unit}`))
    : null;

  // #151: op een samengevoegde kaart telt de ml van een gelogd drankje al mee
  // op de drinkbalk via zijn eigen (verborgen) ml-entry — deze suffix maakt
  // dat zichtbaar op de kcal-regel zelf, zodat het geen verrassing is dat er
  // ergens een tweede totaal meebeweegt. Herrekend uit de bevroren
  // source-snapshot (dezelfde formule als App.jsx bij het loggen), geen
  // lookup naar de drinkmodule. Alleen wanneer deze regel ook echt gepaard is
  // gelogd (`source.drinkEntry`) — een ml-product zonder gekoppelde teller op
  // het moment van loggen telt nergens dubbel, dus mag hier ook geen ml tonen.
  const drinkMl = (showDrinkSuffix && hasSource && entry.source.drinkEntry)
    ? Math.round(entry.source.quantity * (entry.source.perUnit?.ml ?? 0))
    : 0;

  return (
    <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${theme.cardSecondary} text-sm`}>
      {linkedTo ? (
        <>
          <span className={`font-medium ${theme.textSecondary} truncate`}>{linkedTo.name}</span>
          <span className={theme.textMuted}>—</span>
          {/* Vast 'ml': het bedrag ís ml (alleen ml-tellers kunnen een
              gekoppelde regel ontvangen), niet de eenheid die de module
              vandaag toevallig draagt. */}
          <span className={`font-medium ${theme.textSecondary}`}>{formatAmount(entry.amount, 'ml')}</span>
        </>
      ) : hasSource ? (
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
          {drinkMl > 0 && (
            <span className={`text-xs ${theme.textMuted}`}>
              {t('nutrition.entry.drinkSuffix', { ml: drinkMl })}
            </span>
          )}
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
