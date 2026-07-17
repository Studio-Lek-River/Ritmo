// Bouwt Trello-borden om tot afgeleide `projects`-modules (S08, de
// kernbeslissing "afgeleide modules" uit de slice-spec). Puur en
// deterministisch: dezelfde `cache`+`prefs` geven altijd exact dezelfde
// modules terug, en dit bestand schrijft zelf NOOIT naar opslag (AC16) — het
// wordt bij elke render opnieuw afgeleid, dus er is geen merge en geen
// wees-data mogelijk. Bord -> module, lijst -> subject, kaart -> subgoal
// (Poort-0-beslissing 3), met deterministische ids zodat een bulk-import in
// één tick nooit botst (zie de id-botsing-toelichting in de slice-spec).
//
// Alleen borden die zowel in `prefs` zijn aangevinkt (`include: true`) als in
// `cache` aanwezig zijn leveren een module op: een aangevinkt maar nog niet
// opgehaald bord (cache leeg/verouderd) levert simpelweg niets op totdat
// useTrelloCards het heeft opgehaald — nooit een module met lege/rare data.
import { fmtDateKey } from './dates';
import { getBoardPref } from './trelloBoardPrefs';

// Trello levert `due` als volledige UTC-ISO-timestamp (anders dan Microsoft
// Graph, dat via de `Prefer`-header al wall-clock-tijd teruggeeft — zie
// outlookEvents.js). Een kaart die om 23:00 UTC vervalt hoort in Amsterdam op
// de volgende lokale dag, dus de `deadline` gaat via de LOKALE tijdzone:
// `new Date(due)` parseert het instant, en `fmtDateKey` leest daarna de
// lokale jaar/maand/dag-componenten. Dit wijkt bewust af van de
// tz-onafhankelijke regel in outlookEvents.js (Graph levert al wall-clock) —
// niet "fixen" naar UTC-only, dat zou de dag hier juist verkeerd maken.
function dueToDeadline(due) {
  if (!due) return null;
  const date = new Date(due);
  if (Number.isNaN(date.getTime())) return null;
  return fmtDateKey(date);
}

// De id-vorm van een afgeleid subgoal staat alleen hier. Geëxporteerd zodat
// sourceItemPrefs alle Trello-overrides in één keer kan wissen zonder de
// vorm te kopiëren.
export const TRELLO_CARD_ID_PREFIX = 'trello:card:';

function buildSubgoal(card, { isAlwaysList }) {
  return {
    id: `${TRELLO_CARD_ID_PREFIX}${card.id}`,
    label: card.name || '',
    // Trello kent geen aparte done-vlag op een kaart: `dueComplete` is het
    // enige signaal en is alleen betekenisvol bij een kaart mét due-datum
    // (zonder due staat hij altijd op `false`, ook kaarten uit de
    // altijd-lijst). De bordvoortgang telt zulke kaarten dus mee als "niet
    // klaar" — bewust aanvaard, zie Valkuil 3 in de slice-spec.
    completed: !!card.dueComplete,
    deadline: dueToDeadline(card.due),
    ...(isAlwaysList ? { freeBlock: true } : {}),
    // Trello-kaarten zijn read-only en hebben geen eigen autoPlan-checkbox
    // (die bestaat alleen in de bewerkbare ProjectsView-UI); ze mogen wel
    // altijd meedoen aan "deel mijn dag in" zodra ze een deadline of
    // freeBlock hebben, dus autoPlan staat hier vast aan.
    autoPlan: true,
    grade: null,
    url: card.url || null,
  };
}

function buildSubject(list, cardsForList, boardPref) {
  const isAlwaysList = !!boardPref.alwaysListId && list.id === boardPref.alwaysListId;
  return {
    id: `trello:list:${list.id}`,
    name: list.name || '',
    subgoals: cardsForList.map((card) => buildSubgoal(card, { isAlwaysList })),
  };
}

function buildBoardModule(board, boardPref, { connectionId, color }) {
  const lists = board.lists || [];
  const cards = board.cards || [];
  return {
    id: `trello:board:${board.id}`,
    type: 'projects',
    name: board.name || '',
    icon: 'Trello',
    color,
    enabled: true,
    source: { provider: 'trello', connectionId: connectionId ?? null, url: board.url || null },
    subjects: lists.map((list) => buildSubject(
      list,
      cards.filter((card) => card.idList === list.id),
      boardPref,
    )),
  };
}

// `cache` komt uit trelloCache.js (readTrelloCache), `prefs` uit
// trelloBoardPrefs.js (readTrelloBoardPrefs). Beide mogen `null`/leeg zijn
// (bv. vóór de eerste fetch) — dan is het resultaat een lege lijst.
export function buildTrelloModules(cache, prefs, { connectionId, color } = {}) {
  const boards = cache?.boards || [];
  return boards
    .map((board) => {
      const boardPref = getBoardPref(prefs, board.id);
      if (!boardPref.include) return null;
      return buildBoardModule(board, boardPref, { connectionId, color });
    })
    .filter(Boolean);
}
