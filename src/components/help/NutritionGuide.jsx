import React, { useMemo, useState } from 'react';
import { Utensils, Layers, UtensilsCrossed, Plus, CheckCircle2 } from 'lucide-react';
import { useTranslation } from '../../i18n/useTranslation';
import { useNutritionLibrary } from '../../context/NutritionLibraryContext';
import { useUndoToast } from '../../hooks/useUndoToast';
import MacroSummary from '../nutrition/MacroSummary';
import { buildNutritionExample } from '../../utils/nutritionExample';
import { kcalPerProduct, portionRate, mealRate, portionDrinkMl, mealDrinkMl } from '../../utils/nutrition';

// Structuur naar InstallGuide.jsx: intro, secties met kop + tekst, hier
// aangevuld met een doorgerekend voorbeeld (#150). `Section`/`ExampleRow` zijn
// lokale helpers, zoals InlineIcon daar.
function Section({ icon: Icon, title, theme, children }) {
  return (
    <section>
      <h3 className={`flex items-center gap-2 text-sm font-semibold ${theme.text} mb-2`}>
        {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
        {title}
      </h3>
      <div className={`space-y-2 text-sm ${theme.textSecondary}`}>
        {children}
      </div>
    </section>
  );
}

// Eén regel in het voorbeeldblok. Zonder `value` is het een enkele, gedempte
// tekstregel (bv. een per-100-detail of een al volledig samengestelde
// entryLine/totalLabel-zin); mét `value` een naam-links/bedrag-rechts rij (bv.
// productnaam tegenover het berekende "1 product = ... kcal").
function ExampleRow({ theme, label, value, emphasis }) {
  if (!value) {
    return <p className={`text-xs ${theme.textMuted}`}>{label}</p>;
  }
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className={theme.textSecondary}>{label}</span>
      <span className={emphasis ? `font-semibold ${theme.text}` : theme.textMuted}>{value}</span>
    </div>
  );
}

