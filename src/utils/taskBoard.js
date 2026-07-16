// Aggregatie-helper voor de Productivity Suite Kanban-view. Bouwt uit de
// bestaande Ritmo-bronnen (modules, customTasks) een platte set genormaliseerde
// kaarten, gegroepeerd per kolom (status). Voegt geen nieuw "kind"-veld toe aan
// opgeslagen data — het type wordt hier afgeleid uit de bron, net als in
// dayTimeline.js. Schrijft zelf nooit naar opslag; roept alleen de meegegeven
// handlers aan.

import { subgoalKey, taskKey } from './itemKeys';

export const KANBAN_COLUMNS = ['todo', 'bezig', 'klaar'];

// Leidt de Kanban-kolom af uit de bestaande boolean-velden (`done`/`completed`)
// met een optioneel `status`-veld als tiebreaker. `done`/`completed` winnen
// altijd (blijft consistent met Today/Dag-view); zonder `status` valt terug op
// 'todo'. Optioneel veld, geen migratie nodig (principe 2).
export function deriveTaskStatus({ done, completed, status } = {}) {
  if (done || completed) return 'klaar';
  return status === 'bezig' ? 'bezig' : 'todo';
}

function emptyBoard() {
  return { todo: [], bezig: [], klaar: [] };
}

// Bouwt het Kanban-bord: losse taken (vandaag, meegegeven via customTasks) en
// alle project-subgoals (ongeacht deadline), gegroepeerd per kolom.
export function buildTaskBoard({ modules = [], customTasks = [], handlers = {} } = {}) {
  const board = emptyBoard();

  const tasksModuleColor = modules.find(m => m.enabled && m.type === 'tasks')?.color;
  customTasks.forEach(task => {
    const column = deriveTaskStatus({ done: task.done, status: task.status });
    const card = {
      key: taskKey(task.id),
      kind: 'losseTaak',
      label: task.text,
      column,
      color: tasksModuleColor,
      projectLabel: undefined,
      setStatus: (col) => handlers.onSetTaskStatus?.(task.id, col),
    };
    board[column].push(card);
  });

  modules.forEach(mod => {
    if (!mod.enabled || mod.type !== 'projects') return;
    (mod.subjects || []).forEach(subject => {
      (subject.subgoals || []).forEach(goal => {
        const column = deriveTaskStatus({ completed: goal.completed, status: goal.status });
        const card = {
          key: subgoalKey(mod.id, subject.id, goal.id),
          kind: 'projecttaak',
          label: goal.label,
          column,
          color: mod.color,
          projectLabel: subject.name,
          setStatus: (col) => handlers.onSetSubgoalStatus?.(mod.id, subject.id, goal.id, col),
        };
        board[column].push(card);
      });
    });
  });

  return board;
}
