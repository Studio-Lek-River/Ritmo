// Duur en tijd die de gebruiker zelf zet op een item van een gekoppelde bron
// (een Trello-kaart, een GitHub-issue).
//
// WAAROM DIT BESTAAT: afgeleide bron-modules worden bij elke render opnieuw
// opgebouwd uit de cache (trelloModules.js / githubModules.js zijn puur en
// schrijven nooit) en `setModules` kent alleen de settings-only `modules`. Er
// is dus geen veld op het item zelf waar zo'n waarde kan landen. Deze map is
// dat zijkanaal: hij wordt read-time over de afgeleide modules gemerged
// (applyItemOverrides), zodat `modules` settings-only blijft en de bron
// structureel read-only.
//
// PRIVACY — LEES DIT VOOR JE HIER EEN VELD BIJ ZET:
// Deze map leeft in de settings-blob en synct dus naar Supabase én staat in
// elk backup-bestand (zie sync/userDataStorage.js `isUserSyncKey`). Dat mag
// hier, en bewust NIET voor `trello:cards`/`github:issues` (S08 Valkuil 1),
// om precies één reden: de inhoud is ondoorzichtig. De sleutels zijn opake
// ids (een Trello-ObjectId, een GitHub-database-id) en de waarden zijn een
// aantal minuten of een klokwaarde. Bordnamen, kaarttitels, issue-titels en
// urls horen hier NOOIT — die zouden de bron-inhoud alsnog naar de cloud
// tillen, wat de hele reden is dat de caches device-local staan.
// `withItemOverride` spreadt daarom nooit de input van de aanroeper maar
// plukt expliciet de twee toegestane velden; een per ongeluk meegegeven
// `label` valt vanzelf af.

import { TRELLO_CARD_ID_PREFIX } from './trelloModules';
import { GITHUB_ISSUE_ID_PREFIX } from './githubModules';

// Sleutel = de afgeleide subgoal-id (`trello:card:<id>`, `github:issue:<id>`).
// Shape: { [subgoalId]: { duration?, dateKey?, time? } }
//
// `dateKey` is de dag-binding: staat hij er, dan heeft de gebruiker dit item
// zelf op die dag gepland en gedraagt het zich verder als een gewoon subgoal
// (één blok, op één dag). Staat hij er niet, dan bepaalt de bron het (de
// Trello-due, of een vrij blok dat elke dag mag). Dat onderscheid is nodig
// omdat het weekrooster per dagkolom een tijdlijn bouwt: een vrij blok mét
// tijd zou anders in alle zeven kolommen tegelijk verschijnen.
//
// De binding maskeert de due-datum van de bron dus wél, maar alleen zolang de
// gebruiker hem zelf heeft gezet, en één klik ("terug naar de bron") haalt hem
// weg. Dat is bewust iets anders dan een stille, permanente overschrijving.
const EMPTY_PREF = { duration: undefined, dateKey: undefined, time: undefined };

// De prefixen komen uit de mappers zelf, die de enige makers van deze ids
// zijn; een id met zo'n prefix ís dus per constructie een bron-item.
const SOURCE_ITEM_ID_PREFIXES = [TRELLO_CARD_ID_PREFIX, GITHUB_ISSUE_ID_PREFIX];

// Herkent of een subgoal-id van een gekoppelde bron komt, en dus hierheen
// geschreven moet worden in plaats van naar `modules`.
//
// Dit kijkt naar de id-vorm en niet naar `module.source` (wat mooier zou zijn)
// omdat de schrijvers in App.jsx boven de `allModules`-useMemo staan: die
// mogen er in hun dependency-array niet naar verwijzen. Een nieuwe provider
// voegt hier zijn prefix toe.
export function isSourceItemId(subgoalId) {
  if (typeof subgoalId !== 'string') return false;
  return SOURCE_ITEM_ID_PREFIXES.some(prefix => subgoalId.startsWith(prefix));
}

// Merge met de default zodat een ontbrekend item nooit `undefined` teruggeeft.
// Bestaande settings zonder `sourceItemPrefs` werken zo zonder migratie.
export function getSourceItemPref(prefs, subgoalId) {
  return { ...EMPTY_PREF, ...(prefs?.[subgoalId] || {}) };
}

