// Voedingsbibliotheek-domein (slice A): puur data, geen React, geen storage.
// Zelfde normalisatie-patroon als normalizeWeekMenu (mealplan.js): bouw
// altijd een verse, geldige shape en kopieer alléén herkende waarden uit
// `raw` — een corrupte of oude opgeslagen vorm mag nooit crashen, hij levert
// gewoon een lege bibliotheek op.

import { genId } from './genId';

// Eenheden waarin een voedingsmiddel wordt vastgelegd. 'ml' is de enige
// eenheid waarbij "telt ook mee als drinken" betekenis heeft (zie
// resolveDrinkModule: alleen ml-tellers kunnen die ml ontvangen).
export const NUTRITION_UNITS = [
  { key: 'g', labelKey: 'modules.units.g' },
  { key: 'ml', labelKey: 'modules.units.ml' },
];

const NUTRITION_UNIT_KEYS = NUTRITION_UNITS.map((u) => u.key);

// Voedingswaarden per 100 eenheid, als map i.p.v. los `kcal`-veld: zo is een
// macro later (eiwit, vet, koolhydraten) één extra entry hier en lopen alle
// rekenpaden (itemRate, normalisatie) ongewijzigd mee.
export const NUTRIENT_KEYS = ['kcal'];

export function isValidNutritionUnit(unit) {
  return NUTRITION_UNIT_KEYS.includes(unit);
}

function normalizePer100(raw) {
  const source = raw && typeof raw === 'object' ? raw : {};
  const per100 = {};
  for (const key of NUTRIENT_KEYS) {
    const value = source[key];
    per100[key] = typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }
  return per100;
}

// Een portie is alleen geldig met zowel een label als een positief bedrag;
// anders is het geen portie (null), nooit een half-ingevuld object.
function normalizePortion(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const label = typeof raw.label === 'string' ? raw.label.trim() : '';
  const amount = raw.amount;
  const validAmount = typeof amount === 'number' && Number.isFinite(amount) && amount > 0;
  if (!label || !validAmount) return null;
  return { label, amount };
}

// Bouwt een nieuw, volledig genormaliseerd voedingsmiddel. Input komt binnen
// als platte formuliervelden (niet als de opgeslagen per100/portion-shape),
// zodat het formulier die zelf niet hoeft samen te stellen. Wordt zowel voor
// een nieuw item als (met een overschreven `id`) voor een bewerkt item
// gebruikt, zodat beide paden dezelfde validatie/normalisatie doorlopen.
export function createFoodItem({
  name,
  unit = 'g',
  kcalPer100 = 0,
  portionLabel = '',
  portionAmount = null,
  countsAsDrink = false,
} = {}) {
  const safeUnit = isValidNutritionUnit(unit) ? unit : 'g';
  return {
    id: genId('food'),
    name: (name || '').trim(),
    unit: safeUnit,
    per100: normalizePer100({ kcal: kcalPer100 }),
    portion: normalizePortion({ label: portionLabel, amount: portionAmount }),
    // Alleen betekenisvol bij ml; bij g altijd false, ook als de aanroeper
    // het meegeeft (bv. een niet-opgeschoonde formulierwaarde na eenheidswissel).
    countsAsDrink: safeUnit === 'ml' && !!countsAsDrink,
  };
}

export function emptyNutritionLibrary() {
  return { items: [], recipes: [] };
}

// Eén ingrediëntrij is alleen geldig met zowel een itemId als een positief,
// eindig bedrag; anders is de rij zinloos en wordt hij niet bewaard. Dit
// controleert bewust NIET of het item nog bestaat — dat weet deze module
// niet (geen `items`-parameter) en zou hier stil dataverlies veroorzaken.
function normalizeIngredientRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const itemId = typeof raw.itemId === 'string' && raw.itemId ? raw.itemId : '';
  if (!itemId) return null;
  const amount = typeof raw.amount === 'number' ? raw.amount : Number(raw.amount);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { itemId, amount };
}

function normalizeIngredients(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const row of rows) {
    const ingredient = normalizeIngredientRow(row);
    if (ingredient) out.push(ingredient);
  }
  return out;
}

// Bouwt een nieuw, volledig genormaliseerd recept. Zelfde rol als
// createFoodItem: platte formuliervelden erin, een opslagbare shape eruit —
// gebruikt voor zowel een nieuw als een bewerkt recept (in het laatste geval
// overschrijft de aanroeper `id` met het bestaande id).
export function createRecipe({ name, ingredients = [] } = {}) {
  return {
    id: genId('recipe'),
    name: (name || '').trim(),
    ingredients: normalizeIngredients(ingredients),
  };
}

