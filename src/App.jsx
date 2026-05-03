import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Check, Sun, Moon, Activity, Briefcase, Footprints, Plus, Trash2, TrendingUp, Calendar, AlertCircle, Sparkles, Flame, Settings, BookOpen, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Repeat, Trophy, GripVertical, Heart, Coffee, Book, Music, Dumbbell, Zap, Smile, Brain, Cloud, Star, Target, Edit3, Eye, EyeOff, GraduationCap, Clock, GlassWater, Droplet, HelpCircle, ArrowUpDown, SlidersHorizontal, MoreHorizontal,
  AlarmClock, BadgeEuro, BedDouble, BrushCleaning, Castle, CookingPot, Drill, Fuel, Hospital, Panda, Plane, Rabbit, ShoppingCart, Toilet, TrainFront, WashingMachine, UtensilsCrossed
} from 'lucide-react';
import './storage';
import ProjectsModule from './modules/ProjectsModule';
import CounterModule from './modules/CounterModule';
import SleepModule from './modules/SleepModule';
import CollectionModule from './modules/CollectionModule';
import ProjectsView from './views/ProjectsView';
import CollectionsView from './views/CollectionsView';
import HouseholdView from './views/HouseholdView';
import DayNavigator from './components/DayNavigator';
import ReadOnlyBanner from './components/ReadOnlyBanner';
import SplashScreen from './components/SplashScreen';
import RitmoLogo from './components/RitmoLogo';
import HelpOverlay from './components/help/HelpOverlay';
import InstallGuide from './components/help/InstallGuide';
import FeedbackForm from './components/help/FeedbackForm';
import ChecklistModule from './modules/ChecklistModule';
import { migrateModuleConfig, migrateDayModuleData } from './utils/migrate';
import { createItem, logEvent, removeEvent, createTag } from './utils/collections';
import { formatAmount, formatDuration } from './utils/format';
import { MODULE_PRESETS } from './utils/presets';
import {
  fmtDateKey, parseDateKey, addDays, sameDay, startOfWeek,
  isEditable, isFuture, isToday as isTodayDate,
  formatDayTitle, formatDaySubtitle, formatWeekTitle, formatWeekRange,
  DAYS_NL, WEEKDAY_KEYS,
} from './utils/dates';
import { summarizeSleep } from './utils/sleep';
import {
  buildDayCellBackground, moduleStatusForDay, isDayFullyComplete,
  normalizeChecklistItemData, isChecklistItemComplete,
} from './utils/dayProgress';
import { playSound } from './utils/sound';

// Available icons for modules
const ICON_OPTIONS = {
  Sun, Moon, Activity, Briefcase, Footprints, Sparkles, Heart, Coffee, Book, Music, Dumbbell, Zap, Smile, Brain, Cloud, Star, Target, Check, BookOpen, GraduationCap, GlassWater, Droplet,
  Panda, Rabbit, Castle,
  Hospital, AlarmClock, BedDouble,
  WashingMachine, CookingPot, BrushCleaning, Toilet,
  Drill, BadgeEuro, ShoppingCart,
  Plane, TrainFront, Fuel,
  UtensilsCrossed,
};

const COLOR_OPTIONS = ['red', 'orange', 'amber', 'yellow', 'green', 'teal', 'cyan', 'blue', 'indigo', 'purple', 'pink'];

// Default modules for first-time users
const DEFAULT_MODULES = [
  {
    id: 'morning',
    name: 'Ochtendroutine',
    icon: 'Sun',
    color: 'amber',
    enabled: true,
    countInStreak: true,
    type: 'checklist',
    items: []
  },
  {
    id: 'physio',
    name: 'Fysio-oefeningen',
    icon: 'Activity',
    color: 'purple',
    enabled: true,
    countInStreak: true,
    type: 'checklist',
    items: []
  },
  {
    id: 'walk',
    name: 'Beweging buiten',
    icon: 'Footprints',
    color: 'green',
    enabled: true,
    countInStreak: true,
    type: 'choice',
    options: []
  },
  {
    id: 'evening',
    name: 'Avondroutine',
    icon: 'Moon',
    color: 'indigo',
    enabled: true,
    countInStreak: true,
    type: 'checklist',
    items: []
  },
  {
    id: 'work',
    name: 'Productief werk',
    icon: 'Briefcase',
    color: 'blue',
    enabled: true,
    countInStreak: false,
    type: 'counter',
    unit: 'minutes',
    dailyGoal: 120,
    weeklyMax: 360,
    presets: [],
    categoriesEnabled: false,
    categories: [],
    dailyGoalMinutes: 120,
    weeklyMaxMinutes: 360,
  },
  {
    id: 'tasks',
    name: 'Eigen taken',
    icon: 'Check',
    color: 'pink',
    enabled: true,
    countInStreak: false,
    type: 'tasks',
  }
];

const PROJECTS_MODULE_TEMPLATE = {
  id: 'projects',
  name: 'Projecten',
  icon: 'GraduationCap',
  color: 'cyan',
  enabled: true,
  countInStreak: false,
  type: 'projects',
  subjects: []
};

