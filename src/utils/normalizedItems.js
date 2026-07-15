// Genormaliseerde items-laag (S02, zie docs/ROADMAP.md §S02). Pure functie die
// bestaande `tasks`- en `projects`-modules mapt naar het ROADMAP-item-shape:
// { source, account, project, title, status, due, priority, progress, url }.
// Voegt geen nieuw module-type toe: een module krijgt optioneel een
// `source: { provider, connectionId, account }`-veld wanneer hij aan een
// externe koppeling hangt (S03+ vult dit daadwerkelijk). Zonder `source` is het
// item lokaal (source: null) — bestaande profielen blijven ongewijzigd werken
// (principe 1: hergebruik, geen nieuw type; principe 2: optioneel, niets
// afgedwongen). `deriveTaskStatus` (taskBoard.js) wordt hergebruikt zodat de
// statuslogica op precies één plek staat.
//
// `progress` is een aggregatie van done/total over alle items met dezelfde
// (source, project)-combinatie — niet per subject/module afzonderlijk — zodat
// items die later uit hetzelfde externe bord/project samenkomen (S04+) correct
// meetellen. Schrijft zelf nooit naar opslag.
import { fmtDateKey } from './dates';
import { deriveTaskStatus } from './taskBoard';

const DONE_STATUS = 'klaar';

function moduleSource(mod) {
  const s = mod?.source;
  if (!s || !s.provider) return null;
  return { provider: s.provider, connectionId: s.connectionId ?? null };
}

function moduleAccount(mod) {
  return mod?.source?.account ?? null;
}

function sourceProjectKey(source, project) {
  const sourceKey = source ? `${source.provider}:${source.connectionId ?? ''}` : 'local';
  return `${sourceKey}::${project ?? ''}`;
}

function applyProgress(items) {
  const totals = new Map();
  items.forEach(item => {
    if (item.project == null) return;
    const key = sourceProjectKey(item.source, item.project);
    const entry = totals.get(key) || { done: 0, total: 0 };
    entry.total += 1;
    if (item.status === DONE_STATUS) entry.done += 1;
    totals.set(key, entry);
  });

  return items.map(item => {
    if (item.project == null) return item;
    const key = sourceProjectKey(item.source, item.project);
    const { done, total } = totals.get(key);
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

  const tasksModule = modules.find(m => m.enabled && m.type === 'tasks');
  const taskSource = moduleSource(tasksModule);
  const taskAccount = moduleAccount(tasksModule);
  customTasks.forEach(task => {
    raw.push({
      source: taskSource,
      account: taskAccount,
      project: null,
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
      (subject.subgoals || []).forEach(goal => {
        raw.push({
          source,
          account,
          project: subject.name,
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
