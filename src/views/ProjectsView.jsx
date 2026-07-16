import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Clock, Sparkles, GraduationCap, MoreHorizontal, ExternalLink } from 'lucide-react';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';
import SwipeRow from '../components/SwipeRow';
import ConfirmDialog from '../components/ConfirmDialog';
import TimeInput from '../components/TimeInput';
import DurationInput from '../components/DurationInput';
import DagdeelSelect from '../components/DagdeelSelect';
import { getColorClasses } from '../utils/colors';
import { SOURCE_ICONS } from '../utils/sourcePrefs';
import {
  projectProgress,
  subjectProgress,
  subjectAverage,
  isOverdue,
  clampGrade,
  formatDeadline,
} from '../utils/projects';
import { useToast } from '../hooks/useToast';
import { useTranslation } from '../i18n/useTranslation';
import { createSubject } from '../utils/createSubject';

export default function ProjectsView({
  modules,
  setModules,
  iconOptions,
  selectedProjectId,
  setSelectedProjectId,
  markTouchedToday,
  onCreate,
  onDeleteProjectModule,
  hasUsedSwipe,
  onFirstSwipe,
  theme,
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();
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
  const [newSubgoalTime, setNewSubgoalTime] = useState('');
  const [newSubgoalDuration, setNewSubgoalDuration] = useState(undefined);
  const [newSubgoalWindow, setNewSubgoalWindow] = useState('');
  const [newSubgoalFreeBlock, setNewSubgoalFreeBlock] = useState(false);
  const [newSubgoalAutoPlan, setNewSubgoalAutoPlan] = useState(false);
  const [newSubgoalDeepWork, setNewSubgoalDeepWork] = useState(false);
  const [confirmDeleteSubject, setConfirmDeleteSubject] = useState(null);
  const [confirmDeleteSubgoal, setConfirmDeleteSubgoal] = useState(null);
  const [confirmDeleteProject, setConfirmDeleteProject] = useState(null);
  const [projectMenuOpen, setProjectMenuOpen] = useState(false);

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

  useEffect(() => {
    if (!projectMenuOpen) return;
    const handler = (e) => {
      if (!e.target.closest('[data-project-menu]')) setProjectMenuOpen(false);
    };
    window.addEventListener('mousedown', handler);
    return () => window.removeEventListener('mousedown', handler);
  }, [projectMenuOpen]);

  if (!activeProject) {
    return (
      <EmptyState
        icon={GraduationCap}
        title={t('projects.empty')}
        description={t('projects.emptyDesc')}
        buttonLabel={onCreate ? t('projects.emptyButton') : null}
        onClick={onCreate}
        theme={theme}
      />
    );
  }

  const c = getColorClasses(activeProject.color);
  const Icon = iconOptions[activeProject.icon] || Sparkles;
  const { done, total, pct } = projectProgress(activeProject);
  const subjects = activeProject.subjects || [];
  const activeSubject = subjects.find(s => s.id === selectedSubjectId) || null;

  // Een module met `source` is afgeleid van een externe koppeling (S08:
  // Trello) en leeft niet in `settings.modules` — `updateProject` hieronder
  // zou dus toch al een no-op zijn (geen match op `m.id`), maar de UI blijft
  // hier expliciet read-only in plaats van controls te tonen die stilletjes
  // niets doen. Zie AC8 in docs/slices/S08-trello-lezen.md.
  const isReadOnly = !!activeProject.source;

  const updateProject = (mutator) => {
    if (isReadOnly) return;
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
    const subject = createSubject(name);
    updateProject(p => ({
      ...p,
      subjects: [...p.subjects, subject],
    }));
    setSelectedSubjectId(subject.id);
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
            ...(newSubgoalTime ? { time: newSubgoalTime } : {}),
            ...(newSubgoalDuration ? { duration: newSubgoalDuration } : {}),
            ...(newSubgoalWindow ? { window: newSubgoalWindow } : {}),
            ...(newSubgoalFreeBlock ? { freeBlock: true } : {}),
            ...(newSubgoalAutoPlan ? { autoPlan: true } : {}),
            ...(newSubgoalDeepWork ? { deepWork: true } : {}),
          }] }
        : s
      ),
    }));
    setNewSubgoalLabel('');
    setNewSubgoalDeadline('');
    setNewSubgoalTime('');
    setNewSubgoalDuration(undefined);
    setNewSubgoalWindow('');
    setNewSubgoalFreeBlock(false);
    setNewSubgoalAutoPlan(false);
    setNewSubgoalDeepWork(false);
  };

  const toggleSubgoal = (subjectId, goalId) => {
    if (isReadOnly) return;
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.map(g => g.id !== goalId ? g : { ...g, completed: !g.completed }),
      }),
    }));
    markTouchedToday?.(activeProject.id);
  };

  const setSubgoalTime = (subjectId, goalId, time) => {
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.map(g => g.id !== goalId ? g : { ...g, time: time || undefined }),
      }),
    }));
  };

  const setSubgoalDuration = (subjectId, goalId, duration) => {
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.map(g => g.id !== goalId ? g : { ...g, duration: duration || undefined }),
      }),
    }));
  };

  const setSubgoalWindow = (subjectId, goalId, windowValue) => {
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.map(g => g.id !== goalId ? g : { ...g, window: windowValue || undefined }),
      }),
    }));
  };

  const setSubgoalFreeBlock = (subjectId, goalId, freeBlock) => {
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.map(g => g.id !== goalId ? g : { ...g, freeBlock: freeBlock || undefined }),
      }),
    }));
  };

  const setSubgoalAutoPlan = (subjectId, goalId, autoPlan) => {
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.map(g => g.id !== goalId ? g : { ...g, autoPlan: autoPlan || undefined }),
      }),
    }));
  };

  const setSubgoalDeepWork = (subjectId, goalId, deepWork) => {
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.map(g => g.id !== goalId ? g : { ...g, deepWork: deepWork || undefined }),
      }),
    }));
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

  const handleConfirmDeleteSubject = () => {
    if (!confirmDeleteSubject) return;
    const snapshot = confirmDeleteSubject;
    updateProject(p => ({
      ...p,
      subjects: p.subjects.filter(s => s.id !== snapshot.id),
    }));
    setConfirmDeleteSubject(null);
    if (selectedSubjectId === snapshot.id) setSelectedSubjectId(null);
    showToast({
      message: t('toast.subjectDeleted'),
      actionLabel: t('common.undo'),
      onAction: () => {
        setModules(prev => prev.map(m => {
          if (m.id !== activeProject.id) return m;
          return { ...m, subjects: [...(m.subjects || []), snapshot] };
        }));
      },
    });
  };

  const handleConfirmDeleteSubgoal = () => {
    if (!confirmDeleteSubgoal) return;
    const { subjectId, goal } = confirmDeleteSubgoal;
    updateProject(p => ({
      ...p,
      subjects: p.subjects.map(s => s.id !== subjectId ? s : {
        ...s,
        subgoals: s.subgoals.filter(g => g.id !== goal.id),
      }),
    }));
    setConfirmDeleteSubgoal(null);
    showToast({
      message: t('toast.subgoalDeleted'),
      actionLabel: t('common.undo'),
      onAction: () => {
        setModules(prev => prev.map(m => {
          if (m.id !== activeProject.id) return m;
          return {
            ...m,
            subjects: (m.subjects || []).map(s => s.id !== subjectId ? s : {
              ...s,
              subgoals: [...(s.subgoals || []), goal],
            }),
          };
        }));
      },
    });
  };

  const handleConfirmDeleteProject = () => {
    if (!confirmDeleteProject || confirmDeleteProject.source) return;
    const snapshot = confirmDeleteProject;
    onDeleteProjectModule?.(snapshot.id);
    setConfirmDeleteProject(null);
    showToast({
      message: t('toast.projectDeleted'),
      actionLabel: t('common.undo'),
      onAction: () => {
        setModules(prev => prev.find(m => m.id === snapshot.id)
          ? prev
          : [...prev, snapshot]);
      },
    });
  };

  const showSwipeHint = !hasUsedSwipe && (subjects.length > 0 || (activeSubject && (activeSubject.subgoals || []).length > 0));

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
                    : `${theme.cardSecondary} ${theme.textSecondary}`
                }`}
              >
                {p.name}
              </button>
            );
          })}
        </div>
      )}

      <div className={`${theme.card} rounded-2xl p-5 shadow-sm`}>
        <div className="flex items-center gap-3 mb-3 relative" data-project-menu>
          <div className={`${c.iconBg} ${c.iconText} w-9 h-9 rounded-xl flex items-center justify-center`}>
            <Icon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold ${theme.textSecondary} truncate`}>{activeProject.name}</h2>
            <p className={`text-xs ${theme.textMuted}`}>
              {total === 0 ? t('projects.subgoalsCount', { done: 0, total: 0 }) : t('projects.subgoalsCount', { done, total })}
            </p>
          </div>
          {isReadOnly ? (
            // Read-only (S08): geen "..."-menu (er is toch niets te
            // verwijderen/bewerken, ontkoppelen doe je bij de bron), in
            // plaats daarvan een bron-badge plus een link naar het bord.
            <div className="flex items-center gap-1 shrink-0">
              <span className={`text-[11px] font-medium r-chip ${c.pillBg} ${c.pillText} flex items-center gap-1`}>
                {(() => {
                  const SourceIcon = SOURCE_ICONS[activeProject.source.provider];
                  return SourceIcon ? <SourceIcon className="w-3 h-3" /> : null;
                })()}
                {t('projectsView.sourceBadge', { provider: t(`connections.providers.${activeProject.source.provider}`) })}
              </span>
              {activeProject.source.url && (
                <a
                  href={activeProject.source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={t('projectsView.openBoardAria', { provider: t(`connections.providers.${activeProject.source.provider}`) })}
                  className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setProjectMenuOpen(v => !v)}
                className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
                aria-label={t('common.options')}
              >
                <MoreHorizontal className="w-4 h-4" />
              </button>
              {projectMenuOpen && (
                <div className={`absolute right-0 top-full mt-1 z-20 ${theme.card} rounded-xl shadow-lg border ${theme.border} overflow-hidden min-w-[10rem]`}>
                  <button
                    type="button"
                    onClick={() => {
                      setProjectMenuOpen(false);
                      setConfirmDeleteProject(activeProject);
                    }}
                    className={`w-full text-left px-3 py-2 text-sm text-red-500 ${theme.hover} transition`}
                  >
                    {t('projectsView.deleteProjectAction')}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
        <ProgressBar value={pct} colorKey={activeProject.color} label={`${pct}%`} />
      </div>

      {showSwipeHint && (
        <p className={`text-xs ${theme.textMuted} px-1`}>{t('collectionList.swipeHint')}</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)] gap-4">
        <div className={`${theme.card} rounded-2xl p-4 shadow-sm`}>
          <h3 className={`font-semibold ${theme.textSecondary} mb-3`}>{t('projects.boxes')}</h3>
          {subjects.length === 0 ? (
            <p className={`${theme.textMuted} text-sm py-2`}>
              {t('projects.noBoxes')}
            </p>
          ) : (
            <div className="space-y-2 mb-3">
              {subjects.map(s => {
                const sp = subjectProgress(s);
                const avg = subjectAverage(s);
                const isSel = s.id === selectedSubjectId;
                return (
                  <SwipeRow
                    key={s.id}
                    disabled={isReadOnly}
                    onDelete={() => setConfirmDeleteSubject(s)}
                    onFirstSwipe={onFirstSwipe}
                    ariaLabel={t('projectsView.deleteSubjectAria')}
                    className="rounded-lg"
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectId(s.id)}
                      className={`w-full text-left p-3 rounded-lg border transition ${
                        isSel
                          ? `${c.ringBorder} ${theme.cardSecondary}`
                          : `border-transparent ${theme.cardSecondary}`
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className={`font-medium text-sm ${theme.textSecondary} truncate`}>
                          {s.name}
                        </span>
                        {avg !== null && (
                          <span className={`text-xs font-semibold r-chip ${c.pillBg} ${c.pillText} shrink-0`}>
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
                  </SwipeRow>
                );
              })}
            </div>
          )}
          {!isReadOnly && (
            <div className="flex gap-2">
              <input
                type="text"
                value={newSubjectName}
                onChange={(e) => setNewSubjectName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addSubject()}
                placeholder={t('projects.newBoxPlaceholder')}
                className={`flex-1 px-3 py-2 ${theme.input} rounded-lg text-sm`}
              />
              <button
                type="button"
                onClick={addSubject}
                className={`px-3 py-2 ${c.bar} text-white rounded-lg`}
                aria-label={t('projects.addBoxAria')}
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        <div className={`${theme.card} rounded-2xl p-4 shadow-sm`}>
          {activeSubject ? (
            <>
              <div className="flex items-center justify-between mb-3 gap-2">
                <h3 className={`font-semibold ${theme.textSecondary} truncate`}>
                  {activeSubject.name}
                </h3>
                {!isReadOnly && (
                  <span className={`text-xs ${theme.textMuted} shrink-0`}>
                    {t('projects.avgGrade')} <strong className={theme.textSecondary}>
                      {subjectAverage(activeSubject) ?? '-'}
                    </strong>
                  </span>
                )}
              </div>

              <SubgoalList
                subject={activeSubject}
                color={activeProject.color}
                theme={theme}
                readOnly={isReadOnly}
                onToggle={(goalId) => toggleSubgoal(activeSubject.id, goalId)}
                onGrade={(goalId, raw) => setGrade(activeSubject.id, goalId, raw)}
                onSetTime={(goalId, time) => setSubgoalTime(activeSubject.id, goalId, time)}
                onSetDuration={(goalId, duration) => setSubgoalDuration(activeSubject.id, goalId, duration)}
                onSetWindow={(goalId, windowValue) => setSubgoalWindow(activeSubject.id, goalId, windowValue)}
                onSetFreeBlock={(goalId, freeBlock) => setSubgoalFreeBlock(activeSubject.id, goalId, freeBlock)}
                onSetAutoPlan={(goalId, autoPlan) => setSubgoalAutoPlan(activeSubject.id, goalId, autoPlan)}
                onSetDeepWork={(goalId, deepWork) => setSubgoalDeepWork(activeSubject.id, goalId, deepWork)}
                onRequestDelete={(goal) => setConfirmDeleteSubgoal({ subjectId: activeSubject.id, goal })}
                onFirstSwipe={onFirstSwipe}
              />

              {!isReadOnly && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  value={newSubgoalLabel}
                  onChange={(e) => setNewSubgoalLabel(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addSubgoal()}
                  placeholder={t('projects.newSubgoalPlaceholder')}
                  className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                />
                <div className="flex gap-2 flex-wrap">
                  <input
                    type="date"
                    value={newSubgoalDeadline}
                    onChange={(e) => setNewSubgoalDeadline(e.target.value)}
                    disabled={newSubgoalFreeBlock}
                    className={`flex-1 min-w-0 px-2 py-2 ${theme.input} rounded-lg text-sm disabled:opacity-60`}
                  />
                  <TimeInput value={newSubgoalTime} onChange={setNewSubgoalTime} theme={theme} />
                  <DurationInput value={newSubgoalDuration} onChange={setNewSubgoalDuration} theme={theme} className="w-20" />
                  <DagdeelSelect value={newSubgoalWindow} onChange={setNewSubgoalWindow} theme={theme} />
                  <button
                    type="button"
                    onClick={addSubgoal}
                    className={`px-3 py-2 ${c.bar} text-white rounded-lg shrink-0`}
                    aria-label={t('projects.addSubgoalAria')}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4 flex-wrap">
                  <label className={`flex items-center gap-1.5 text-xs ${theme.textMuted}`}>
                    <input
                      type="checkbox"
                      checked={newSubgoalFreeBlock}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setNewSubgoalFreeBlock(checked);
                        if (checked) setNewSubgoalDeadline('');
                      }}
                      className="w-3.5 h-3.5"
                    />
                    {t('planner.freeBlock.label')}
                  </label>
                  <label className={`flex items-center gap-1.5 text-xs ${theme.textMuted}`}>
                    <input
                      type="checkbox"
                      checked={newSubgoalAutoPlan}
                      onChange={(e) => setNewSubgoalAutoPlan(e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    {t('planner.autoPlan.label')}
                  </label>
                  <label className={`flex items-center gap-1.5 text-xs ${theme.textMuted}`}>
                    <input
                      type="checkbox"
                      checked={newSubgoalDeepWork}
                      onChange={(e) => setNewSubgoalDeepWork(e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    {t('planner.deepWork.label')}
                  </label>
                </div>
              </div>
              )}
            </>
          ) : (
            <p className={`${theme.textMuted} text-sm`}>
              {t('projects.selectBoxFirst')}
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!confirmDeleteSubject}
        title={confirmDeleteSubject ? t('projectsView.deleteSubjectTitle', { name: confirmDeleteSubject.name }) : ''}
        description={t('projectsView.deleteSubjectDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleConfirmDeleteSubject}
        onCancel={() => setConfirmDeleteSubject(null)}
        theme={theme}
      />

      <ConfirmDialog
        open={!!confirmDeleteSubgoal}
        title={confirmDeleteSubgoal ? t('projectsView.deleteSubgoalTitle', { label: confirmDeleteSubgoal.goal.label }) : ''}
        description={t('projectsView.deleteSubgoalDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleConfirmDeleteSubgoal}
        onCancel={() => setConfirmDeleteSubgoal(null)}
        theme={theme}
      />

      <ConfirmDialog
        open={!!confirmDeleteProject}
        title={confirmDeleteProject ? t('projectsView.deleteProjectTitle', { name: confirmDeleteProject.name }) : ''}
        description={t('projectsView.deleteProjectDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={handleConfirmDeleteProject}
        onCancel={() => setConfirmDeleteProject(null)}
        theme={theme}
      />
    </div>
  );
}

function SubgoalList({
  subject,
  color,
  theme,
  readOnly = false,
  onToggle,
  onGrade,
  onSetTime,
  onSetDuration,
  onSetWindow,
  onSetFreeBlock,
  onSetAutoPlan,
  onSetDeepWork,
  onRequestDelete,
  onFirstSwipe,
}) {
  const { t } = useTranslation();
  const c = getColorClasses(color);
  const sorted = useMemo(() => {
    const arr = [...(subject.subgoals || [])];
    arr.sort((a, b) => Number(a.completed) - Number(b.completed));
    return arr;
  }, [subject]);

  if (sorted.length === 0) {
    return (
      <p className={`${theme.textMuted} text-sm py-2`}>
        {t('projects.noSubgoals')}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {sorted.map(g => {
        const overdue = isOverdue(g.deadline, g.completed);
        return (
          <li key={g.id}>
            <SwipeRow
              disabled={readOnly}
              onDelete={() => onRequestDelete(g)}
              onFirstSwipe={onFirstSwipe}
              ariaLabel={t('projectsView.deleteSubgoalAria')}
              className="rounded-lg"
            >
              <div
                className={`flex flex-col gap-1.5 p-2 ${theme.cardSecondary} rounded-lg ${
                  g.completed ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!g.completed}
                    onChange={() => onToggle(g.id)}
                    disabled={readOnly}
                    className={`w-4 h-4 accent-${color}-500 ${readOnly ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'}`}
                  />
                  <span className={`flex-1 text-sm ${theme.textSecondary} ${
                    g.completed ? 'line-through' : ''
                  } truncate`}>
                    {g.label}
                  </span>
                  {g.freeBlock && (
                    <span className={`text-[11px] shrink-0 r-chip ${theme.cardSecondary} ${theme.textMuted} border ${theme.border}`}>
                      {t('planner.freeBlock.chip')}
                    </span>
                  )}
                  {g.deadline && (
                    <span className={`text-xs flex items-center gap-1 shrink-0 ${
                      overdue ? 'text-red-500' : theme.textMuted
                    }`}>
                      {overdue && <Clock className="w-3 h-3" />}
                      {formatDeadline(g.deadline)}
                    </span>
                  )}
                  {readOnly ? (
                    g.url && (
                      <a
                        href={g.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={t('projectsView.openCardAria')}
                        className={`p-1 shrink-0 ${theme.textMuted} ${theme.hover} rounded`}
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )
                  ) : (
                    <input
                      type="number"
                      min="1"
                      max="10"
                      step="0.1"
                      value={g.grade ?? ''}
                      onChange={(e) => onGrade(g.id, e.target.value)}
                      placeholder="-"
                      className={`w-14 px-2 py-1 text-xs text-right ${theme.input} rounded-md`}
                      aria-label={t('projects.grade')}
                    />
                  )}
                </div>
                {!readOnly && (
                <div className="flex items-center gap-2 flex-wrap">
                  <TimeInput
                    value={g.time}
                    onChange={(v) => onSetTime(g.id, v)}
                    theme={theme}
                    className="w-20 shrink-0"
                  />
                  <DurationInput
                    value={g.duration}
                    onChange={(v) => onSetDuration(g.id, v)}
                    theme={theme}
                    className="w-16 shrink-0"
                  />
                  <DagdeelSelect
                    value={g.window}
                    onChange={(v) => onSetWindow(g.id, v)}
                    theme={theme}
                    className="shrink-0"
                  />
                  <label className={`flex items-center gap-1 text-[11px] shrink-0 ${theme.textMuted}`}>
                    <input
                      type="checkbox"
                      checked={!!g.freeBlock}
                      onChange={(e) => onSetFreeBlock(g.id, e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    {t('planner.freeBlock.short')}
                  </label>
                  <label className={`flex items-center gap-1 text-[11px] shrink-0 ${theme.textMuted}`}>
                    <input
                      type="checkbox"
                      checked={!!g.autoPlan}
                      onChange={(e) => onSetAutoPlan(g.id, e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    {t('planner.autoPlan.short')}
                  </label>
                  <label className={`flex items-center gap-1 text-[11px] shrink-0 ${theme.textMuted}`}>
                    <input
                      type="checkbox"
                      checked={!!g.deepWork}
                      onChange={(e) => onSetDeepWork(g.id, e.target.checked)}
                      className="w-3.5 h-3.5"
                    />
                    {t('planner.deepWork.short')}
                  </label>
                </div>
                )}
              </div>
            </SwipeRow>
          </li>
        );
      })}
    </ul>
  );
}
