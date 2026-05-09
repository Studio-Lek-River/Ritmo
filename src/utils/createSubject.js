// Factory voor een project-subject (vak/onderwerp binnen een projects-module).
// Gebruikt door ProjectsView en de onboarding-flow.
export function createSubject(name) {
  return {
    id: `subj_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
    name,
    subgoals: [],
  };
}
