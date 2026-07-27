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

// De productmaat ("1 product = X g/ml"), opgeslagen onder `item.portion`.
// Hernoemd t.o.v. de vorige naam (normalizePortion) omdat #147 een eigen
// Portie-entiteit introduceert; deze functie blijft over productmaten gaan,
// niet over die nieuwe entiteit. De opgeslagen veldnaam (`item.portion`)
// verandert niet. Alleen geldig met zowel een label als een positief bedrag;
// anders is het geen maat (null), nooit een half-ingevuld object.
function normalizeProductSize(raw) {
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
    portion: normalizeProductSize({ label: portionLabel, amount: portionAmount }),
    // Alleen betekenisvol bij ml; bij g altijd false, ook als de aanroeper
    // het meegeeft (bv. een niet-opgeschoonde formulierwaarde na eenheidswissel).
    countsAsDrink: safeUnit === 'ml' && !!countsAsDrink,
  };
}

export function emptyNutritionLibrary() {
  return { items: [], portions: [], meals: [] };
}

// Eén rij binnen een portie is alleen geldig met zowel een productId als een
// positief, eindig aantal; anders is de rij zinloos en wordt hij niet
// bewaard. Dit controleert bewust NIET of het product nog bestaat — dat weet
// deze module niet (geen `items`-parameter) en zou hier stil dataverlies
// veroorzaken (zie missingProductIds voor de zichtbare hint).
function normalizePortionEntryRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const productId = typeof raw.productId === 'string' && raw.productId ? raw.productId : '';
  if (!productId) return null;
  const count = typeof raw.count === 'number' ? raw.count : Number(raw.count);
  if (!Number.isFinite(count) || count <= 0) return null;
  return { productId, count };
}

function normalizePortionEntries(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const row of rows) {
    const entry = normalizePortionEntryRow(row);
    if (entry) out.push(entry);
  }
  return out;
}

// Zelfde rol als normalizePortionEntryRow, één laag hoger: een rij binnen een
// maaltijd wijst naar een portie in plaats van een product.
function normalizeMealEntryRow(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const portionId = typeof raw.portionId === 'string' && raw.portionId ? raw.portionId : '';
  if (!portionId) return null;
  const count = typeof raw.count === 'number' ? raw.count : Number(raw.count);
  if (!Number.isFinite(count) || count <= 0) return null;
  return { portionId, count };
}

function normalizeMealEntries(raw) {
  const rows = Array.isArray(raw) ? raw : [];
  const out = [];
  for (const row of rows) {
    const entry = normalizeMealEntryRow(row);
    if (entry) out.push(entry);
  }
  return out;
}

// Bouwt een nieuwe, volledig genormaliseerde portie. Zelfde rol als
// createFoodItem: platte formuliervelden erin, een opslagbare shape eruit —
// gebruikt voor zowel een nieuwe als een bewerkte portie (in het laatste
// geval overschrijft de aanroeper `id` met het bestaande id).
export function createPortion({ name, entries = [] } = {}) {
  return {
    id: genId('portion'),
    name: (name || '').trim(),
    entries: normalizePortionEntries(entries),
  };
}

// Privé, zoals normalizeFoodItem: leest een opgeslagen portie en levert
// altijd een geldige shape of null (bij een lege naam) — nooit een crash op
// corrupte data.
function normalizePortion(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : genId('portion'),
    name,
    entries: normalizePortionEntries(raw.entries),
  };
}

// Bouwt een nieuwe, volledig genormaliseerde maaltijd. Zelfde rol als
// createPortion, één laag hoger (entries wijzen naar porties i.p.v.
// producten).
export function createMeal({ name, entries = [] } = {}) {
  return {
    id: genId('meal'),
    name: (name || '').trim(),
    entries: normalizeMealEntries(entries),
  };
}

