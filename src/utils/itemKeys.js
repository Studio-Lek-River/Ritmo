// Item-keys identificeren een sleepbaar/afvinkbaar item (losse taak of
// project-subgoal) in de Productivity Suite. Ze zijn AFGELEID en worden
// nergens opgeslagen — alleen gebruikt als React-key en als dragPayload
// binnen één sleepactie (WeekView/TaskPoolPanel/KanbanView). Vroeger werd een
// subgoal-key samengesteld als een template-string (`subgoal:<mod>:<subj>:
// <goal>`) en weer ontleed met een positionele `split(':')`. Zodra één van
// die ids zelf een dubbele punt bevat — elke Trello-id (`trello:board:<id>`)
// — leverde dat de verkeerde delen op en deed `moveItemToDay` stil niets
// (S09a). Deze module codeert elk id-segment (`encodeURIComponent`) zodat
// samenstellen en ontleden altijd omkeerbaar zijn, ongeacht wat een
// id-segment zelf bevat.
const SUBGOAL_KIND = 'subgoal';
const TASK_KIND = 'task';
const VIRTUAL_TASK_PREFIX = 'virtual';

function enc(id) {
  return encodeURIComponent(String(id));
}

// `decodeURIComponent` gooit een URIError bij een malvormde %-reeks. Een
// item-key komt hier niet altijd uit vertrouwde bron: WeekView/TaskPoolPanel
// lezen de generieke `text/plain`-dataTransfer bij een drop, en die kan ook
// ruwe tekst van buiten Ritmo bevatten (extern gesleept). Zo'n decodeerfout
// hoort dezelfde stille no-op te geven als elke andere onherkende key, dus
// hier gevangen — nooit een ongevangen crash tot bij `moveItemToDay`.
function dec(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

// Samenstellen van een projecttaak-key. Elk id-segment wordt los gecodeerd
// vóór het samenvoegen, zodat een `:` binnen een id de latere ontleding niet
// breekt.
export function subgoalKey(moduleId, subjectId, goalId) {
  return [SUBGOAL_KIND, enc(moduleId), enc(subjectId), enc(goalId)].join(':');
}

// Samenstellen van een losse-taak-key. `taskId` mag zelf al een samengestelde
// vorm zijn (zie `virtualTaskId` hieronder) — als enkel segment gecodeerd,
// dus nooit dubbelzinnig te splitsen.
export function taskKey(taskId) {
  return `${TASK_KIND}:${enc(taskId)}`;
}

// Taak-id voor een nog niet gematerialiseerde recurring-instantie (zie
// App.jsx `weekDays`): een eigen samengestelde vorm, vóórdat die door
// `taskKey` gaat. Eigen encode/decode zodat `recurringId`/`dateKey` ook zelf
// een `:` mogen bevatten.
export function virtualTaskId(recurringId, dateKey) {
  return [VIRTUAL_TASK_PREFIX, enc(recurringId), enc(dateKey)].join(':');
}

// Herkent en ontleedt een virtuele taak-id. Geeft `null` bij een gewone
// (niet-virtuele) taak-id, zodat aanroepers een simpele if-check houden.
export function parseVirtualTaskId(taskId) {
  if (typeof taskId !== 'string') return null;
  const parts = taskId.split(':');
  if (parts.length !== 3 || parts[0] !== VIRTUAL_TASK_PREFIX) return null;
  const recurringId = dec(parts[1]);
  const dateKey = dec(parts[2]);
  if (recurringId === undefined || dateKey === undefined) return null;
  return { recurringId, dateKey };
}

// Gemakshelper voor de plekken die alleen willen weten "is dit item-key een
// nog niet gematerialiseerde recurring-instantie" (WeekView/ProductivitySuiteView),
// zonder zelf te hoeven ontleden.
export function isVirtualTaskKey(key) {
  const parsed = parseItemKey(key);
  return parsed.kind === TASK_KIND && parseVirtualTaskId(parsed.taskId) != null;
}

// Ontleedt een item-key naar zijn samenstellende, gedecodeerde ids. Een
// onherkende of ongeldige key levert `{ kind: 'unknown' }` op — nooit een
// crash — zodat een aanroeper (bv. `moveItemToDay`) er veilig niets mee kan
// doen, zoals voorheen.
export function parseItemKey(key) {
  if (typeof key !== 'string') return { kind: 'unknown' };

  if (key.startsWith(`${SUBGOAL_KIND}:`)) {
    const parts = key.split(':');
    if (parts.length !== 4) return { kind: 'unknown' };
    const [, moduleIdRaw, subjectIdRaw, goalIdRaw] = parts;
    const moduleId = dec(moduleIdRaw);
    const subjectId = dec(subjectIdRaw);
    const goalId = dec(goalIdRaw);
    if (moduleId === undefined || subjectId === undefined || goalId === undefined) return { kind: 'unknown' };
    return { kind: SUBGOAL_KIND, moduleId, subjectId, goalId };
  }

  if (key.startsWith(`${TASK_KIND}:`)) {
    const taskId = dec(key.slice(TASK_KIND.length + 1));
    return taskId === undefined ? { kind: 'unknown' } : { kind: TASK_KIND, taskId };
  }

  return { kind: 'unknown' };
}
