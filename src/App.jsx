import React, { useState, useEffect, useRef } from 'react';
import { Check, Sun, Moon, Activity, Briefcase, Footprints, Plus, Trash2, TrendingUp, Calendar, AlertCircle, Sparkles, Flame, Settings, BookOpen, ChevronLeft, ChevronRight, X, Repeat, Trophy, GripVertical, Heart, Coffee, Book, Music, Dumbbell, Zap, Smile, Brain, Cloud, Star, Target, Edit3, Eye, EyeOff } from 'lucide-react';
import './storage';

// Available icons for modules
const ICON_OPTIONS = {
  Sun, Moon, Activity, Briefcase, Footprints, Sparkles, Heart, Coffee, Book, Music, Dumbbell, Zap, Smile, Brain, Cloud, Star, Target, Check, BookOpen
};

const COLOR_OPTIONS = ['amber', 'cyan', 'purple', 'green', 'indigo', 'pink', 'blue', 'orange', 'rose', 'teal'];

// Default modules for first-time users
const DEFAULT_MODULES = [
  {
    id: 'morning',
    name: 'Ochtendroutine',
    icon: 'Sun',
    color: 'amber',
    enabled: true,
    type: 'checklist',
    items: [
      { id: 'wakeUp', label: '8:00 — Opstaan' },
      { id: 'teeth', label: 'Tandenpoetsen' },
    ]
  },
  {
    id: 'physio',
    name: 'Fysio-oefeningen',
    icon: 'Activity',
    color: 'purple',
    enabled: true,
    type: 'checklist',
    items: [
      { id: 'physio1', label: 'Wandelen met de billen' },
      { id: 'physio2', label: 'Superman op de knieën en strekken' },
      { id: 'physio3', label: 'Nek van links naar rechts' },
      { id: 'physio4', label: 'Nek van oor naar oksel' },
    ]
  },
  {
    id: 'walk',
    name: 'Beweging buiten',
    icon: 'Footprints',
    color: 'green',
    enabled: true,
    type: 'choice',
    options: [
      { id: 'walk', label: '🚶 Wandelen' },
      { id: 'bike', label: '🚴 Fietsen (bij regen)' },
    ],
    completionLabel: 'Beweging buiten gedaan'
  },
  {
    id: 'work',
    name: 'Productief werk',
    icon: 'Briefcase',
    color: 'indigo',
    enabled: true,
    type: 'timer',
    dailyGoalMinutes: 120,
    weeklyMaxMinutes: 360,
  },
  {
    id: 'tasks',
    name: 'Eigen taken',
    icon: 'Check',
    color: 'pink',
    enabled: true,
    type: 'tasks',
  }
];

