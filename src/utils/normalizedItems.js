// Genormaliseerde items-laag (S02, issue #35). Pure functie die bestaande
// `tasks`- en `projects`-modules mapt naar het vastgelegde item-shape
// (.claude/docs/PROJECT_INSTRUCTIONS.md, "Vastgelegde architectuurkeuzes"):
// { source, account, project, projectKey, title, status, due, priority, progress, url }.
// Voegt geen nieuw module-type toe: een module krijgt optioneel een
// `source: { provider, connectionId, account }`-veld wanneer hij aan een
// externe koppeling hangt (S03+ vult dit daadwerkelijk). Zonder `source` is het
// item lokaal (source: null) — bestaande profielen blijven ongewijzigd werken
// (principe 1: hergebruik, geen nieuw type; principe 2: optioneel, niets
// afgedwongen). `deriveTaskStatus` (taskBoard.js) wordt hergebruikt zodat de
// statuslogica op precies één plek staat.
//
// `project` blijft het weergave-label (de subjectnaam, bv. een Trello-lijst of
// GitHub-repo) — puur voor tonen in de UI. `progress` groepeert daarentegen op
// `projectKey`: een stabiele sleutel van module-id + subject-id, losstaand van
// dat label. Zonder die scheiding belanden twee Trello-borden met allebei een
// lijst "Doing" in dezelfde voortgangsbucket, puur omdat het label toevallig
// gelijk is (de landmijn uit docs/slices/S08-trello-lezen.md, opgeruimd in
// S10). Module- en subject-ids zijn al deterministisch en uniek per bron
// (trelloModules.js: `trello:board:<id>` / `trello:list:<id>`,
// githubModules.js: `github:repo:<id>`; lokale project-modules dragen hun
// eigen module-/subject-id), dus `projectKey` hoeft de provider niet nog eens
// apart te herhalen.
//
// Sinds S02 dode code (nul imports buiten docs); vanaf S10 hergebruikt door
// FeedView. Schrijft zelf nooit naar opslag.
import { fmtDateKey } from './dates';
import { deriveTaskStatus } from './taskBoard';

const DONE_STATUS = 'klaar';
const LOOSE_TASKS_SUBJECT_KEY = 'tasks';

function moduleSource(mod) {
  const s = mod?.source;
  if (!s || !s.provider) return null;
  return { provider: s.provider, connectionId: s.connectionId ?? null };
}

function moduleAccount(mod) {
  return mod?.source?.account ?? null;
}

// Stabiele voortgangssleutel: module-id + subject-id, los van het
// weergave-label (`project`). `subjectId` is `null` voor losse taken (er is
// geen subject) en krijgt dan een vaste placeholder, zodat de sleutel nooit
// op een lege string na de `::` eindigt.
function computeProjectKey(moduleId, subjectId) {
  return `${moduleId ?? ''}::${subjectId ?? LOOSE_TASKS_SUBJECT_KEY}`;
}

function applyProgress(items) {
  const totals = new Map();
  items.forEach(item => {
    const entry = totals.get(item.projectKey) || { done: 0, total: 0 };
    entry.total += 1;
    if (item.status === DONE_STATUS) entry.done += 1;
    totals.set(item.projectKey, entry);
  });

  return items.map(item => {
    const { done, total } = totals.get(item.projectKey);
    const progress = total === 0 ? 0 : Math.round((done / total) * 100);
    return { ...item, progress };
  });
}

// Bouwt de platte lijst genormaliseerde items uit de bestaande Ritmo-bronnen.
// `referenceDate` bepaalt de dag-key die aan losse taken (customTasks) als
// `due` wordt meegegeven — zij horen bij "vandaag" totdat een echte due-datum
// bestaat.
export function buildNormalizedItems({ modules = [], customTasks = [], referenceDate = new Date() } = {}) {
  const raw = [];
  const todayKey = fmtDateKey(referenceDate);

  // Losse taken (customTasks) dragen zelf geen module-id, dus ze horen niet
  // bij één specifieke module-instantie. De metadata (bron, account,
  // projectKey) moet wel van een enabled `tasks`-module komen als die er is,
  // en niet zomaar van de eerst gevonden ongeacht of die een echte externe
  // bron heeft: bij meerdere enabled `tasks`-modules wint de module mét een
  // `source`-binding. Zonder zo'n module valt het terug op de eerste
  // (sowieso lokaal, dus `source: null`).
  const taskModules = modules.filter(m => m.enabled && m.type === 'tasks');
  const taskModule = taskModules.find(m => moduleSource(m)) || taskModules[0];
  const taskSource = moduleSource(taskModule);
  const taskAccount = moduleAccount(taskModule);
  const taskProjectKey = computeProjectKey(taskModule?.id, null);
  customTasks.forEach(task => {
    raw.push({
      source: taskSource,
      account: taskAccount,
      project: null,
      projectKey: taskProjectKey,
      title: task.text,
      status: deriveTaskStatus({ done: task.done, status: task.status }),
      due: task.time ? todayKey : null,
      priority: task.priority ?? null,
      progress: null,
      url: task.url ?? null,
    });
  });

  modules.forEach(mod => {
    if (!mod.enabled || mod.type !== 'projects') return;
    const source = moduleSource(mod);
    const account = moduleAccount(mod);
    (mod.subjects || []).forEach(subject => {
      const projectKey = computeProjectKey(mod.id, subject.id);
      (subject.subgoals || []).forEach(goal => {
        raw.push({
          source,
          account,
          project: subject.name,
          projectKey,
          title: goal.label,
          status: deriveTaskStatus({ completed: goal.completed, status: goal.status }),
          due: goal.deadline || null,
          priority: goal.priority ?? null,
          progress: null,
          url: goal.url ?? null,
        });
      });
    });
  });

  return applyProgress(raw);
}