// Privé, zoals normalizeFoodItem: leest een opgeslagen recept en levert
// altijd een geldige shape of null (bij een lege naam) — nooit een crash op
// corrupte data.
function normalizeRecipe(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : genId('recipe'),
    name,
    ingredients: normalizeIngredients(raw.ingredients),
  };
}

function normalizeFoodItem(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  const unit = isValidNutritionUnit(raw.unit) ? raw.unit : 'g';
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : genId('food'),
    name,
    unit,
    per100: normalizePer100(raw.per100),
    portion: normalizePortion(raw.portion),
    // Hard gekoppeld aan de eenheid bij het lezen: een g-item kan nooit als
    // drinken meetellen, ook niet als een corrupte/oude waarde dat beweert.
    countsAsDrink: unit === 'ml' && raw.countsAsDrink === true,
  };
}

// Bouwt altijd een verse, geldige bibliotheek-shape en kopieert alléén
// herkende items uit `raw`. Elke oude/onbekende/corrupte vorm (kale array,
// string, null) levert dus een lege bibliotheek op, nooit een crash.
export function normalizeNutritionLibrary(raw) {
  const library = emptyNutritionLibrary();
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return library;
  const rawItems = Array.isArray(raw.items) ? raw.items : [];
  for (const rawItem of rawItems) {
    const item = normalizeFoodItem(rawItem);
    if (item) library.items.push(item);
  }
  // Een bestaande opgeslagen blob zonder `recipes` (van vóór deze slice)
  // levert hier vanzelf een lege lijst op — geen aparte migratie nodig.
  const rawRecipes = Array.isArray(raw.recipes) ? raw.recipes : [];
  for (const rawRecipe of rawRecipes) {
    const recipe = normalizeRecipe(rawRecipe);
    if (recipe) library.recipes.push(recipe);
  }
  return library;
}

// Kcal (of een andere NUTRIENT_KEYS-waarde) per 1 eenheid van het item — de
// rekenbasis voor loggen in slice B (hoeveelheid x rate = totaal).
export function itemRate(item, nutrientKey = 'kcal') {
  const value = item?.per100?.[nutrientKey];
  return typeof value === 'number' ? value / 100 : 0;
}

// Of de voedingsbibliotheek aan staat voor een counter-module. Een
// ontbrekend `nutrition`-veld betekent uit, dus geen migratie nodig voor
// bestaande modules.
export function nutritionEnabled(mod) {
  return !!(mod && mod.nutrition && mod.nutrition.enabled === true);
}

// Standaard nutrition-config voor een counter-module. `drinkModuleId` wijst
// naar de teller die de ml van drankjes ontvangt (#143); `null` = geen
// koppeling, en dat is ook de betekenis van een ontbrekend veld.
export function defaultModuleNutrition() {
  return { enabled: false, drinkModuleId: null };
}

// De tellers die drankjes kunnen ontvangen: aanstaande counters met eenheid
// ml. Bewust géén 'l' of 'glas' — die zouden een omrekening vragen en dat is
// een aparte keuze, geen stille aanname. Voedt de keuzelijst in de
// module-editor; een lege lijst is een geldige uitkomst (dan is er alleen
// "Geen").
export function drinkModuleCandidates(modules) {
  const list = Array.isArray(modules) ? modules : [];
  return list.filter((m) => m && m.enabled && m.type === 'counter' && m.unit === 'ml');
}

// De gekoppelde drinkteller van een calorieënmodule, of `null`. `null` is het
// enige "de koppeling staat stil uit"-signaal in de hele app: geen
// drinkModuleId, module verwijderd, uitgezet, van eenheid gewijzigd of naar
// zichzelf wijzend ⇒ er wordt gewoon alleen kcal gelogd. De opgeslagen
// drinkModuleId wordt daarbij nooit gewist, zodat de koppeling weer werkt
// zodra de gebruiker de module opnieuw aanzet.
export function resolveDrinkModule(modules, calorieModule) {
  const id = calorieModule?.nutrition?.drinkModuleId;
  if (!id || id === calorieModule?.id) return null;
  return drinkModuleCandidates(modules).find((m) => m.id === id) || null;
}