export default function Ritmo() {
  const [view, setView] = useState('today');
  const [today] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState(true);
  
  const [modules, setModules] = useState(DEFAULT_MODULES);
  const [moduleData, setModuleData] = useState({}); // per-module daily state
  const [history, setHistory] = useState({});
  const [customTasks, setCustomTasks] = useState([]);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [reflectionAnswers, setReflectionAnswers] = useState({});
  const [reflectionQuestions, setReflectionQuestions] = useState([
    'Wat ging er vandaag goed?',
    'Wat kan morgen beter?',
    'Waar ben ik dankbaar voor?'
  ]);
  const [streakSettings, setStreakSettings] = useState({});
  const [confetti, setConfetti] = useState([]);
  const [celebrationMsg, setCelebrationMsg] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  
  const previousCompletionRef = useRef(null);

  useEffect(() => {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  // Load all data
  useEffect(() => {
    async function loadData() {
      try {
        const result = await window.storage.get(`day:${today}`);
        if (result?.value) {
          const data = JSON.parse(result.value);
          setModuleData(data.moduleData || {});
          setCustomTasks(data.customTasks || []);
          setReflectionAnswers(data.reflectionAnswers || {});
        }
      } catch (e) {}
      
      try {
        const settingsResult = await window.storage.get('settings');
        if (settingsResult?.value) {
          const settings = JSON.parse(settingsResult.value);
          if (settings.darkMode !== undefined) setDarkMode(settings.darkMode);
          if (settings.reflectionQuestions) setReflectionQuestions(settings.reflectionQuestions);
          if (settings.recurringTasks) setRecurringTasks(settings.recurringTasks);
          if (settings.streakSettings) setStreakSettings(settings.streakSettings);
          if (settings.modules) setModules(settings.modules);
          if (settings.hasOnboarded !== undefined) setHasOnboarded(settings.hasOnboarded);
        } else {
          setHasOnboarded(false);
        }
      } catch {
        setHasOnboarded(false);
      }
      
      try {
        const keys = await window.storage.list('day:');
        if (keys?.keys) {
          const allHistory = {};
          for (const key of keys.keys) {
            try {
              const r = await window.storage.get(key);
              if (r?.value) {
                const date = key.replace('day:', '');
                allHistory[date] = JSON.parse(r.value);
              }
            } catch {}
          }
          setHistory(allHistory);
        }
      } catch {}
      
      setLoading(false);
    }
    loadData();
  }, [today]);

  // Save day data
  useEffect(() => {
    if (loading) return;
    const saveData = async () => {
      try {
        const dayData = {
          moduleData,
          customTasks,
          reflectionAnswers,
        };
        await window.storage.set(`day:${today}`, JSON.stringify(dayData));
        setHistory(prev => ({ ...prev, [today]: dayData }));
      } catch (e) {
        console.error('Save failed', e);
      }
    };
    saveData();
  }, [moduleData, customTasks, reflectionAnswers, loading, today]);

  // Save settings
  useEffect(() => {
    if (loading) return;
    const saveSettings = async () => {
      try {
        await window.storage.set('settings', JSON.stringify({
          darkMode,
          reflectionQuestions,
          recurringTasks,
          streakSettings,
          modules,
          hasOnboarded,
        }));
      } catch {}
    };
    saveSettings();
  }, [darkMode, reflectionQuestions, recurringTasks, streakSettings, modules, hasOnboarded, loading]);

  // Recurring tasks
  useEffect(() => {
    if (loading) return;
    const dayOfWeek = new Date().getDay();
    const todayDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    
    recurringTasks.forEach(rt => {
      if (rt.days.includes(todayDay)) {
        const existsToday = customTasks.some(t => t.recurringId === rt.id);
        if (!existsToday) {
          setCustomTasks(prev => [...prev, {
            id: Date.now() + Math.random(),
            recurringId: rt.id,
            text: rt.text,
            done: false
          }]);
        }
      }
    });
  }, [loading, recurringTasks]);

  const triggerCelebration = (message) => {
    const newConfetti = Array.from({ length: 30 }, (_, i) => ({
      id: Date.now() + i,
      x: Math.random() * 100,
      delay: Math.random() * 0.5,
      color: ['#fbbf24', '#3b82f6', '#10b981', '#ec4899', '#a855f7'][Math.floor(Math.random() * 5)],
      rotation: Math.random() * 360,
    }));
    setConfetti(newConfetti);
    setCelebrationMsg(message);
    setTimeout(() => setConfetti([]), 3000);
    setTimeout(() => setCelebrationMsg(null), 2500);
  };

  // Check overall completion
  useEffect(() => {
    if (loading) return;
    const enabledModules = modules.filter(m => m.enabled && m.type !== 'tasks');
    const totalItems = enabledModules.reduce((sum, m) => {
      if (m.type === 'checklist') return sum + m.items.length;
      if (m.type === 'choice') return sum + 1;
      if (m.type === 'timer') return sum + 1;
      return sum;
    }, 0);
    
    const completed = enabledModules.reduce((sum, m) => {
      const data = moduleData[m.id] || {};
      if (m.type === 'checklist') {
        return sum + m.items.filter(i => data[i.id]).length;
      }
      if (m.type === 'choice') {
        return sum + (data.completed ? 1 : 0);
      }
      if (m.type === 'timer') {
        return sum + ((data.minutes || 0) >= m.dailyGoalMinutes ? 1 : 0);
      }
      return sum;
    }, 0);
    
    if (previousCompletionRef.current !== null && totalItems > 0) {
      if (completed === totalItems && previousCompletionRef.current < totalItems) {
        triggerCelebration('🎉 Alle modules voltooid!');
      }
    }
    previousCompletionRef.current = completed;
  }, [moduleData, modules, loading]);

  // Module helpers
  const updateModuleData = (moduleId, updater) => {
    setModuleData(prev => ({
      ...prev,
      [moduleId]: typeof updater === 'function' 
        ? updater(prev[moduleId] || {})
        : updater
    }));
  };

  const toggleChecklistItem = (moduleId, itemId) => {
    updateModuleData(moduleId, prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const toggleChoice = (moduleId) => {
    updateModuleData(moduleId, prev => ({
      ...prev,
      completed: !prev.completed
    }));
  };

  const setChoiceOption = (moduleId, optionId) => {
    updateModuleData(moduleId, prev => ({
      ...prev,
      selectedOption: optionId
    }));
  };

  const addWorkMinutes = (moduleId, mins) => {
    const currentMinutes = moduleData[moduleId]?.minutes || 0;
    const newMinutes = currentMinutes + mins;
    const mod = modules.find(m => m.id === moduleId);
    
    updateModuleData(moduleId, prev => ({
      ...prev,
      minutes: newMinutes
    }));
    
    if (mod && currentMinutes < mod.dailyGoalMinutes && newMinutes >= mod.dailyGoalMinutes) {
      triggerCelebration(`💪 ${mod.name} doel gehaald!`);
    }
  };

  const resetWorkMinutes = (moduleId) => {
    updateModuleData(moduleId, prev => ({
      ...prev,
      minutes: 0
    }));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setCustomTasks(prev => [...prev, { id: Date.now(), text: newTask.trim(), done: false }]);
      setNewTask('');
    }
  };

  const toggleTask = (id) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
  };

  const deleteTask = (id) => {
    setCustomTasks(prev => prev.filter(t => t.id !== id));
  };

  // Streak calculation
  const calculateStreak = (checkFn) => {
    let streak = 0;
    const d = new Date();
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      const dayData = dateStr === today 
        ? { moduleData } 
        : history[dateStr];
      
      if (!dayData) break;
      if (!checkFn(dayData)) break;
      streak++;
      d.setDate(d.getDate() - 1);
      if (streak > 365) break;
    }
    return streak;
  };

  const getModuleStreak = (mod) => {
    const setting = streakSettings[mod.id] || {};
    
    if (mod.type === 'checklist') {
      const requireAll = setting.requireAll !== false;
      return calculateStreak(d => {
        const data = d.moduleData?.[mod.id];
        if (!data) return false;
        if (requireAll) {
          return mod.items.every(i => data[i.id]);
        }
        return mod.items.some(i => data[i.id]);
      });
    }
    
    if (mod.type === 'choice') {
      return calculateStreak(d => d.moduleData?.[mod.id]?.completed);
    }
    
    if (mod.type === 'timer') {
      const goal = setting.minutesGoal || mod.dailyGoalMinutes;
      return calculateStreak(d => (d.moduleData?.[mod.id]?.minutes || 0) >= goal);
    }
    
    return 0;
  };

  const getWeekStart = () => {
    const d = new Date();
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff)).toISOString().split('T')[0];
  };

  const weekStart = getWeekStart();
  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + i);
    return d.toISOString().split('T')[0];
  });

  const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];
  const monthNames = ['Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni', 'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'];

  const t = darkMode ? {
    bg: 'bg-gradient-to-br from-slate-900 to-slate-800',
    card: 'bg-slate-800',
    cardSecondary: 'bg-slate-700',
    text: 'text-slate-100',
    textSecondary: 'text-slate-300',
    textMuted: 'text-slate-400',
    border: 'border-slate-700',
    input: 'bg-slate-700 text-slate-100',
    hover: 'hover:bg-slate-700',
    progressBg: 'bg-slate-700',
  } : {
    bg: 'bg-gradient-to-br from-slate-50 to-blue-50',
    card: 'bg-white',
    cardSecondary: 'bg-slate-50',
    text: 'text-slate-800',
    textSecondary: 'text-slate-700',
    textMuted: 'text-slate-500',
    border: 'border-slate-100',
    input: 'bg-slate-50 text-slate-700',
    hover: 'hover:bg-slate-50',
    progressBg: 'bg-slate-100',
  };

  // Overall completion
  const enabledNonTaskModules = modules.filter(m => m.enabled && m.type !== 'tasks');
  const totalCompletionItems = enabledNonTaskModules.reduce((sum, m) => {
    if (m.type === 'checklist') return sum + m.items.length;
    if (m.type === 'choice') return sum + 1;
    if (m.type === 'timer') return sum + 1;
    return sum;
  }, 0);
  const completedItems = enabledNonTaskModules.reduce((sum, m) => {
    const data = moduleData[m.id] || {};
    if (m.type === 'checklist') return sum + m.items.filter(i => data[i.id]).length;
    if (m.type === 'choice') return sum + (data.completed ? 1 : 0);
    if (m.type === 'timer') return sum + ((data.minutes || 0) >= m.dailyGoalMinutes ? 1 : 0);
    return sum;
  }, 0);
  const overallPercentage = totalCompletionItems > 0 ? (completedItems / totalCompletionItems) * 100 : 0;

  if (loading) {
    return (
      <div className={`min-h-screen ${t.bg} flex items-center justify-center`}>
        <div className={t.textMuted}>Laden...</div>
      </div>
    );
  }

  if (!hasOnboarded) {
    return <Onboarding onComplete={(selectedModules) => {
      setModules(selectedModules);
      setHasOnboarded(true);
    }} t={t} darkMode={darkMode} setDarkMode={setDarkMode} />;
  }

  const enabledModules = modules.filter(m => m.enabled);

  return (
    <div className={`min-h-screen ${t.bg} p-4 transition-colors duration-300 relative overflow-hidden`}>
      {confetti.map(c => (
        <div
          key={c.id}
          className="absolute pointer-events-none z-50"
          style={{
            left: `${c.x}%`,
            top: '-20px',
            animation: `confettiFall 2.5s ease-in ${c.delay}s forwards`,
            transform: `rotate(${c.rotation}deg)`,
          }}
        >
          <div 
            className="w-3 h-3" 
            style={{ backgroundColor: c.color, borderRadius: Math.random() > 0.5 ? '50%' : '0' }} 
          />
        </div>
      ))}

      {celebrationMsg && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none">
          <div className="bg-gradient-to-r from-amber-400 to-pink-500 text-white px-8 py-4 rounded-2xl shadow-2xl text-lg font-bold animate-bounce">
            {celebrationMsg}
          </div>
        </div>
      )}

      <style>{`
        @keyframes confettiFall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }
        @keyframes checkPop {
          0% { transform: scale(1); }
          50% { transform: scale(1.3); }
          100% { transform: scale(1); }
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .check-pop { animation: checkPop 0.4s ease-out; }
        .slide-in { animation: slideIn 0.3s ease-out; }
      `}</style>

      <div className="max-w-2xl mx-auto relative">
        <div className="flex items-start justify-between mb-6">
          <div>
            <div className="flex items-baseline gap-2 mb-1">
              <h1 className={`text-3xl font-bold ${t.text}`}>Ritmo</h1>
              <span className={`text-sm ${t.textMuted}`}>· jouw dag, jouw ritme</span>
            </div>
            <p className={`${t.textMuted} text-sm`}>
              {new Date().toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 ${t.card} rounded-xl shadow-sm ${t.hover} transition`}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 ${t.card} rounded-xl shadow-sm ${t.hover} transition`}
            >
              <Settings className={`w-5 h-5 ${t.textSecondary}`} />
            </button>
          </div>
        </div>

        <div className={`flex gap-1 mb-6 ${t.card} rounded-xl p-1 shadow-sm`}>
          {['today', 'week', 'month', 'reflection'].map(v => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition ${
                view === v ? 'bg-blue-500 text-white shadow' : `${t.textMuted} ${t.hover}`
              }`}
            >
              {v === 'today' ? 'Vandaag' : v === 'week' ? 'Week' : v === 'month' ? 'Maand' : 'Reflectie'}
            </button>
          ))}
        </div>

        {view === 'today' && (
          <div className="slide-in">
            {/* Streaks - only for enabled trackable modules */}
            {enabledModules.filter(m => m.type !== 'tasks').length > 0 && (
              <div className={`${t.card} rounded-2xl p-4 shadow-sm mb-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <h2 className={`font-semibold ${t.textSecondary} text-sm`}>Streaks</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {enabledModules.filter(m => m.type !== 'tasks').slice(0, 4).map(mod => (
                    <StreakBadge 
                      key={mod.id}
                      label={mod.name} 
                      days={getModuleStreak(mod)} 
                      color={mod.color} 
                      t={t} 
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Overall progress */}
            {totalCompletionItems > 0 && (
              <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
                <div className="flex items-center justify-between mb-3">
                  <h2 className={`font-semibold ${t.textSecondary}`}>Dagvoortgang</h2>
                  <span className="text-2xl font-bold text-blue-500">{Math.round(overallPercentage)}%</span>
                </div>
                <div className={`w-full ${t.progressBg} rounded-full h-3 overflow-hidden`}>
                  <div 
                    className="bg-gradient-to-r from-blue-400 to-blue-600 h-3 rounded-full transition-all duration-700"
                    style={{ width: `${overallPercentage}%` }}
                  />
                </div>
                <p className={`text-xs ${t.textMuted} mt-2`}>
                  {completedItems} van {totalCompletionItems} items voltooid
                </p>
              </div>
            )}

            {/* Render each enabled module */}
            {enabledModules.map(mod => (
              <ModuleRenderer
                key={mod.id}
                module={mod}
                data={moduleData[mod.id] || {}}
                onChecklistToggle={(itemId) => toggleChecklistItem(mod.id, itemId)}
                onChoiceToggle={() => toggleChoice(mod.id)}
                onChoiceOptionSet={(optId) => setChoiceOption(mod.id, optId)}
                onAddMinutes={(mins) => addWorkMinutes(mod.id, mins)}
                onResetMinutes={() => resetWorkMinutes(mod.id)}
                history={history}
                weekDates={weekDates}
                customTasks={customTasks}
                newTask={newTask}
                setNewTask={setNewTask}
                addTask={addTask}
                toggleTask={toggleTask}
                deleteTask={deleteTask}
                t={t}
                darkMode={darkMode}
              />
            ))}

            {enabledModules.length === 0 && (
              <div className={`${t.card} rounded-2xl p-8 shadow-sm text-center`}>
                <Sparkles className={`w-12 h-12 mx-auto mb-3 ${t.textMuted}`} />
                <h3 className={`font-semibold ${t.textSecondary} mb-2`}>Geen modules actief</h3>
                <p className={`text-sm ${t.textMuted} mb-4`}>
                  Activeer modules via de instellingen om je dag te beginnen.
                </p>
                <button
                  onClick={() => setShowSettings(true)}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
                >
                  Naar instellingen
                </button>
              </div>
            )}

            {/* Quick reflection */}
            <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500" />
                  <h2 className={`font-semibold ${t.textSecondary}`}>Reflectie</h2>
                </div>
                <button
                  onClick={() => setView('reflection')}
                  className="text-xs text-blue-500 hover:underline"
                >
                  Volledig bekijken →
                </button>
              </div>
              {reflectionQuestions.slice(0, 1).map((q, i) => (
                <div key={i}>
                  <label className={`text-xs ${t.textMuted} mb-1 block`}>{q}</label>
                  <textarea
                    value={reflectionAnswers[q] || ''}
                    onChange={(e) => setReflectionAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                    placeholder="Schrijf hier..."
                    className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300`}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {view === 'week' && (
          <WeekView 
            modules={modules}
            history={history}
            today={today}
            moduleData={moduleData}
            weekDates={weekDates}
            dayNames={dayNames}
            t={t}
            darkMode={darkMode}
          />
        )}

        {view === 'month' && (
          <MonthView 
            calendarMonth={calendarMonth} 
            setCalendarMonth={setCalendarMonth}
            history={history}
            today={today}
            moduleData={moduleData}
            modules={modules}
            t={t}
            darkMode={darkMode}
            monthNames={monthNames}
            dayNames={dayNames}
          />
        )}

        {view === 'reflection' && (
          <ReflectionView
            reflectionQuestions={reflectionQuestions}
            reflectionAnswers={reflectionAnswers}
            setReflectionAnswers={setReflectionAnswers}
            history={history}
            today={today}
            t={t}
            darkMode={darkMode}
          />
        )}

        <div className={`text-center text-xs ${t.textMuted} mt-6 pb-4`}>
          Je voortgang wordt automatisch opgeslagen
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          modules={modules}
          setModules={setModules}
          reflectionQuestions={reflectionQuestions}
          setReflectionQuestions={setReflectionQuestions}
          recurringTasks={recurringTasks}
          setRecurringTasks={setRecurringTasks}
          streakSettings={streakSettings}
          setStreakSettings={setStreakSettings}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          t={t}
          dayNames={dayNames}
        />
      )}
    </div>
  );
}

// =============================================
// ONBOARDING
// =============================================
function Onboarding({ onComplete, t, darkMode, setDarkMode }) {
  const [step, setStep] = useState(0);
  const [selectedDefaults, setSelectedDefaults] = useState(
    DEFAULT_MODULES.reduce((acc, m) => ({ ...acc, [m.id]: true }), {})
  );

  const finish = () => {
    const finalModules = DEFAULT_MODULES.map(m => ({
      ...m,
      enabled: selectedDefaults[m.id] !== false
    }));
    onComplete(finalModules);
  };

  return (
    <div className={`min-h-screen ${t.bg} p-4 flex items-center justify-center`}>
      <div className={`${t.card} rounded-2xl p-6 shadow-lg max-w-lg w-full`}>
        {step === 0 && (
          <div className="text-center">
            <div className="text-6xl mb-4">🎵</div>
            <h1 className={`text-3xl font-bold ${t.text} mb-2`}>Welkom bij Ritmo</h1>
            <p className={`${t.textMuted} mb-6`}>
              Jouw persoonlijke dag-app. Volledig modulair: kies wat je wilt bijhouden, voeg toe wat je nodig hebt, verberg wat niet relevant is.
            </p>
            <button
              onClick={() => setStep(1)}
              className="w-full py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition"
            >
              Aan de slag
            </button>
          </div>
        )}

        {step === 1 && (
          <div>
            <h2 className={`text-2xl font-bold ${t.text} mb-2`}>Kies je modules</h2>
            <p className={`${t.textMuted} mb-4 text-sm`}>
              Selecteer welke onderdelen je wilt gebruiken. Je kunt dit later altijd aanpassen.
            </p>
            <div className="space-y-2 mb-6">
              {DEFAULT_MODULES.map(m => {
                const Icon = ICON_OPTIONS[m.icon] || Sparkles;
                const enabled = selectedDefaults[m.id] !== false;
                return (
                  <button
                    key={m.id}
                    onClick={() => setSelectedDefaults(prev => ({ ...prev, [m.id]: !enabled }))}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition ${
                      enabled 
                        ? `border-${m.color}-400 bg-${m.color}-50 ${darkMode ? 'bg-opacity-10' : ''}`
                        : `${t.border} ${t.cardSecondary}`
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${enabled ? `text-${m.color}-500` : t.textMuted}`} />
                    <div className="flex-1 text-left">
                      <div className={`font-medium text-sm ${enabled ? t.textSecondary : t.textMuted}`}>
                        {m.name}
                      </div>
                      <div className={`text-xs ${t.textMuted}`}>
                        {m.type === 'checklist' && `${m.items.length} items`}
                        {m.type === 'choice' && 'Keuze + voltooien'}
                        {m.type === 'timer' && 'Tijd bijhouden'}
                        {m.type === 'tasks' && 'Eigen takenlijst'}
                      </div>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      enabled ? `bg-${m.color}-500 border-${m.color}-500` : 'border-slate-300'
                    }`}>
                      {enabled && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
            <p className={`text-xs ${t.textMuted} mb-4 text-center`}>
              💡 Je kunt later eigen modules toevoegen, items wijzigen, en alles personaliseren via instellingen.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep(0)}
                className={`px-4 py-3 ${t.cardSecondary} ${t.textSecondary} rounded-xl font-medium transition`}
              >
                Terug
              </button>
              <button
                onClick={finish}
                className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-medium transition"
              >
                Start Ritmo
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// MODULE RENDERER
// =============================================
function ModuleRenderer({ module: mod, data, onChecklistToggle, onChoiceToggle, onChoiceOptionSet, onAddMinutes, onResetMinutes, weekDates, history, customTasks, newTask, setNewTask, addTask, toggleTask, deleteTask, t, darkMode }) {
  const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
  const colorClass = `text-${mod.color}-500`;

  if (mod.type === 'checklist') {
    return (
      <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <h2 className={`font-semibold ${t.textSecondary}`}>{mod.name}</h2>
        </div>
        <div className="space-y-2">
          {mod.items.map(item => (
            <ChecklistItem
              key={item.id}
              label={item.label}
              icon={Icon}
              color={mod.color}
              checked={data[item.id] || false}
              onToggle={() => onChecklistToggle(item.id)}
              t={t}
            />
          ))}
        </div>
      </div>
    );
  }

  if (mod.type === 'choice') {
    return (
      <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <h2 className={`font-semibold ${t.textSecondary}`}>{mod.name}</h2>
        </div>
        <div className="flex gap-2 mb-3">
          {mod.options.map(opt => (
            <button
              key={opt.id}
              onClick={() => onChoiceOptionSet(opt.id)}
              className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                data.selectedOption === opt.id 
                  ? `bg-${mod.color}-100 text-${mod.color}-700 ring-2 ring-${mod.color}-300` 
                  : `${t.cardSecondary} ${t.textMuted}`
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        <ChecklistItem
          label={mod.completionLabel || `${mod.name} gedaan`}
          icon={Icon}
          color={mod.color}
          checked={data.completed || false}
          onToggle={onChoiceToggle}
          t={t}
        />
      </div>
    );
  }

  if (mod.type === 'timer') {
    const minutes = data.minutes || 0;
    const goal = mod.dailyGoalMinutes || 120;
    const weekMinutes = weekDates.reduce((sum, date) => {
      return sum + (history[date]?.moduleData?.[mod.id]?.minutes || 0);
    }, 0);
    const weekMax = mod.weeklyMaxMinutes;
    const weekHours = (weekMinutes / 60).toFixed(1);
    const weekPct = weekMax ? Math.min((weekMinutes / weekMax) * 100, 100) : 0;

    return (
      <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <h2 className={`font-semibold ${t.textSecondary}`}>{mod.name}</h2>
        </div>
        
        <div className={`${darkMode ? `bg-${mod.color}-900/30` : `bg-${mod.color}-50`} rounded-xl p-4 mb-3`}>
          <div className={`text-3xl font-bold ${darkMode ? `text-${mod.color}-300` : `text-${mod.color}-600`} mb-1`}>
            {(minutes / 60).toFixed(1)} uur
          </div>
          <p className={`text-xs ${darkMode ? `text-${mod.color}-400` : `text-${mod.color}-500`}`}>
            vandaag (doel: {(goal/60).toFixed(1)} uur)
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 mb-3">
          {[15, 30, 45, 60].map(min => (
            <button
              key={min}
              onClick={() => onAddMinutes(min)}
              className={`py-2 ${darkMode ? `bg-${mod.color}-900/30 hover:bg-${mod.color}-900/50 text-${mod.color}-300` : `bg-${mod.color}-50 hover:bg-${mod.color}-100 text-${mod.color}-700`} rounded-lg text-sm font-medium transition`}
            >
              +{min}m
            </button>
          ))}
        </div>
        <button
          onClick={onResetMinutes}
          className={`w-full py-2 ${t.cardSecondary} ${t.hover} ${t.textMuted} rounded-lg text-sm transition`}
        >
          Reset vandaag
        </button>

        {weekMax && (
          <div className={`mt-4 pt-4 border-t ${t.border}`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`text-sm font-medium ${t.textSecondary}`}>Deze week</span>
              <span className={`text-sm font-bold ${weekMinutes >= weekMax ? 'text-red-500' : weekMinutes >= weekMax * 0.83 ? 'text-amber-500' : 'text-green-600'}`}>
                {weekHours} / {(weekMax/60).toFixed(0)} uur
              </span>
            </div>
            <div className={`w-full ${t.progressBg} rounded-full h-2`}>
              <div 
                className={`h-2 rounded-full transition-all duration-700 ${
                  weekPct >= 100 ? 'bg-red-500' : weekPct >= 83 ? 'bg-amber-500' : 'bg-green-500'
                }`}
                style={{ width: `${weekPct}%` }}
              />
            </div>
            {weekMinutes >= weekMax && (
              <div className={`flex items-start gap-2 mt-3 p-2 ${darkMode ? 'bg-red-900/30' : 'bg-red-50'} rounded-lg`}>
                <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className={`text-xs ${darkMode ? 'text-red-300' : 'text-red-700'}`}>Weeklimiet bereikt!</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  if (mod.type === 'tasks') {
    return (
      <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <h2 className={`font-semibold ${t.textSecondary}`}>{mod.name}</h2>
        </div>
        
        <div className="flex gap-2 mb-3">
          <input
            type="text"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addTask()}
            placeholder="Voeg een taak toe..."
            className={`flex-1 px-3 py-2 ${t.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${mod.color}-300`}
          />
          <button
            onClick={addTask}
            className={`px-3 py-2 bg-${mod.color}-500 hover:bg-${mod.color}-600 text-white rounded-lg transition`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          {customTasks.length === 0 ? (
            <p className={`text-sm ${t.textMuted} text-center py-4`}>Nog geen taken toegevoegd</p>
          ) : (
            customTasks.map(task => (
              <div key={task.id} className={`flex items-center gap-3 p-2 ${t.cardSecondary} rounded-lg group`}>
                <button
                  onClick={() => toggleTask(task.id)}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${
                    task.done ? `bg-${mod.color}-500 border-${mod.color}-500 check-pop` : 'border-slate-300'
                  }`}
                >
                  {task.done && <Check className="w-3 h-3 text-white" />}
                </button>
                {task.recurringId && <Repeat className={`w-3 h-3 ${t.textMuted} flex-shrink-0`} />}
                <span className={`flex-1 text-sm ${task.done ? `line-through ${t.textMuted}` : t.textSecondary}`}>
                  {task.text}
                </span>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="opacity-50 sm:opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
}

function ChecklistItem({ label, icon: Icon, color, checked, onToggle, t }) {
  return (
    <button
      onClick={onToggle}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition ${
        checked ? t.cardSecondary : t.hover
      }`}
    >
      <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition flex-shrink-0 ${
        checked ? `bg-${color}-500 border-${color}-500 check-pop` : 'border-slate-300'
      }`}>
        {checked && <Check className="w-4 h-4 text-white" />}
      </div>
      <span className={`text-sm text-left flex-1 ${checked ? `line-through ${t.textMuted}` : t.textSecondary}`}>
        {label}
      </span>
    </button>
  );
}

// =============================================
// STREAK BADGE
// =============================================
function StreakBadge({ label, days, color, t }) {
  const colorMap = {
    amber: 'from-amber-400 to-orange-500',
    purple: 'from-purple-400 to-pink-500',
    green: 'from-green-400 to-emerald-500',
    indigo: 'from-indigo-400 to-blue-500',
    cyan: 'from-cyan-400 to-blue-500',
    pink: 'from-pink-400 to-rose-500',
    blue: 'from-blue-400 to-indigo-500',
    orange: 'from-orange-400 to-red-500',
    rose: 'from-rose-400 to-pink-500',
    teal: 'from-teal-400 to-cyan-500',
  };
  
  return (
    <div className="text-center">
      <div className={`bg-gradient-to-br ${colorMap[color] || colorMap.blue} rounded-xl p-2 mb-1 shadow-sm`}>
        <div className="text-2xl font-bold text-white">{days}</div>
        <div className="text-xs text-white/90">{days === 1 ? 'dag' : 'dagen'}</div>
      </div>
      <div className={`text-xs ${t.textMuted} truncate`}>{label}</div>
    </div>
  );
}

// =============================================
// WEEK VIEW
// =============================================
function WeekView({ modules, history, today, moduleData, weekDates, dayNames, t, darkMode }) {
  const enabledNonTaskModules = modules.filter(m => m.enabled && m.type !== 'tasks');
  
  const getDayCompletion = (date) => {
    const data = date === today 
      ? { moduleData } 
      : history[date];
    if (!data?.moduleData) return 0;
    
    let total = 0, done = 0;
    enabledNonTaskModules.forEach(m => {
      const d = data.moduleData[m.id] || {};
      if (m.type === 'checklist') {
        total += m.items.length;
        done += m.items.filter(i => d[i.id]).length;
      } else if (m.type === 'choice') {
        total += 1;
        done += d.completed ? 1 : 0;
      } else if (m.type === 'timer') {
        total += 1;
        done += (d.minutes || 0) >= m.dailyGoalMinutes ? 1 : 0;
      }
    });
    
    return total > 0 ? (done / total) * 100 : 0;
  };

  return (
    <div className={`${t.card} rounded-2xl p-5 shadow-sm slide-in`}>
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-blue-500" />
        <h2 className={`font-semibold ${t.textSecondary}`}>Week overzicht</h2>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDates.map((date, i) => {
          const isToday = date === today;
          const pct = getDayCompletion(date);
          
          return (
            <div key={date} className="text-center">
              <div className={`text-xs font-medium mb-1 ${isToday ? 'text-blue-500' : t.textMuted}`}>
                {dayNames[i]}
              </div>
              <div className={`relative h-20 rounded-lg overflow-hidden ${t.progressBg} ${isToday ? 'ring-2 ring-blue-400' : ''}`}>
                <div 
                  className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-blue-500 to-blue-300 transition-all duration-700"
                  style={{ height: `${pct}%` }}
                />
                <div className={`absolute inset-0 flex items-center justify-center text-xs font-bold ${pct > 50 ? 'text-white' : t.textSecondary}`}>
                  {Math.round(pct)}%
                </div>
              </div>
              <div className={`text-xs ${t.textMuted} mt-1`}>
                {date.slice(8)}
              </div>
            </div>
          );
        })}
      </div>

      <div className={`space-y-3 pt-4 border-t ${t.border}`}>
        {enabledNonTaskModules.map(mod => {
          const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
          let label = '';
          let value = '';
          
          if (mod.type === 'checklist') {
            const fullDays = weekDates.filter(d => {
              const data = d === today ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id];
              return data && mod.items.every(i => data[i.id]);
            }).length;
            label = `${mod.name} deze week`;
            value = `${fullDays} / 7 dagen volledig`;
          } else if (mod.type === 'choice') {
            const days = weekDates.filter(d => {
              const data = d === today ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id];
              return data?.completed;
            }).length;
            label = `${mod.name} deze week`;
            value = `${days} / 7 dagen`;
          } else if (mod.type === 'timer') {
            const total = weekDates.reduce((sum, d) => {
              const data = d === today ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id];
              return sum + (data?.minutes || 0);
            }, 0);
            label = `${mod.name} deze week`;
            value = mod.weeklyMaxMinutes 
              ? `${(total/60).toFixed(1)} / ${(mod.weeklyMaxMinutes/60).toFixed(0)} uur`
              : `${(total/60).toFixed(1)} uur`;
          }
          
          return (
            <div key={mod.id} className={`flex items-center justify-between p-3 ${darkMode ? `bg-${mod.color}-900/20` : `bg-${mod.color}-50`} rounded-lg`}>
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 text-${mod.color}-500`} />
                <span className={`text-sm font-medium ${t.textSecondary}`}>{label}</span>
              </div>
              <span className={`font-bold text-sm ${darkMode ? `text-${mod.color}-300` : `text-${mod.color}-600`}`}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================
// MONTH VIEW
// =============================================
function MonthView({ calendarMonth, setCalendarMonth, history, today, moduleData, modules, t, darkMode, monthNames, dayNames }) {
  const year = calendarMonth.getFullYear();
  const month = calendarMonth.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startWeekday = firstDay.getDay() === 0 ? 6 : firstDay.getDay() - 1;
  
  const cells = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    cells.push(dateStr);
  }

  const enabledNonTaskModules = modules.filter(m => m.enabled && m.type !== 'tasks');

  const getCompletion = (dateStr) => {
    const data = dateStr === today ? { moduleData } : history[dateStr];
    if (!data?.moduleData) return 0;
    
    let total = 0, done = 0;
    enabledNonTaskModules.forEach(m => {
      const d = data.moduleData[m.id] || {};
      if (m.type === 'checklist') {
        total += m.items.length;
        done += m.items.filter(i => d[i.id]).length;
      } else if (m.type === 'choice') {
        total += 1;
        done += d.completed ? 1 : 0;
      } else if (m.type === 'timer') {
        total += 1;
        done += (d.minutes || 0) >= m.dailyGoalMinutes ? 1 : 0;
      }
    });
    
    return total > 0 ? done / total : 0;
  };

  const getColor = (pct) => {
    if (pct === 0) return darkMode ? 'bg-slate-700' : 'bg-slate-100';
    if (pct < 0.4) return darkMode ? 'bg-blue-900/40' : 'bg-blue-100';
    if (pct < 0.7) return darkMode ? 'bg-blue-700/60' : 'bg-blue-300';
    if (pct < 1) return darkMode ? 'bg-blue-600' : 'bg-blue-400';
    return 'bg-blue-500';
  };

  const monthDays = cells.filter(c => c !== null);
  const completedDays = monthDays.filter(d => getCompletion(d) === 1).length;
  const partialDays = monthDays.filter(d => {
    const c = getCompletion(d);
    return c > 0 && c < 1;
  }).length;

  return (
    <div className={`${t.card} rounded-2xl p-5 shadow-sm slide-in`}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className={`p-2 ${t.hover} rounded-lg transition`}>
          <ChevronLeft className={`w-5 h-5 ${t.textSecondary}`} />
        </button>
        <h2 className={`font-semibold ${t.textSecondary}`}>{monthNames[month]} {year}</h2>
        <button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className={`p-2 ${t.hover} rounded-lg transition`}>
          <ChevronRight className={`w-5 h-5 ${t.textSecondary}`} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className={`text-center text-xs font-medium ${t.textMuted} py-1`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const pct = getCompletion(dateStr);
          const day = parseInt(dateStr.slice(8));
          const isToday = dateStr === today;
          
          return (
            <div
              key={dateStr}
              className={`aspect-square rounded-md ${getColor(pct)} flex items-center justify-center text-xs font-medium transition-all hover:scale-110 ${
                isToday ? 'ring-2 ring-blue-500' : ''
              } ${pct > 0.5 ? 'text-white' : t.textSecondary}`}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className={`flex items-center gap-2 text-xs ${t.textMuted} mb-4`}>
        <span>Minder</span>
        <div className={`w-4 h-4 rounded ${darkMode ? 'bg-slate-700' : 'bg-slate-100'}`} />
        <div className={`w-4 h-4 rounded ${darkMode ? 'bg-blue-900/40' : 'bg-blue-100'}`} />
        <div className={`w-4 h-4 rounded ${darkMode ? 'bg-blue-700/60' : 'bg-blue-300'}`} />
        <div className={`w-4 h-4 rounded ${darkMode ? 'bg-blue-600' : 'bg-blue-400'}`} />
        <div className="w-4 h-4 rounded bg-blue-500" />
        <span>Meer</span>
      </div>

      <div className={`grid grid-cols-2 gap-2 pt-4 border-t ${t.border}`}>
        <div className={`${darkMode ? 'bg-green-900/20' : 'bg-green-50'} p-3 rounded-lg text-center`}>
          <Trophy className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          <div className={`text-xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{completedDays}</div>
          <div className={`text-xs ${t.textMuted}`}>volledig</div>
        </div>
        <div className={`${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} p-3 rounded-lg text-center`}>
          <Calendar className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <div className={`text-xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{partialDays}</div>
          <div className={`text-xs ${t.textMuted}`}>gedeeltelijk</div>
        </div>
      </div>
    </div>
  );
}

// =============================================
// REFLECTION VIEW
// =============================================
function ReflectionView({ reflectionQuestions, reflectionAnswers, setReflectionAnswers, history, today, t, darkMode }) {
  const [selectedDate, setSelectedDate] = useState(today);
  
  const isToday = selectedDate === today;
  const dayData = isToday ? { reflectionAnswers } : history[selectedDate];
  const answers = isToday ? reflectionAnswers : (dayData?.reflectionAnswers || {});

  const datesWithReflections = Object.keys(history)
    .filter(d => {
      const refs = history[d]?.reflectionAnswers;
      return refs && Object.values(refs).some(v => v && v.trim());
    })
    .sort()
    .reverse();

  return (
    <div className="slide-in space-y-4">
      <div className={`${t.card} rounded-2xl p-5 shadow-sm`}>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <h2 className={`font-semibold ${t.textSecondary}`}>Reflectie</h2>
        </div>

        <div className="mb-4">
          <label className={`text-xs ${t.textMuted} mb-1 block`}>Datum</label>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
          />
        </div>

        <div className="space-y-4">
          {reflectionQuestions.map((q, i) => (
            <div key={i}>
              <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>{q}</label>
              {isToday ? (
                <textarea
                  value={answers[q] || ''}
                  onChange={(e) => setReflectionAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                  placeholder="Schrijf hier..."
                  className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300`}
                />
              ) : (
                <div className={`px-3 py-2 ${t.cardSecondary} rounded-lg text-sm min-h-[60px] ${t.textSecondary}`}>
                  {answers[q] || <span className={t.textMuted}>Geen antwoord ingevuld</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className={`text-xs ${t.textMuted} mt-4`}>💡 Wijzig vragen via instellingen</p>
      </div>

      {datesWithReflections.length > 0 && (
        <div className={`${t.card} rounded-2xl p-5 shadow-sm`}>
          <h3 className={`font-semibold ${t.textSecondary} mb-3 text-sm`}>Eerdere reflecties</h3>
          <div className="space-y-2">
            {datesWithReflections.slice(0, 10).map(date => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`w-full text-left px-3 py-2 ${t.cardSecondary} ${t.hover} rounded-lg text-sm transition flex items-center justify-between`}
              >
                <span className={t.textSecondary}>
                  {new Date(date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
                <ChevronRight className={`w-4 h-4 ${t.textMuted}`} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================
// SETTINGS MODAL
// =============================================
function SettingsModal({ onClose, modules, setModules, reflectionQuestions, setReflectionQuestions, recurringTasks, setRecurringTasks, streakSettings, setStreakSettings, darkMode, setDarkMode, t, dayNames }) {
  const [activeTab, setActiveTab] = useState('modules');
  const [editingModule, setEditingModule] = useState(null);

  if (editingModule) {
    return (
      <ModuleEditor
        module={editingModule}
        onSave={(updated) => {
          setModules(prev => {
            const exists = prev.find(m => m.id === updated.id);
            if (exists) return prev.map(m => m.id === updated.id ? updated : m);
            return [...prev, updated];
          });
          setEditingModule(null);
        }}
        onCancel={() => setEditingModule(null)}
        onDelete={(id) => {
          setModules(prev => prev.filter(m => m.id !== id));
          setEditingModule(null);
        }}
        t={t}
      />
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`${t.card} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto my-4`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${t.text}`}>Instellingen</h2>
          <button onClick={onClose} className={`p-2 ${t.hover} rounded-lg`}>
            <X className={`w-5 h-5 ${t.textSecondary}`} />
          </button>
        </div>

        <div className={`flex gap-1 mb-6 ${t.cardSecondary} rounded-xl p-1`}>
          {[
            { id: 'modules', label: 'Modules' },
            { id: 'streaks', label: 'Streaks' },
            { id: 'reflect', label: 'Reflectie' },
            { id: 'theme', label: 'Thema' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === tab.id ? 'bg-blue-500 text-white' : `${t.textMuted}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'modules' && (
          <div>
            <h3 className={`font-semibold ${t.textSecondary} mb-3`}>Beheer modules</h3>
            <p className={`text-xs ${t.textMuted} mb-4`}>
              Activeer, verberg, bewerk of verwijder modules. Voeg eigen modules toe voor wat jij belangrijk vindt.
            </p>
            
            <div className="space-y-2 mb-4">
              {modules.map(mod => {
                const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
                return (
                  <div key={mod.id} className={`flex items-center gap-2 p-3 ${t.cardSecondary} rounded-lg`}>
                    <button
                      onClick={() => setModules(prev => prev.map(m => m.id === mod.id ? { ...m, enabled: !m.enabled } : m))}
                      className={`p-1.5 rounded transition ${mod.enabled ? `text-${mod.color}-500` : t.textMuted}`}
                      title={mod.enabled ? 'Verbergen' : 'Tonen'}
                    >
                      {mod.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    </button>
                    <Icon className={`w-4 h-4 ${mod.enabled ? `text-${mod.color}-500` : t.textMuted}`} />
                    <div className="flex-1">
                      <div className={`text-sm font-medium ${mod.enabled ? t.textSecondary : t.textMuted}`}>
                        {mod.name}
                      </div>
                      <div className={`text-xs ${t.textMuted}`}>
                        {mod.type === 'checklist' && `Checklist · ${mod.items.length} items`}
                        {mod.type === 'choice' && 'Keuze + voltooien'}
                        {mod.type === 'timer' && `Timer · ${(mod.dailyGoalMinutes/60).toFixed(1)}u doel`}
                        {mod.type === 'tasks' && 'Eigen takenlijst'}
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingModule(mod)}
                      className={`p-1.5 ${t.hover} rounded transition ${t.textMuted}`}
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => setEditingModule({
                id: `mod_${Date.now()}`,
                name: '',
                icon: 'Star',
                color: 'blue',
                enabled: true,
                type: 'checklist',
                items: []
              })}
              className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium text-slate-500 hover:text-blue-500 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nieuwe module toevoegen
            </button>
          </div>
        )}

        {activeTab === 'streaks' && (
          <div>
            <h3 className={`font-semibold ${t.textSecondary} mb-3`}>Streak-criteria</h3>
            <p className={`text-xs ${t.textMuted} mb-4`}>
              Bepaal per module wanneer een dag meetelt voor je streak.
            </p>

            <div className="space-y-4">
              {modules.filter(m => m.enabled && m.type !== 'tasks').map(mod => {
                const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
                const setting = streakSettings[mod.id] || {};
                
                return (
                  <div key={mod.id} className={`p-3 ${t.cardSecondary} rounded-lg`}>
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className={`w-4 h-4 text-${mod.color}-500`} />
                      <span className={`font-medium text-sm ${t.textSecondary}`}>{mod.name}</span>
                    </div>

                    {mod.type === 'checklist' && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setStreakSettings(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], requireAll: true } }))}
                          className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition ${
                            setting.requireAll !== false ? `bg-${mod.color}-500 text-white` : `${t.card} ${t.textMuted}`
                          }`}
                        >
                          Alle items
                        </button>
                        <button
                          onClick={() => setStreakSettings(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], requireAll: false } }))}
                          className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition ${
                            setting.requireAll === false ? `bg-${mod.color}-500 text-white` : `${t.card} ${t.textMuted}`
                          }`}
                        >
                          Minstens 1
                        </button>
                      </div>
                    )}

                    {mod.type === 'timer' && (
                      <div>
                        <label className={`text-xs ${t.textMuted} mb-2 block`}>Min. minuten per dag</label>
                        <div className="flex gap-1">
                          {[30, 60, 90, 120, 180, 240].map(min => {
                            const current = setting.minutesGoal || mod.dailyGoalMinutes;
                            return (
                              <button
                                key={min}
                                onClick={() => setStreakSettings(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], minutesGoal: min } }))}
                                className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                                  current === min ? `bg-${mod.color}-500 text-white` : `${t.card} ${t.textMuted}`
                                }`}
                              >
                                {min < 60 ? `${min}m` : `${min/60}u`}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {mod.type === 'choice' && (
                      <p className={`text-xs ${t.textMuted}`}>
                        Streak telt zodra je het vakje "voltooid" aanvinkt.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'reflect' && (
          <div>
            <h3 className={`font-semibold ${t.textSecondary} mb-3`}>Reflectievragen</h3>
            <ReflectionSettings
              reflectionQuestions={reflectionQuestions}
              setReflectionQuestions={setReflectionQuestions}
              recurringTasks={recurringTasks}
              setRecurringTasks={setRecurringTasks}
              t={t}
              dayNames={dayNames}
            />
          </div>
        )}

        {activeTab === 'theme' && (
          <div>
            <h3 className={`font-semibold ${t.textSecondary} mb-3`}>Thema</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setDarkMode(false)}
                className={`flex-1 py-3 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                  !darkMode ? 'bg-blue-500 text-white' : `${t.cardSecondary} ${t.textMuted}`
                }`}
              >
                <Sun className="w-4 h-4" /> Licht
              </button>
              <button
                onClick={() => setDarkMode(true)}
                className={`flex-1 py-3 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                  darkMode ? 'bg-blue-500 text-white' : `${t.cardSecondary} ${t.textMuted}`
                }`}
              >
                <Moon className="w-4 h-4" /> Donker
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// =============================================
// MODULE EDITOR
// =============================================
function ModuleEditor({ module: mod, onSave, onCancel, onDelete, t }) {
  const [editing, setEditing] = useState(mod);
  const [newItem, setNewItem] = useState('');

  const update = (key, value) => setEditing(prev => ({ ...prev, [key]: value }));

  const addItem = () => {
    if (newItem.trim()) {
      setEditing(prev => ({
        ...prev,
        items: [...(prev.items || []), { id: `item_${Date.now()}`, label: newItem.trim() }]
      }));
      setNewItem('');
    }
  };

  const removeItem = (id) => {
    setEditing(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== id)
    }));
  };

  const isNew = !mod.name;
  const canSave = editing.name && editing.name.trim();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`${t.card} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto my-4`}>
        <div className="flex items-center justify-between mb-6">
          <h2 className={`text-xl font-bold ${t.text}`}>
            {isNew ? 'Nieuwe module' : 'Bewerk module'}
          </h2>
          <button onClick={onCancel} className={`p-2 ${t.hover} rounded-lg`}>
            <X className={`w-5 h-5 ${t.textSecondary}`} />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>Naam</label>
            <input
              type="text"
              value={editing.name || ''}
              onChange={(e) => update('name', e.target.value)}
              placeholder="Bijv. Meditatie, Lezen, Water drinken..."
              className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
            />
          </div>

          <div>
            <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>Type</label>
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'checklist', label: 'Checklist', desc: 'Lijst met items' },
                { id: 'choice', label: 'Keuze', desc: 'Optie + voltooien' },
                { id: 'timer', label: 'Timer', desc: 'Minuten bijhouden' },
                { id: 'tasks', label: 'Taken', desc: 'Vrije takenlijst' },
              ].map(typ => (
                <button
                  key={typ.id}
                  onClick={() => update('type', typ.id)}
                  className={`p-3 rounded-lg text-left transition ${
                    editing.type === typ.id ? 'bg-blue-500 text-white' : `${t.cardSecondary} ${t.textSecondary}`
                  }`}
                >
                  <div className="font-medium text-sm">{typ.label}</div>
                  <div className={`text-xs ${editing.type === typ.id ? 'text-blue-100' : t.textMuted}`}>
                    {typ.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>Icoon</label>
            <div className="grid grid-cols-8 gap-1">
              {Object.keys(ICON_OPTIONS).map(iconName => {
                const Icon = ICON_OPTIONS[iconName];
                return (
                  <button
                    key={iconName}
                    onClick={() => update('icon', iconName)}
                    className={`aspect-square rounded-lg flex items-center justify-center transition ${
                      editing.icon === iconName ? `bg-${editing.color}-500 text-white` : `${t.cardSecondary} ${t.textMuted}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>Kleur</label>
            <div className="flex gap-2 flex-wrap">
              {COLOR_OPTIONS.map(c => (
                <button
                  key={c}
                  onClick={() => update('color', c)}
                  className={`w-8 h-8 rounded-lg bg-${c}-500 transition ${
                    editing.color === c ? 'ring-2 ring-offset-2 ring-slate-400' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          {editing.type === 'checklist' && (
            <div>
              <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>Items</label>
              <div className="space-y-2 mb-2">
                {(editing.items || []).map(item => (
                  <div key={item.id} className={`flex items-center gap-2 p-2 ${t.cardSecondary} rounded-lg`}>
                    <span className={`flex-1 text-sm ${t.textSecondary}`}>{item.label}</span>
                    <button
                      onClick={() => removeItem(item.id)}
                      className="text-slate-400 hover:text-red-500"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addItem()}
                  placeholder="Nieuw item..."
                  className={`flex-1 px-3 py-2 ${t.input} rounded-lg text-sm`}
                />
                <button onClick={addItem} className={`px-3 py-2 bg-${editing.color}-500 text-white rounded-lg`}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {editing.type === 'timer' && (
            <>
              <div>
                <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                  Dagdoel (minuten)
                </label>
                <input
                  type="number"
                  value={editing.dailyGoalMinutes || 60}
                  onChange={(e) => update('dailyGoalMinutes', parseInt(e.target.value) || 0)}
                  className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                />
              </div>
              <div>
                <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                  Weekmaximum (minuten, optioneel)
                </label>
                <input
                  type="number"
                  value={editing.weeklyMaxMinutes || ''}
                  onChange={(e) => update('weeklyMaxMinutes', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="Geen limiet"
                  className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                />
              </div>
            </>
          )}
        </div>

        <div className="flex gap-2 mt-6">
          {!isNew && (
            <button
              onClick={() => onDelete(editing.id)}
              className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onCancel}
            className={`px-4 py-2 ${t.cardSecondary} ${t.textSecondary} rounded-lg text-sm font-medium transition`}
          >
            Annuleren
          </button>
          <button
            onClick={() => canSave && onSave(editing)}
            disabled={!canSave}
            className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  );
}

// =============================================
// REFLECTION SETTINGS
// =============================================
function ReflectionSettings({ reflectionQuestions, setReflectionQuestions, recurringTasks, setRecurringTasks, t, dayNames }) {
  const [newQuestion, setNewQuestion] = useState('');
  const [newRecurringText, setNewRecurringText] = useState('');
  const [newRecurringDays, setNewRecurringDays] = useState([]);

  const addQuestion = () => {
    if (newQuestion.trim()) {
      setReflectionQuestions(prev => [...prev, newQuestion.trim()]);
      setNewQuestion('');
    }
  };

  const removeQuestion = (i) => {
    setReflectionQuestions(prev => prev.filter((_, idx) => idx !== i));
  };

  const toggleDay = (day) => {
    setNewRecurringDays(prev => 
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const addRecurring = () => {
    if (newRecurringText.trim() && newRecurringDays.length > 0) {
      setRecurringTasks(prev => [...prev, {
        id: Date.now(),
        text: newRecurringText.trim(),
        days: newRecurringDays
      }]);
      setNewRecurringText('');
      setNewRecurringDays([]);
    }
  };

  const removeRecurring = (id) => {
    setRecurringTasks(prev => prev.filter(t => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="space-y-2 mb-3">
          {reflectionQuestions.map((q, i) => (
            <div key={i} className={`flex items-center gap-2 p-2 ${t.cardSecondary} rounded-lg`}>
              <span className={`flex-1 text-sm ${t.textSecondary}`}>{q}</span>
              <button onClick={() => removeQuestion(i)} className="text-slate-400 hover:text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newQuestion}
            onChange={(e) => setNewQuestion(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addQuestion()}
            placeholder="Nieuwe reflectievraag..."
            className={`flex-1 px-3 py-2 ${t.input} rounded-lg text-sm`}
          />
          <button onClick={addQuestion} className="px-3 py-2 bg-blue-500 text-white rounded-lg">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <h4 className={`font-semibold ${t.textSecondary} mb-3 text-sm`}>Wekelijks terugkerende taken</h4>
        <div className="space-y-2 mb-4">
          {recurringTasks.length === 0 ? (
            <p className={`text-sm ${t.textMuted} text-center py-2`}>Nog geen terugkerende taken</p>
          ) : (
            recurringTasks.map(rt => (
              <div key={rt.id} className={`flex items-center gap-2 p-2 ${t.cardSecondary} rounded-lg`}>
                <Repeat className={`w-4 h-4 ${t.textMuted}`} />
                <div className="flex-1">
                  <div className={`text-sm ${t.textSecondary}`}>{rt.text}</div>
                  <div className={`text-xs ${t.textMuted}`}>
                    {rt.days.map(d => dayNames[d]).join(', ')}
                  </div>
                </div>
                <button onClick={() => removeRecurring(rt.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
        
        <div className="space-y-2">
          <input
            type="text"
            value={newRecurringText}
            onChange={(e) => setNewRecurringText(e.target.value)}
            placeholder="Bijv. 'Boodschappen doen'..."
            className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
          />
          <div className="flex gap-1">
            {dayNames.map((day, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                  newRecurringDays.includes(i) ? 'bg-blue-500 text-white' : `${t.cardSecondary} ${t.textMuted}`
                }`}
              >
                {day}
              </button>
            ))}
          </div>
          <button
            onClick={addRecurring}
            disabled={!newRecurringText.trim() || newRecurringDays.length === 0}
            className="w-full py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition"
          >
            Taak toevoegen
          </button>
        </div>
      </div>
    </div>
  );
}