export default function Ritmo() {
  const [view, setView] = useState('today');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [activeDate, setActiveDate] = useState(new Date());
  const [activeWeekStart, setActiveWeekStart] = useState(() => startOfWeek(new Date()));
  const todayKey = fmtDateKey(new Date());
  const activeDateKey = fmtDateKey(activeDate);
  const today = todayKey;
  const editable = isEditable(activeDate);
  const skipNextSaveRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [editingModule, setEditingModule] = useState(null);
  const [hasOnboarded, setHasOnboarded] = useState(true);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreMenuRef = useRef(null);
  
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
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(80);
  const [goldenBorderEnabled, setGoldenBorderEnabled] = useState(true);
  const [showReflectionOnToday, setShowReflectionOnToday] = useState(true);
  const [confetti, setConfetti] = useState([]);
  const [celebrationMsg, setCelebrationMsg] = useState(null);
  const [calendarMonth, setCalendarMonth] = useState(new Date());

  const previousCompletionRef = useRef(null);
  const prevModuleStatusRef = useRef({});

  useEffect(() => {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  useEffect(() => {
    if (!moreOpen) return;
    const handler = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [moreOpen]);

  // Load all data
  useEffect(() => {
    async function loadData() {
      let loadedModules = null;

      try {
        const settingsResult = await window.storage.get('settings');
        if (settingsResult?.value) {
          const settings = JSON.parse(settingsResult.value);
          if (settings.modules) {
            loadedModules = settings.modules.map(migrateModuleConfig);
          }
          if (settings.darkMode !== undefined) setDarkMode(settings.darkMode);
          if (settings.reflectionQuestions) setReflectionQuestions(settings.reflectionQuestions);
          if (settings.recurringTasks) setRecurringTasks(settings.recurringTasks);
          if (settings.streakSettings) setStreakSettings(settings.streakSettings);
          if (settings.soundEnabled !== undefined) setSoundEnabled(settings.soundEnabled);
          if (settings.soundVolume !== undefined) setSoundVolume(settings.soundVolume);
          if (settings.goldenBorderEnabled !== undefined) setGoldenBorderEnabled(settings.goldenBorderEnabled);
          if (settings.showReflectionOnToday !== undefined) setShowReflectionOnToday(settings.showReflectionOnToday);
          if (loadedModules) setModules(loadedModules);
          if (settings.hasOnboarded !== undefined) setHasOnboarded(settings.hasOnboarded);
        } else {
          setHasOnboarded(false);
        }
      } catch {
        setHasOnboarded(false);
      }

      const migrateDayData = (raw) => {
        if (!raw?.moduleData || !loadedModules) return raw;
        const migrated = {};
        for (const [id, md] of Object.entries(raw.moduleData)) {
          const cfg = loadedModules.find(m => m.id === id);
          migrated[id] = migrateDayModuleData(md, cfg);
        }
        return { ...raw, moduleData: migrated };
      };

      try {
        const result = await window.storage.get(`day:${todayKey}`);
        if (result?.value) {
          const data = migrateDayData(JSON.parse(result.value));
          setModuleData(data.moduleData || {});
          setCustomTasks(data.customTasks || []);
          setReflectionAnswers(data.reflectionAnswers || {});
          // First state load comes from storage directly; suppress the
          // first save that would otherwise round-trip the same data back.
          skipNextSaveRef.current = true;
        }
      } catch (e) {}

      try {
        const keys = await window.storage.list('day:');
        if (keys?.keys) {
          const allHistory = {};
          for (const key of keys.keys) {
            try {
              const r = await window.storage.get(key);
              if (r?.value) {
                const date = key.replace('day:', '');
                allHistory[date] = migrateDayData(JSON.parse(r.value));
              }
            } catch {}
          }
          setHistory(allHistory);
        }
      } catch {}

      setLoading(false);
    }
    loadData();
    // One-shot on mount; activeDate changes are handled by a separate effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When the active date changes, swap in that day's data from history.
  // Suppresses the immediately-following save effect to avoid writing the
  // previous day's state to the new day's storage key.
  useEffect(() => {
    if (loading) return;
    const data = history[activeDateKey] || {};
    skipNextSaveRef.current = true;
    setModuleData(data.moduleData || {});
    setCustomTasks(data.customTasks || []);
    setReflectionAnswers(data.reflectionAnswers || {});
    prevModuleStatusRef.current = {};
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeDateKey, loading]);

  // Save day data
  useEffect(() => {
    if (loading) return;
    if (!editable) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    const saveData = async () => {
      try {
        const dayData = {
          moduleData,
          customTasks,
          reflectionAnswers,
        };
        await window.storage.set(`day:${activeDateKey}`, JSON.stringify(dayData));
        setHistory(prev => ({ ...prev, [activeDateKey]: dayData }));
      } catch (e) {
        console.error('Save failed', e);
      }
    };
    saveData();
  }, [moduleData, customTasks, reflectionAnswers, loading, activeDateKey, editable]);

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
          soundEnabled,
          soundVolume,
          goldenBorderEnabled,
          showReflectionOnToday,
          modules,
          hasOnboarded,
        }));
      } catch {}
    };
    saveSettings();
  }, [darkMode, reflectionQuestions, recurringTasks, streakSettings, soundEnabled, soundVolume, goldenBorderEnabled, showReflectionOnToday, modules, hasOnboarded, loading]);

  // Recurring tasks. Only inject into today's task list, never into a
  // historical day the user is just viewing.
  useEffect(() => {
    if (loading) return;
    if (activeDateKey !== todayKey) return;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, recurringTasks, activeDateKey, todayKey]);

  const sfx = useCallback((name) => {
    playSound(name, { enabled: soundEnabled, volume: soundVolume });
  }, [soundEnabled, soundVolume]);

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
    const enabledModules = modules.filter(m => m.enabled && m.type !== 'tasks' && m.type !== 'projects' && m.type !== 'collection');
    const totalItems = enabledModules.reduce((sum, m) => {
      if (m.type === 'checklist') return sum + m.items.length;
      if (m.type === 'choice') return sum + 1;
      if (m.type === 'counter') return sum + 1;
      return sum;
    }, 0);
    
    const completed = enabledModules.reduce((sum, m) => {
      const data = moduleData[m.id] || {};
      if (m.type === 'checklist') {
        return sum + m.items.filter(i => isChecklistItemComplete(i, data[i.id])).length;
      }
      if (m.type === 'choice') {
        return sum + (data.completed ? 1 : 0);
      }
      if (m.type === 'counter') {
        const goal = m.dailyGoal ?? m.dailyGoalMinutes ?? 0;
        const tot = data.total ?? data.minutes ?? 0;
        return sum + (goal > 0 && tot >= goal ? 1 : 0);
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

  useEffect(() => {
    if (loading) return;
    const dayData = { moduleData };
    modules.forEach(mod => {
      if (!mod.enabled) return;
      if (mod.type === 'tasks' || mod.type === 'projects') return;
      const newStatus = moduleStatusForDay(mod, dayData, activeDate);
      const prevStatus = prevModuleStatusRef.current[mod.id];
      if (prevStatus !== undefined && prevStatus !== 'full' && newStatus === 'full') {
        setTimeout(() => sfx('chime'), 80);
      }
      prevModuleStatusRef.current[mod.id] = newStatus;
    });
  }, [moduleData, modules, loading, sfx, activeDate]);

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
    const mod = modules.find(m => m.id === moduleId);
    const item = mod?.items?.find(i => i.id === itemId);
    const wasComplete = isChecklistItemComplete(item || { id: itemId }, moduleData[moduleId]?.[itemId]);
    updateModuleData(moduleId, prev => {
      const data = normalizeChecklistItemData(prev[itemId]);
      return { ...prev, [itemId]: { ...data, checked: !data.checked } };
    });
    if (!wasComplete) sfx('tick');
  };

  const incrementChecklistProgress = (moduleId, itemId, delta) => {
    const mod = modules.find(m => m.id === moduleId);
    const item = mod?.items?.find(i => i.id === itemId);
    const wasComplete = isChecklistItemComplete(item || { id: itemId }, moduleData[moduleId]?.[itemId]);
    let nowComplete = wasComplete;
    updateModuleData(moduleId, prev => {
      const data = normalizeChecklistItemData(prev[itemId]);
      const next = Math.max(0, (data.progress || 0) + delta);
      const merged = { ...data, progress: next };
      nowComplete = item?.target ? next >= item.target : !!data.checked;
      return { ...prev, [itemId]: merged };
    });
    if (!wasComplete && nowComplete) sfx('tick');
  };

  const setChecklistItemNote = (moduleId, itemId, note) => {
    updateModuleData(moduleId, prev => {
      const data = normalizeChecklistItemData(prev[itemId]);
      return { ...prev, [itemId]: { ...data, note } };
    });
  };

  const toggleChoice = (moduleId) => {
    const willBeCompleted = !moduleData[moduleId]?.completed;
    updateModuleData(moduleId, prev => ({
      ...prev,
      completed: !prev.completed
    }));
    if (willBeCompleted) sfx('pop');
  };

  const setChoiceOption = (moduleId, optionId) => {
    const prev = moduleData[moduleId] || {};
    const willDeselect = prev.selectedOption === optionId && prev.completed;
    updateModuleData(moduleId, p => {
      if (p.selectedOption === optionId && p.completed) {
        return { ...p, completed: false, selectedOption: null };
      }
      return { ...p, selectedOption: optionId, completed: true };
    });
    if (!willDeselect) sfx('pop');
  };

  const incrementCounter = (moduleId, amount) => {
    const mod = modules.find(m => m.id === moduleId);
    const currentTotal = moduleData[moduleId]?.total ?? moduleData[moduleId]?.minutes ?? 0;
    const newTotal = currentTotal + amount;
    const goal = mod?.dailyGoal ?? mod?.dailyGoalMinutes ?? 0;

    updateModuleData(moduleId, prev => ({
      ...prev,
      total: newTotal,
      minutes: newTotal,
    }));

    sfx('tick');

    if (mod && goal > 0 && currentTotal < goal && newTotal >= goal) {
      triggerCelebration(`💪 ${mod.name} doel gehaald!`);
    }
  };

  const resetCounter = (moduleId) => {
    updateModuleData(moduleId, prev => ({
      ...prev,
      total: 0,
      minutes: 0,
      entries: [],
    }));
  };

  const addCounterEntry = (moduleId, amount, category) => {
    if (!amount || amount <= 0) return;
    const mod = modules.find(m => m.id === moduleId);
    const goal = mod?.dailyGoal ?? 0;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const entry = {
      id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      amount,
      category: category ?? null,
      time,
    };

    let crossedGoal = false;
    updateModuleData(moduleId, prev => {
      const prevTotal = prev.total ?? prev.minutes ?? 0;
      const newTotal = prevTotal + amount;
      if (goal > 0 && prevTotal < goal && newTotal >= goal) crossedGoal = true;
      return {
        ...prev,
        total: newTotal,
        minutes: newTotal,
        entries: [...(prev.entries || []), entry],
      };
    });

    sfx('tick');

    if (crossedGoal && mod) {
      triggerCelebration(`💪 ${mod.name} doel gehaald!`);
    }
  };

  const removeCounterEntry = (moduleId, entryId) => {
    updateModuleData(moduleId, prev => {
      const entries = prev.entries || [];
      const entry = entries.find(e => e.id === entryId);
      if (!entry) return prev;
      const newTotal = Math.max(0, (prev.total ?? 0) - entry.amount);
      return {
        ...prev,
        total: newTotal,
        minutes: newTotal,
        entries: entries.filter(e => e.id !== entryId),
      };
    });
  };

  const dismissCounterReminder = (moduleId) => {
    updateModuleData(moduleId, prev => ({
      ...prev,
      reminderShownDate: todayKey,
    }));
  };

  // ---- collection handlers ----------------------------------------------

  const updateCollectionModule = (moduleId, mutator) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId || m.type !== 'collection') return m;
      return mutator(m);
    }));
  };

  const addCollectionItem = (moduleId, name) => {
    const trimmed = (name || '').trim();
    if (!trimmed) return;
    const newItem = logEvent(createItem(trimmed));
    updateCollectionModule(moduleId, (m) => ({
      ...m,
      items: [...(m.items || []), newItem],
    }));
  };

  const updateCollectionItem = (moduleId, item) => {
    updateCollectionModule(moduleId, (m) => ({
      ...m,
      items: (m.items || []).map((it) => (it.id === item.id ? item : it)),
    }));
  };

  const deleteCollectionItem = (moduleId, itemId) => {
    updateCollectionModule(moduleId, (m) => ({
      ...m,
      items: (m.items || []).filter((it) => it.id !== itemId),
    }));
  };

  const logCollectionEvent = (moduleId, itemId, eventData) => {
    updateCollectionModule(moduleId, (m) => ({
      ...m,
      items: (m.items || []).map((it) =>
        it.id === itemId ? logEvent(it, eventData || {}) : it
      ),
    }));
  };

  const removeCollectionEvent = (moduleId, itemId, eventIndex) => {
    updateCollectionModule(moduleId, (m) => ({
      ...m,
      items: (m.items || []).map((it) =>
        it.id === itemId ? removeEvent(it, eventIndex) : it
      ),
    }));
  };

  const openModuleEditor = (type) => {
    setEditingModule({
      id: `mod_${Date.now()}`,
      name: '',
      icon: type === 'projects' ? 'GraduationCap' : 'Star',
      color: 'blue',
      enabled: true,
      countInStreak: false,
      type,
      ...(type === 'projects' ? { subjects: [] } : {}),
      ...(type === 'collection' ? {
        trackingMode: 'completion',
        itemFields: { rating: true, notes: true, tags: true },
        tags: [],
        items: [],
      } : {}),
    });
  };

  const addCollectionTag = (moduleId, label, color = 'blue') => {
    const trimmed = (label || '').trim();
    if (!trimmed) return;
    updateCollectionModule(moduleId, (m) => ({
      ...m,
      tags: [...(m.tags || []), createTag(trimmed, color)],
    }));
  };

  const updateCollectionTag = (moduleId, tag) => {
    updateCollectionModule(moduleId, (m) => ({
      ...m,
      tags: (m.tags || []).map((tg) => (tg.id === tag.id ? tag : tg)),
    }));
  };

  const deleteCollectionTag = (moduleId, tagId) => {
    updateCollectionModule(moduleId, (m) => ({
      ...m,
      tags: (m.tags || []).filter((tg) => tg.id !== tagId),
      items: (m.items || []).map((it) => ({
        ...it,
        tags: (it.tags || []).filter((id) => id !== tagId),
      })),
    }));
  };

  const addTask = () => {
    if (newTask.trim()) {
      setCustomTasks(prev => [...prev, { id: Date.now(), text: newTask.trim(), done: false }]);
      setNewTask('');
    }
  };

  const toggleTask = (id) => {
    const task = customTasks.find(t => t.id === id);
    const willBeDone = task && !task.done;
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, done: !t.done } : t));
    if (willBeDone) sfx('tick');
  };

  const deleteTask = (id) => {
    setCustomTasks(prev => prev.filter(t => t.id !== id));
  };

  // Streak calculation. moduleData is the source of truth for the active
  // date; for any other day, fall back to history (which is updated on save).
  const calculateStreak = (checkFn) => {
    let streak = 0;
    let d = new Date();
    while (true) {
      const dateStr = fmtDateKey(d);
      const dayData = dateStr === activeDateKey
        ? { moduleData }
        : history[dateStr];

      if (!dayData) break;
      if (!checkFn(dayData)) break;
      streak++;
      d = addDays(d, -1);
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
          return mod.items.every(i => isChecklistItemComplete(i, data[i.id]));
        }
        return mod.items.some(i => isChecklistItemComplete(i, data[i.id]));
      });
    }
    
    if (mod.type === 'choice') {
      return calculateStreak(d => d.moduleData?.[mod.id]?.completed);
    }
    
    if (mod.type === 'counter') {
      const goal = setting.minutesGoal ?? mod.dailyGoal ?? mod.dailyGoalMinutes ?? 0;
      return calculateStreak(d => {
        const md = d.moduleData?.[mod.id];
        const tot = md?.total ?? md?.minutes ?? 0;
        return goal > 0 && tot >= goal;
      });
    }

    if (mod.type === 'projects') {
      return calculateStreak(d => d.moduleData?.[mod.id]?.touchedToday === true);
    }

    return 0;
  };

  // Current calendar week (used by Today-side widgets like CounterModule's
  // "deze week" totals — those should always reflect the real current week,
  // never the user's nav position in WeekView).
  const currentWeekDates = Array.from({ length: 7 }, (_, i) => {
    return fmtDateKey(addDays(startOfWeek(new Date()), i));
  });
  // Week shown in WeekView, follows the week-nav arrows.
  const activeWeekDates = Array.from({ length: 7 }, (_, i) => {
    return fmtDateKey(addDays(activeWeekStart, i));
  });
  const weekDates = currentWeekDates;

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
  const enabledNonTaskModules = modules.filter(m => m.enabled && m.type !== 'tasks' && m.type !== 'projects' && m.type !== 'collection');
  const totalCompletionItems = enabledNonTaskModules.reduce((sum, m) => {
    if (m.type === 'checklist') return sum + m.items.length;
    if (m.type === 'choice') return sum + 1;
    if (m.type === 'counter') return sum + 1;
    return sum;
  }, 0);
  const completedItems = enabledNonTaskModules.reduce((sum, m) => {
    const data = moduleData[m.id] || {};
    if (m.type === 'checklist') return sum + m.items.filter(i => isChecklistItemComplete(i, data[i.id])).length;
    if (m.type === 'choice') return sum + (data.completed ? 1 : 0);
    if (m.type === 'counter') {
      const goal = m.dailyGoal ?? m.dailyGoalMinutes ?? 0;
      const tot = data.total ?? data.minutes ?? 0;
      return sum + (goal > 0 && tot >= goal ? 1 : 0);
    }
    return sum;
  }, 0);
  const overallPercentage = totalCompletionItems > 0 ? (completedItems / totalCompletionItems) * 100 : 0;
  const todayFullyComplete = isDayFullyComplete(modules, { moduleData }, activeDate);

  if (!splashDone) {
    return (
      <SplashScreen
        ready={!loading}
        onDone={() => setSplashDone(true)}
        darkMode={darkMode}
      />
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

        {(() => {
          const allTabs = [
            { id: 'today', label: 'Vandaag', always: true },
            { id: 'week', label: 'Week', always: true },
            { id: 'month', label: 'Maand', always: true },
            { id: 'household', label: 'Huishouden', always: true },
            {
              id: 'projects',
              label: 'Projecten',
              emptyAddable: true,
              visible: modules.some(m => m.enabled && m.type === 'projects'),
            },
            {
              id: 'collections',
              label: 'Collecties',
              emptyAddable: true,
              visible: modules.some(m => m.enabled && m.type === 'collection'),
            },
            { id: 'reflection', label: 'Reflectie', always: true },
          ];
          const visibleTabs = allTabs.filter(tab => tab.always || tab.visible);
          const MAX_VISIBLE = 5;
          const overflows = visibleTabs.length > MAX_VISIBLE;
          const inBar = overflows ? visibleTabs.slice(0, MAX_VISIBLE - 1) : visibleTabs;
          const inOverflow = overflows ? visibleTabs.slice(MAX_VISIBLE - 1) : [];
          const discoverable = allTabs.filter(tab => !tab.always && !tab.visible && tab.emptyAddable);
          const showMore = inOverflow.length > 0 || discoverable.length > 0;
          const activeInOverflow = inOverflow.some(tab => tab.id === view);

          const tabBtnClass = (active) =>
            `flex-1 py-2 px-2 rounded-lg text-xs sm:text-sm font-medium transition ${
              active ? 'bg-blue-500 text-white shadow' : `${t.textMuted} ${t.hover}`
            }`;

          return (
            <div className="relative mb-6" ref={moreMenuRef}>
              <div className={`flex gap-1 ${t.card} rounded-xl p-1 shadow-sm`}>
                {inBar.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => { setView(tab.id); setMoreOpen(false); }}
                    className={tabBtnClass(view === tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
                {showMore && (
                  <button
                    onClick={() => setMoreOpen(o => !o)}
                    className={tabBtnClass(activeInOverflow)}
                    aria-label="Meer tabs"
                    aria-expanded={moreOpen}
                  >
                    <span className="inline-flex items-center justify-center gap-1">
                      <MoreHorizontal className="w-4 h-4" />
                      <span>Meer</span>
                    </span>
                  </button>
                )}
              </div>
              {showMore && moreOpen && (
                <div
                  className={`absolute right-0 mt-2 z-30 ${t.card} rounded-xl shadow-lg border ${t.border} overflow-hidden min-w-[12rem]`}
                >
                  {inOverflow.length > 0 && (
                    <ul className="py-1">
                      {inOverflow.map(tab => (
                        <li key={tab.id}>
                          <button
                            onClick={() => { setView(tab.id); setMoreOpen(false); }}
                            className={`w-full text-left px-3 py-2 text-sm ${
                              view === tab.id ? `${t.text} font-semibold` : t.textSecondary
                            } ${t.hover}`}
                          >
                            {tab.label}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {discoverable.length > 0 && (
                    <div className={`${inOverflow.length > 0 ? `border-t ${t.border}` : ''}`}>
                      <div className={`px-3 pt-2 pb-1 text-[11px] uppercase tracking-wide ${t.textMuted}`}>
                        Nog niet aangemaakt
                      </div>
                      <ul className="pb-1">
                        {discoverable.map(tab => (
                          <li key={tab.id}>
                            <button
                              onClick={() => { setView(tab.id); setMoreOpen(false); }}
                              className={`w-full flex items-center justify-between px-3 py-2 text-sm ${t.textSecondary} ${t.hover}`}
                            >
                              <span>{tab.label}</span>
                              <Plus className={`w-4 h-4 ${t.textMuted}`} />
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })()}

        {view === 'today' && (
          <div className={`slide-in ${(goldenBorderEnabled && todayFullyComplete) ? 'ritmo-golden-border rounded-2xl' : ''}`}>
            <DayNavigator
              currentDate={activeDate}
              onChange={(d) => setActiveDate(d)}
              title={formatDayTitle(activeDate)}
              subtitle={formatDaySubtitle(activeDate)}
              t={t}
            />
            {!editable && <ReadOnlyBanner t={t} />}
            {/* Streaks - only for modules waar gebruiker streaks voor wil bijhouden (max 4) */}
            {editable && enabledModules.filter(m => m.countInStreak === true).length > 0 && (
              <div className={`${t.card} rounded-2xl p-4 shadow-sm mb-4`}>
                <div className="flex items-center gap-2 mb-3">
                  <Flame className="w-4 h-4 text-orange-500" />
                  <h2 className={`font-semibold ${t.textSecondary} text-sm`}>Streaks</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {enabledModules.filter(m => m.countInStreak === true).slice(0, 4).map(mod => (
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

            {/* Render each enabled module. On read-only days, hide modules
                that had no activity that day (no point showing an empty
                checklist for a day the user can't interact with). */}
            {(() => {
              const visibleModules = editable
                ? enabledModules
                : enabledModules.filter(m => moduleStatusForDay(m, { moduleData }, activeDate) !== 'none');
              if (!editable && visibleModules.length === 0) {
                return (
                  <div className={`${t.card} rounded-2xl p-8 shadow-sm text-center mb-4`}>
                    <div className={`text-2xl mb-2 ${t.textMuted}`}>○</div>
                    <p className={`text-sm ${t.textMuted}`}>Geen activiteit op deze dag</p>
                  </div>
                );
              }
              return visibleModules.map(mod => {
                if (mod.type === 'projects') {
                  return (
                    <ProjectsModule
                      key={mod.id}
                      module={mod}
                      Icon={ICON_OPTIONS[mod.icon] || Sparkles}
                      onOpen={(id) => { setSelectedProjectId(id); setView('projects'); }}
                      onEdit={() => setEditingModule(mod)}
                      t={t}
                    />
                  );
                }
                if (mod.type === 'counter') {
                  return (
                    <CounterModule
                      key={mod.id}
                      module={mod}
                      Icon={ICON_OPTIONS[mod.icon] || Sparkles}
                      data={moduleData[mod.id] || {}}
                      weekDates={weekDates}
                      history={history}
                      today={todayKey}
                      editable={editable}
                      onIncrementCounter={(amount) => incrementCounter(mod.id, amount)}
                      onResetCounter={() => resetCounter(mod.id)}
                      onAddEntry={(amount, category) => addCounterEntry(mod.id, amount, category)}
                      onRemoveEntry={(entryId) => removeCounterEntry(mod.id, entryId)}
                      onDismissReminder={() => dismissCounterReminder(mod.id)}
                      onEdit={() => setEditingModule(mod)}
                      t={t}
                      darkMode={darkMode}
                    />
                  );
                }
                if (mod.type === 'sleep') {
                  return (
                    <SleepModule
                      key={mod.id}
                      module={mod}
                      Icon={ICON_OPTIONS[mod.icon] || BedDouble}
                      data={moduleData[mod.id] || {}}
                      editable={editable}
                      date={parseDateKey(activeDateKey)}
                      onUpdate={(updater) => updateModuleData(mod.id, updater)}
                      onEdit={() => setEditingModule(mod)}
                      t={t}
                      darkMode={darkMode}
                    />
                  );
                }
                if (mod.type === 'collection') {
                  return (
                    <CollectionModule
                      key={mod.id}
                      module={mod}
                      Icon={ICON_OPTIONS[mod.icon] || Sparkles}
                      editable={editable}
                      onAddItem={(name) => addCollectionItem(mod.id, name)}
                      onLogEvent={(itemId, eventData) => logCollectionEvent(mod.id, itemId, eventData)}
                      onOpenView={() => { setSelectedCollectionId(mod.id); setView('collections'); }}
                      onEdit={() => setEditingModule(mod)}
                      t={t}
                      darkMode={darkMode}
                    />
                  );
                }
                return (
                  <ModuleRenderer
                    key={mod.id}
                    module={mod}
                    data={moduleData[mod.id] || {}}
                    editable={editable}
                    onChecklistToggle={(itemId) => toggleChecklistItem(mod.id, itemId)}
                    onChecklistIncrement={(itemId, delta) => incrementChecklistProgress(mod.id, itemId, delta)}
                    onChecklistNote={(itemId, note) => setChecklistItemNote(mod.id, itemId, note)}
                    onChoiceToggle={() => toggleChoice(mod.id)}
                    onChoiceOptionSet={(optId) => setChoiceOption(mod.id, optId)}
                    onEdit={() => setEditingModule(mod)}
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
                );
              });
            })()}

            {editable && enabledModules.length === 0 && (
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

            {/* Quick reflection. On read-only days, only show if there was
                actually a reflection written. */}
            {showReflectionOnToday && (() => {
              const firstQ = reflectionQuestions[0];
              const hasAnswer = !!firstQ && !!reflectionAnswers[firstQ];
              if (!editable && !hasAnswer) return null;
              return (
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
                      Volledig bekijken
                    </button>
                  </div>
                  {firstQ && (
                    <div>
                      <label className={`text-xs ${t.textMuted} mb-1 block`}>{firstQ}</label>
                      <textarea
                        value={reflectionAnswers[firstQ] || ''}
                        onChange={(e) => setReflectionAnswers(prev => ({ ...prev, [firstQ]: e.target.value }))}
                        disabled={!editable}
                        placeholder={editable ? 'Schrijf hier...' : ''}
                        className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm h-16 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:opacity-70 disabled:cursor-not-allowed`}
                      />
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        )}

        {view === 'week' && (
          <WeekView
            modules={modules}
            history={history}
            today={todayKey}
            activeDateKey={activeDateKey}
            moduleData={moduleData}
            activeWeekStart={activeWeekStart}
            setActiveWeekStart={setActiveWeekStart}
            weekDates={activeWeekDates}
            dayNames={dayNames}
            onPickDay={(date) => { setActiveDate(date); setView('today'); }}
            t={t}
            darkMode={darkMode}
            goldenBorderEnabled={goldenBorderEnabled}
          />
        )}

        {view === 'projects' && (
          <ProjectsView
            modules={modules}
            setModules={setModules}
            iconOptions={ICON_OPTIONS}
            selectedProjectId={selectedProjectId}
            setSelectedProjectId={setSelectedProjectId}
            markTouchedToday={(moduleId) => updateModuleData(moduleId, prev => ({ ...prev, touchedToday: true }))}
            onCreate={() => openModuleEditor('projects')}
            t={t}
          />
        )}

        {view === 'collections' && (
          <CollectionsView
            modules={modules}
            iconOptions={ICON_OPTIONS}
            initialFilterModuleId={selectedCollectionId}
            editable={editable}
            onAddItem={addCollectionItem}
            onUpdateItem={updateCollectionItem}
            onDeleteItem={deleteCollectionItem}
            onLogEvent={logCollectionEvent}
            onRemoveEvent={removeCollectionEvent}
            onCreate={() => openModuleEditor('collection')}
            t={t}
          />
        )}

        {view === 'month' && (
          <MonthView
            calendarMonth={calendarMonth}
            setCalendarMonth={setCalendarMonth}
            history={history}
            today={todayKey}
            activeDateKey={activeDateKey}
            moduleData={moduleData}
            modules={modules}
            onPickDay={(date) => { setActiveDate(date); setView('today'); }}
            t={t}
            darkMode={darkMode}
            monthNames={monthNames}
            dayNames={dayNames}
            goldenBorderEnabled={goldenBorderEnabled}
          />
        )}

        {view === 'household' && (
          <HouseholdView t={t} darkMode={darkMode} />
        )}

        {view === 'reflection' && (
          <ReflectionView
            reflectionQuestions={reflectionQuestions}
            reflectionAnswers={reflectionAnswers}
            setReflectionAnswers={setReflectionAnswers}
            history={history}
            today={todayKey}
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
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          soundVolume={soundVolume}
          setSoundVolume={setSoundVolume}
          goldenBorderEnabled={goldenBorderEnabled}
          setGoldenBorderEnabled={setGoldenBorderEnabled}
          showReflectionOnToday={showReflectionOnToday}
          setShowReflectionOnToday={setShowReflectionOnToday}
          t={t}
          dayNames={dayNames}
          setEditingModule={setEditingModule}
        />
      )}

      {editingModule && (
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
    DEFAULT_MODULES.reduce((acc, m) => ({ ...acc, [m.id]: false }), {})
  );
  const [projectsEnabled, setProjectsEnabled] = useState(false);

  const moduleCount = Object.values(selectedDefaults).filter(Boolean).length;
  const canProceed = moduleCount >= 1;

  const finish = () => {
    const finalModules = DEFAULT_MODULES.map(m => ({
      ...m,
      enabled: selectedDefaults[m.id] === true
    }));
    if (projectsEnabled) {
      finalModules.push({ ...PROJECTS_MODULE_TEMPLATE, enabled: true });
    }
    onComplete(finalModules);
  };

  return (
    <div className={`min-h-screen ${t.bg} p-4 flex items-center justify-center`}>
      <div className={`${t.card} rounded-2xl p-6 shadow-lg max-w-lg w-full`}>
        {step === 0 && (
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <RitmoLogo
                size={96}
                variant={darkMode ? 'light' : 'dark'}
                animated="splash"
              />
            </div>
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
              Selecteer welke onderdelen je wilt gebruiken. Vink aan wat bij je past. Je kunt dit later altijd uitbreiden.
            </p>
            <div className="space-y-2 mb-4">
              {DEFAULT_MODULES.map(m => {
                const Icon = ICON_OPTIONS[m.icon] || Sparkles;
                const enabled = selectedDefaults[m.id] === true;
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
                        {m.type === 'counter' && 'Aantal bijhouden'}
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
            {!canProceed && (
              <p className="text-xs text-rose-500 mb-3 text-center">
                Activeer minstens één module om verder te gaan.
              </p>
            )}
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
                onClick={() => setStep(2)}
                disabled={!canProceed}
                className={`flex-1 py-3 rounded-xl font-medium transition ${
                  canProceed
                    ? 'bg-blue-500 hover:bg-blue-600 text-white'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                Volgende
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className={`p-2 rounded-xl bg-cyan-100 ${darkMode ? 'bg-opacity-20' : ''}`}>
                <GraduationCap className="w-6 h-6 text-cyan-500" />
              </div>
              <h2 className={`text-2xl font-bold ${t.text}`}>Projecten</h2>
            </div>
            <p className={`${t.textMuted} mb-3 text-sm`}>
              Met projecten houd je grotere doelen bij. Denk aan studievakken, werkprojecten of leertrajecten.
              Per project maak je <span className={t.textSecondary}>onderwerpen</span> aan met
              <span className={t.textSecondary}> subdoelen</span>, optionele <span className={t.textSecondary}>deadlines</span> en <span className={t.textSecondary}>cijfers</span> (1 tot 10).
            </p>
            <p className={`${t.textMuted} mb-4 text-sm`}>
              Voortgang en gemiddelden zie je terug op je dagoverzicht. Ideaal voor wie naast dagelijkse routines ook lange-termijndoelen wil tracken.
            </p>

            <button
              onClick={() => setProjectsEnabled(v => !v)}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition mb-4 ${
                projectsEnabled
                  ? `border-cyan-400 bg-cyan-50 ${darkMode ? 'bg-opacity-10' : ''}`
                  : `${t.border} ${t.cardSecondary}`
              }`}
            >
              <GraduationCap className={`w-5 h-5 ${projectsEnabled ? 'text-cyan-500' : t.textMuted}`} />
              <div className="flex-1 text-left">
                <div className={`font-medium text-sm ${projectsEnabled ? t.textSecondary : t.textMuted}`}>
                  Projecten activeren
                </div>
                <div className={`text-xs ${t.textMuted}`}>
                  Beheer onderwerpen, subdoelen en cijfers
                </div>
              </div>
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                projectsEnabled ? 'bg-cyan-500 border-cyan-500' : 'border-slate-300'
              }`}>
                {projectsEnabled && <Check className="w-3 h-3 text-white" />}
              </div>
            </button>

            <p className={`text-xs ${t.textMuted} mb-4 text-center`}>
              Niet zeker? Sla over en activeer projecten later via Instellingen.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
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
function ModuleRenderer({ module: mod, data, editable = true, onChecklistToggle, onChecklistIncrement, onChecklistNote, onChoiceToggle, onChoiceOptionSet, onEdit, weekDates, history, customTasks, newTask, setNewTask, addTask, toggleTask, deleteTask, t, darkMode }) {
  const editButton = onEdit ? (
    <button
      onClick={onEdit}
      className={`ml-auto p-1.5 ${t.hover} rounded-lg ${t.textMuted} transition`}
      title="Module-instellingen"
      aria-label={`Instellingen voor ${mod.name}`}
    >
      <Settings className="w-4 h-4" />
    </button>
  ) : null;
  const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
  const colorClass = `text-${mod.color}-500`;

  if (mod.type === 'checklist') {
    return (
      <ChecklistModule
        module={mod}
        Icon={Icon}
        data={data}
        editable={editable}
        onToggle={onChecklistToggle}
        onIncrement={onChecklistIncrement}
        onSetNote={onChecklistNote}
        onEdit={onEdit}
        t={t}
      />
    );
  }

  if (mod.type === 'choice') {
    const options = mod.options || [];
    const selectedLabel = options.find(o => o.id === data.selectedOption)?.label;
    return (
      <div className={`${t.card} rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <h2 className={`font-semibold ${t.textSecondary}`}>{mod.name}</h2>
          {editButton}
        </div>
        {options.length === 0 ? (
          <p className={`${t.textMuted} text-sm text-center py-4`}>
            Voeg opties toe via instellingen ⚙️
          </p>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap">
              {options.map(opt => {
                const isActive = data.selectedOption === opt.id && data.completed;
                return (
                  <button
                    key={opt.id}
                    onClick={() => onChoiceOptionSet(opt.id)}
                    disabled={!editable}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 disabled:cursor-not-allowed ${
                      isActive
                        ? `bg-${mod.color}-500 text-white shadow-md`
                        : `${t.cardSecondary} ${t.textMuted}`
                    } ${!editable && !isActive ? 'opacity-50' : ''}`}
                  >
                    {isActive && <Check className="w-4 h-4" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {data.completed && data.selectedOption && (
              <p className={`text-xs ${t.textMuted} mt-2 text-center`}>
                ✓ {selectedLabel} gekozen — klik nogmaals om te resetten
              </p>
            )}
          </>
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
          {editButton}
        </div>
        
        {editable && (
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
        )}

        <div className="space-y-2">
          {customTasks.length === 0 ? (
            <p className={`text-sm ${t.textMuted} text-center py-4`}>
              {editable ? 'Nog geen taken toegevoegd' : 'Geen taken op deze dag'}
            </p>
          ) : (
            customTasks.map(task => (
              <div key={task.id} className={`flex items-center gap-3 p-2 ${t.cardSecondary} rounded-lg group`}>
                <button
                  onClick={() => toggleTask(task.id)}
                  disabled={!editable}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 disabled:cursor-not-allowed ${
                    task.done ? `bg-${mod.color}-500 border-${mod.color}-500 check-pop` : 'border-slate-300'
                  }`}
                >
                  {task.done && <Check className="w-3 h-3 text-white" />}
                </button>
                {task.recurringId && <Repeat className={`w-3 h-3 ${t.textMuted} flex-shrink-0`} />}
                <span className={`flex-1 text-sm ${task.done ? `line-through ${t.textMuted}` : t.textSecondary}`}>
                  {task.text}
                </span>
                {editable && (
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="opacity-50 sm:opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return null;
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
function WeekView({ modules, history, today, activeDateKey, moduleData, activeWeekStart, setActiveWeekStart, weekDates, dayNames, onPickDay, t, darkMode, goldenBorderEnabled }) {
  const enabledNonTaskModules = modules.filter(m => m.enabled && m.type !== 'tasks' && m.type !== 'projects' && m.type !== 'collection');
  const atCurrentWeek = sameDay(activeWeekStart, startOfWeek(new Date()));

  const dayDataFor = (dateStr) => (
    dateStr === activeDateKey ? { moduleData } : history[dateStr]
  );

  return (
    <div className={`${t.card} rounded-2xl p-5 shadow-sm slide-in`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          onClick={() => setActiveWeekStart(addDays(activeWeekStart, -7))}
          aria-label="Vorige week"
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.hover} ${t.textSecondary} transition`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h2 className={`font-semibold ${t.textSecondary}`}>{formatWeekTitle(activeWeekStart)}</h2>
          </div>
          <div className={`text-xs ${t.textMuted}`}>{formatWeekRange(activeWeekStart)}</div>
        </div>
        <button
          onClick={() => setActiveWeekStart(addDays(activeWeekStart, 7))}
          disabled={atCurrentWeek}
          aria-label="Volgende week"
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${t.hover} ${t.textSecondary} transition disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-6">
        {weekDates.map((date, i) => {
          const isTodayCell = date === today;
          const dateObj = parseDateKey(date);
          const future = isFuture(dateObj);
          const bg = buildDayCellBackground(modules, dayDataFor(date), dateObj);
          const fullyComplete = isDayFullyComplete(modules, dayDataFor(date), dateObj);
          const dayNum = date.slice(8).replace(/^0/, '');

          return (
            <div key={date} className="text-center">
              <div className={`text-xs font-medium mb-1 ${isTodayCell ? 'text-blue-500' : t.textMuted}`}>
                {dayNames[i]}
              </div>
              <button
                onClick={() => !future && onPickDay?.(dateObj)}
                disabled={future}
                style={bg ? { background: bg } : undefined}
                className={`relative w-full h-20 rounded-lg overflow-hidden flex items-center justify-center transition ${
                  bg ? '' : t.progressBg
                } ${isTodayCell ? 'ring-2 ring-blue-400' : ''} ${
                  future ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-90'
                } ${(goldenBorderEnabled && fullyComplete) ? 'ritmo-golden-border' : ''}`}
                aria-label={`Open ${date}`}
              >
                <span className={`text-sm font-bold ${bg ? 'text-white drop-shadow' : t.textSecondary}`}>
                  {dayNum}
                </span>
              </button>
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
              const data = d === activeDateKey ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id];
              return data && mod.items.every(i => data[i.id]);
            }).length;
            label = mod.name;
            value = `${fullDays} / 7 dagen volledig`;
          } else if (mod.type === 'choice') {
            const days = weekDates.filter(d => {
              const data = d === activeDateKey ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id];
              return data?.completed;
            }).length;
            label = mod.name;
            value = `${days} / 7 dagen`;
          } else if (mod.type === 'counter') {
            const unit = mod.unit || 'minutes';
            const total = weekDates.reduce((sum, d) => {
              const data = d === activeDateKey ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id];
              return sum + (data?.total ?? data?.minutes ?? 0);
            }, 0);
            const weekMax = mod.weeklyMax ?? mod.weeklyMaxMinutes;
            label = mod.name;
            value = weekMax
              ? `${formatAmount(total, unit)} / ${formatAmount(weekMax, unit)}`
              : formatAmount(total, unit);
          } else if (mod.type === 'sleep') {
            if (!mod.countInStreak) return null;
            const days = weekDates.map(d => ({
              date: parseDateKey(d),
              dayData: (d === activeDateKey ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id]) || null,
            }));
            const summary = summarizeSleep(days, mod);
            label = mod.name;
            value = summary.nightsLogged === 0
              ? 'Nog geen data'
              : `${formatDuration(summary.averageDurationMinutes)} · ${summary.nightsOnTarget} / 7 op ritme`;
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
function MonthView({ calendarMonth, setCalendarMonth, history, today, activeDateKey, moduleData, modules, onPickDay, t, darkMode, monthNames, dayNames, goldenBorderEnabled }) {
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

  const dayDataFor = (dateStr) => (
    dateStr === activeDateKey ? { moduleData } : history[dateStr]
  );

  const monthDays = cells.filter(c => c !== null);
  const completedDays = monthDays.filter(d => buildDayCellBackground(modules, dayDataFor(d), parseDateKey(d)) !== null).length;
  const partialDays = monthDays.filter(d => {
    const data = dayDataFor(d);
    if (!data?.moduleData) return false;
    const dateObj = parseDateKey(d);
    if (buildDayCellBackground(modules, data, dateObj) !== null) return false;
    // any non-empty status counts as partial
    return modules.some(m => m.enabled && m.type !== 'tasks' && m.type !== 'projects' && m.type !== 'sleep' && m.type !== 'collection' &&
      moduleStatusForDay(m, data, dateObj) !== 'none');
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
          const day = parseInt(dateStr.slice(8));
          const isTodayCell = dateStr === today;
          const dateObj = parseDateKey(dateStr);
          const future = isFuture(dateObj);
          const bg = buildDayCellBackground(modules, dayDataFor(dateStr), dateObj);
          const fullyComplete = isDayFullyComplete(modules, dayDataFor(dateStr), dateObj);

          return (
            <button
              key={dateStr}
              onClick={() => !future && onPickDay?.(dateObj)}
              disabled={future}
              style={bg ? { background: bg } : undefined}
              className={`aspect-square rounded-md flex items-center justify-center text-xs font-medium transition-all ${
                bg ? '' : (darkMode ? 'bg-slate-700' : 'bg-slate-100')
              } ${isTodayCell ? 'ring-2 ring-blue-500' : ''} ${
                future ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110'
              } ${(goldenBorderEnabled && fullyComplete) ? 'ritmo-golden-border' : ''}`}
              aria-label={`Open ${dateStr}`}
            >
              <span className={bg ? 'text-white drop-shadow' : t.textSecondary}>{day}</span>
            </button>
          );
        })}
      </div>

      <p className={`text-xs ${t.textMuted} mb-4 text-center`}>
        Klik op een dag om te bekijken
      </p>

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

      {modules.filter(m => m.enabled && m.type === 'sleep' && m.countInStreak === true).map(mod => {
        const Icon = ICON_OPTIONS[mod.icon] || BedDouble;
        const days = monthDays.map(d => ({
          date: parseDateKey(d),
          dayData: (d === activeDateKey ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id]) || null,
        }));
        const summary = summarizeSleep(days, mod);
        const value = summary.nightsLogged === 0
          ? 'Nog geen slaapdata in deze maand'
          : `${formatDuration(summary.averageDurationMinutes)} · ${summary.nightsOnTarget} / ${monthDays.length} op ritme`;
        return (
          <div key={mod.id} className={`mt-3 flex items-center justify-between p-3 ${darkMode ? `bg-${mod.color}-900/20` : `bg-${mod.color}-50`} rounded-lg`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 text-${mod.color}-500`} />
              <span className={`text-sm font-medium ${t.textSecondary}`}>{mod.name}</span>
            </div>
            <span className={`font-bold text-sm ${darkMode ? `text-${mod.color}-300` : `text-${mod.color}-600`}`}>
              {value}
            </span>
          </div>
        );
      })}
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
function SettingsModal({ onClose, modules, setModules, reflectionQuestions, setReflectionQuestions, recurringTasks, setRecurringTasks, streakSettings, setStreakSettings, darkMode, setDarkMode, soundEnabled, setSoundEnabled, soundVolume, setSoundVolume, goldenBorderEnabled, setGoldenBorderEnabled, showReflectionOnToday, setShowReflectionOnToday, t, dayNames, setEditingModule }) {
  const [activeTab, setActiveTab] = useState('modules');
  const [helpView, setHelpView] = useState(null); // null | 'list' | 'install' | 'feedback'
  const [reorderMode, setReorderMode] = useState(false);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const moveModule = (id, dir) => {
    setModules(prev => {
      const i = prev.findIndex(m => m.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  };

  const reorderModules = (fromId, toId) => {
    setModules(prev => {
      const from = prev.findIndex(m => m.id === fromId);
      const to = prev.findIndex(m => m.id === toId);
      if (from < 0 || to < 0 || from === to) return prev;
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const helpTitles = {
    list: 'Help',
    install: 'App op beginscherm zetten',
    feedback: 'Feedback geven',
  };

  const handleBack = () => {
    if (helpView === 'install' || helpView === 'feedback') {
      setHelpView('list');
    } else {
      setHelpView(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`${t.card} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto my-4`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 min-w-0">
            {helpView !== null && (
              <button
                onClick={handleBack}
                className={`p-2 ${t.hover} rounded-lg`}
                aria-label="Terug"
              >
                <ChevronLeft className={`w-5 h-5 ${t.textSecondary}`} />
              </button>
            )}
            <h2 className={`text-xl font-bold ${t.text} truncate`}>
              {helpView === null ? 'Instellingen' : helpTitles[helpView]}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {helpView === null && (
              <button
                onClick={() => setHelpView('list')}
                className={`p-2 ${t.hover} rounded-lg`}
                aria-label="Help"
              >
                <HelpCircle className={`w-5 h-5 ${t.textSecondary}`} />
              </button>
            )}
            <button onClick={onClose} className={`p-2 ${t.hover} rounded-lg`} aria-label="Sluiten">
              <X className={`w-5 h-5 ${t.textSecondary}`} />
            </button>
          </div>
        </div>

        {helpView === 'list' && (
          <HelpOverlay t={t} onSelect={setHelpView} />
        )}

        {helpView === 'install' && (
          <InstallGuide t={t} />
        )}

        {helpView === 'feedback' && (
          <FeedbackForm t={t} onBack={() => setHelpView('list')} />
        )}

        {helpView === null && (
        <>
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
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className={`font-semibold ${t.textSecondary}`}>Beheer modules</h3>
              <button
                onClick={() => setReorderMode(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  reorderMode
                    ? 'bg-slate-700 text-white'
                    : `border ${t.border} ${t.textSecondary} ${t.hover}`
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {reorderMode ? 'Klaar' : 'Volgorde'}
              </button>
            </div>
            <p className={`text-xs ${t.textMuted} mb-4`}>
              {reorderMode
                ? 'Versleep of gebruik de pijltjes om de volgorde aan te passen.'
                : 'Activeer, verberg, bewerk of verwijder modules. Voeg eigen modules toe voor wat jij belangrijk vindt.'}
            </p>

            <div className="space-y-2 mb-4">
              {modules.map((mod, index) => {
                const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
                const isFirst = index === 0;
                const isLast = index === modules.length - 1;
                const isDragging = draggingId === mod.id;
                const isDragOver = dragOverId === mod.id && draggingId && draggingId !== mod.id;
                return (
                  <div
                    key={mod.id}
                    draggable={reorderMode}
                    onDragStart={() => setDraggingId(mod.id)}
                    onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                    onDragOver={(e) => { if (reorderMode) { e.preventDefault(); setDragOverId(mod.id); } }}
                    onDrop={(e) => {
                      if (!reorderMode) return;
                      e.preventDefault();
                      if (draggingId && draggingId !== mod.id) reorderModules(draggingId, mod.id);
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    onClick={() => { if (!reorderMode) setEditingModule(mod); }}
                    className={`flex items-center gap-2 p-3 ${t.cardSecondary} rounded-lg transition ${
                      reorderMode ? 'cursor-default' : 'cursor-pointer'
                    } ${isDragging ? 'opacity-40' : ''} ${isDragOver ? `ring-2 ring-${mod.color}-400` : ''}`}
                  >
                    {reorderMode && (
                      <span className={`${t.textMuted} touch-none cursor-grab active:cursor-grabbing`} aria-hidden>
                        <GripVertical className="w-4 h-4" />
                      </span>
                    )}
                    {!reorderMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModules(prev => prev.map(m => m.id === mod.id ? { ...m, enabled: !m.enabled } : m));
                        }}
                        className={`p-1.5 rounded transition ${mod.enabled ? `text-${mod.color}-500` : t.textMuted}`}
                        title={mod.enabled ? 'Verbergen' : 'Tonen'}
                      >
                        {mod.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}
                    <Icon className={`w-4 h-4 ${mod.enabled ? `text-${mod.color}-500` : t.textMuted}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${mod.enabled ? t.textSecondary : t.textMuted}`}>
                        {mod.name}
                      </div>
                      <div className={`text-xs ${t.textMuted}`}>
                        {mod.type === 'checklist' && `Checklist · ${(mod.items || []).length} items`}
                        {mod.type === 'choice' && 'Keuze + voltooien'}
                        {mod.type === 'counter' && `Counter · ${formatAmount(mod.dailyGoal ?? mod.dailyGoalMinutes ?? 0, mod.unit || 'minutes')} doel`}
                        {mod.type === 'tasks' && 'Eigen takenlijst'}
                      </div>
                    </div>
                    {reorderMode && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModule(mod.id, -1); }}
                          disabled={isFirst}
                          aria-label="Naar boven"
                          className={`p-1.5 rounded transition ${t.hover} ${t.textSecondary} disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModule(mod.id, 1); }}
                          disabled={isLast}
                          aria-label="Naar beneden"
                          className={`p-1.5 rounded transition ${t.hover} ${t.textSecondary} disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {!reorderMode && (
              <button
                onClick={() => setEditingModule({
                  id: `mod_${Date.now()}`,
                  name: '',
                  icon: 'Star',
                  color: 'blue',
                  enabled: true,
                  countInStreak: false,
                  type: 'checklist',
                  items: []
                })}
                className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium text-slate-500 hover:text-blue-500 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Nieuwe module toevoegen
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm('Weet je zeker dat je alle modules wilt resetten? Je items en instellingen voor modules gaan verloren. Je dagelijkse data en geschiedenis blijven bewaard.')) {
                  setModules(DEFAULT_MODULES);
                  setStreakSettings({});
                }
              }}
              className={`w-full mt-3 py-2 text-xs ${t.textMuted} hover:text-red-500 transition`}
            >
              Reset modules naar standaard
            </button>
          </div>
        )}

        {activeTab === 'streaks' && (() => {
          const activeCount = modules.filter(m => m.countInStreak === true).length;
          return (
            <div>
              <h3 className={`font-semibold ${t.textSecondary} mb-3`}>Streaks beheren</h3>
              <p className={`text-xs ${t.textMuted} mb-4`}>
                Kies welke modules meetellen voor je streaks (max. 4) en bepaal per module de criteria.
              </p>

              <div className={`${t.cardSecondary} rounded-lg p-3 mb-4 text-sm ${t.textSecondary}`}>
                <span className="font-medium">{activeCount}</span> van max. <span className="font-medium">4</span> streaks actief
              </div>

              <div className="space-y-4">
                {modules.filter(m => m.enabled && m.type !== 'tasks' && m.type !== 'collection').map(mod => {
                  const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
                  const setting = streakSettings[mod.id] || {};
                  const isActive = mod.countInStreak === true;
                  const atMax = activeCount >= 4 && !isActive;

                  return (
                    <div
                      key={mod.id}
                      className={`p-3 ${t.cardSecondary} rounded-lg transition ${
                        isActive ? `border-2 border-${mod.color}-400` : 'border-2 border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <button
                          onClick={() => {
                            if (atMax) return;
                            setModules(prev => prev.map(m =>
                              m.id === mod.id ? { ...m, countInStreak: !isActive } : m
                            ));
                          }}
                          disabled={atMax}
                          className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${
                            isActive ? `bg-${mod.color}-500 border-${mod.color}-500` : 'border-slate-300'
                          } ${atMax ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                        >
                          {isActive && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <Icon className={`w-4 h-4 text-${mod.color}-500`} />
                        <span className={`font-medium text-sm ${t.textSecondary}`}>{mod.name}</span>
                        {atMax && (
                          <span className={`ml-auto text-xs ${t.textMuted}`}>max. bereikt</span>
                        )}
                      </div>

                      {isActive && mod.type === 'checklist' && (
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

                      {isActive && mod.type === 'counter' && (mod.unit || 'minutes') === 'minutes' && (
                        <div>
                          <label className={`text-xs ${t.textMuted} mb-2 block`}>Min. minuten per dag</label>
                          <div className="flex gap-1">
                            {[30, 60, 90, 120, 180, 240].map(min => {
                              const current = setting.minutesGoal ?? mod.dailyGoal ?? mod.dailyGoalMinutes;
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

                      {isActive && mod.type === 'counter' && (mod.unit || 'minutes') !== 'minutes' && (
                        <p className={`text-xs ${t.textMuted}`}>
                          Streak telt zodra je het dagdoel ({formatAmount(mod.dailyGoal ?? 0, mod.unit)}) haalt.
                        </p>
                      )}

                      {isActive && mod.type === 'choice' && (
                        <p className={`text-xs ${t.textMuted}`}>
                          Streak telt zodra je een optie kiest.
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

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

            <div className={`mt-6 pt-6 border-t ${t.border}`}>
              <h3 className={`font-semibold ${t.textSecondary} mb-3`}>Effecten</h3>

              <label className={`flex items-center justify-between gap-3 p-3 ${t.cardSecondary} rounded-lg mb-3`}>
                <div className="min-w-0">
                  <span className={`text-sm font-medium ${t.textSecondary}`}>Gouden rand bij voltooide dagen</span>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>Animatie rond dagen waarop alles afgevinkt is.</p>
                </div>
                <input
                  type="checkbox"
                  checked={goldenBorderEnabled}
                  onChange={(e) => setGoldenBorderEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer flex-shrink-0"
                />
              </label>

              <label className={`flex items-center justify-between gap-3 p-3 ${t.cardSecondary} rounded-lg mb-3`}>
                <div className="min-w-0">
                  <span className={`text-sm font-medium ${t.textSecondary}`}>Reflectie tonen op Vandaag</span>
                  <p className={`text-xs ${t.textMuted} mt-0.5`}>Verberg de Reflectie-kaart op het Vandaag-scherm. De Reflectie-tab blijft bereikbaar.</p>
                </div>
                <input
                  type="checkbox"
                  checked={showReflectionOnToday}
                  onChange={(e) => setShowReflectionOnToday(e.target.checked)}
                  className="w-4 h-4 cursor-pointer flex-shrink-0"
                />
              </label>
            </div>

            <div className={`mt-6 pt-6 border-t ${t.border}`}>
              <h3 className={`font-semibold ${t.textSecondary} mb-3`}>Geluiden</h3>

              <label className={`flex items-center justify-between p-3 ${t.cardSecondary} rounded-lg mb-3`}>
                <span className={`text-sm font-medium ${t.textSecondary}`}>Geluidseffecten</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
              </label>

              <div className={`flex items-center gap-3 p-3 ${t.cardSecondary} rounded-lg mb-3 ${!soundEnabled ? 'opacity-40' : ''}`}>
                <span className={`text-sm font-medium ${t.textSecondary} min-w-[60px]`}>Volume</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value, 10))}
                  disabled={!soundEnabled}
                  className="flex-1"
                />
                <span className={`text-sm ${t.textMuted} min-w-[40px] text-right`}>{soundVolume}%</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => playSound('tick', { enabled: true, volume: soundVolume })}
                  className={`flex-1 py-2 ${t.cardSecondary} ${t.hover} ${t.textSecondary} rounded-lg text-xs font-medium transition`}
                >
                  Test tick
                </button>
                <button
                  onClick={() => playSound('pop', { enabled: true, volume: soundVolume })}
                  className={`flex-1 py-2 ${t.cardSecondary} ${t.hover} ${t.textSecondary} rounded-lg text-xs font-medium transition`}
                >
                  Test pop
                </button>
                <button
                  onClick={() => playSound('chime', { enabled: true, volume: soundVolume })}
                  className={`flex-1 py-2 ${t.cardSecondary} ${t.hover} ${t.textSecondary} rounded-lg text-xs font-medium transition`}
                >
                  Test chime
                </button>
              </div>

              <p className={`text-xs ${t.textMuted} mt-3`}>
                Korte tonen bij afvinken, voltooien van een module en counter-acties.
              </p>
            </div>
          </div>
        )}

        </>
        )}
      </div>
    </div>
  );
}

// =============================================
// MODULE EDITOR
// =============================================
const DEFAULT_SLEEP_GOALS = {
  monday:    { bed: '23:00', wake: '07:00' },
  tuesday:   { bed: '23:00', wake: '07:00' },
  wednesday: { bed: '23:00', wake: '07:00' },
  thursday:  { bed: '23:00', wake: '07:00' },
  friday:    { bed: '00:00', wake: '08:30' },
  saturday:  { bed: '00:00', wake: '09:00' },
  sunday:    { bed: '23:00', wake: '07:30' },
};

const TYPE_OPTIONS = [
  { id: 'checklist', label: 'Checklist', desc: 'Lijst met items' },
  { id: 'choice', label: 'Keuze', desc: 'Optie + voltooien' },
  { id: 'counter', label: 'Teller', desc: 'Aantal bijhouden tegen een dagdoel' },
  { id: 'tasks', label: 'Taken', desc: 'Vrije takenlijst' },
  { id: 'projects', label: 'Project', desc: 'Vakken & subdoelen' },
  { id: 'sleep', label: 'Slaap', desc: 'Bedtijd, opstaan, ochtendscore' },
  { id: 'collection', label: 'Collectie', desc: 'Catalogus van items met events' },
];

function CollectionTagsEditor({ tags, onAdd, onUpdate, onRemove, t }) {
  const [label, setLabel] = useState('');
  const [color, setColor] = useState('blue');
  const submit = () => {
    if (!label.trim()) return;
    onAdd(label, color);
    setLabel('');
  };
  return (
    <div>
      <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
        Tags
      </label>
      {tags.length === 0 ? (
        <p className={`text-xs ${t.textMuted} mb-2`}>Nog geen tags.</p>
      ) : (
        <ul className="space-y-1 mb-2">
          {tags.map((tg) => (
            <li key={tg.id} className={`flex items-center gap-2 p-2 ${t.cardSecondary} rounded-lg`}>
              <select
                value={tg.color}
                onChange={(e) => onUpdate(tg.id, { color: e.target.value })}
                className={`px-2 py-1 ${t.input} rounded text-xs`}
                aria-label="Kleur"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input
                type="text"
                value={tg.label}
                onChange={(e) => onUpdate(tg.id, { label: e.target.value })}
                className={`flex-1 px-2 py-1 ${t.input} rounded text-sm`}
              />
              <button
                type="button"
                onClick={() => onRemove(tg.id)}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                aria-label="Tag verwijderen"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <select
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className={`px-2 py-2 ${t.input} rounded-lg text-sm`}
          aria-label="Kleur nieuwe tag"
        >
          {COLOR_OPTIONS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submit(); } }}
          placeholder="Tag-naam..."
          className={`flex-1 px-3 py-2 ${t.input} rounded-lg text-sm`}
        />
        <button
          type="button"
          onClick={submit}
          disabled={!label.trim()}
          className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white rounded-lg text-sm transition"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function genId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function ModuleEditor({ module: mod, onSave, onCancel, onDelete, t }) {
  const [editing, setEditing] = useState(mod);
  const [newItem, setNewItem] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);
  const isNew = !mod.name;
  const [step, setStep] = useState(
    isNew ? (mod.type ? 'preset' : 'type') : 'config'
  );
  const [presetTab, setPresetTab] = useState('suggestions');

  const update = (key, value) => setEditing(prev => ({ ...prev, [key]: value }));

  const addEntry = (key) => {
    if (newItem.trim()) {
      setEditing(prev => ({
        ...prev,
        [key]: [...(prev[key] || []), { id: `${key}_${Date.now()}`, label: newItem.trim() }]
      }));
      setNewItem('');
    }
  };

  const removeEntry = (key, id) => {
    setEditing(prev => ({
      ...prev,
      [key]: (prev[key] || []).filter(i => i.id !== id)
    }));
  };

  const updateItem = (itemId, patch) => {
    setEditing(prev => ({
      ...prev,
      items: (prev.items || []).map(i => i.id === itemId ? { ...i, ...patch } : i),
    }));
  };

  const selectType = (typeId) => {
    setEditing(prev => ({
      ...prev,
      type: typeId,
      ...(typeId === 'projects' && !prev.subjects ? { subjects: [] } : {}),
      ...(typeId === 'counter' && prev.unit === undefined ? {
        unit: 'minutes',
        dailyGoal: prev.dailyGoalMinutes ?? 30,
        weeklyMax: prev.weeklyMaxMinutes,
        presets: [],
        categoriesEnabled: false,
        categories: [],
      } : {}),
      ...(typeId === 'sleep' ? {
        goals: prev.goals || DEFAULT_SLEEP_GOALS,
        toleranceMinutes: prev.toleranceMinutes ?? 15,
        showMorningScore: typeof prev.showMorningScore === 'boolean' ? prev.showMorningScore : true,
      } : {}),
      ...(typeId === 'collection' ? {
        trackingMode: prev.trackingMode || 'completion',
        itemFields: prev.itemFields || { rating: true, notes: true, tags: true },
        tags: prev.tags || [],
        items: prev.items || [],
        countInStreak: false,
      } : {}),
    }));
    setStep('preset');
    setPresetTab('suggestions');
  };

  const applyPreset = (preset) => {
    setEditing(prev => {
      const merged = { ...prev, ...preset };
      if (preset.items && merged.type !== 'collection') {
        merged.items = preset.items.map(label => ({ id: genId('items'), label }));
      }
      if (preset.options) {
        merged.options = preset.options.map(label => ({ id: genId('options'), label }));
      }
      return merged;
    });
    setStep('config');
  };

  const startBlank = () => setStep('config');

  const canSave = editing.name && editing.name.trim();

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`${t.card} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto my-4`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {isNew && step !== 'type' && (
              <button
                onClick={() => setStep(step === 'config' ? 'preset' : 'type')}
                className={`p-1.5 ${t.hover} rounded-lg ${t.textMuted}`}
                aria-label="Terug"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className={`text-xl font-bold ${t.text}`}>
              {!isNew && 'Bewerk module'}
              {isNew && step === 'type' && 'Nieuwe module — kies type'}
              {isNew && step === 'preset' && 'Kies een suggestie'}
              {isNew && step === 'config' && 'Module aanpassen'}
            </h2>
          </div>
          <button onClick={onCancel} className={`p-2 ${t.hover} rounded-lg`}>
            <X className={`w-5 h-5 ${t.textSecondary}`} />
          </button>
        </div>

        {step === 'type' && (
          <div className="space-y-4">
            <p className={`text-sm ${t.textMuted}`}>
              Wat voor module wil je toevoegen?
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(typ => (
                <button
                  key={typ.id}
                  onClick={() => selectType(typ.id)}
                  className={`p-3 rounded-lg text-left transition ${t.cardSecondary} ${t.textSecondary} hover:bg-blue-500 hover:text-white`}
                >
                  <div className="font-medium text-sm">{typ.label}</div>
                  <div className={`text-xs ${t.textMuted}`}>{typ.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'preset' && (
          <div className="space-y-4">
            <div className={`flex gap-1 p-1 ${t.cardSecondary} rounded-lg`}>
              <button
                onClick={() => setPresetTab('suggestions')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  presetTab === 'suggestions' ? `${t.card} ${t.textSecondary} shadow-sm` : t.textMuted
                }`}
              >
                Suggesties
              </button>
              <button
                onClick={() => setPresetTab('blank')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  presetTab === 'blank' ? `${t.card} ${t.textSecondary} shadow-sm` : t.textMuted
                }`}
              >
                Zelf maken
              </button>
            </div>

            {presetTab === 'suggestions' && (
              <div className="space-y-2">
                {(MODULE_PRESETS[editing.type] || []).map((preset, idx) => {
                  const PresetIcon = ICON_OPTIONS[preset.icon] || Sparkles;
                  return (
                    <button
                      key={idx}
                      onClick={() => applyPreset(preset)}
                      className={`w-full flex items-center gap-3 p-3 ${t.cardSecondary} rounded-lg text-left ${t.hover} transition`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${preset.color}-100 dark:bg-${preset.color}-900/30 text-${preset.color}-500`}>
                        <PresetIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${t.textSecondary}`}>{preset.name}</div>
                        {preset.unit && (
                          <div className={`text-xs ${t.textMuted}`}>
                            Doel: {formatAmount(preset.dailyGoal, preset.unit)}
                          </div>
                        )}
                        {preset.items && (
                          <div className={`text-xs ${t.textMuted}`}>{preset.items.length} items</div>
                        )}
                        {preset.options && (
                          <div className={`text-xs ${t.textMuted}`}>{preset.options.length} opties</div>
                        )}
                      </div>
                    </button>
                  );
                })}
                {(!MODULE_PRESETS[editing.type] || MODULE_PRESETS[editing.type].length === 0) && (
                  <p className={`text-sm ${t.textMuted} text-center py-4`}>
                    Geen suggesties beschikbaar voor dit type. Kies "Zelf maken".
                  </p>
                )}
              </div>
            )}

            {presetTab === 'blank' && (
              <div className={`p-4 ${t.cardSecondary} rounded-lg text-center space-y-3`}>
                <p className={`text-sm ${t.textSecondary}`}>
                  Begin met een lege module en vul alles zelf in.
                </p>
                <button
                  onClick={startBlank}
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium transition"
                >
                  Lege module maken
                </button>
              </div>
            )}
          </div>
        )}

        {step === 'config' && (
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
            <>
              <div className={`pt-4 border-t ${t.border}`}>
                <label className={`text-sm font-medium ${t.textSecondary} mb-3 block`}>Opties</label>
                <div className="space-y-3">
                  {[
                    { key: 'allowNotes', title: 'Dagelijkse notities', desc: 'Voeg per dag een korte notitie toe aan een item.' },
                    { key: 'allowDescriptions', title: 'Instructies per item', desc: 'Geef een item een vaste geheugensteun, bijv. "3 sets van 10".' },
                    { key: 'allowTargets', title: 'Sets per item', desc: 'Vervang het vinkje door een teller (bijv. 0/3 sets).' },
                  ].map(opt => {
                    const isOn = !!editing[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => update(opt.key, !isOn)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition ${t.cardSecondary} ${t.hover}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 mt-0.5 ${
                          isOn ? `bg-${editing.color}-500 border-${editing.color}-500` : 'border-slate-300'
                        }`}>
                          {isOn && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${t.textSecondary}`}>{opt.title}</div>
                          <div className={`text-xs ${t.textMuted} mt-0.5`}>{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>Items</label>
                <div className="space-y-2 mb-2">
                  {(editing.items || []).map(item => {
                    const isExpanded = expandedItemId === item.id;
                    const showSettingsBtn = editing.allowDescriptions || editing.allowTargets;
                    return (
                      <div key={item.id} className={`${t.cardSecondary} rounded-lg`}>
                        <div className="flex items-center gap-2 p-2">
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => updateItem(item.id, { label: e.target.value })}
                            className={`flex-1 px-2 py-1 ${t.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-${editing.color}-300`}
                          />
                          {showSettingsBtn && (
                            <button
                              onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                              className={`p-1.5 rounded transition ${
                                isExpanded ? `bg-${editing.color}-500 text-white` : `${t.textMuted} ${t.hover}`
                              }`}
                              title="Item-instellingen"
                            >
                              <SlidersHorizontal className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => removeEntry('items', item.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {isExpanded && showSettingsBtn && (
                          <div className="px-2 pb-2 space-y-2">
                            {editing.allowDescriptions && (
                              <div>
                                <label className={`text-xs font-medium ${t.textMuted} mb-1 block`}>Instructie</label>
                                <textarea
                                  value={item.description || ''}
                                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                  rows={2}
                                  placeholder='Bijv. "3 sets van 10"'
                                  className={`w-full px-2 py-1.5 ${t.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
                                />
                              </div>
                            )}
                            {editing.allowTargets && (
                              <div>
                                <label className={`text-xs font-medium ${t.textMuted} mb-1 block`}>Aantal sets (leeg = vinkje)</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.target ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    updateItem(item.id, { target: v === '' ? undefined : Math.max(1, parseInt(v, 10) || 1) });
                                  }}
                                  placeholder="bijv. 3"
                                  className={`w-24 px-2 py-1.5 ${t.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-rose-300`}
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && addEntry('items')}
                    placeholder="Nieuw item..."
                    className={`flex-1 px-3 py-2 ${t.input} rounded-lg text-sm`}
                  />
                  <button onClick={() => addEntry('items')} className={`px-3 py-2 bg-${editing.color}-500 text-white rounded-lg`}>
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}

          {editing.type === 'choice' && (
            <div>
              <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>Opties</label>
              <div className="space-y-2 mb-2">
                {(editing.options || []).map(opt => (
                  <div key={opt.id} className={`flex items-center gap-2 p-2 ${t.cardSecondary} rounded-lg`}>
                    <span className={`flex-1 text-sm ${t.textSecondary}`}>{opt.label}</span>
                    <button
                      onClick={() => removeEntry('options', opt.id)}
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
                  onKeyDown={(e) => e.key === 'Enter' && addEntry('options')}
                  placeholder="Bijv. 🚶 Wandelen, 🏃 Hardlopen..."
                  className={`flex-1 px-3 py-2 ${t.input} rounded-lg text-sm`}
                />
                <button onClick={() => addEntry('options')} className={`px-3 py-2 bg-${editing.color}-500 text-white rounded-lg`}>
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {editing.type === 'counter' && (() => {
            const unit = editing.unit || 'minutes';
            const isMinutes = unit === 'minutes';
            const dailyGoal = editing.dailyGoal ?? editing.dailyGoalMinutes ?? 0;
            const weeklyMax = editing.weeklyMax ?? editing.weeklyMaxMinutes ?? '';
            const presetsString = (editing.presets || []).join(', ');
            const categoriesString = (editing.categories || []).join(', ');
            const setBoth = (goalKey, legacyKey, parsed) => {
              setEditing(prev => ({ ...prev, [goalKey]: parsed, [legacyKey]: parsed }));
            };
            const updateUnit = (newUnit) => {
              setEditing(prev => ({ ...prev, unit: newUnit }));
            };
            const updatePresets = (str) => {
              const parsed = str
                .split(',')
                .map(s => parseFloat(s.trim()))
                .filter(n => !isNaN(n) && n > 0);
              update('presets', parsed);
            };
            const updateCategories = (str) => {
              const parsed = str.split(',').map(s => s.trim()).filter(Boolean);
              update('categories', parsed);
            };

            return (
              <>
                <div>
                  <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>Eenheid</label>
                  <select
                    value={unit}
                    onChange={(e) => updateUnit(e.target.value)}
                    className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                  >
                    <option value="minutes">minuten</option>
                    <option value="ml">ml</option>
                    <option value="l">l</option>
                    <option value="glas">glas</option>
                    <option value="pages">pagina's</option>
                    <option value="km">km</option>
                    <option value="kcal">kcal</option>
                    <option value="reps">reps</option>
                  </select>
                </div>

                <div>
                  <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                    {isMinutes ? 'Dagdoel (minuten)' : `Dagdoel (in ${unit})`}
                  </label>
                  <input
                    type="number"
                    value={dailyGoal || ''}
                    onChange={(e) => setBoth('dailyGoal', 'dailyGoalMinutes', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                  />
                </div>

                <div>
                  <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                    {isMinutes ? 'Weekmaximum (minuten, optioneel)' : `Weekmaximum (in ${unit}, optioneel)`}
                  </label>
                  <input
                    type="number"
                    value={weeklyMax === null ? '' : weeklyMax}
                    onChange={(e) => {
                      const v = e.target.value ? parseFloat(e.target.value) : null;
                      setBoth('weeklyMax', 'weeklyMaxMinutes', v);
                    }}
                    placeholder="Geen limiet"
                    className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                  />
                </div>

                {isMinutes ? (
                  <details className={`${t.cardSecondary} rounded-lg p-3`}>
                    <summary className={`text-sm font-medium ${t.textSecondary} cursor-pointer`}>
                      Geavanceerd
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                          Snelknop-presets
                        </label>
                        <input
                          type="text"
                          defaultValue={presetsString}
                          onBlur={(e) => updatePresets(e.target.value)}
                          placeholder="Bijv. 15, 30, 60 — laat leeg voor de standaard"
                          className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                        />
                      </div>

                      <label className={`flex items-center gap-2 text-sm ${t.textSecondary}`}>
                        <input
                          type="checkbox"
                          checked={!!editing.categoriesEnabled}
                          onChange={(e) => update('categoriesEnabled', e.target.checked)}
                        />
                        Categorieën gebruiken
                      </label>

                      {editing.categoriesEnabled && (
                        <div>
                          <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                            Categorieën
                          </label>
                          <input
                            type="text"
                            defaultValue={categoriesString}
                            onBlur={(e) => updateCategories(e.target.value)}
                            placeholder="Komma-gescheiden, bv. Werk, Studie, Hobby"
                            className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                          />
                        </div>
                      )}
                    </div>
                  </details>
                ) : (
                  <>
                    <div>
                      <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                        Snelknop-presets
                      </label>
                      <input
                        type="text"
                        defaultValue={presetsString}
                        onBlur={(e) => updatePresets(e.target.value)}
                        placeholder={`Bijv. 250, 500, 750 — laat leeg voor geen snelknoppen`}
                        className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                      />
                    </div>

                    <label className={`flex items-center gap-2 text-sm ${t.textSecondary}`}>
                      <input
                        type="checkbox"
                        checked={!!editing.categoriesEnabled}
                        onChange={(e) => update('categoriesEnabled', e.target.checked)}
                      />
                      Categorieën gebruiken
                    </label>

                    {editing.categoriesEnabled && (
                      <div>
                        <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                          Categorieën
                        </label>
                        <input
                          type="text"
                          defaultValue={categoriesString}
                          onBlur={(e) => updateCategories(e.target.value)}
                          placeholder="Komma-gescheiden, bv. Water, Thee, Koffie"
                          className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                        />
                      </div>
                    )}
                  </>
                )}
              </>
            );
          })()}

          {editing.type === 'sleep' && (() => {
            const goals = editing.goals || DEFAULT_SLEEP_GOALS;
            const tol = editing.toleranceMinutes ?? 15;
            const showScore = typeof editing.showMorningScore === 'boolean' ? editing.showMorningScore : true;
            const setGoal = (weekdayKey, field, value) => {
              setEditing(prev => ({
                ...prev,
                goals: {
                  ...(prev.goals || DEFAULT_SLEEP_GOALS),
                  [weekdayKey]: {
                    ...((prev.goals || DEFAULT_SLEEP_GOALS)[weekdayKey] || {}),
                    [field]: value,
                  },
                },
              }));
            };
            return (
              <>
                <div>
                  <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                    Doel-tijden per weekdag
                  </label>
                  <div className="space-y-1">
                    {WEEKDAY_KEYS.map((wk, i) => {
                      const dayLabel = DAYS_NL[(i + 1) % 7];
                      const g = goals[wk] || { bed: '', wake: '' };
                      return (
                        <div key={wk} className="flex items-center gap-2">
                          <span className={`text-xs ${t.textMuted} w-20 capitalize`}>{dayLabel}</span>
                          <input
                            type="time"
                            value={g.bed || ''}
                            onChange={(e) => setGoal(wk, 'bed', e.target.value)}
                            className={`flex-1 min-w-0 px-2 py-1 ${t.input} rounded text-sm`}
                          />
                          <span className={`text-xs ${t.textMuted}`}>naar</span>
                          <input
                            type="time"
                            value={g.wake || ''}
                            onChange={(e) => setGoal(wk, 'wake', e.target.value)}
                            className={`flex-1 min-w-0 px-2 py-1 ${t.input} rounded text-sm`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                    Tolerance (minuten)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tol}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      update('toleranceMinutes', isNaN(v) || v < 1 ? 15 : v);
                    }}
                    className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                  />
                  <p className={`text-xs ${t.textMuted} mt-1`}>
                    Een nacht telt als 'op ritme' als beide tijden binnen deze marge van het doel liggen.
                  </p>
                </div>

                <label className={`flex items-center gap-2 text-sm ${t.textSecondary}`}>
                  <input
                    type="checkbox"
                    checked={showScore}
                    onChange={(e) => update('showMorningScore', e.target.checked)}
                  />
                  Vraag ochtendscore
                </label>
              </>
            );
          })()}

          {editing.type === 'collection' && (() => {
            const trackingMode = editing.trackingMode || 'completion';
            const fields = editing.itemFields || { rating: true, notes: true, tags: true };
            const tags = editing.tags || [];
            const showUnit = trackingMode === 'amount' || trackingMode === 'flexible';
            const setField = (key, value) => {
              setEditing(prev => ({
                ...prev,
                itemFields: { ...(prev.itemFields || { rating: true, notes: true, tags: true }), [key]: value },
              }));
            };
            const addTag = (label, color) => {
              const trimmed = (label || '').trim();
              if (!trimmed) return;
              setEditing(prev => ({
                ...prev,
                tags: [...(prev.tags || []), {
                  id: genId('tag'),
                  label: trimmed,
                  color: color || 'blue',
                }],
              }));
            };
            const updateTag = (id, patch) => {
              setEditing(prev => ({
                ...prev,
                tags: (prev.tags || []).map(tg => tg.id === id ? { ...tg, ...patch } : tg),
              }));
            };
            const removeTag = (id) => {
              setEditing(prev => ({
                ...prev,
                tags: (prev.tags || []).filter(tg => tg.id !== id),
                items: (prev.items || []).map(it => ({
                  ...it,
                  tags: (it.tags || []).filter(tid => tid !== id),
                })),
              }));
            };
            return (
              <>
                <div>
                  <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                    Bijhouden als
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'completion', label: 'Voltooien' },
                      { id: 'count', label: 'Tellen' },
                      { id: 'amount', label: 'Hoeveelheid' },
                      { id: 'flexible', label: 'Per item' },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => update('trackingMode', opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          trackingMode === opt.id ? 'bg-blue-500 text-white' : `${t.cardSecondary} ${t.textMuted}`
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {showUnit && (
                  <div>
                    <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                      Eenheid
                    </label>
                    <input
                      type="text"
                      value={editing.amountUnit || ''}
                      onChange={(e) => update('amountUnit', e.target.value)}
                      placeholder="bv. ml, pagina"
                      className={`w-full px-3 py-2 ${t.input} rounded-lg text-sm`}
                    />
                  </div>
                )}

                <div>
                  <label className={`text-sm font-medium ${t.textSecondary} mb-2 block`}>
                    Velden per item
                  </label>
                  <div className="space-y-1">
                    {[
                      { id: 'rating', label: 'Beoordeling (sterren)' },
                      { id: 'notes', label: 'Notities' },
                      { id: 'tags', label: 'Tags' },
                    ].map(f => (
                      <label key={f.id} className={`flex items-center gap-2 text-sm ${t.textSecondary}`}>
                        <input
                          type="checkbox"
                          checked={!!fields[f.id]}
                          onChange={(e) => setField(f.id, e.target.checked)}
                        />
                        {f.label}
                      </label>
                    ))}
                  </div>
                </div>

                {fields.tags && (
                  <CollectionTagsEditor
                    tags={tags}
                    onAdd={addTag}
                    onUpdate={updateTag}
                    onRemove={removeTag}
                    t={t}
                  />
                )}
              </>
            );
          })()}
        </div>
        )}

        {step === 'config' && (
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
        )}
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