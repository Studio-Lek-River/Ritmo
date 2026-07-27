// Pure helpers voor de `returnTo`-waarde door de Outlook-OAuth-state heen
// (S12a, deel A): zodat je na "Opnieuw koppelen" terugkomt in de Planner op
// de dag waarvoor je wilde wegschrijven, in plaats van op het startscherm.
//
// Vorm: `planner:<dateKey>` (bv. `planner:2026-07-27`) — een token, geen pad
// of URL. Per constructie geen open-redirect: er staat nooit een host of pad
// in de waarde zelf. De server houdt zijn eigen kopie van precies deze regex
// (`api/connections/_shared.js`, `RETURN_TO_REGEX`): `api/` importeert
// nergens uit `src/`, en die grens doorbreken voor één regex is de verkeerde
// ruil. Beide plekken verwijzen in hun comment naar de andere.
const RETURN_TO_PREFIX = 'planner:';
const RETURN_TO_REGEX = /^planner:\d{4}-\d{2}-\d{2}$/;

// Bouwt de returnTo-waarde voor `dateKey`, of `null` als die niet aan het
// verwachte formaat voldoet (defensief; `dateKey` komt in de praktijk altijd
// uit `fmtDateKey`). `null` betekent voor de aanroeper: geen `returnTo`
// meegeven, exact het gedrag van vóór deze slice.
export function buildPlannerReturnTo(dateKey) {
  const value = `${RETURN_TO_PREFIX}${dateKey}`;
  return RETURN_TO_REGEX.test(value) ? value : null;
}

// Parseert een teruggekregen `returnTo`-waarde naar `{ view, dateKey }`, of
// `null` als de waarde ontbreekt, gemanipuleerd is of niet aan het formaat
// voldoet — de aanroeper valt dan terug op de default-view (AC5).
export function parseReturnTo(value) {
  if (typeof value !== 'string' || !RETURN_TO_REGEX.test(value)) return null;
  return { view: 'productivity', dateKey: value.slice(RETURN_TO_PREFIX.length) };
}
