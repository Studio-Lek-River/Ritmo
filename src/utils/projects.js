// Pure helpers for the 'projects' module type.
// Used by both the Vandaag-card (ProjectsModule) and the detail view (ProjectsView).

export function projectProgress(module) {
  const subjects = module?.subjects || [];
  let done = 0;
  let total = 0;
  for (const s of subjects) {
    for (const g of s.subgoals || []) {
      total++;
      if (g.completed) done++;
    }
  }
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

export function subjectProgress(subject) {
  const subgoals = subject?.subgoals || [];
  const total = subgoals.length;
  const done = subgoals.filter(g => g.completed).length;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);
  return { done, total, pct };
}

export function subjectAverage(subject) {
  const grades = (subject?.subgoals || [])
    .map(g => g.grade)
    .filter(g => typeof g === 'number' && !Number.isNaN(g));
  if (grades.length === 0) return null;
  const avg = grades.reduce((sum, v) => sum + v, 0) / grades.length;
  return (Math.round(avg * 10) / 10).toFixed(1);
}

export function isOverdue(deadline, completed) {
  if (!deadline || completed) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return false;
  d.setHours(0, 0, 0, 0);
  return d < today;
}

export function clampGrade(input) {
  if (input === '' || input === null || input === undefined) return null;
  const n = parseFloat(input);
  if (Number.isNaN(n)) return null;
  const clamped = Math.max(1, Math.min(10, n));
  return Math.round(clamped * 10) / 10;
}

const DATE_FMT = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'short' });

export function formatDeadline(deadline) {
  if (!deadline) return '';
  const d = new Date(deadline);
  if (Number.isNaN(d.getTime())) return '';
  return DATE_FMT.format(d).replace('.', '');
}
