// Aggregatie-helper voor de Productivity Suite Dag-view. De Planner toont
// échte taken (losse taken voor vandaag), projecten (project-subgoals met
// deadline vandaag) en, sinds S10c, module-items/-blokken die de module zelf
// heeft opt-in gezet (`planInDay`) — bv. fysio-oefeningen of de avondroutine.
// Neemt de bestaande Ritmo-bronnen (modules, customTasks, moduleData) en bouwt
// daaruit een platte, genormaliseerde tijdlijn met per item: dagdeel, status en
// een toggle-functie die de bestaande handlers hergebruikt. Voegt geen nieuw
// veld toe aan opgeslagen data buiten wat de moduleconfig al draagt — het type
// wordt hier afgeleid uit de bron.
import { fmtDateKey } from './dates';
import { subgoalKey, taskKey, moduleItemKey, moduleBlockKey } from './itemKeys';
import { isChecklistItemComplete, moduleStatusForDay } from './dayProgress';

// Vaste drempels (kloktijd, "HH:MM") voor de dagdeel-indeling. Geen UI-instelling
// in deze slice; hier als constante zodat er geen verspreide magic numbers zijn.
export const DAGDEEL_THRESHOLDS = {
  ochtendEnd: '12:00', // < ochtendEnd => 'ochtend'
  middagEnd: '18:00',  // ochtendEnd..middagEnd => 'middag'; >= middagEnd => 'avond'
};

export const DAGDEEL_ORDER = ['ochtend', 'middag', 'avond', 'ongepland'];

// Default blok-duur (minuten) als een item geen `duration` heeft: bepaalt de
// WeekView-blokhoogte en de TaskPoolPanel-duurhint. Eén centrale plek zodat
// beide views dezelfde aanname delen (geen losse magic numbers).
export const DEFAULT_BLOCK_MINUTES = 30;

// Snelkeuzes (minuten) voor de duur-chip in de takenpool. Zelfde reden als
// DEFAULT_BLOCK_MINUTES hierboven: geen verspreide magic numbers. Wie een
// andere waarde wil gebruikt het vrije minutenveld in dezelfde popover.
export const DURATION_PRESETS = [15, 30, 45, 60, 90];

// Keuzelijst voor de dagdeel-voorkeur (`window`) op customTasks, project-
// subgoals en recurringTasks. '' = geen voorkeur (veld weglaten bij opslag).
// Hergebruikt de bestaande `productivity.dagdelen.*`-labels; alleen de lege
// optie krijgt een nieuwe key (`planner.window.none`).
export const WINDOW_OPTIONS = [
  { id: '', labelKey: 'planner.window.none' },
  { id: 'ochtend', labelKey: 'productivity.dagdelen.ochtend' },
  { id: 'middag', labelKey: 'productivity.dagdelen.middag' },
  { id: 'avond', labelKey: 'productivity.dagdelen.avond' },
];

