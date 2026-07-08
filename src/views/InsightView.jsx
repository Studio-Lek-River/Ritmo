import React, { useMemo, useState } from 'react';
import { Sparkles } from 'lucide-react';
import InsightHeader from '../components/insight/InsightHeader';
import CounterInsightCard from '../components/insight/CounterInsightCard';
import ChecklistInsightCard from '../components/insight/ChecklistInsightCard';
import ChoiceInsightCard from '../components/insight/ChoiceInsightCard';
import SleepInsightCard from '../components/insight/SleepInsightCard';
import CollectionInsightCard from '../components/insight/CollectionInsightCard';
import TasksInsightCard from '../components/insight/TasksInsightCard';
import ProjectsInsightCard from '../components/insight/ProjectsInsightCard';
import MeasurementsInsightCard from '../components/insight/MeasurementsInsightCard';
import { rangeForPeriod, buildDays } from '../utils/insights';

function CardForModule({ mod, days, theme, darkMode, t }) {
  switch (mod.type) {
    case 'counter':    return <CounterInsightCard mod={mod} days={days} theme={theme} darkMode={darkMode} t={t} />;
    case 'checklist':  return <ChecklistInsightCard mod={mod} days={days} theme={theme} darkMode={darkMode} t={t} />;
    case 'choice':     return <ChoiceInsightCard mod={mod} days={days} theme={theme} darkMode={darkMode} t={t} />;
    case 'sleep':      return <SleepInsightCard mod={mod} days={days} theme={theme} darkMode={darkMode} t={t} />;
    case 'collection': return <CollectionInsightCard mod={mod} days={days} theme={theme} darkMode={darkMode} t={t} />;
    case 'tasks':      return <TasksInsightCard mod={mod} days={days} theme={theme} darkMode={darkMode} t={t} />;
    case 'projects':   return <ProjectsInsightCard mod={mod} theme={theme} darkMode={darkMode} t={t} />;
    case 'measurements': return <MeasurementsInsightCard mod={mod} days={days} theme={theme} darkMode={darkMode} t={t} />;
    default:           return null;
  }
}

export default function InsightView({ modules, history, theme, darkMode, t }) {
  const [period, setPeriod] = useState('7');
  const enabled = useMemo(
    () => (modules || []).filter(m => m.enabled && m.type !== 'collection' && m.type !== 'medication' && m.type !== 'bodymap' && m.type !== 'injectionSchedule'),
    [modules],
  );
  const { dayKeys } = useMemo(() => rangeForPeriod(period), [period]);
  const days = useMemo(() => buildDays(history || {}, dayKeys), [history, dayKeys]);
  const hasAnyData = useMemo(
    () => days.some(d => d.dayData) || enabled.some(m =>
      m.type === 'projects' || m.type === 'measurements',
    ),
    [days, enabled],
  );

  if (enabled.length === 0) {
    return (
      <div className="slide-in">
        <div className={`${theme.card} rounded-2xl p-8 shadow-sm text-center`}>
          <Sparkles className={`w-12 h-12 mx-auto mb-3 ${theme.textMuted}`} />
          <p className={`text-sm ${theme.textMuted}`}>{t('insight.empty.noModules')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="slide-in">
      <InsightHeader period={period} setPeriod={setPeriod} theme={theme} t={t} />
      {!hasAnyData && (
        <div className={`${theme.card} rounded-2xl p-8 shadow-sm text-center mb-4`}>
          <p className={`text-sm ${theme.textMuted}`}>{t('insight.empty.noHistory')}</p>
        </div>
      )}
      {enabled.map(mod => (
        <CardForModule
          key={mod.id}
          mod={mod}
          days={days}
          theme={theme}
          darkMode={darkMode}
          t={t}
        />
      ))}
      <p className={`text-xs ${theme.textMuted} text-center mt-2 mb-6`}>
        {t('insight.footerHint')}
      </p>
    </div>
  );
}
