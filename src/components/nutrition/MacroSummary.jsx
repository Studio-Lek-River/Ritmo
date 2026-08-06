import React from 'react';
import { formatAmount } from '../../utils/format';

// Gedeelde macro-regel (#148): dezelfde eiwit/koolhydraten/vet-samenvatting
// is nodig op drie plekken (portie-totaal, maaltijd-totaal, Inzicht-kaart),
// dus één presentational component i.p.v. drie keer dezelfde t()-samenstelling.
//
// Rendert `null` zonder macro-data (alle drie 0) — dat is de "zonder
// macro-data verschijnt er niets extra's"-eis van AC3, op één plek geregeld.
//
// `label` is optioneel en is de NAAM van een i18n-key (bv.
// 'insight.counter.macrosLabel') die de opgebouwde macro-tekst via een
// `{macros}`-interpolatie omhult (zie insight.counter.macrosLabel in
// nl.js/en.js). Zonder `label` verschijnt de kale macro-regel — zo blijft ook
// het "ervoor"-tekstje (scheidingsteken, dubbele punt, ...) volledig
// vertaalbaar in plaats van hier hardcoded.
export default function MacroSummary({ macros, theme, t, label }) {
  const protein = typeof macros?.protein === 'number' ? macros.protein : 0;
  const carbs = typeof macros?.carbs === 'number' ? macros.carbs : 0;
  const fat = typeof macros?.fat === 'number' ? macros.fat : 0;

  if (!protein && !carbs && !fat) return null;

  const macrosText = t('nutrition.macros.summary', {
    proteinLabel: t('nutrition.macros.proteinLabel'),
    protein: formatAmount(protein, 'g'),
    carbsLabel: t('nutrition.macros.carbsLabel'),
    carbs: formatAmount(carbs, 'g'),
    fatLabel: t('nutrition.macros.fatLabel'),
    fat: formatAmount(fat, 'g'),
  });
  const content = label ? t(label, { macros: macrosText }) : macrosText;

  return (
    <p className={`text-xs ${theme.textMuted}`}>{content}</p>
  );
}
