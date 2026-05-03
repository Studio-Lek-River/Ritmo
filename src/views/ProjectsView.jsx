import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Clock, Sparkles, GraduationCap } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import { getColorClasses } from '../utils/colors';
import {
  projectProgress,
  subjectProgress,
  subjectAverage,
  isOverdue,
  clampGrade,
  formatDeadline,
} from '../utils/projects';

export default function ProjectsView({
  modules,
  setModules,
  iconOptions,
  selectedProjectId,
  setSelectedProjectId,
  markTouchedToday,
  onCreate,
  t,
}) {
  const projects = useMemo(
    () => modules.filter(m => m.enabled && m.type === 'projects'),
    [modules]
  );

  const activeProject = projects.find(p => p.id === selectedProjectId) || projects[0];

  useEffect(() => {
    if (activeProject && activeProject.id !== selectedProjectId) {
      setSelectedProjectId(activeProject.id);
    }
  }, [activeProject, selectedProjectId, setSelectedProjectId]);

  const [selectedSubjectId, setSelectedSubjectId] = useState(null);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [newSubgoalLabel, setNewSubgoalLabel] = useState('');
  const [newSubgoalDeadline, setNewSubgoalDeadline] = useState('');

  useEffect(() => {
    if (!activeProject) {
      setSelectedSubjectId(null);
      return;
    }
    const subjects = activeProject.subjects || [];
    if (!subjects.find(s => s.id === selectedSubjectId)) {
      setSelectedSubjectId(subjects[0]?.id || null);
    }
  }, [activeProject, selectedSubjectId]);

  if (!activeProject) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Nog geen projecten"
        description="Maak een project-module aan om losse projecten met vakken en subdoelen bij te houden."
        buttonLabel={onCreate ? 'Project-module aanmaken' : null}
        onClick={onCreate}
        t={t}
      />
    );
  }

  const c = getColorClasses(activeProject.color);
  const Icon = iconOptions[activeProject.icon] || Sparkles;
  const { done, total, pct } = projectProgress(activeProject);
  const subjects = activeProject.subjects || [];
  const activeSubject = subjects.find(s => s.id === selectedSubjectId) || null;

  // ---- mutations ----------------------------------------------------------

  const updateProject = (mutator) => {
    setModules(prev => prev.map(m => {
      if (m.id !== activeProject.id) return m;
      return mutator({ ...m, subjects: (m.subjects || []).map(s => ({
        ...s,
        subgoals: (s.subgoals || []).map(g => ({ ...g })),
      })) });
    }));
  };

  const addSubject = () => {
    const name = newSubjectName.trim();
    if (!name) return;
    const newId = `subj_${Date.now()}`;
    updateProject(p => ({
      ...p,
      subjects: [...p.subjects, { id: newId, name, subgoals: [] }],
    }));
    setSelectedSubjectId(newId);
    setNewSubjectName('');
  };

  const addSubgoal = () => {
    const label = newSubgoalLabel.trim();
    if (!label || !activeSubject) return;
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id === activeSubject.id
        ? { ...s, subgoals: [...s.subgoals, {
            id: `goal_${Date.now()}`,
            label,
            deadline: newSubgoalDeadline || null,
            completed: false,
            grade: null,
          }] }
        : s
      ),
    }));
    setNewSubgoalLabel('');
    setNewSubgoalDeadline('');
  };

  const toggleSubgoal = (subjectId, goalId) => {
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.map(g => g.id !== goalId ? g : { ...g, completed: !g.completed }),
      }),
    }));
    markTouchedToday?.(activeProject.id);
  };

  const setGrade = (subjectId, goalId, raw) => {
    const grade = clampGrade(raw);
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.map(g => g.id !== goalId ? g : { ...g, grade }),
      }),
    }));
  };

  // ---- render -------------------------------------------------------------

  return (
    <div className="slide-in space-y-4">
      {projects.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {projects.map(p => {
            const pc = getColorClasses(p.color);
            const isActive = p.id === activeProject.id;
            return (
              <button
                key={p.id}
                onClick={() => setSelectedProjectId(p.id)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                  isActive
                    ? `${pc.bar} text-white shadow`
                    : `${t.cardSecondary} ${t.textSecondary}`
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      <div className={`${t.card} rounded-2xl p-5 shadow-sm`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`${c.iconBg} ${c.iconText} w-9 h-9 rounded-xl flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold ${t.textSecondary} truncate`}>{activeProject.name}</h2>
            <p className={`text-xs ${t.textMuted}`}>
              {total === 0 ? '0 / 0 subdoelen' : `${done} / ${total} subdoelen`}
            </p>
          </div>
        </div>
        <ProgressBar value={pct} colorKey={activeProject.color} label={`${pct}%`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4">
        {/* Subjects column */}
        <div className={`${t.card} rounded-2xl p-4 shadow-sm`}>
          <h3 className={`font-semibold ${t.textSecondary} mb-3`}>Vakken</h3>
          {subjects.length === 0 ? (
            <p className={`${t.textMuted} text-sm py-2`}>
              Nog geen vakken — voeg er een toe hieronder.
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              {subjects.map(s => {
                const sp = subjectProgress(s);
                const avg = subjectAverage(s);
                const isSel = s.id === selectedSubjectId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSubjectId(s.id)}
                    className={`w-full text-left p-3 rounded-lg border transition ${
                      isSel
                        ? `${c.ringBorder} ${t.cardSecondary}`
                        : `border-transparent ${t.cardSecondary}`
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`font-medium text-sm ${t.textSecondary} truncate`}>
                        {s.name}
                      </span>
                      {avg !== null && (
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${c.pillBg} ${c.pillText} shrink-0`}>
                          {avg}
                        </span>
                      )}
                    </div>
                    <ProgressBar
                      size="sm"
                      value={sp.pct}
                      colorKey={activeProject.color}
                      label={`${sp.done}/${sp.total}`}
                    />
                  </button>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={newSubjectName}
              onChange={(e) => setNewSubjectName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addSubject()}
              placeholder="Nieuw vak..."
              className={`flex-1 px-3 py-2 ${t.input} rounded-lg text-sm`}
            />
            <button
              type="button"
              onClick={addSubject}
              className={`px-3 py-2 ${c.bar} text-white rounded-lg`}
              aria-label="Vak toevoegen"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Subgoals column */}
        <div className={`${t.card} rounded-2xl p-4 shadow-sm`}>
          {activeSubject ? (
            <>
              <div className="flex items-center justify-between mb-3 gap-2">
                <h3 className={`font-semibold ${t.textSecondary} truncate`}>
                  {activeSubject.name}
                </h3>
                <span className={`text-xs ${t.textMuted} shrink-0`}>
                  Gemiddeld cijfer: <strong className={t.textSecondary}>
                    {subjectAverage(activeSubject) ?? '—'}
                  </strong>
                </span>
              </div>

              <SubgoalList
                subject={activeSubject}
                color={activeProject.color}
                t={t}
                onToggle={(goalId) => toggleSubgoal(activeSubject.id, goalId)}
                onGrade={(goalId, raw) => setGrade(activeSubject.id, goalId, raw)}
              />

              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={newSubgoalLabel}
                  onChange={(e) => setNewSubgoalLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubgoal()}
                  placeholder="Nieuw subdoel..."
                  className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                />
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={newSubgoalDeadline}
                    onChange={(e) => setNewSubgoalDeadline(e.target.value)}
                    className={`flex-1 min-w-0 px-2 py-2 ${t.input} rounded-lg text-sm`}
                  />
                  <button
                    type="button"
                    onClick={addSubgoal}
                    className={`px-3 py-2 ${c.bar} text-white rounded-lg shrink-0`}
                    aria-label="Subdoel toevoegen"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <p className={`${t.textMuted} text-sm`}>
              Selecteer of maak eerst een vak.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function SubgoalList({ subject, color, t, onToggle, onGrade }) {
  const c = getColorClasses(color);
  const sorted = useMemo(() => {
    const arr = [...(subject.subgoals || [])];
    arr.sort((a, b) => Number(a.completed) - Number(b.completed));
    return arr;
  }, [subject]);

  if (sorted.length === 0) {
    return (
      <p className={`${t.textMuted} text-sm py-2`}>
        Nog geen subdoelen — voeg er een toe hieronder.
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map(g => {
        const overdue = isOverdue(g.deadline, g.completed);
        return (
          <li
            key={g.id}
            className={`flex items-center gap-2 p-2 ${t.cardSecondary} rounded-lg ${
              g.completed ? 'opacity-60' : ''
            }`}
          >
            <input
              type="checkbox"
              checked={!!g.completed}
              onChange={() => onToggle(g.id)}
              className={`w-4 h-4 accent-${color}-500 cursor-pointer`}
            />
            <span className={`flex-1 text-sm ${t.textSecondary} ${
              g.completed ? 'line-through' : ''
            } truncate`}>
              {g.label}
            </span>
            {g.deadline && (
              <span className={`text-xs flex items-center gap-1 shrink-0 ${
                overdue ? 'text-red-500' : t.textMuted
              }`}>
                {overdue && <Clock className="w-3 h-3" />}
                {formatDeadline(g.deadline)}
              </span>
            )}
            <input
              type="number"
              min="1"
              max="10"
              step="0.1"
              value={g.grade ?? ''}
              onChange={(e) => onGrade(g.id, e.target.value)}
              placeholder="—"
              className={`w-14 px-2 py-1 text-xs text-right ${t.input} rounded-md`}
              aria-label="Cijfer"
            />
          </li>
        );
      })}
    </ul>
  );
}
