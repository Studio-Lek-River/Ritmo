// Voedingsbibliotheek-domein (slice A): puur data, geen React, geen storage.
// Zelfde normalisatie-patroon als normalizeWeekMenu (mealplan.js): bouw
// altijd een verse, geldige shape en kopieer alléén herkende waarden uit
// `raw` — een corrupte of oude opgeslagen vorm mag nooit crashen, hij levert
// gewoon een lege bibliotheek op.

import { genId } from './genId';

// Eenheden waarin een voedingsmiddel wordt vastgelegd. 'ml' is de enige
// eenheid waarbij "telt ook mee als drinken" betekenis heeft (koppeling met
// de Drinken-teller volgt pas in slice D).
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
  return { items: [] };
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

// Standaard nutrition-config voor een counter-module. `drinkModuleId` wordt
// pas in slice D daadwerkelijk gebruikt; het datamodel ligt nu al vast.
export function defaultModuleNutrition() {
  return { enabled: false, drinkModuleId: null };
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
