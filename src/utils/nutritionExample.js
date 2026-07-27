// Doorgerekend voorbeeld voor de "Van product naar maaltijd"-uitleg (#150).
// Alle getallen staan uitsluitend hier — nooit in i18n (AC5) — zodat er één
// auditeerbare plek is voor de voorbeeldwaarden. Namen komen via `t` binnen,
// zodat ze meewisselen met de taalinstelling; de bedragen zijn taalneutraal.
//
// Bewust 90 i.p.v. 89 kcal voor de banaan: zo zijn alle zichtbare bedragen
// hele kcal en klopt elke optelling in beeld exact (111+111+94=316,
// 316+108=424). Twee porties waarvan één met één product illustreert dat een
// portie ook uit één product mag bestaan; de melk maakt de drinken-sectie
// concreet (#150).
import { createFoodItem, createPortion, createMeal } from './nutrition';

export function buildNutritionExample(t) {
  const oatmeal = createFoodItem({
    name: t('nutrition.guide.example.oatmealName'),
    unit: 'g',
    per100: { kcal: 370, protein: 13, carbs: 60, fat: 7 },
    portionLabel: t('nutrition.guide.example.scoopLabel'),
    portionAmount: 30,
  });
  const milk = createFoodItem({
    name: t('nutrition.guide.example.milkName'),
    unit: 'ml',
    per100: { kcal: 47, protein: 3.5, carbs: 4.8, fat: 1.5 },
    portionLabel: t('nutrition.guide.example.glassLabel'),
    portionAmount: 200,
    countsAsDrink: true,
  });
  const banana = createFoodItem({
    name: t('nutrition.guide.example.bananaName'),
    unit: 'g',
    per100: { kcal: 90, protein: 1.1, carbs: 23, fat: 0.3 },
    portionLabel: t('nutrition.guide.example.bananaLabel'),
    portionAmount: 120,
  });

  const bowl = createPortion({
    name: t('nutrition.guide.example.bowlName'),
    entries: [
      { productId: oatmeal.id, count: 2 },
      { productId: milk.id, count: 1 },
    ],
  });
  const fruit = createPortion({
    name: t('nutrition.guide.example.fruitName'),
    entries: [{ productId: banana.id, count: 1 }],
  });

  const breakfast = createMeal({
    name: t('nutrition.guide.example.breakfastName'),
    entries: [
      { portionId: bowl.id, count: 1 },
      { portionId: fruit.id, count: 1 },
    ],
  });

  return {
    items: [oatmeal, milk, banana],
    portions: [bowl, fruit],
    meals: [breakfast],
  };
}