// Bouwt een logbare { amount, source } uit een bibliotheek-item en een
// hoeveelheid (slice B, #141). `null` is het enige ongeldig-signaal (geen
// item, quantity niet-eindig of <= 0, of mode: 'portion' zonder geldige
// item.portion) — de modal gebruikt hem voor zowel de live preview als de
// disabled-state van de bevestigknop, dus is er één formule/validatie in de
// hele app.
//
// `source` bevriest naam, portie-label en tarief (per 1 quantity-eenheid,
// ONAFGEROND) op het moment van loggen: een latere bibliotheek-correctie mag
// het dagtotaal van weken geleden niet met terugwerkende kracht veranderen
// (uitgangspunt 1). `amount` is wél afgerond, zodat het zichtbare dagtotaal
// exact de som van de zichtbare regels blijft.
export function buildNutritionLog(item, { quantity, mode = 'base' } = {}) {
  if (!item) return null;
  const qty = typeof quantity === 'number' ? quantity : Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return null;
  const usePortion = mode === 'portion';
  if (usePortion && !item.portion) return null;

  const baseRate = itemRate(item, 'kcal');
  const perUnitQty = usePortion ? item.portion.amount : 1;
  const kcalPerUnit = baseRate * perUnitQty;
  const mlPerUnit = (item.unit === 'ml' && item.countsAsDrink) ? perUnitQty : 0;
  const amount = Math.round(qty * kcalPerUnit);

  return {
    amount,
    source: {
      kind: 'item',
      refId: item.id,
      name: item.name,
      quantity: qty,
      unit: usePortion ? 'serving' : item.unit,
      unitLabel: usePortion ? item.portion.label : null,
      perUnit: { kcal: kcalPerUnit, ml: mlPerUnit },
    },
  };
}

// Som van itemRate * hoeveelheid over alle ingrediënten waarvan het item nog
// bestaat. Symmetrisch met itemRate: ontbrekende items tellen als 0 in
// plaats van de hele berekening te laten falen, zodat een recept met een
// verwijderd ingrediënt gewoon met het resterende deel blijft rekenen.
export function recipeRate(recipe, items, nutrientKey = 'kcal') {
  const list = Array.isArray(items) ? items : [];
  const ingredients = recipe?.ingredients || [];
  let total = 0;
  for (const ingredient of ingredients) {
    const item = list.find((it) => it.id === ingredient.itemId);
    if (!item) continue;
    total += itemRate(item, nutrientKey) * ingredient.amount;
  }
  return total;
}

// Som van de ml uit ingrediënten die zelf als drinken meetellen, per portie.
// Voedt perUnit.ml in buildRecipeLog, zodat 2 porties van een recept met 200
// ml melk 400 ml naar de gekoppelde drinkteller schrijven.
export function recipeDrinkMl(recipe, items) {
  const list = Array.isArray(items) ? items : [];
  const ingredients = recipe?.ingredients || [];
  let total = 0;
  for (const ingredient of ingredients) {
    const item = list.find((it) => it.id === ingredient.itemId);
    if (!item) continue;
    if (item.unit === 'ml' && item.countsAsDrink) total += ingredient.amount;
  }
  return total;
}

// Ingrediënt-itemId's zonder bijbehorend bibliotheekitem — een verwijderd
// item wordt niet stil uit het recept gefilterd (normalizeRecipe kent
// `items` niet), dus het formulier en de log-modal hebben deze lijst nodig
// om een zichtbare hint te tonen in plaats van data-onzichtbaar-weg te laten
// vallen.
export function missingIngredientIds(recipe, items) {
  const list = Array.isArray(items) ? items : [];
  const ingredients = recipe?.ingredients || [];
  const ids = [];
  for (const ingredient of ingredients) {
    const exists = list.some((it) => it.id === ingredient.itemId);
    if (!exists) ids.push(ingredient.itemId);
  }
  return ids;
}

// Bouwt een logbare { amount, source } uit een recept en een aantal porties
// — exact hetzelfde contract als buildNutritionLog: `null` is het enige
// ongeldig-signaal (servings niet eindig of <= 0), nooit bij een leeg
// recept (dat levert gewoon kcalPerServing 0 en dus amount 0 op, AC7).
//
// `perUnit` bevriest de kcal/ml van één portie ONAFGEROND op het moment van
// loggen: een latere receptwijziging mag het dagtotaal van weken geleden
// niet met terugwerkende kracht veranderen (uitgangspunt 1) — hetzelfde doel
// als bij buildNutritionLog, nu toegepast op een sjabloon i.p.v. een los item.
export function buildRecipeLog(recipe, items, { servings } = {}) {
  if (!recipe) return null;
  const s = typeof servings === 'number' ? servings : Number(servings);
  if (!Number.isFinite(s) || s <= 0) return null;

  const kcalPerServing = recipeRate(recipe, items, 'kcal');
  const mlPerServing = recipeDrinkMl(recipe, items);
  const amount = Math.round(s * kcalPerServing);

  return {
    amount,
    source: {
      kind: 'recipe',
      refId: recipe.id,
      name: recipe.name,
      quantity: s,
      unit: 'serving',
      unitLabel: null,
      perUnit: { kcal: kcalPerServing, ml: mlPerServing },
    },
  };
}