export default function NutritionGuide({ theme }) {
  const { t } = useTranslation();
  const {
    library,
    addItem, addPortion, addMeal,
    removeItem, removePortion, removeMeal,
  } = useNutritionLibrary();
  const showUndoToast = useUndoToast();
  // "Net toegevoegd" voor directe knop-feedback; gecombineerd met de
  // naam-check hieronder blijft de knop ook na remount/reload uit en gaat hij
  // na undo weer aan (undo zet dit ook expliciet terug op false).
  const [justAdded, setJustAdded] = useState(false);

  // Alleen voor de weergave/berekeningen — bij toevoegen wordt altijd opnieuw
  // gebouwd (zie handleAdd), anders krijgen twee toevoegingen dezelfde id's.
  const example = useMemo(() => buildNutritionExample(t), [t]);
  const [oatmeal, milk, banana] = example.items;
  const [bowl, fruit] = example.portions;
  const [breakfast] = example.meals;

  const alreadyInLibrary = useMemo(() => (
    example.items.every((it) => library.items.some((existing) => existing.name === it.name))
    && example.portions.every((p) => library.portions.some((existing) => existing.name === p.name))
    && example.meals.every((m) => library.meals.some((existing) => existing.name === m.name))
  ), [example, library]);

  const added = justAdded || alreadyInLibrary;

  const handleAdd = () => {
    const fresh = buildNutritionExample(t); // vers bouwen, anders dubbele id's (AC8)
    fresh.items.forEach((it) => addItem(it));
    fresh.portions.forEach((p) => addPortion(p));
    fresh.meals.forEach((m) => addMeal(m));
    setJustAdded(true);
    showUndoToast(t('nutrition.guide.addedToast'), () => {
      // Omgekeerde volgorde van toevoegen: maaltijd → porties → producten.
      fresh.meals.forEach((m) => removeMeal(m.id));
      fresh.portions.forEach((p) => removePortion(p.id));
      fresh.items.forEach((it) => removeItem(it.id));
      setJustAdded(false);
    });
  };

  const oatmealKcal = Math.round(kcalPerProduct(oatmeal));
  const milkKcal = Math.round(kcalPerProduct(milk));
  const bananaKcal = Math.round(kcalPerProduct(banana));
  const mealKcal = Math.round(mealRate(breakfast, example.portions, example.items, 'kcal'));
  const bowlMl = Math.round(portionDrinkMl(bowl, example.items));
  const mealMl = Math.round(mealDrinkMl(breakfast, example.portions, example.items));
  const mealMacros = {
    protein: mealRate(breakfast, example.portions, example.items, 'protein'),
    carbs: mealRate(breakfast, example.portions, example.items, 'carbs'),
    fat: mealRate(breakfast, example.portions, example.items, 'fat'),
  };

  const setupSteps = Array.isArray(t('nutrition.guide.setupSteps')) ? t('nutrition.guide.setupSteps') : [];
  const logSteps = Array.isArray(t('nutrition.guide.logSteps')) ? t('nutrition.guide.logSteps') : [];

  const itemKcals = { [oatmeal.id]: oatmealKcal, [milk.id]: milkKcal, [banana.id]: bananaKcal };

  return (
    <div className="space-y-6">
      <p className={`text-sm ${theme.textSecondary}`}>{t('nutrition.guide.intro')}</p>

      <Section title={t('nutrition.guide.setupTitle')} theme={theme}>
        <ol className="list-decimal pl-5 space-y-1">
          {setupSteps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </Section>

      <Section icon={Utensils} title={t('nutrition.guide.productTitle')} theme={theme}>
        <p>{t('nutrition.guide.productBody')}</p>
        <div className="space-y-2">
          {example.items.map((item) => (
            <div key={item.id} className={`${theme.cardSecondary} rounded-lg p-3 space-y-1`}>
              <ExampleRow
                theme={theme}
                label={item.name}
                value={t('nutrition.item.perProductLabel', { kcal: itemKcals[item.id] })}
                emphasis
              />
              <ExampleRow
                theme={theme}
                label={t('nutrition.library.itemPer100', { kcal: item.per100.kcal, unit: t(`modules.units.${item.unit}`) })}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section icon={Layers} title={t('nutrition.guide.portionTitle')} theme={theme}>
        <p>{t('nutrition.guide.portionBody')}</p>
        <div className="space-y-2">
          {example.portions.map((portion) => (
            <div key={portion.id} className={`${theme.cardSecondary} rounded-lg p-3 space-y-1`}>
              <p className={`text-sm font-medium ${theme.text}`}>{portion.name}</p>
              {portion.entries.map((entry, i) => {
                const item = example.items.find((it) => it.id === entry.productId);
                if (!item) return null;
                return (
                  <ExampleRow
                    key={i}
                    theme={theme}
                    label={t('nutrition.guide.entryLine', {
                      count: entry.count,
                      name: item.name,
                      kcal: Math.round(entry.count * kcalPerProduct(item)),
                    })}
                  />
                );
              })}
              <ExampleRow
                theme={theme}
                label={t('nutrition.portion.totalLabel', { kcal: Math.round(portionRate(portion, example.items, 'kcal')) })}
                emphasis
              />
            </div>
          ))}
        </div>
      </Section>

      <Section icon={UtensilsCrossed} title={t('nutrition.guide.mealTitle')} theme={theme}>
        <p>{t('nutrition.guide.mealBody')}</p>
        <div className={`${theme.cardSecondary} rounded-lg p-3 space-y-1`}>
          <p className={`text-sm font-medium ${theme.text}`}>{breakfast.name}</p>
          {breakfast.entries.map((entry, i) => {
            const portion = example.portions.find((p) => p.id === entry.portionId);
            if (!portion) return null;
            return (
              <ExampleRow
                key={i}
                theme={theme}
                label={t('nutrition.guide.entryLine', {
                  count: entry.count,
                  name: portion.name,
                  kcal: Math.round(entry.count * portionRate(portion, example.items, 'kcal')),
                })}
              />
            );
          })}
          <ExampleRow theme={theme} label={t('nutrition.meal.totalLabel', { kcal: mealKcal })} emphasis />
          <MacroSummary macros={mealMacros} theme={theme} t={t} />
        </div>
        <p className={`text-xs ${theme.textMuted}`}>{t('nutrition.guide.exampleNote')}</p>
      </Section>

      <div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={added}
          className={`w-full inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 font-medium text-sm transition ${
            added
              ? `${theme.cardSecondary} ${theme.textMuted} cursor-default`
              : 'bg-blue-500 hover:bg-blue-600 text-white'
          }`}
        >
          {added ? <CheckCircle2 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {added ? t('nutrition.guide.addedButton') : t('nutrition.guide.addButton')}
        </button>
        <p className={`text-xs ${theme.textMuted} mt-2`}>{t('nutrition.guide.addHint')}</p>
      </div>

      <Section title={t('nutrition.guide.logTitle')} theme={theme}>
        <ol className="list-decimal pl-5 space-y-1">
          {logSteps.map((step, i) => <li key={i}>{step}</li>)}
        </ol>
      </Section>

      <Section title={t('nutrition.guide.editTitle')} theme={theme}>
        <p>{t('nutrition.guide.editBody')}</p>
      </Section>

      <Section title={t('nutrition.guide.drinkTitle')} theme={theme}>
        <p>{t('nutrition.guide.drinkBody')}</p>
        <p className={`text-xs ${theme.textMuted}`}>
          {t('nutrition.guide.drinkExample', {
            name: milk.name,
            portion: bowl.name,
            meal: breakfast.name,
            ml: bowlMl,
            mealMl,
          })}
        </p>
      </Section>

      <Section title={t('nutrition.guide.macrosTitle')} theme={theme}>
        <p>{t('nutrition.guide.macrosBody')}</p>
      </Section>

      <Section title={t('nutrition.guide.insightTitle')} theme={theme}>
        <p>{t('nutrition.guide.insightBody')}</p>
      </Section>
    </div>
  );
}