// De enige plek die bepaalt wat er in de map mag staan. Expliciet plukken in
// plaats van `...patch` spreaden: zie de privacy-toelichting hierboven.
//
// De AANWEZIGHEID van de sleutel is het signaal, niet de waarde: `{ time:
// undefined }` betekent "wis de tijd" en niet "laat de tijd met rust". Anders
// zou zowel de wis-knop als het terugdraaien van een eerste tijd stil niets
// doen, want die geven allebei een lege waarde mee. Een veld dat niet in
// `patch` zit blijft ongemoeid.
function pickAllowed(patch) {
  const out = {};
  if ('duration' in patch) out.duration = patch.duration;
  if ('dateKey' in patch) out.dateKey = patch.dateKey;
  if ('time' in patch) out.time = patch.time;
  return out;
}

// Pure reducer: geeft een nieuwe map terug met `patch` toegepast op één item.
// Delete-on-empty — een item zonder waarden verdwijnt uit de map in plaats van
// als leeg object te blijven staan. Dat houdt de map (en dus de settings-blob)
// begrensd tot wat de gebruiker echt heeft gezet, en het is meteen de
// wis-actie: een lege duur of tijd ruimt zichzelf op. Zelfde
// "leeg = geen waarde"-conventie als `duration`/`time` op een eigen taak.
export function withItemOverride(prefs, subgoalId, patch) {
  const merged = { ...getSourceItemPref(prefs, subgoalId), ...pickAllowed(patch) };
  const cleaned = {};
  if (merged.duration) cleaned.duration = merged.duration;
  if (merged.dateKey) cleaned.dateKey = merged.dateKey;
  // Een tijd zonder dag-binding kan het rooster niet plaatsen (het zou op elke
  // dag verschijnen), dus die bewaren we niet los.
  if (merged.dateKey && merged.time) cleaned.time = merged.time;

  const next = { ...(prefs || {}) };
  if (Object.keys(cleaned).length === 0) delete next[subgoalId];
  else next[subgoalId] = cleaned;
  return next;
}

// Wist alle overrides van één bron in één keer, gebruikt zodra een koppeling
// verbroken blijkt (naast het wissen van de cache en de board/repo-prefs).
// De prefix komt uit de mapper zelf, zodat de id-vorm op één plek staat.
export function clearOverridesWithPrefix(prefs, prefix) {
  if (!prefs) return prefs;
  const keys = Object.keys(prefs).filter(k => k.startsWith(prefix));
  if (keys.length === 0) return prefs;
  const next = { ...prefs };
  keys.forEach(k => { delete next[k]; });
  return next;
}

// Read-time merge over afgeleide modules (bord -> module, lijst -> subject,
// kaart -> subgoal). Alleen bedoeld voor bron-modules; lokale modules dragen
// hun duur/tijd op het item zelf.
//
// De identity-fast-path is functioneel, niet cosmetisch: zonder hem levert
// elke render een nieuwe array op, wat de memo-identiteit van `allModules`
// breekt en daarmee die van `buildPlanInputs`.
//
// Conditionele spread (niet `duration: o.duration`) zodat een ontbrekende
// waarde het veld weglaat in plaats van het op `undefined` te zetten —
// dezelfde conventie als de mappers zelf.
//
// Een dag-binding (`dateKey`) zet `freeBlock` uit: een vrij blok mag op elke
// dag verschijnen, maar zodra de gebruiker het item op één dag heeft gezet
// hoort het daar alleen te staan. Zonder dat zou het rooster hetzelfde item in
// alle zeven dagkolommen tonen.
export function applyItemOverrides(modules, prefs) {
  if (!prefs || Object.keys(prefs).length === 0) return modules;
  return modules.map(mod => ({
    ...mod,
    subjects: (mod.subjects || []).map(subject => ({
      ...subject,
      subgoals: (subject.subgoals || []).map(goal => {
        const override = prefs[goal.id];
        if (!override) return goal;
        return {
          ...goal,
          ...(override.duration ? { duration: override.duration } : {}),
          ...(override.dateKey ? { deadline: override.dateKey, freeBlock: false } : {}),
          ...(override.time ? { time: override.time } : {}),
        };
      }),
    })),
  }));
}