// Privé, zoals normalizePortion: leest een opgeslagen maaltijd en levert
// altijd een geldige shape of null (bij een lege naam) — nooit een crash op
// corrupte data.
function normalizeMeal(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const name = typeof raw.name === 'string' ? raw.name.trim() : '';
  if (!name) return null;
  return {
    id: typeof raw.id === 'string' && raw.id ? raw.id : genId('meal'),
    name,
    entries: normalizeMealEntries(raw.entries),
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
    portion: normalizeProductSize(raw.portion),
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
  const rawPortions = Array.isArray(raw.portions) ? raw.portions : [];
  for (const rawPortion of rawPortions) {
    const portion = normalizePortion(rawPortion);
    if (portion) library.portions.push(portion);
  }
  const rawMeals = Array.isArray(raw.meals) ? raw.meals : [];
  for (const rawMeal of rawMeals) {
    const meal = normalizeMeal(rawMeal);
    if (meal) library.meals.push(meal);
  }
  // #147: recepten verdwijnen uit de UI, maar hun data mag niet verdwijnen uit
  // de opslag (AC7/Poort-0). We normaliseren `recipes` daarom bewust NIET meer
  // (geen `normalizeRecipe`, dat is met deze slice vervallen) — we dragen de
  // ruwe waarde ongewijzigd door. `emptyNutritionLibrary()` kent geen
  // `recipes`-veld meer, en de provider schrijft met `{ ...base, ... }`; zonder
  // deze regel zou de EERSTE schrijfactie na deze slice (een nieuw product,
  // portie of maaltijd) de oude recepten dus stilletjes wissen.
  if (raw.recipes !== undefined) library.recipes = raw.recipes;
  return library;
}

// Kcal (of een andere NUTRIENT_KEYS-waarde) per 1 eenheid van het item — de
// rekenbasis voor loggen in slice B (hoeveelheid x rate = totaal).
export function itemRate(item, nutrientKey = 'kcal') {
  const value = item?.per100?.[nutrientKey];
  return typeof value === 'number' ? value / 100 : 0;
}

// Kcal (of een andere NUTRIENT_KEYS-waarde) van ÉÉN product, zoals de
// gebruiker het opgeeft ("1 product = X g/ml"). Zonder geldige maat
// (item.portion === null) is dit 0 — nooit een crash, en dat is precies het
// AC7/AC8-gedrag: een product zonder maat telt in een portie gewoon als 0
// tot de gebruiker het bewerkt.
export function kcalPerProduct(item, nutrientKey = 'kcal') {
  return itemRate(item, nutrientKey) * (item?.portion?.amount ?? 0);
}

// De ml die één product bijdraagt aan een gekoppelde drinkteller (#143),
// zelfde voorwaarde als in buildNutritionLog: alleen ml-producten met
// `countsAsDrink`. Zonder geldige maat is dit ook 0.
export function productDrinkMl(item) {
  return item?.unit === 'ml' && item?.countsAsDrink ? (item?.portion?.amount ?? 0) : 0;
}

// Som van count × kcalPerProduct over alle entries waarvan het product nog
// bestaat. Symmetrisch met kcalPerProduct: een ontbrekend product telt als 0
// in plaats van de hele berekening te laten falen (AC8).
export function portionRate(portion, items, nutrientKey = 'kcal') {
  const list = Array.isArray(items) ? items : [];
  const entries = portion?.entries || [];
  let total = 0;
  for (const entry of entries) {
    const item = list.find((it) => it.id === entry.productId);
    if (!item) continue;
    total += entry.count * kcalPerProduct(item, nutrientKey);
  }
  return total;
}

// Som van de ml uit producten die zelf als drinken meetellen, per portie.
// Voedt perUnit.ml in buildPortionLog/buildMealLog.
export function portionDrinkMl(portion, items) {
  const list = Array.isArray(items) ? items : [];
  const entries = portion?.entries || [];
  let total = 0;
  for (const entry of entries) {
    const item = list.find((it) => it.id === entry.productId);
    if (!item) continue;
    total += entry.count * productDrinkMl(item);
  }
  return total;
}

// Som van count × portionRate over alle entries waarvan de portie nog
// bestaat — één laag hoger dan portionRate, zelfde "ontbrekend deel telt als
// 0"-gedrag (AC8).
export function mealRate(meal, portions, items, nutrientKey = 'kcal') {
  const list = Array.isArray(portions) ? portions : [];
  const entries = meal?.entries || [];
  let total = 0;
  for (const entry of entries) {
    const portion = list.find((p) => p.id === entry.portionId);
    if (!portion) continue;
    total += entry.count * portionRate(portion, items, nutrientKey);
  }
  return total;
}

// Som van de ml uit porties die zelf drinkbare ml bevatten, per maaltijd.
export function mealDrinkMl(meal, portions, items) {
  const list = Array.isArray(portions) ? portions : [];
  const entries = meal?.entries || [];
  let total = 0;
  for (const entry of entries) {
    const portion = list.find((p) => p.id === entry.portionId);
    if (!portion) continue;
    total += entry.count * portionDrinkMl(portion, items);
  }
  return total;
}

// Product-id's binnen een portie zonder bijbehorend bibliotheekitem — een
// verwijderd product wordt niet stil uit de portie gefilterd
// (normalizePortion kent `items` niet), dus het formulier en de log-modal
// hebben deze lijst nodig om een zichtbare hint te tonen (AC8) in plaats van
// data-onzichtbaar-weg te laten vallen.
export function missingProductIds(portion, items) {
  const list = Array.isArray(items) ? items : [];
  const entries = portion?.entries || [];
  const ids = [];
  for (const entry of entries) {
    const exists = list.some((it) => it.id === entry.productId);
    if (!exists) ids.push(entry.productId);
  }
  return ids;
}

// Zelfde rol als missingProductIds, één laag hoger: portie-id's binnen een
// maaltijd zonder bijbehorende portie.
export function missingPortionIds(meal, portions) {
  const list = Array.isArray(portions) ? portions : [];
  const entries = meal?.entries || [];
  const ids = [];
  for (const entry of entries) {
    const exists = list.some((p) => p.id === entry.portionId);
    if (!exists) ids.push(entry.portionId);
  }
  return ids;
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

// Bouwt een logbare { amount, source } uit een portie en een aantal — exact
// hetzelfde contract als buildNutritionLog: `null` is het enige
// ongeldig-signaal (count niet eindig of <= 0), nooit bij een lege portie
// (die levert gewoon kcalPerPortion 0 en dus amount 0 op, AC7/AC8).
//
// `perUnit` bevriest de kcal/ml van ÉÉN portie ONAFGEROND op het moment van
// loggen: een latere portiewijziging mag het dagtotaal van weken geleden niet
// met terugwerkende kracht veranderen (uitgangspunt 1) — hetzelfde doel als
// bij buildNutritionLog, nu toegepast op een portie i.p.v. een los item.
// `unit: 'portion'` (niet 'serving') zodat CounterEntryRow het juiste woord
// kiest op unit alleen, zonder op source.kind te schakelen (AC6).
export function buildPortionLog(portion, items, { count } = {}) {
  if (!portion) return null;
  const c = typeof count === 'number' ? count : Number(count);
  if (!Number.isFinite(c) || c <= 0) return null;

  const kcalPerPortion = portionRate(portion, items, 'kcal');
  const mlPerPortion = portionDrinkMl(portion, items);
  const amount = Math.round(c * kcalPerPortion);

  return {
    amount,
    source: {
      kind: 'portion',
      refId: portion.id,
      name: portion.name,
      quantity: c,
      unit: 'portion',
      unitLabel: null,
      perUnit: { kcal: kcalPerPortion, ml: mlPerPortion },
    },
  };
}

// Bouwt een logbare { amount, source } uit een maaltijd en een aantal — één
// laag hoger dan buildPortionLog, zelfde contract en bevriezingslogica.
export function buildMealLog(meal, portions, items, { count } = {}) {
  if (!meal) return null;
  const c = typeof count === 'number' ? count : Number(count);
  if (!Number.isFinite(c) || c <= 0) return null;

  const kcalPerMeal = mealRate(meal, portions, items, 'kcal');
  const mlPerMeal = mealDrinkMl(meal, portions, items);
  const amount = Math.round(c * kcalPerMeal);

  return {
    amount,
    source: {
      kind: 'meal',
      refId: meal.id,
      name: meal.name,
      quantity: c,
      unit: 'meal',
      unitLabel: null,
      perUnit: { kcal: kcalPerMeal, ml: mlPerMeal },
    },
  };
}