// Prioriteitsniveaus (S03b) voor customTasks en project-subgoals. `normaal`
// is de default en wordt bewust NIET opgeslagen (zelfde '' = geen waarde-
// conventie als `window`/`duration`, zie docs/slices/S04-planning-metadata-
// vrije-blokken.md:37): schrijven doet `value === DEFAULT_PRIORITY ?
// undefined : value`, lezen doet `x.priority || DEFAULT_PRIORITY`.
export const PRIORITY_LEVELS = ['hoog', 'normaal', 'laag'];
export const DEFAULT_PRIORITY = 'normaal';

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
  customTasks = [],
  moduleData = {},
  resolveName = mod => mod.name || '',
  referenceDate = new Date(),
  handlers = {},
} = {}) {
  const items = [];
  const todayDateKey = fmtDateKey(referenceDate);

  modules.forEach(mod => {
    if (!mod.enabled) return;

    if (mod.type === 'projects') {
      (mod.subjects || []).forEach(subject => {
        (subject.subgoals || []).forEach(goal => {
          // Een gewoon subgoal zonder deadline (en zonder `freeBlock`) mag niet
          // in de pool verschijnen (geen overspoeling, principe 2). Een
          // `freeBlock`-subgoal verschijnt elke dag; een subgoal met deadline
          // vandaag verschijnt zoals voorheen. Eén enkele push dekt beide
          // gevallen, dus geen dubbele emit als een goal toevallig allebei is.
          const isFreeBlock = !!goal.freeBlock;
          const isDueToday = goal.deadline === todayDateKey;
          if (!isFreeBlock && !isDueToday) return;
          const time = goal.time || '';
          pushItem(items, {
            key: subgoalKey(mod.id, subject.id, goal.id),
            kind: 'projecttaak',
            label: goal.label,
            time,
            dagdeel: dagdeelForTime(time),
            duration: goal.duration,
            window: goal.window || '',
            status: !!goal.completed,
            color: mod.color,
            // Kaart-chips (S03b): projectnaam + onderwerpnaam voor de pool-
            // kaart, diepwerk-vlag en prioriteit (default bij ontbreken, geen
            // migratie — zie PRIORITY_LEVELS hierboven) en de kaart-url (voor
            // de "Openen in {bron}"-menuactie). Leeg/null op losse taken
            // hieronder, zodat de item-shape uniform blijft (zelfde discipline
            // als `window: goal.window || ''`).
            projectName: mod.name || '',
            subjectName: subject.name || '',
            deepWork: !!goal.deepWork,
            priority: goal.priority || DEFAULT_PRIORITY,
            url: goal.url || null,
            // `source` geeft TaskPoolPanel iets om een bron-icoon op te tonen
            // (S08: Trello-kenmerk in de rij); `toggle: undefined` bij een
            // module met `source` maakt afvinken read-only voor die rij
            // (TaskPoolPanel honoreert `!item.toggle` al, zelfde patroon als
            // virtuele recurring-taken hieronder).
            source: mod.source || null,
            toggle: (handlers.onToggleProjectSubgoal && !mod.source)
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
      key: taskKey(task.id),
      kind: 'losseTaak',
      label: task.text,
      time,
      dagdeel: dagdeelForTime(time),
      duration: task.duration,
      window: task.window || '',
      status: !!task.done,
      color: tasksModuleColor,
      projectName: '',
      subjectName: '',
      deepWork: !!task.deepWork,
      priority: task.priority || DEFAULT_PRIORITY,
      url: task.url || null,
      toggle: handlers.onToggleTask ? () => handlers.onToggleTask(task.id) : undefined,
    });
  });

  // Derde bron (S10c): module-items/-blokken die de module zelf opt-in heeft
  // gezet (`planInDay`). Checklist levert los per item óf één blok, afhankelijk
  // van `planGranularity`; choice en counter hebben geen items en zijn altijd
  // één blok. Eén nieuw `kind: 'routine'` voor beide vormen — geen nieuw
  // opgeslagen veld, alleen een nieuwe manier om bestaande moduleData te lezen.
  modules.forEach(mod => {
    if (!mod.enabled || !mod.planInDay) return;
    if (!['checklist', 'choice', 'counter'].includes(mod.type)) return;

    if (mod.type === 'checklist' && mod.planGranularity !== 'block') {
      (mod.items || []).forEach(item => {
        if (item.planInDay === false) return;
        const raw = moduleData[mod.id]?.[item.id];
        const time = raw?.plannedTime ?? item.time ?? '';
        pushItem(items, {
          key: moduleItemKey(mod.id, item.id),
          kind: 'routine',
          label: item.label,
          time,
          dagdeel: dagdeelForTime(time),
          duration: item.duration,
          window: item.window || '',
          status: isChecklistItemComplete(item, raw),
          color: mod.color,
          projectName: resolveName(mod),
          subjectName: '',
          deepWork: false,
          priority: DEFAULT_PRIORITY,
          url: null,
          source: null,
          toggle: handlers.onToggleModuleItem
            ? () => handlers.onToggleModuleItem(mod.id, item.id)
            : undefined,
        });
      });
      return;
    }

    // Checklist-blok, choice of counter: één kaart voor de hele module.
    const blockData = moduleData[mod.id] || {};
    const time = blockData.plannedTime ?? mod.time ?? '';
    pushItem(items, {
      key: moduleBlockKey(mod.id),
      kind: 'routine',
      label: resolveName(mod),
      time,
      dagdeel: dagdeelForTime(time),
      duration: mod.duration,
      window: mod.window || '',
      status: moduleStatusForDay(mod, { moduleData }, referenceDate) === 'full',
      color: mod.color,
      projectName: '',
      subjectName: '',
      deepWork: false,
      priority: DEFAULT_PRIORITY,
      url: null,
      source: null,
      // Alleen een choice-blok is afvinkbaar; checklist-blok en counter zijn
      // read-only kaarten, zelfde patroon als een bronitem/virtuele taak
      // hierboven (`toggle: undefined`).
      toggle: (mod.type === 'choice' && handlers.onToggleModuleBlock)
        ? () => handlers.onToggleModuleBlock(mod.id)
        : undefined,
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
