// Aggregatie-helper voor de Productivity Suite Dag-view. Neemt de bestaande
// Ritmo-bronnen (modules, moduleData, customTasks) en bouwt daaruit een platte,
// genormaliseerde tijdlijn met per item: dagdeel, status en een toggle-functie
// die de bestaande handlers hergebruikt. Voegt geen nieuw "kind"-veld toe aan
// opgeslagen data — het type wordt hier afgeleid uit de bron.
import { fmtDateKey } from './dates';
import { isChecklistItemComplete } from './dayProgress';
import { resolveModuleName, t } from '../i18n/useTranslation';

// Vaste drempels (kloktijd, "HH:MM") voor de dagdeel-indeling. Geen UI-instelling
// in deze slice; hier als constante zodat er geen verspreide magic numbers zijn.
export const DAGDEEL_THRESHOLDS = {
  ochtendEnd: '12:00', // < ochtendEnd => 'ochtend'
  middagEnd: '18:00',  // ochtendEnd..middagEnd => 'middag'; >= middagEnd => 'avond'
};

export const DAGDEEL_ORDER = ['ochtend', 'middag', 'avond', 'ongepland'];

function timeToMinutes(time) {
  if (!time || typeof time !== 'string') return null;
  const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Bepaalt het dagdeel voor een kloktijd ("HH:MM"). Ontbrekende/ongeldige tijd
// => 'ongepland', zodat bestaande data zonder tijd zichtbaar blijft.
export function dagdeelForTime(time) {
  const minutes = timeToMinutes(time);
  if (minutes == null) return 'ongepland';
  const ochtendEnd = timeToMinutes(DAGDEEL_THRESHOLDS.ochtendEnd);
  const middagEnd = timeToMinutes(DAGDEEL_THRESHOLDS.middagEnd);
  if (minutes < ochtendEnd) return 'ochtend';
  if (minutes < middagEnd) return 'middag';
  return 'avond';
}

function pushItem(items, entry) {
  items.push({ ...entry, order: items.length });
}

// Bouwt de platte, ongegroepeerde tijdlijn voor "vandaag". `handlers` bevat de
// bestaande App-level toggle-functies; deze module schrijft zelf nooit naar
// opslag, ze roept alleen de meegegeven functie aan bij een klik.
export function buildDayTimeline({
  modules = [],
  moduleData = {},
  customTasks = [],
  referenceDate = new Date(),
  handlers = {},
} = {}) {
  const items = [];
  const todayDateKey = fmtDateKey(referenceDate);

  modules.forEach(mod => {
    if (!mod.enabled) return;

    if (mod.type === 'checklist') {
      (mod.items || []).forEach(item => {
        const raw = moduleData[mod.id]?.[item.id];
        const time = item.time || '';
        pushItem(items, {
          key: `checklist:${mod.id}:${item.id}`,
          kind: 'routine',
          label: item.label,
          time,
          dagdeel: dagdeelForTime(time),
          status: isChecklistItemComplete(item, raw),
          color: mod.color,
          toggle: handlers.onChecklistToggle
            ? () => handlers.onChecklistToggle(mod.id, item.id)
            : undefined,
        });
      });
      return;
    }

    if (mod.type === 'choice') {
      const data = moduleData[mod.id] || {};
      const time = mod.time || '';
      const options = mod.options || [];
      const toggleOptionId = data.completed && data.selectedOption
        ? data.selectedOption
        : options[0]?.id;
      pushItem(items, {
        key: `choice:${mod.id}`,
        kind: 'routine',
        label: resolveModuleName(mod, t),
        time,
        dagdeel: dagdeelForTime(time),
        status: !!data.completed,
        color: mod.color,
        toggle: (handlers.onChoiceOptionSet && toggleOptionId)
          ? () => handlers.onChoiceOptionSet(mod.id, toggleOptionId)
          : undefined,
      });
      return;
    }

    if (mod.type === 'counter') {
      const data = moduleData[mod.id] || {};
      const time = mod.time || '';
      const goal = mod.dailyGoal ?? mod.dailyGoalMinutes ?? 0;
      const total = data.total ?? data.minutes ?? 0;
      pushItem(items, {
        key: `counter:${mod.id}`,
        kind: 'activiteit',
        label: resolveModuleName(mod, t),
        time,
        dagdeel: dagdeelForTime(time),
        status: goal > 0 && total >= goal,
        color: mod.color,
        // Activiteiten zijn niet afvinkbaar vanuit de Dag-view; de regel
        // navigeert naar Vandaag om de voortgang daar te loggen.
        toggle: handlers.onNavigateToday ? () => handlers.onNavigateToday() : undefined,
      });
      return;
    }

    if (mod.type === 'projects') {
      (mod.subjects || []).forEach(subject => {
        (subject.subgoals || []).forEach(goal => {
          if (goal.deadline !== todayDateKey) return;
          const time = goal.time || '';
          pushItem(items, {
            key: `subgoal:${mod.id}:${subject.id}:${goal.id}`,
            kind: 'projecttaak',
            label: goal.label,
            time,
            dagdeel: dagdeelForTime(time),
            status: !!goal.completed,
            color: mod.color,
            toggle: handlers.onToggleProjectSubgoal
              ? () => handlers.onToggleProjectSubgoal(mod.id, subject.id, goal.id)
              : undefined,
          });
        });
      });
    }
  });

  const tasksModuleColor = modules.find(m => m.enabled && m.type === 'tasks')?.color;
  customTasks.forEach(task => {
    const time = task.time || '';
    pushItem(items, {
      key: `task:${task.id}`,
      kind: 'losseTaak',
      label: task.text,
      time,
      dagdeel: dagdeelForTime(time),
      status: !!task.done,
      color: tasksModuleColor,
      toggle: handlers.onToggleTask ? () => handlers.onToggleTask(task.id) : undefined,
    });
  });

  return items;
}

function byTimeThenOrder(a, b) {
  if (a.time !== b.time) return a.time < b.time ? -1 : 1;
  return a.order - b.order;
}

// Groepeert een platte tijdlijn per dagdeel. Binnen een dagdeel: sorteren op
// tijd, daarna op bronvolgorde (stabiele tiebreaker via `order`).
export function groupDayTimelineByDagdeel(items) {
  const grouped = { ochtend: [], middag: [], avond: [], ongepland: [] };
  items.forEach(item => {
    (grouped[item.dagdeel] || grouped.ongepland).push(item);
  });
  DAGDEEL_ORDER.forEach(key => {
    grouped[key].sort(byTimeThenOrder);
  });
  return grouped;
}

// Groepeert een platte tijdlijn per uur (00:00–23:00) voor een agenda-weergave.
// Items zonder geldige tijd komen in `untimed`. Binnen een uur en binnen
// `untimed`: sorteren op tijd, daarna op bronvolgorde (stabiele tiebreaker).
export function groupDayTimelineByHour(items) {
  const untimed = [];
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, items: [] }));
  items.forEach(item => {
    const minutes = timeToMinutes(item.time);
    if (minutes == null) {
      untimed.push(item);
      return;
    }
    hours[Math.floor(minutes / 60)].items.push(item);
  });
  hours.forEach(slot => slot.items.sort(byTimeThenOrder));
  untimed.sort(byTimeThenOrder);
  return { untimed, hours };
}
