import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sun, Moon, Plus, Trash2, TrendingUp, Calendar, Sparkles, Settings, BookOpen, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Repeat, Trophy, GripVertical, Eye, EyeOff, GraduationCap, HelpCircle, ArrowUpDown, SlidersHorizontal, BedDouble, Check, BarChart3,
} from 'lucide-react';
import './storage';
import ProjectsModule from './modules/ProjectsModule';
import CounterModule from './modules/CounterModule';
import SleepModule from './modules/SleepModule';
import ProjectsView from './views/ProjectsView';
import CollectionsView from './views/CollectionsView';
import MeasurementsView from './views/MeasurementsView';
import HouseholdView from './views/HouseholdView';
import TodayView from './views/TodayView';
import InsightView from './views/InsightView';
import OnboardingView from './views/OnboardingView';
import SplashScreen from './components/SplashScreen';
import RitmoLogo from './components/RitmoLogo';
import TabBar from './components/TabBar';
import HelpOverlay from './components/help/HelpOverlay';
import InstallGuide from './components/help/InstallGuide';
import BackupSection from './components/BackupSection';
import { isStandalone, isIOS, onPromptAvailableChange, triggerInstallPrompt } from './utils/install';
import FeedbackForm from './components/help/FeedbackForm';
import ChecklistModule from './modules/ChecklistModule';
import CelebrationOverlay from './components/CelebrationOverlay';
import ConfirmDialog from './components/ConfirmDialog';
import { CELEBRATION_ANIMATIONS, CONFETTI_CONFIG, buildConfetti } from './utils/celebrations';
import { migrateModuleConfig, migrateDayModuleData, migrateSettings } from './utils/migrate';
import { useTranslation, resolveModuleName } from './i18n/useTranslation';
import { logEvent, removeEvent, generateTagId, generateTagGroupId } from './utils/collections';
import { ToastProvider } from './hooks/useToast';
import Toast from './components/Toast';
import { formatAmount, formatDuration } from './utils/format';
import { MODULE_PRESETS } from './utils/presets';
import { genId } from './utils/genId';
import { applyModulePreset } from './utils/applyModulePreset';
import { MEASUREMENT_UNITS, unitSymbol, createMetric } from './utils/measurements';
import { ICON_OPTIONS } from './utils/icons';
import {
  fmtDateKey, parseDateKey, addDays, sameDay, startOfWeek,
  isEditable, isFuture, isToday as isTodayDate,
  formatWeekTitle, formatWeekRange,
  WEEKDAY_KEYS, shortWeekdayLabelsMondayFirst, longMonthLabels, weekdayLabelLong,
} from './utils/dates';
import { summarizeSleep, goalsForNight, isOnTarget } from './utils/sleep';
import {
  buildDayCellBackground, moduleStatusForDay, isDayFullyComplete,
  normalizeChecklistItemData, isChecklistItemComplete,
  canCountInStreak,
} from './utils/dayProgress';
import { getColorHex, COLOR_OPTIONS } from './utils/colors';
import { DEFAULT_MODULES, instantiateDefaults } from './utils/defaultModules';
import { playSound } from './utils/sound';

export default function Ritmo() {
  const { t, language, languageSetting, setLanguage } = useTranslation();
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
  
  const [modules, setModules] = useState(() => instantiateDefaults(DEFAULT_MODULES));
  const [moduleData, setModuleData] = useState({}); // per-module daily state
  const [history, setHistory] = useState({});
  const [customTasks, setCustomTasks] = useState([]);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [reflectionAnswers, setReflectionAnswers] = useState({});
  const [reflectionQuestions, setReflectionQuestions] = useState([]);
  const [streakSettings, setStreakSettings] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(80);
  const [goldenBorderEnabled, setGoldenBorderEnabled] = useState(true);
  const [showReflectionOnToday, setShowReflectionOnToday] = useState(false);
  const [hasUsedSwipe, setHasUsedSwipe] = useState(false);
  const [hasDismissedInstallBanner, setHasDismissedInstallBanner] = useState(false);
  const [confetti, setConfetti] = useState([]);
  const [celebrationMsg, setCelebrationMsg] = useState(null);
  const [celebrationOverlay, setCelebrationOverlay] = useState(null);
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
          const settings = migrateSettings(JSON.parse(settingsResult.value));
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
          if (settings.hasUsedSwipe !== undefined) setHasUsedSwipe(settings.hasUsedSwipe);
          if (settings.hasDismissedInstallBanner !== undefined) setHasDismissedInstallBanner(settings.hasDismissedInstallBanner);
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
          hasUsedSwipe,
          hasDismissedInstallBanner,
          modules,
          hasOnboarded,
          language: languageSetting,
        }));
      } catch {}
    };
    saveSettings();
  }, [darkMode, reflectionQuestions, recurringTasks, streakSettings, soundEnabled, soundVolume, goldenBorderEnabled, showReflectionOnToday, hasUsedSwipe, hasDismissedInstallBanner, modules, hasOnboarded, languageSetting, loading]);

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
            id: genId('task'),
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
    setConfetti(buildConfetti());
    setCelebrationMsg(message);
    setTimeout(() => setConfetti([]), CONFETTI_CONFIG.fadeOutMs);
    setTimeout(() => setCelebrationMsg(null), CONFETTI_CONFIG.messageFadeMs);
  };

  // Counter-modules met celebration aan tonen een Lottie-overlay i.p.v. de
  // confetti-toast — eenmalig per dag, gemarkeerd via celebrationShown in
  // dayData. Andere counters en de "alles voltooid"-celebratie houden de toast.
  const tryCounterCelebration = (mod, message) => {
    const cel = mod?.celebration;
    const alreadyShown = moduleData[mod.id]?.celebrationShown === true;
    if (cel?.enabled && cel.mode === 'overlay' && !alreadyShown) {
      setCelebrationOverlay({ moduleId: mod.id, animationId: cel.animation });
      updateModuleData(mod.id, prev => ({ ...prev, celebrationShown: true }));
    } else {
      triggerCelebration(message);
    }
  };

  // Check overall completion
  useEffect(() => {
    if (loading) return;
    const enabledModules = modules.filter(m => m.enabled && canCountInStreak(m.type));
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
        triggerCelebration(t('today.allModulesCompleted'));
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
      tryCounterCelebration(mod, t('today.goalReached', { name: resolveModuleName(mod, t) }));
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
      tryCounterCelebration(mod, t('today.goalReached', { name: resolveModuleName(mod, t) }));
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

  const addCollectionItem = (moduleId, item) => {
    if (!item || !item.name || !item.name.trim()) return null;
    updateCollectionModule(moduleId, (m) => ({
      ...m,
      items: [...(m.items || []), item],
    }));
    return item;
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

  // ---- measurements handlers --------------------------------------------

  const updateMeasurementsModule = (updatedModule) => {
    setModules(prev => prev.map(m =>
      m.id === updatedModule.id && m.type === 'measurements' ? updatedModule : m
    ));
  };

  const openModuleEditor = (type) => {
    const defaultIcon = type === 'projects'
      ? 'GraduationCap'
      : type === 'measurements'
        ? 'Heart'
        : 'Star';
    setEditingModule({
      id: `mod_${Date.now()}`,
      name: '',
      icon: defaultIcon,
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
      ...(type === 'measurements' ? {
        metrics: [],
      } : {}),
    });
  };

  const openCollectionCreator = () => {
    setEditingModule({
      id: `mod_${Date.now()}`,
      name: '',
      icon: 'Star',
      color: 'blue',
      enabled: false,
      countInStreak: false,
      type: 'collection',
      trackingMode: 'completion',
      itemFields: { rating: true, notes: true, tags: true },
      tagGroups: [],
      items: [],
    });
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
      if (!checkFn(dayData, d)) break;
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

    if (mod.type === 'sleep') {
      return calculateStreak((dayData, date) => {
        const goals = goalsForNight(mod.goals, date);
        if (!goals?.bed || !goals?.wake) return false;
        return isOnTarget(dayData.moduleData?.[mod.id], goals, mod.toleranceMinutes ?? 15);
      });
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

  const dayNames = shortWeekdayLabelsMondayFirst();
  const monthNames = longMonthLabels();

  const theme = darkMode ? {
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
  const enabledNonTaskModules = modules.filter(m => m.enabled && canCountInStreak(m.type));
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
    return <OnboardingView onComplete={(selectedModules) => {
      setModules(selectedModules);
      setHasOnboarded(true);
    }} theme={theme} darkMode={darkMode} />;
  }

  const enabledModules = modules.filter(m => m.enabled && m.type !== 'collection');

  const todayVisibleModules = editable
    ? enabledModules
    : enabledModules.filter(m => moduleStatusForDay(m, { moduleData }, activeDate) !== 'none');

  const renderTodayModule = (mod) => {
    if (mod.type === 'projects') {
      return (
        <ProjectsModule
          key={mod.id}
          module={mod}
          Icon={ICON_OPTIONS[mod.icon] || Sparkles}
          onOpen={(id) => { setSelectedProjectId(id); setView('projects'); }}
          onEdit={() => setEditingModule(mod)}
          theme={theme}
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
          theme={theme}
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
          theme={theme}
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
        theme={theme}
        darkMode={darkMode}
      />
    );
  };

  return (
    <ToastProvider>
    <div className={`min-h-screen ${theme.bg} p-4 transition-colors duration-300 relative overflow-hidden`}>
      <Toast theme={theme} />
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

      {celebrationOverlay && (
        <CelebrationOverlay
          animationId={celebrationOverlay.animationId}
          onClose={() => setCelebrationOverlay(null)}
        />
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
              <h1 className={`text-3xl font-bold ${theme.text}`}>{t('app.title')}</h1>
              <span className={`text-sm ${theme.textMuted}`}>· {t('app.tagline')}</span>
            </div>
            <p className={`${theme.textMuted} text-sm`}>
              {new Date().toLocaleDateString(language === 'nl' ? 'nl-NL' : 'en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 ${theme.card} rounded-xl shadow-sm ${theme.hover} transition`}
            >
              {darkMode ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-600" />}
            </button>
            <button
              onClick={() => setView('insight')}
              aria-label={t('insight.headerButtonAria')}
              className={`p-2 ${theme.card} rounded-xl shadow-sm ${theme.hover} transition ${view === 'insight' ? 'ring-2 ring-blue-400' : ''}`}
            >
              <BarChart3 className={`w-5 h-5 ${view === 'insight' ? 'text-blue-500' : theme.textSecondary}`} />
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className={`p-2 ${theme.card} rounded-xl shadow-sm ${theme.hover} transition`}
            >
              <Settings className={`w-5 h-5 ${theme.textSecondary}`} />
            </button>
          </div>
        </div>

        <TabBar
          modules={modules}
          view={view}
          setView={setView}
          theme={theme}
          moreOpen={moreOpen}
          setMoreOpen={setMoreOpen}
          moreMenuRef={moreMenuRef}
        />

        {view === 'today' && (
          <TodayView
            t={t}
            theme={theme}
            activeDate={activeDate}
            setActiveDate={setActiveDate}
            editable={editable}
            goldenBorderEnabled={goldenBorderEnabled}
            todayFullyComplete={todayFullyComplete}
            hasDismissedInstallBanner={hasDismissedInstallBanner}
            setHasDismissedInstallBanner={setHasDismissedInstallBanner}
            enabledModules={enabledModules}
            todayVisibleModules={todayVisibleModules}
            getModuleStreak={getModuleStreak}
            renderTodayModule={renderTodayModule}
            totalCompletionItems={totalCompletionItems}
            completedItems={completedItems}
            overallPercentage={overallPercentage}
            setShowSettings={setShowSettings}
            setView={setView}
            showReflectionOnToday={showReflectionOnToday}
            reflectionQuestions={reflectionQuestions}
            reflectionAnswers={reflectionAnswers}
            setReflectionAnswers={setReflectionAnswers}
            StreakBadge={StreakBadge}
          />
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
            theme={theme}
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
            onDeleteProjectModule={(projectId) => {
              setModules(prev => prev.filter(m => m.id !== projectId));
              if (selectedProjectId === projectId) setSelectedProjectId(null);
            }}
            hasUsedSwipe={hasUsedSwipe}
            onFirstSwipe={() => setHasUsedSwipe(true)}
            theme={theme}
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
            onDeleteCollection={(collectionId) => {
              setModules(prev => prev.filter(m => m.id !== collectionId));
            }}
            onCreate={openCollectionCreator}
            onEditCollection={(mod) => setEditingModule(mod)}
            hasUsedSwipe={hasUsedSwipe}
            onFirstSwipe={() => setHasUsedSwipe(true)}
            theme={theme}
          />
        )}

        {view === 'measurements' && (
          <MeasurementsView
            module={modules.find(m => m.enabled && m.type === 'measurements')}
            onUpdateModule={updateMeasurementsModule}
            onCreate={() => openModuleEditor('measurements')}
            onEditModule={(mod) => setEditingModule(mod)}
            theme={theme}
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
            theme={theme}
            darkMode={darkMode}
            monthNames={monthNames}
            dayNames={dayNames}
            goldenBorderEnabled={goldenBorderEnabled}
          />
        )}

        {view === 'household' && (
          <HouseholdView theme={theme} darkMode={darkMode} />
        )}

        {view === 'insight' && (
          <InsightView
            modules={modules}
            history={history}
            theme={theme}
            darkMode={darkMode}
            t={t}
          />
        )}

        {view === 'reflection' && (
          <ReflectionView
            reflectionQuestions={reflectionQuestions}
            reflectionAnswers={reflectionAnswers}
            setReflectionAnswers={setReflectionAnswers}
            history={history}
            today={todayKey}
            theme={theme}
            darkMode={darkMode}
          />
        )}

        <div className={`text-center text-xs ${theme.textMuted} mt-6 pb-4`}>
          {t('app.autosave')}
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
          theme={theme}
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
          theme={theme}
        />
      )}
    </div>
    </ToastProvider>
  );
}

// =============================================
// MODULE RENDERER
// =============================================
function ModuleRenderer({ module: mod, data, editable = true, onChecklistToggle, onChecklistIncrement, onChecklistNote, onChoiceToggle, onChoiceOptionSet, onEdit, weekDates, history, customTasks, newTask, setNewTask, addTask, toggleTask, deleteTask, theme, darkMode }) {
  const { t } = useTranslation();
  const modName = resolveModuleName(mod, t);
  const editButton = onEdit ? (
    <button
      onClick={onEdit}
      className={`ml-auto p-1.5 ${theme.hover} rounded-lg ${theme.textMuted} transition`}
      title={t('modules.settingsTitle')}
      aria-label={t('modules.settingsAria', { name: modName })}
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
        theme={theme}
      />
    );
  }

  if (mod.type === 'choice') {
    const options = mod.options || [];
    const selectedLabel = options.find(o => o.id === data.selectedOption)?.label;
    return (
      <div className={`${theme.card} rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <h2 className={`font-semibold ${theme.textSecondary}`}>{modName}</h2>
          {editButton}
        </div>
        {options.length === 0 ? (
          <p className={`${theme.textMuted} text-sm text-center py-4`}>
            {t('modules.addOptionsHint')}
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
                        : `${theme.cardSecondary} ${theme.textMuted}`
                    } ${!editable && !isActive ? 'opacity-50' : ''}`}
                  >
                    {isActive && <Check className="w-4 h-4" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {data.completed && data.selectedOption && (
              <p className={`text-xs ${theme.textMuted} mt-2 text-center`}>
                {t('modules.chosenHint', { label: selectedLabel })}
              </p>
            )}
          </>
        )}
      </div>
    );
  }


  if (mod.type === 'tasks') {
    return (
      <div className={`${theme.card} rounded-2xl p-5 shadow-sm mb-4`}>
        <div className="flex items-center gap-2 mb-4">
          <Icon className={`w-5 h-5 ${colorClass}`} />
          <h2 className={`font-semibold ${theme.textSecondary}`}>{modName}</h2>
          {editButton}
        </div>
        
        {editable && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder={t('modules.addTaskPlaceholder')}
              className={`flex-1 px-3 py-2 ${theme.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-${mod.color}-300`}
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
            <p className={`text-sm ${theme.textMuted} text-center py-4`}>
              {editable ? t('modules.noTasksAdded') : t('modules.noTasksOnDay')}
            </p>
          ) : (
            customTasks.map(task => (
              <div key={task.id} className={`flex items-center gap-3 p-2 ${theme.cardSecondary} rounded-lg group`}>
                <button
                  onClick={() => toggleTask(task.id)}
                  disabled={!editable}
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 disabled:cursor-not-allowed ${
                    task.done ? `bg-${mod.color}-500 border-${mod.color}-500 check-pop` : 'border-slate-300'
                  }`}
                >
                  {task.done && <Check className="w-3 h-3 text-white" />}
                </button>
                {task.recurringId && <Repeat className={`w-3 h-3 ${theme.textMuted} flex-shrink-0`} />}
                <span className={`flex-1 text-sm ${task.done ? `line-through ${theme.textMuted}` : theme.textSecondary}`}>
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
function StreakBadge({ label, days, color, theme }) {
  const { t } = useTranslation();
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
        <div className="text-xs text-white/90">{days === 1 ? t('common.day') : t('common.days')}</div>
      </div>
      <div className={`text-xs ${theme.textMuted} truncate`}>{label}</div>
    </div>
  );
}

// =============================================
// WEEK VIEW
// =============================================
function WeekView({ modules, history, today, activeDateKey, moduleData, activeWeekStart, setActiveWeekStart, weekDates, dayNames, onPickDay, theme, darkMode, goldenBorderEnabled }) {
  const { t } = useTranslation();
  const enabledNonTaskModules = modules.filter(m => m.enabled && canCountInStreak(m.type));
  const atCurrentWeek = sameDay(activeWeekStart, startOfWeek(new Date()));

  const dayDataFor = (dateStr) => (
    dateStr === activeDateKey ? { moduleData } : history[dateStr]
  );

  return (
    <div className={`${theme.card} rounded-2xl p-5 shadow-sm slide-in`}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <button
          onClick={() => setActiveWeekStart(addDays(activeWeekStart, -7))}
          aria-label={t('dates.previousWeekAria')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${theme.hover} ${theme.textSecondary} transition`}
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 text-center">
          <div className="flex items-center justify-center gap-2">
            <TrendingUp className="w-4 h-4 text-blue-500" />
            <h2 className={`font-semibold ${theme.textSecondary}`}>{formatWeekTitle(activeWeekStart)}</h2>
          </div>
          <div className={`text-xs ${theme.textMuted}`}>{formatWeekRange(activeWeekStart)}</div>
        </div>
        <button
          onClick={() => setActiveWeekStart(addDays(activeWeekStart, 7))}
          disabled={atCurrentWeek}
          aria-label={t('dates.nextWeekAria')}
          className={`w-9 h-9 rounded-lg flex items-center justify-center ${theme.hover} ${theme.textSecondary} transition disabled:opacity-30 disabled:cursor-not-allowed`}
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
              <div className={`text-xs font-medium mb-1 ${isTodayCell ? 'text-blue-500' : theme.textMuted}`}>
                {dayNames[i]}
              </div>
              <button
                onClick={() => !future && onPickDay?.(dateObj)}
                disabled={future}
                style={bg ? { background: bg } : undefined}
                className={`relative w-full h-20 rounded-lg overflow-hidden flex items-center justify-center transition ${
                  bg ? '' : theme.progressBg
                } ${isTodayCell ? 'ring-2 ring-blue-400' : ''} ${
                  future ? 'opacity-30 cursor-not-allowed' : 'hover:opacity-90'
                } ${(goldenBorderEnabled && fullyComplete) ? 'ritmo-golden-border' : ''}`}
                aria-label={t('dates.openDay', { date })}
              >
                <span className={`text-sm font-bold ${bg ? 'text-white drop-shadow' : theme.textSecondary}`}>
                  {dayNum}
                </span>
              </button>
            </div>
          );
        })}
      </div>

      <div className={`space-y-3 pt-4 border-t ${theme.border}`}>
        {enabledNonTaskModules.map(mod => {
          const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
          let label = '';
          let value = '';

          if (mod.type === 'checklist') {
            const fullDays = weekDates.filter(d => {
              const data = d === activeDateKey ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id];
              return data && mod.items.every(i => data[i.id]);
            }).length;
            label = resolveModuleName(mod, t);
            value = t('week.fullDays', { n: fullDays });
          } else if (mod.type === 'choice') {
            const days = weekDates.filter(d => {
              const data = d === activeDateKey ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id];
              return data?.completed;
            }).length;
            label = resolveModuleName(mod, t);
            value = t('week.daysCount', { n: days });
          } else if (mod.type === 'counter') {
            const unit = mod.unit || 'minutes';
            const total = weekDates.reduce((sum, d) => {
              const data = d === activeDateKey ? moduleData[mod.id] : history[d]?.moduleData?.[mod.id];
              return sum + (data?.total ?? data?.minutes ?? 0);
            }, 0);
            const weekMax = mod.weeklyMax ?? mod.weeklyMaxMinutes;
            label = resolveModuleName(mod, t);
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
            label = resolveModuleName(mod, t);
            value = summary.nightsLogged === 0
              ? t('week.noData')
              : `${formatDuration(summary.averageDurationMinutes)} · ${t('week.onRhythm', { n: summary.nightsOnTarget })}`;
          }

          return (
            <div key={mod.id} className={`flex items-center justify-between p-3 ${darkMode ? `bg-${mod.color}-900/20` : `bg-${mod.color}-50`} rounded-lg`}>
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 text-${mod.color}-500`} />
                <span className={`text-sm font-medium ${theme.textSecondary}`}>{label}</span>
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
function MonthView({ calendarMonth, setCalendarMonth, history, today, activeDateKey, moduleData, modules, onPickDay, theme, darkMode, monthNames, dayNames, goldenBorderEnabled }) {
  const { t } = useTranslation();
  const [filterModuleId, setFilterModuleId] = useState('all');
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

  const filterModule = filterModuleId === 'all'
    ? null
    : modules.find(m => m.id === filterModuleId) || null;

  const cellBackground = (dateStr, dateObj) => {
    if (!filterModule) {
      return buildDayCellBackground(modules, dayDataFor(dateStr), dateObj);
    }
    const status = moduleStatusForDay(filterModule, dayDataFor(dateStr), dateObj);
    return status === 'full' ? getColorHex(filterModule.color) : null;
  };

  const monthDays = cells.filter(c => c !== null);
  const completedDays = monthDays.filter(d => cellBackground(d, parseDateKey(d)) !== null).length;
  const partialDays = monthDays.filter(d => {
    const data = dayDataFor(d);
    if (!data?.moduleData) return false;
    const dateObj = parseDateKey(d);
    if (cellBackground(d, dateObj) !== null) return false;
    if (filterModule) {
      return moduleStatusForDay(filterModule, data, dateObj) === 'partial';
    }
    return modules.some(m => m.enabled && canCountInStreak(m.type) &&
      moduleStatusForDay(m, data, dateObj) !== 'none');
  }).length;

  const filterableModules = modules.filter(m => m.enabled && canCountInStreak(m.type));

  return (
    <div className={`${theme.card} rounded-2xl p-5 shadow-sm slide-in`}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => setCalendarMonth(new Date(year, month - 1, 1))} className={`p-2 ${theme.hover} rounded-lg transition`}>
          <ChevronLeft className={`w-5 h-5 ${theme.textSecondary}`} />
        </button>
        <h2 className={`font-semibold ${theme.textSecondary}`}>{monthNames[month]} {year}</h2>
        <button onClick={() => setCalendarMonth(new Date(year, month + 1, 1))} className={`p-2 ${theme.hover} rounded-lg transition`}>
          <ChevronRight className={`w-5 h-5 ${theme.textSecondary}`} />
        </button>
      </div>

      {filterableModules.length > 0 && (
        <div className="flex items-center justify-end gap-2 mb-3">
          <label className={`text-xs ${theme.textMuted}`} htmlFor="month-module-filter">
            {t('month.filter')}
          </label>
          <select
            id="month-module-filter"
            value={filterModuleId}
            onChange={(e) => setFilterModuleId(e.target.value)}
            className={`px-2 py-1 ${theme.input} rounded text-xs`}
          >
            <option value="all">{t('month.filterAll')}</option>
            {filterableModules.map(m => (
              <option key={m.id} value={m.id}>{resolveModuleName(m, t)}</option>
            ))}
          </select>
        </div>
      )}

      <div className="grid grid-cols-7 gap-1 mb-2">
        {dayNames.map(d => (
          <div key={d} className={`text-center text-xs font-medium ${theme.textMuted} py-1`}>{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 mb-4">
        {cells.map((dateStr, i) => {
          if (!dateStr) return <div key={i} />;
          const day = parseInt(dateStr.slice(8));
          const isTodayCell = dateStr === today;
          const dateObj = parseDateKey(dateStr);
          const future = isFuture(dateObj);
          const bg = cellBackground(dateStr, dateObj);
          const fullyComplete = !filterModule && isDayFullyComplete(modules, dayDataFor(dateStr), dateObj);

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
              aria-label={t('dates.openDay', { date: dateStr })}
            >
              <span className={bg ? 'text-white drop-shadow' : theme.textSecondary}>{day}</span>
            </button>
          );
        })}
      </div>

      <p className={`text-xs ${theme.textMuted} mb-4 text-center`}>
        {t('month.clickDay')}
      </p>

      <div className={`grid grid-cols-2 gap-2 pt-4 border-t ${theme.border}`}>
        <div className={`${darkMode ? 'bg-green-900/20' : 'bg-green-50'} p-3 rounded-lg text-center`}>
          <Trophy className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          <div className={`text-xl font-bold ${darkMode ? 'text-green-300' : 'text-green-600'}`}>{completedDays}</div>
          <div className={`text-xs ${theme.textMuted}`}>{t('month.fullyCompleted')}</div>
        </div>
        <div className={`${darkMode ? 'bg-blue-900/20' : 'bg-blue-50'} p-3 rounded-lg text-center`}>
          <Calendar className={`w-4 h-4 mx-auto mb-1 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          <div className={`text-xl font-bold ${darkMode ? 'text-blue-300' : 'text-blue-600'}`}>{partialDays}</div>
          <div className={`text-xs ${theme.textMuted}`}>{t('month.partial')}</div>
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
          ? t('month.noSleepData')
          : `${formatDuration(summary.averageDurationMinutes)} · ${t('month.onRhythmOf', { n: summary.nightsOnTarget, total: monthDays.length })}`;
        return (
          <div key={mod.id} className={`mt-3 flex items-center justify-between p-3 ${darkMode ? `bg-${mod.color}-900/20` : `bg-${mod.color}-50`} rounded-lg`}>
            <div className="flex items-center gap-2">
              <Icon className={`w-4 h-4 text-${mod.color}-500`} />
              <span className={`text-sm font-medium ${theme.textSecondary}`}>{resolveModuleName(mod, t)}</span>
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
function ReflectionView({ reflectionQuestions, reflectionAnswers, setReflectionAnswers, history, today, theme, darkMode }) {
  const { t } = useTranslation();
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
      <div className={`${theme.card} rounded-2xl p-5 shadow-sm`}>
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-blue-500" />
          <h2 className={`font-semibold ${theme.textSecondary}`}>{t('reflection.title')}</h2>
        </div>

        <div className="mb-4">
          <label className={`text-xs ${theme.textMuted} mb-1 block`}>{t('reflection.date')}</label>
          <input
            type="date"
            value={selectedDate}
            max={today}
            onChange={(e) => setSelectedDate(e.target.value)}
            className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
          />
        </div>

        <div className="space-y-4">
          {reflectionQuestions.map((q, i) => (
            <div key={i}>
              <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{q}</label>
              {isToday ? (
                <textarea
                  value={answers[q] || ''}
                  onChange={(e) => setReflectionAnswers(prev => ({ ...prev, [q]: e.target.value }))}
                  placeholder={t('reflection.placeholder')}
                  className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-blue-300`}
                />
              ) : (
                <div className={`px-3 py-2 ${theme.cardSecondary} rounded-lg text-sm min-h-[60px] ${theme.textSecondary}`}>
                  {answers[q] || <span className={theme.textMuted}>{t('reflection.noAnswer')}</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <p className={`text-xs ${theme.textMuted} mt-4`}>{t('reflection.editHint')}</p>
      </div>

      {datesWithReflections.length > 0 && (
        <div className={`${theme.card} rounded-2xl p-5 shadow-sm`}>
          <h3 className={`font-semibold ${theme.textSecondary} mb-3 text-sm`}>{t('reflection.earlier')}</h3>
          <div className="space-y-2">
            {datesWithReflections.slice(0, 10).map(date => (
              <button
                key={date}
                onClick={() => setSelectedDate(date)}
                className={`w-full text-left px-3 py-2 ${theme.cardSecondary} ${theme.hover} rounded-lg text-sm transition flex items-center justify-between`}
              >
                <span className={theme.textSecondary}>
                  {new Date(date).toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' })}
                </span>
                <ChevronRight className={`w-4 h-4 ${theme.textMuted}`} />
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
function SettingsModal({ onClose, modules, setModules, reflectionQuestions, setReflectionQuestions, recurringTasks, setRecurringTasks, streakSettings, setStreakSettings, darkMode, setDarkMode, soundEnabled, setSoundEnabled, soundVolume, setSoundVolume, goldenBorderEnabled, setGoldenBorderEnabled, showReflectionOnToday, setShowReflectionOnToday, theme, dayNames, setEditingModule }) {
  const { t, languageSetting, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState('modules');
  const [helpView, setHelpView] = useState(null); // null | 'list' | 'install' | 'feedback'
  const [reorderMode, setReorderMode] = useState(false);
  const [androidPromptable, setAndroidPromptable] = useState(false);
  useEffect(() => {
    return onPromptAvailableChange(setAndroidPromptable);
  }, []);
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
    list: t('help.title'),
    install: t('help.install'),
    feedback: t('help.feedback'),
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
      <div className={`${theme.card} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto my-4`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 min-w-0">
            {helpView !== null && (
              <button
                onClick={handleBack}
                className={`p-2 ${theme.hover} rounded-lg`}
                aria-label={t('settings.backAria')}
              >
                <ChevronLeft className={`w-5 h-5 ${theme.textSecondary}`} />
              </button>
            )}
            <h2 className={`text-xl font-bold ${theme.text} truncate`}>
              {helpView === null ? t('settings.title') : helpTitles[helpView]}
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {helpView === null && (
              <button
                onClick={() => setHelpView('list')}
                className={`p-2 ${theme.hover} rounded-lg`}
                aria-label={t('settings.helpAria')}
              >
                <HelpCircle className={`w-5 h-5 ${theme.textSecondary}`} />
              </button>
            )}
            <button onClick={onClose} className={`p-2 ${theme.hover} rounded-lg`} aria-label={t('settings.closeAria')}>
              <X className={`w-5 h-5 ${theme.textSecondary}`} />
            </button>
          </div>
        </div>

        {helpView === 'list' && (
          <HelpOverlay theme={theme} onSelect={setHelpView} />
        )}

        {helpView === 'install' && (
          <InstallGuide theme={theme} />
        )}

        {helpView === 'feedback' && (
          <FeedbackForm theme={theme} onBack={() => setHelpView('list')} />
        )}

        {helpView === null && (
        <>
        <div className={`flex gap-1 mb-6 ${theme.cardSecondary} rounded-xl p-1`}>
          {[
            { id: 'modules', label: t('settings.tabModules') },
            { id: 'streaks', label: t('settings.tabStreaks') },
            { id: 'reflect', label: t('settings.tabReflection') },
            { id: 'theme', label: t('settings.tabTheme') },
            { id: 'language', label: t('settings.tabLanguage') },
            { id: 'install', label: t('install.settingsHeader') },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                activeTab === tab.id ? 'bg-blue-500 text-white' : `${theme.textMuted}`
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'modules' && (
          <div>
            <div className="flex items-center justify-between gap-2 mb-2">
              <h3 className={`font-semibold ${theme.textSecondary}`}>{t('settings.manageModules')}</h3>
              <button
                onClick={() => setReorderMode(v => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  reorderMode
                    ? 'bg-slate-700 text-white'
                    : `border ${theme.border} ${theme.textSecondary} ${theme.hover}`
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                {reorderMode ? t('settings.reorderToggleOn') : t('settings.reorderToggleOff')}
              </button>
            </div>
            <p className={`text-xs ${theme.textMuted} mb-4`}>
              {reorderMode ? t('settings.reorderHint') : t('settings.manageHint')}
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
                    className={`flex items-center gap-2 p-3 ${theme.cardSecondary} rounded-lg transition ${
                      reorderMode ? 'cursor-default' : 'cursor-pointer'
                    } ${isDragging ? 'opacity-40' : ''} ${isDragOver ? `ring-2 ring-${mod.color}-400` : ''}`}
                  >
                    {reorderMode && (
                      <span className={`${theme.textMuted} touch-none cursor-grab active:cursor-grabbing`} aria-hidden>
                        <GripVertical className="w-4 h-4" />
                      </span>
                    )}
                    {!reorderMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setModules(prev => prev.map(m => m.id === mod.id ? { ...m, enabled: !m.enabled } : m));
                        }}
                        className={`p-1.5 rounded transition ${mod.enabled ? `text-${mod.color}-500` : theme.textMuted}`}
                        title={mod.enabled ? t('common.hide') : t('common.show')}
                      >
                        {mod.enabled ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                    )}
                    <Icon className={`w-4 h-4 ${mod.enabled ? `text-${mod.color}-500` : theme.textMuted}`} />
                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-medium ${mod.enabled ? theme.textSecondary : theme.textMuted}`}>
                        {resolveModuleName(mod, t)}
                      </div>
                      <div className={`text-xs ${theme.textMuted}`}>
                        {mod.type === 'checklist' && t('modules.summary.checklistItems', { n: (mod.items || []).length })}
                        {mod.type === 'choice' && t('modules.summary.choice')}
                        {mod.type === 'counter' && t('modules.summary.counter', { goal: formatAmount(mod.dailyGoal ?? mod.dailyGoalMinutes ?? 0, mod.unit || 'minutes') })}
                        {mod.type === 'tasks' && t('modules.summary.tasks')}
                      </div>
                    </div>
                    {reorderMode && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModule(mod.id, -1); }}
                          disabled={isFirst}
                          aria-label={t('common.moveUp')}
                          className={`p-1.5 rounded transition ${theme.hover} ${theme.textSecondary} disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); moveModule(mod.id, 1); }}
                          disabled={isLast}
                          aria-label={t('common.moveDown')}
                          className={`p-1.5 rounded transition ${theme.hover} ${theme.textSecondary} disabled:opacity-30 disabled:cursor-not-allowed`}
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
                })}
                className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-sm font-medium text-slate-500 hover:text-blue-500 transition flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {t('modules.add')}
              </button>
            )}

            <button
              onClick={() => {
                if (window.confirm(t('settings.resetConfirm'))) {
                  setModules(instantiateDefaults(DEFAULT_MODULES));
                  setStreakSettings({});
                }
              }}
              className={`w-full mt-3 py-2 text-xs ${theme.textMuted} hover:text-red-500 transition`}
            >
              {t('settings.resetModules')}
            </button>
          </div>
        )}

        {activeTab === 'streaks' && (() => {
          const activeCount = modules.filter(m => m.countInStreak === true).length;
          return (
            <div>
              <h3 className={`font-semibold ${theme.textSecondary} mb-3`}>{t('settings.streaksManage')}</h3>
              <p className={`text-xs ${theme.textMuted} mb-4`}>
                {t('settings.streaksHint')}
              </p>

              <div className={`${theme.cardSecondary} rounded-lg p-3 mb-4 text-sm ${theme.textSecondary}`}>
                {t('settings.streaksActive', { active: activeCount })}
              </div>

              <div className="space-y-4">
                {modules.filter(m => m.enabled && canCountInStreak(m.type)).map(mod => {
                  const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
                  const setting = streakSettings[mod.id] || {};
                  const isActive = mod.countInStreak === true;
                  const atMax = activeCount >= 4 && !isActive;

                  return (
                    <div
                      key={mod.id}
                      className={`p-3 ${theme.cardSecondary} rounded-lg transition ${
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
                        <span className={`font-medium text-sm ${theme.textSecondary}`}>{resolveModuleName(mod, t)}</span>
                        {atMax && (
                          <span className={`ml-auto text-xs ${theme.textMuted}`}>{t('settings.streaksMax')}</span>
                        )}
                      </div>

                      {isActive && mod.type === 'checklist' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setStreakSettings(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], requireAll: true } }))}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition ${
                              setting.requireAll !== false ? `bg-${mod.color}-500 text-white` : `${theme.card} ${theme.textMuted}`
                            }`}
                          >
                            {t('settings.streakAllItems')}
                          </button>
                          <button
                            onClick={() => setStreakSettings(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], requireAll: false } }))}
                            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition ${
                              setting.requireAll === false ? `bg-${mod.color}-500 text-white` : `${theme.card} ${theme.textMuted}`
                            }`}
                          >
                            {t('settings.streakAtLeastOne')}
                          </button>
                        </div>
                      )}

                      {isActive && mod.type === 'counter' && (mod.unit || 'minutes') === 'minutes' && (
                        <div>
                          <label className={`text-xs ${theme.textMuted} mb-2 block`}>{t('settings.streakMinutesGoal')}</label>
                          <div className="flex gap-1">
                            {[30, 60, 90, 120, 180, 240].map(min => {
                              const current = setting.minutesGoal ?? mod.dailyGoal ?? mod.dailyGoalMinutes;
                              return (
                                <button
                                  key={min}
                                  onClick={() => setStreakSettings(prev => ({ ...prev, [mod.id]: { ...prev[mod.id], minutesGoal: min } }))}
                                  className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                                    current === min ? `bg-${mod.color}-500 text-white` : `${theme.card} ${theme.textMuted}`
                                  }`}
                                >
                                  {min < 60 ? `${min}${t('common.minute_short')}` : `${min/60}${t('common.hour_short')}`}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {isActive && mod.type === 'counter' && (mod.unit || 'minutes') !== 'minutes' && (
                        <p className={`text-xs ${theme.textMuted}`}>
                          {t('settings.streakCounterUnitHint', { goal: formatAmount(mod.dailyGoal ?? 0, mod.unit) })}
                        </p>
                      )}

                      {isActive && mod.type === 'choice' && (
                        <p className={`text-xs ${theme.textMuted}`}>
                          {t('settings.streakChoiceHint')}
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
            <h3 className={`font-semibold ${theme.textSecondary} mb-3`}>{t('settings.reflectionQuestions')}</h3>
            <ReflectionSettings
              reflectionQuestions={reflectionQuestions}
              setReflectionQuestions={setReflectionQuestions}
              recurringTasks={recurringTasks}
              setRecurringTasks={setRecurringTasks}
              theme={theme}
              dayNames={dayNames}
            />
          </div>
        )}

        {activeTab === 'theme' && (
          <div>
            <h3 className={`font-semibold ${theme.textSecondary} mb-3`}>{t('settings.theme')}</h3>
            <div className="flex gap-2">
              <button
                onClick={() => setDarkMode(false)}
                className={`flex-1 py-3 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                  !darkMode ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                }`}
              >
                <Sun className="w-4 h-4" /> {t('settings.themeLight')}
              </button>
              <button
                onClick={() => setDarkMode(true)}
                className={`flex-1 py-3 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                  darkMode ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                }`}
              >
                <Moon className="w-4 h-4" /> {t('settings.themeDark')}
              </button>
            </div>

            <div className={`mt-6 pt-6 border-t ${theme.border}`}>
              <h3 className={`font-semibold ${theme.textSecondary} mb-3`}>{t('settings.effects')}</h3>

              <label className={`flex items-center justify-between gap-3 p-3 ${theme.cardSecondary} rounded-lg mb-3`}>
                <div className="min-w-0">
                  <span className={`text-sm font-medium ${theme.textSecondary}`}>{t('settings.goldenBorder')}</span>
                  <p className={`text-xs ${theme.textMuted} mt-0.5`}>{t('settings.goldenBorderHint')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={goldenBorderEnabled}
                  onChange={(e) => setGoldenBorderEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer flex-shrink-0"
                />
              </label>

              <label className={`flex items-center justify-between gap-3 p-3 ${theme.cardSecondary} rounded-lg mb-3`}>
                <div className="min-w-0">
                  <span className={`text-sm font-medium ${theme.textSecondary}`}>{t('settings.showReflection')}</span>
                  <p className={`text-xs ${theme.textMuted} mt-0.5`}>{t('settings.showReflectionHint')}</p>
                </div>
                <input
                  type="checkbox"
                  checked={showReflectionOnToday}
                  onChange={(e) => setShowReflectionOnToday(e.target.checked)}
                  className="w-4 h-4 cursor-pointer flex-shrink-0"
                />
              </label>
            </div>

            <div className={`mt-6 pt-6 border-t ${theme.border}`}>
              <h3 className={`font-semibold ${theme.textSecondary} mb-3`}>{t('settings.sounds')}</h3>

              <label className={`flex items-center justify-between p-3 ${theme.cardSecondary} rounded-lg mb-3`}>
                <span className={`text-sm font-medium ${theme.textSecondary}`}>{t('settings.soundEffects')}</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="w-4 h-4 cursor-pointer"
                />
              </label>

              <div className={`flex items-center gap-3 p-3 ${theme.cardSecondary} rounded-lg mb-3 ${!soundEnabled ? 'opacity-40' : ''}`}>
                <span className={`text-sm font-medium ${theme.textSecondary} min-w-[60px]`}>{t('settings.volume')}</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={soundVolume}
                  onChange={(e) => setSoundVolume(parseInt(e.target.value, 10))}
                  disabled={!soundEnabled}
                  className="flex-1"
                />
                <span className={`text-sm ${theme.textMuted} min-w-[40px] text-right`}>{soundVolume}%</span>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => playSound('tick', { enabled: true, volume: soundVolume })}
                  className={`flex-1 py-2 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-lg text-xs font-medium transition`}
                >
                  {t('settings.testTick')}
                </button>
                <button
                  onClick={() => playSound('pop', { enabled: true, volume: soundVolume })}
                  className={`flex-1 py-2 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-lg text-xs font-medium transition`}
                >
                  {t('settings.testPop')}
                </button>
                <button
                  onClick={() => playSound('chime', { enabled: true, volume: soundVolume })}
                  className={`flex-1 py-2 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-lg text-xs font-medium transition`}
                >
                  {t('settings.testChime')}
                </button>
              </div>

              <p className={`text-xs ${theme.textMuted} mt-3`}>
                {t('settings.soundsHint')}
              </p>
            </div>
          </div>
        )}

        {activeTab === 'language' && (
          <div>
            <h3 className={`font-semibold ${theme.textSecondary} mb-3`}>{t('settings.language')}</h3>
            <div className="space-y-2">
              {[
                { value: 'auto', label: t('settings.languageAuto') },
                { value: 'nl', label: 'Nederlands' },
                { value: 'en', label: 'English' },
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setLanguage(opt.value)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg text-sm font-medium transition ${
                    languageSetting === opt.value
                      ? 'bg-blue-500 text-white'
                      : `${theme.cardSecondary} ${theme.textSecondary}`
                  }`}
                >
                  <span>{opt.label}</span>
                  {languageSetting === opt.value && <Check className="w-4 h-4" />}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'install' && (
          <div className="space-y-3">
            <h3 className={`font-semibold ${theme.textSecondary} mb-3`}>{t('install.settingsHeader')}</h3>
            {isStandalone() ? (
              <div className="rounded-xl bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 p-3">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  ✓ {t('install.installed')}
                </p>
                <p className="text-sm text-green-800 dark:text-green-200 mt-0.5">
                  {t('install.installedBody')}
                </p>
              </div>
            ) : isIOS() ? (
              <div className="space-y-1 text-sm">
                <p className="font-medium">{t('install.iosTitle')}</p>
                <p className={`text-xs ${theme.textSecondary}`}>{t('install.iosNote')}</p>
                <ol className={`list-decimal list-inside space-y-1 mt-2 ${theme.textSecondary}`}>
                  <li>{t('install.iosStep1Prefix')} {t('install.iosStep1Suffix')}</li>
                  <li>{t('install.iosStep2Prefix')} <strong>{t('install.iosStep2Mid')}</strong>.</li>
                  <li>{t('install.iosStep3Prefix')} <strong>{t('install.iosStep3Action')}</strong>{t('install.iosStep3Suffix')}</li>
                </ol>
              </div>
            ) : androidPromptable ? (
              <div className="space-y-2">
                <p className={`text-sm ${theme.textSecondary}`}>{t('install.androidHint')}</p>
                <button
                  onClick={triggerInstallPrompt}
                  className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
                >
                  {t('install.installButton')}
                </button>
              </div>
            ) : null}

            <hr className="border-gray-200 dark:border-gray-700 mt-4" />
            <BackupSection theme={theme} />
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

function getTypeOptions(t) {
  return [
    { id: 'checklist', label: t('modules.types.checklist'), desc: t('modules.types.checklistDesc') },
    { id: 'choice', label: t('modules.types.choice'), desc: t('modules.types.choiceDesc') },
    { id: 'counter', label: t('modules.types.counter'), desc: t('modules.types.counterDesc') },
    { id: 'tasks', label: t('modules.types.tasks'), desc: t('modules.types.tasksDesc') },
    { id: 'projects', label: t('modules.types.projects'), desc: t('modules.types.projectsDesc') },
    { id: 'sleep', label: t('modules.types.sleep'), desc: t('modules.types.sleepDesc') },
    { id: 'collection', label: t('modules.types.collection'), desc: t('modules.types.collectionDesc') },
    { id: 'measurements', label: t('modules.types.measurements'), desc: t('modules.types.measurementsDesc') },
  ];
}

function CollectionTagGroupsEditor({ tagGroups, items, onUpdateGroups, theme }) {
  const { t } = useTranslation();
  const [confirmPending, setConfirmPending] = useState(null);

  const applyUpdate = (newGroups, newItems) => onUpdateGroups(newGroups, newItems !== undefined ? newItems : items);

  const addGroup = () => {
    applyUpdate([...tagGroups, { id: generateTagGroupId(), label: '', color: 'blue', allowMultiple: true, tags: [] }]);
  };

  const updateGroup = (groupId, patch) => {
    applyUpdate(tagGroups.map((g) => g.id === groupId ? { ...g, ...patch } : g));
  };

  const removeGroup = (groupId) => {
    const group = tagGroups.find((g) => g.id === groupId);
    const usedTagIds = new Set((group?.tags || []).map((t) => t.id));
    const inUse = items.some((it) => (it.tags || []).some((tid) => usedTagIds.has(tid)));
    if (inUse) { setConfirmPending({ type: 'group', groupId }); return; }
    doRemoveGroup(groupId);
  };

  const doRemoveGroup = (groupId) => {
    const group = tagGroups.find((g) => g.id === groupId);
    const usedTagIds = new Set((group?.tags || []).map((t) => t.id));
    const newItems = items.map((it) => ({ ...it, tags: (it.tags || []).filter((tid) => !usedTagIds.has(tid)) }));
    applyUpdate(tagGroups.filter((g) => g.id !== groupId), newItems);
    setConfirmPending(null);
  };

  const addTagToGroup = (groupId) => {
    applyUpdate(tagGroups.map((g) =>
      g.id === groupId ? { ...g, tags: [...g.tags, { id: generateTagId(), label: '' }] } : g
    ));
  };

  const updateTagInGroup = (groupId, tagId, patch) => {
    applyUpdate(tagGroups.map((g) =>
      g.id === groupId ? { ...g, tags: g.tags.map((tag) => tag.id === tagId ? { ...tag, ...patch } : tag) } : g
    ));
  };

  const removeTag = (groupId, tagId) => {
    const inUse = items.some((it) => (it.tags || []).includes(tagId));
    if (inUse) { setConfirmPending({ type: 'tag', groupId, tagId }); return; }
    doRemoveTag(groupId, tagId);
  };

  const doRemoveTag = (groupId, tagId) => {
    const newGroups = tagGroups.map((g) =>
      g.id === groupId ? { ...g, tags: g.tags.filter((tag) => tag.id !== tagId) } : g
    );
    const newItems = items.map((it) => ({ ...it, tags: (it.tags || []).filter((id) => id !== tagId) }));
    applyUpdate(newGroups, newItems);
    setConfirmPending(null);
  };

  const pendingGroup = confirmPending ? tagGroups.find((g) => g.id === confirmPending.groupId) : null;
  const pendingGroupTagCount = pendingGroup?.tags.length || 0;

  return (
    <div className="space-y-3">
      <label className={`text-sm font-medium ${theme.textSecondary} block`}>
        {t('collections.tagGroups')}
      </label>
      {tagGroups.length === 0 && (
        <p className={`text-xs ${theme.textMuted}`}>{t('collections.noTagGroups')}</p>
      )}
      {tagGroups.map((group) => {
        const groupLabel = group.labelKey ? t(group.labelKey) : (group.label || '');
        return (
          <div key={group.id} className={`p-3 ${theme.cardSecondary} rounded-lg space-y-2`}>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={groupLabel}
                onChange={(e) => updateGroup(group.id, { label: e.target.value, labelKey: undefined })}
                placeholder={t('collections.groupLabel')}
                className={`flex-1 min-w-0 px-2 py-1 ${theme.input} rounded text-sm`}
              />
              <select
                value={group.color || 'blue'}
                onChange={(e) => updateGroup(group.id, { color: e.target.value })}
                className={`max-w-[110px] px-2 py-1 ${theme.input} rounded text-xs`}
                aria-label={t('collections.tagColorAria')}
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c} value={c}>{t(`colors.${c}`)}</option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeGroup(group.id)}
                className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                aria-label={t('collections.deleteTagGroupAria')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            <label className={`flex items-center gap-2 text-xs ${theme.textMuted} cursor-pointer`}>
              <input
                type="checkbox"
                checked={!!group.allowMultiple}
                onChange={(e) => updateGroup(group.id, { allowMultiple: e.target.checked })}
              />
              {t('collections.allowMultiple')}
            </label>
            {group.tags.length > 0 && (
              <ul className="space-y-1">
                {group.tags.map((tag) => {
                  const tagLabel = tag.labelKey ? t(tag.labelKey) : (tag.label || '');
                  return (
                    <li key={tag.id} className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tagLabel}
                        onChange={(e) => updateTagInGroup(group.id, tag.id, { label: e.target.value, labelKey: undefined })}
                        placeholder={t('collections.newTagPlaceholder')}
                        className={`flex-1 px-2 py-1 ${theme.input} rounded text-sm`}
                      />
                      <button
                        type="button"
                        onClick={() => removeTag(group.id, tag.id)}
                        className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition"
                        aria-label={t('collections.deleteTagAria')}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <button
              type="button"
              onClick={() => addTagToGroup(group.id)}
              className={`flex items-center gap-1.5 text-xs ${theme.textMuted} hover:text-blue-500 transition`}
            >
              <Plus className="w-3.5 h-3.5" />
              {t('collections.addTag')}
            </button>
          </div>
        );
      })}
      <button
        type="button"
        onClick={addGroup}
        className={`flex items-center gap-2 text-sm ${theme.textMuted} hover:text-blue-500 transition`}
      >
        <Plus className="w-4 h-4" />
        {t('collections.addTagGroup')}
      </button>
      <ConfirmDialog
        open={confirmPending?.type === 'group'}
        title={t('collections.deleteTagGroupTitle')}
        description={t('collections.deleteTagGroupDesc', { n: pendingGroupTagCount })}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={() => doRemoveGroup(confirmPending.groupId)}
        onCancel={() => setConfirmPending(null)}
        theme={theme}
      />
      <ConfirmDialog
        open={confirmPending?.type === 'tag'}
        title={t('collections.deleteTagTitle')}
        description={t('collections.deleteTagDesc')}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={() => doRemoveTag(confirmPending.groupId, confirmPending.tagId)}
        onCancel={() => setConfirmPending(null)}
        theme={theme}
      />
    </div>
  );
}

function ModuleEditor({ module: mod, onSave, onCancel, onDelete, theme }) {
  const { t } = useTranslation();
  const TYPE_OPTIONS = useMemo(() => getTypeOptions(t), [t]);
  const [editing, setEditing] = useState(mod);
  const [newItem, setNewItem] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [removingMetric, setRemovingMetric] = useState(null);
  const isNew = !mod.name && !mod.nameKey;
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
        tagGroups: prev.tagGroups || [],
        items: prev.items || [],
        countInStreak: false,
      } : {}),
      ...(typeId === 'measurements' ? {
        metrics: Array.isArray(prev.metrics) ? prev.metrics : [],
        countInStreak: false,
      } : {}),
    }));
    setStep('preset');
    setPresetTab('suggestions');
  };

  const applyPreset = (preset) => {
    setEditing(prev => applyModulePreset(prev, preset));
    setStep('config');
  };

  const startBlank = () => setStep('config');

  const displayName = editing.name ?? (editing.nameKey ? t(editing.nameKey) : '');
  const canSave = !!displayName.trim();

  const buildSavePayload = () => {
    const trimmed = displayName.trim();
    // Default-/preset-module ongewijzigd: behoud nameKey, dump `name`. Zo blijft
    // de titel taal-reactief. User-rename: schrijf `name`, dump `nameKey`.
    if (editing.nameKey && trimmed === t(editing.nameKey)) {
      const { name: _drop, ...rest } = editing;
      return rest;
    }
    const { nameKey: _dropKey, ...rest } = editing;
    return { ...rest, name: trimmed };
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className={`${theme.card} rounded-2xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto my-4`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            {isNew && step !== 'type' && (
              <button
                onClick={() => setStep(step === 'config' ? 'preset' : 'type')}
                className={`p-1.5 ${theme.hover} rounded-lg ${theme.textMuted}`}
                aria-label={t('common.back')}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <h2 className={`text-xl font-bold ${theme.text}`}>
              {!isNew && t('modules.editTitle')}
              {isNew && step === 'type' && t('modules.newPickType')}
              {isNew && step === 'preset' && t('modules.pickPreset')}
              {isNew && step === 'config' && t('modules.configure')}
            </h2>
          </div>
          <button onClick={onCancel} className={`p-2 ${theme.hover} rounded-lg`}>
            <X className={`w-5 h-5 ${theme.textSecondary}`} />
          </button>
        </div>

        {step === 'type' && (
          <div className="space-y-4">
            <p className={`text-sm ${theme.textMuted}`}>
              {t('modules.typePicker')}
            </p>
            <div className="grid grid-cols-2 gap-2">
              {TYPE_OPTIONS.map(typ => (
                <button
                  key={typ.id}
                  onClick={() => selectType(typ.id)}
                  className={`p-3 rounded-lg text-left transition ${theme.cardSecondary} ${theme.textSecondary} hover:bg-blue-500 hover:text-white`}
                >
                  <div className="font-medium text-sm">{typ.label}</div>
                  <div className={`text-xs ${theme.textMuted}`}>{typ.desc}</div>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'preset' && (
          <div className="space-y-4">
            <div className={`flex gap-1 p-1 ${theme.cardSecondary} rounded-lg`}>
              <button
                onClick={() => setPresetTab('suggestions')}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
                  presetTab === 'suggestions' ? `${theme.card} ${theme.textSecondary} shadow-sm` : theme.textMuted
                }`}
              >
                {t('modules.suggestions')}
              </button>
              <button
                onClick={startBlank}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition ${theme.textMuted}`}
              >
                {t('modules.blankSelf')}
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
                      className={`w-full flex items-center gap-3 p-3 ${theme.cardSecondary} rounded-lg text-left ${theme.hover} transition`}
                    >
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center bg-${preset.color}-100 dark:bg-${preset.color}-900/30 text-${preset.color}-500`}>
                        <PresetIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${theme.textSecondary}`}>{t(preset.nameKey)}</div>
                        {preset.unit && (
                          <div className={`text-xs ${theme.textMuted}`}>
                            {t('modules.presetGoal', { amount: formatAmount(preset.dailyGoal, preset.unit) })}
                          </div>
                        )}
                        {preset.items && (
                          <div className={`text-xs ${theme.textMuted}`}>{t('modules.presetItems', { n: preset.items.length })}</div>
                        )}
                        {preset.options && (
                          <div className={`text-xs ${theme.textMuted}`}>{t('modules.presetOptions', { n: preset.options.length })}</div>
                        )}
                        {preset.metrics && (
                          <div className={`text-xs ${theme.textMuted}`}>{t('modules.presetMetrics', { n: preset.metrics.length })}</div>
                        )}
                      </div>
                    </button>
                  );
                })}
                {(!MODULE_PRESETS[editing.type] || MODULE_PRESETS[editing.type].length === 0) && (
                  <p className={`text-sm ${theme.textMuted} text-center py-4`}>
                    {t('modules.noSuggestions')}
                  </p>
                )}
              </div>
            )}


          </div>
        )}

        {step === 'config' && (
        <div className="space-y-4">
          <div>
            <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{t('common.name')}</label>
            <input
              type="text"
              value={editing.name ?? (editing.nameKey ? t(editing.nameKey) : '')}
              onChange={(e) => update('name', e.target.value)}
              placeholder={t('modules.namePlaceholder')}
              className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
            />
          </div>

          <div>
            <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{t('common.icon')}</label>
            <div className="grid grid-cols-8 gap-1">
              {Object.keys(ICON_OPTIONS).map(iconName => {
                const Icon = ICON_OPTIONS[iconName];
                return (
                  <button
                    key={iconName}
                    onClick={() => update('icon', iconName)}
                    className={`aspect-square rounded-lg flex items-center justify-center transition ${
                      editing.icon === iconName ? `bg-${editing.color}-500 text-white` : `${theme.cardSecondary} ${theme.textMuted}`
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{t('common.color')}</label>
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
              <div className={`pt-4 border-t ${theme.border}`}>
                <label className={`text-sm font-medium ${theme.textSecondary} mb-3 block`}>{t('common.options')}</label>
                <div className="space-y-3">
                  {[
                    { key: 'allowNotes', title: t('modules.optDailyNotes.title'), desc: t('modules.optDailyNotes.desc') },
                    { key: 'allowDescriptions', title: t('modules.optInstructions.title'), desc: t('modules.optInstructions.desc') },
                    { key: 'allowTargets', title: t('modules.optSetsPerItem.title'), desc: t('modules.optSetsPerItem.desc') },
                  ].map(opt => {
                    const isOn = !!editing[opt.key];
                    return (
                      <button
                        key={opt.key}
                        onClick={() => update(opt.key, !isOn)}
                        className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition ${theme.cardSecondary} ${theme.hover}`}
                      >
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 mt-0.5 ${
                          isOn ? `bg-${editing.color}-500 border-${editing.color}-500` : 'border-slate-300'
                        }`}>
                          {isOn && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className={`text-sm font-medium ${theme.textSecondary}`}>{opt.title}</div>
                          <div className={`text-xs ${theme.textMuted} mt-0.5`}>{opt.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{t('common.items')}</label>
                <div className="space-y-2 mb-2">
                  {(editing.items || []).map(item => {
                    const isExpanded = expandedItemId === item.id;
                    const showSettingsBtn = editing.allowDescriptions || editing.allowTargets;
                    return (
                      <div key={item.id} className={`${theme.cardSecondary} rounded-lg`}>
                        <div className="flex items-center gap-2 p-2">
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => updateItem(item.id, { label: e.target.value })}
                            className={`flex-1 px-2 py-1 ${theme.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-${editing.color}-300`}
                          />
                          {showSettingsBtn && (
                            <button
                              onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                              className={`p-1.5 rounded transition ${
                                isExpanded ? `bg-${editing.color}-500 text-white` : `${theme.textMuted} ${theme.hover}`
                              }`}
                              title={t('modules.itemSettings')}
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
                                <label className={`text-xs font-medium ${theme.textMuted} mb-1 block`}>{t('modules.instruction')}</label>
                                <textarea
                                  value={item.description || ''}
                                  onChange={(e) => updateItem(item.id, { description: e.target.value })}
                                  rows={2}
                                  placeholder={t('modules.instructionPlaceholder')}
                                  className={`w-full px-2 py-1.5 ${theme.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-300`}
                                />
                              </div>
                            )}
                            {editing.allowTargets && (
                              <div>
                                <label className={`text-xs font-medium ${theme.textMuted} mb-1 block`}>{t('modules.setsLabel')}</label>
                                <input
                                  type="number"
                                  min={1}
                                  value={item.target ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    updateItem(item.id, { target: v === '' ? undefined : Math.max(1, parseInt(v, 10) || 1) });
                                  }}
                                  placeholder={t('modules.setsPlaceholder')}
                                  className={`w-24 px-2 py-1.5 ${theme.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-rose-300`}
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
                    placeholder={t('modules.newItemPlaceholder')}
                    className={`flex-1 px-3 py-2 ${theme.input} rounded-lg text-sm`}
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
              <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{t('common.options')}</label>
              <div className="space-y-2 mb-2">
                {(editing.options || []).map(opt => (
                  <div key={opt.id} className={`flex items-center gap-2 p-2 ${theme.cardSecondary} rounded-lg`}>
                    <span className={`flex-1 text-sm ${theme.textSecondary}`}>{opt.label}</span>
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
                  placeholder={t('modules.optionPlaceholder')}
                  className={`flex-1 px-3 py-2 ${theme.input} rounded-lg text-sm`}
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
                  <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{t('modules.unit')}</label>
                  <select
                    value={unit}
                    onChange={(e) => updateUnit(e.target.value)}
                    className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                  >
                    <option value="minutes">{t('modules.units.minutes')}</option>
                    <option value="ml">{t('modules.units.ml')}</option>
                    <option value="l">{t('modules.units.l')}</option>
                    <option value="glas">{t('modules.units.glas')}</option>
                    <option value="pages">{t('modules.units.pages')}</option>
                    <option value="km">{t('modules.units.km')}</option>
                    <option value="kcal">{t('modules.units.kcal')}</option>
                    <option value="reps">{t('modules.units.reps')}</option>
                  </select>
                </div>

                <div>
                  <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                    {isMinutes ? t('modules.dailyGoalMinutes') : t('modules.dailyGoalUnit', { unit })}
                  </label>
                  <input
                    type="number"
                    value={dailyGoal || ''}
                    onChange={(e) => setBoth('dailyGoal', 'dailyGoalMinutes', parseFloat(e.target.value) || 0)}
                    className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                  />
                </div>

                <div>
                  <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                    {isMinutes ? t('modules.weeklyMaxMinutes') : t('modules.weeklyMaxUnit', { unit })}
                  </label>
                  <input
                    type="number"
                    value={weeklyMax === null ? '' : weeklyMax}
                    onChange={(e) => {
                      const v = e.target.value ? parseFloat(e.target.value) : null;
                      setBoth('weeklyMax', 'weeklyMaxMinutes', v);
                    }}
                    placeholder={t('modules.weeklyMaxPlaceholder')}
                    className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                  />
                </div>

                {isMinutes ? (
                  <details className={`${theme.cardSecondary} rounded-lg p-3`}>
                    <summary className={`text-sm font-medium ${theme.textSecondary} cursor-pointer`}>
                      {t('modules.advanced')}
                    </summary>
                    <div className="mt-3 space-y-3">
                      <div>
                        <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                          {t('modules.presets')}
                        </label>
                        <input
                          type="text"
                          defaultValue={presetsString}
                          onBlur={(e) => updatePresets(e.target.value)}
                          placeholder={t('modules.presetsPlaceholderMinutes')}
                          className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                        />
                      </div>

                      <label className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
                        <input
                          type="checkbox"
                          checked={!!editing.categoriesEnabled}
                          onChange={(e) => update('categoriesEnabled', e.target.checked)}
                        />
                        {t('modules.useCategories')}
                      </label>

                      {editing.categoriesEnabled && (
                        <div>
                          <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                            {t('modules.categories')}
                          </label>
                          <input
                            type="text"
                            defaultValue={categoriesString}
                            onBlur={(e) => updateCategories(e.target.value)}
                            placeholder={t('modules.categoriesPlaceholderWork')}
                            className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                          />
                        </div>
                      )}
                    </div>
                  </details>
                ) : (
                  <>
                    <div>
                      <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                        {t('modules.presets')}
                      </label>
                      <input
                        type="text"
                        defaultValue={presetsString}
                        onBlur={(e) => updatePresets(e.target.value)}
                        placeholder={t('modules.presetsPlaceholderUnit')}
                        className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                      />
                    </div>

                    <label className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
                      <input
                        type="checkbox"
                        checked={!!editing.categoriesEnabled}
                        onChange={(e) => update('categoriesEnabled', e.target.checked)}
                      />
                      {t('modules.useCategories')}
                    </label>

                    {editing.categoriesEnabled && (
                      <div>
                        <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                          {t('modules.categories')}
                        </label>
                        <input
                          type="text"
                          defaultValue={categoriesString}
                          onBlur={(e) => updateCategories(e.target.value)}
                          placeholder={t('modules.categoriesPlaceholderDrink')}
                          className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                        />
                      </div>
                    )}
                  </>
                )}

                {(() => {
                  const cel = editing.celebration ?? { enabled: false, animation: 'cowDrinkMilk', mode: 'overlay' };
                  const goalSet = (editing.dailyGoal ?? editing.dailyGoalMinutes ?? 0) > 0;
                  const animationOptions = Object.values(CELEBRATION_ANIMATIONS);
                  return (
                    <div className={`${theme.cardSecondary} rounded-lg p-3 space-y-3`}>
                      <label className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
                        <input
                          type="checkbox"
                          checked={!!cel.enabled}
                          disabled={!goalSet}
                          onChange={(e) => update('celebration', { ...cel, enabled: e.target.checked })}
                        />
                        {t('modules.celebrationEnabled')}
                      </label>
                      {!goalSet && (
                        <p className={`text-xs ${theme.textSecondary} opacity-70`}>
                          {t('modules.celebrationDisabledHint')}
                        </p>
                      )}
                      {cel.enabled && goalSet && (
                        <div>
                          <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                            {t('modules.celebrationAnimation')}
                          </label>
                          <select
                            value={cel.animation}
                            onChange={(e) => update('celebration', { ...cel, animation: e.target.value })}
                            className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                          >
                            {animationOptions.map(a => (
                              <option key={a.id} value={a.id}>{t(a.labelKey)}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })()}
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
                  <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                    {t('modules.sleepGoalsHeader')}
                  </label>
                  <div className="space-y-1">
                    {WEEKDAY_KEYS.map((wk, i) => {
                      const dayLabel = weekdayLabelLong(wk);
                      const g = goals[wk] || { bed: '', wake: '' };
                      return (
                        <div key={wk} className="flex items-center gap-2">
                          <span className={`text-xs ${theme.textMuted} w-20 capitalize`}>{dayLabel}</span>
                          <input
                            type="time"
                            value={g.bed || ''}
                            onChange={(e) => setGoal(wk, 'bed', e.target.value)}
                            className={`flex-1 min-w-0 px-2 py-1 ${theme.input} rounded text-sm`}
                          />
                          <span className={`text-xs ${theme.textMuted}`}>{t('common.to')}</span>
                          <input
                            type="time"
                            value={g.wake || ''}
                            onChange={(e) => setGoal(wk, 'wake', e.target.value)}
                            className={`flex-1 min-w-0 px-2 py-1 ${theme.input} rounded text-sm`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                    {t('modules.tolerance')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={tol}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      update('toleranceMinutes', isNaN(v) || v < 1 ? 15 : v);
                    }}
                    className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                  />
                  <p className={`text-xs ${theme.textMuted} mt-1`}>
                    {t('modules.toleranceHint')}
                  </p>
                </div>

                <label className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
                  <input
                    type="checkbox"
                    checked={showScore}
                    onChange={(e) => update('showMorningScore', e.target.checked)}
                  />
                  {t('modules.morningScoreAsk')}
                </label>
              </>
            );
          })()}

          {editing.type === 'collection' && (() => {
            const trackingMode = editing.trackingMode || 'completion';
            const fields = editing.itemFields || { rating: true, notes: true, tags: true };
            const tagGroups = editing.tagGroups || [];
            const showUnit = trackingMode === 'amount' || trackingMode === 'flexible';
            const setField = (key, value) => {
              setEditing(prev => ({
                ...prev,
                itemFields: { ...(prev.itemFields || { rating: true, notes: true, tags: true }), [key]: value },
              }));
            };
            return (
              <>
                <div>
                  <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                    {t('collections.trackAs')}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      { id: 'completion', label: t('collections.trackingModes.completion') },
                      { id: 'count', label: t('collections.trackingModes.count') },
                      { id: 'amount', label: t('collections.trackingModes.amount') },
                      { id: 'flexible', label: t('collections.trackingModes.flexible') },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => update('trackingMode', opt.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                          trackingMode === opt.id ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {showUnit && (
                  <div>
                    <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                      {t('collections.unit')}
                    </label>
                    <input
                      type="text"
                      value={editing.amountUnit || ''}
                      onChange={(e) => update('amountUnit', e.target.value)}
                      placeholder={t('collections.unitPlaceholder')}
                      className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
                    />
                  </div>
                )}

                <div>
                  <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                    {t('collections.fieldsPerItem')}
                  </label>
                  <div className="space-y-1">
                    {[
                      { id: 'rating', label: t('collections.fieldRatingStars') },
                      { id: 'notes', label: t('collections.fieldNotes') },
                      { id: 'tags', label: t('collections.fieldTags') },
                    ].map(f => (
                      <label key={f.id} className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
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
                  <CollectionTagGroupsEditor
                    tagGroups={tagGroups}
                    items={editing.items || []}
                    onUpdateGroups={(newGroups, newItems) =>
                      setEditing(prev => ({ ...prev, tagGroups: newGroups, items: newItems !== undefined ? newItems : prev.items }))
                    }
                    theme={theme}
                  />
                )}
              </>
            );
          })()}

          {editing.type === 'measurements' && (() => {
            const metrics = editing.metrics || [];
            const updateMetric = (id, patch) => {
              setEditing(prev => ({
                ...prev,
                metrics: (prev.metrics || []).map(m =>
                  m.id === id ? { ...m, ...patch, ...(patch.name !== undefined ? { nameKey: undefined } : {}) } : m
                ),
              }));
            };
            const addMetric = () => {
              setEditing(prev => ({
                ...prev,
                metrics: [
                  ...(prev.metrics || []),
                  createMetric({ unit: 'kg', icon: 'Activity', decimals: 1 }),
                ],
              }));
            };
            const requestRemove = (metric) => {
              if ((metric.events || []).length > 0) {
                setRemovingMetric(metric);
              } else {
                setEditing(prev => ({
                  ...prev,
                  metrics: (prev.metrics || []).filter(m => m.id !== metric.id),
                }));
              }
            };
            return (
              <div>
                <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                  {t('modules.measurements.metricsLabel')}
                </label>
                <div className="space-y-2 mb-2">
                  {metrics.map((metric) => {
                    const isExpanded = expandedItemId === metric.id;
                    const MetricIcon = ICON_OPTIONS[metric.icon] || ICON_OPTIONS.Activity;
                    const displayMetricName = metric.name ?? (metric.nameKey ? t(metric.nameKey) : '');
                    return (
                      <div key={metric.id} className={`${theme.cardSecondary} rounded-lg`}>
                        <div className="flex items-center gap-2 p-2">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${theme.card} ${theme.textMuted}`}>
                            <MetricIcon className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            value={displayMetricName}
                            onChange={(e) => updateMetric(metric.id, { name: e.target.value })}
                            placeholder={t('modules.measurements.fields.name')}
                            className={`flex-1 px-2 py-1 ${theme.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-${editing.color}-300`}
                          />
                          <select
                            value={metric.unit || 'kg'}
                            onChange={(e) => updateMetric(metric.id, { unit: e.target.value })}
                            className={`px-2 py-1 ${theme.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-${editing.color}-300`}
                            aria-label={t('modules.measurements.fields.unit')}
                          >
                            {MEASUREMENT_UNITS.map(u => (
                              <option key={u.key} value={u.key}>{unitSymbol(u.key)}</option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => setExpandedItemId(isExpanded ? null : metric.id)}
                            className={`p-1.5 rounded transition ${
                              isExpanded ? `bg-${editing.color}-500 text-white` : `${theme.textMuted} ${theme.hover}`
                            }`}
                            title={t('modules.itemSettings')}
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => requestRemove(metric)}
                            className="text-slate-400 hover:text-red-500 p-1.5"
                            aria-label={t('common.delete')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {isExpanded && (
                          <div className="px-2 pb-3 space-y-3">
                            <div>
                              <label className={`text-xs font-medium ${theme.textMuted} mb-1 block`}>
                                {t('common.icon')}
                              </label>
                              <div className="grid grid-cols-8 gap-1">
                                {Object.keys(ICON_OPTIONS).map(iconName => {
                                  const Icon = ICON_OPTIONS[iconName];
                                  return (
                                    <button
                                      key={iconName}
                                      type="button"
                                      onClick={() => updateMetric(metric.id, { icon: iconName })}
                                      className={`aspect-square rounded-lg flex items-center justify-center transition ${
                                        metric.icon === iconName ? `bg-${editing.color}-500 text-white` : `${theme.card} ${theme.textMuted}`
                                      }`}
                                    >
                                      <Icon className="w-4 h-4" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                            <div className="flex gap-3">
                              <div className="flex-1">
                                <label className={`text-xs font-medium ${theme.textMuted} mb-1 block`}>
                                  {t('modules.measurements.fields.target')}
                                </label>
                                <input
                                  type="number"
                                  step="any"
                                  value={metric.target ?? ''}
                                  onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '') updateMetric(metric.id, { target: null });
                                    else {
                                      const n = Number(v);
                                      if (Number.isFinite(n)) updateMetric(metric.id, { target: n });
                                    }
                                  }}
                                  placeholder="—"
                                  className={`w-full px-2 py-1.5 ${theme.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-${editing.color}-300`}
                                />
                              </div>
                              <div>
                                <label className={`text-xs font-medium ${theme.textMuted} mb-1 block`}>
                                  {t('modules.measurements.fields.decimals')}
                                </label>
                                <div className="flex gap-1">
                                  {[0, 1, 2].map(n => (
                                    <button
                                      key={n}
                                      type="button"
                                      onClick={() => updateMetric(metric.id, { decimals: n })}
                                      className={`px-3 py-1.5 rounded text-sm font-medium transition ${
                                        (metric.decimals ?? 1) === n ? `bg-${editing.color}-500 text-white` : `${theme.card} ${theme.textMuted}`
                                      }`}
                                    >
                                      {n}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => updateMetric(metric.id, { lowerIsBetter: !metric.lowerIsBetter })}
                              className={`w-full flex items-center gap-3 p-2 rounded-lg text-left transition ${theme.card} ${theme.hover}`}
                            >
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition flex-shrink-0 ${
                                metric.lowerIsBetter ? `bg-${editing.color}-500 border-${editing.color}-500` : 'border-slate-300'
                              }`}>
                                {metric.lowerIsBetter && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <div className="flex-1">
                                <div className={`text-sm font-medium ${theme.textSecondary}`}>
                                  {t('modules.measurements.fields.lowerIsBetter')}
                                </div>
                                <div className={`text-xs ${theme.textMuted} mt-0.5`}>
                                  {t('modules.measurements.fields.lowerIsBetterDesc')}
                                </div>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  type="button"
                  onClick={addMetric}
                  className={`w-full px-3 py-2 ${theme.cardSecondary} ${theme.textSecondary} rounded-lg text-sm font-medium ${theme.hover} flex items-center justify-center gap-2`}
                >
                  <Plus className="w-4 h-4" />
                  {t('modules.measurements.addMetric')}
                </button>
              </div>
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
              className={`px-4 py-2 ${theme.cardSecondary} ${theme.textSecondary} rounded-lg text-sm font-medium transition`}
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={() => canSave && onSave(buildSavePayload())}
              disabled={!canSave}
              className="flex-1 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition"
            >
              {t('common.save')}
            </button>
          </div>
        )}
      </div>
      <ConfirmDialog
        open={!!removingMetric}
        title={t('modules.measurements.confirmDeleteMetric.title')}
        description={removingMetric
          ? t('modules.measurements.confirmDeleteMetric.description', { count: (removingMetric.events || []).length })
          : ''}
        confirmLabel={t('common.delete')}
        variant="danger"
        onConfirm={() => {
          const target = removingMetric;
          setRemovingMetric(null);
          if (!target) return;
          setEditing(prev => ({
            ...prev,
            metrics: (prev.metrics || []).filter(m => m.id !== target.id),
          }));
        }}
        onCancel={() => setRemovingMetric(null)}
        theme={theme}
      />
    </div>
  );
}

// =============================================
// REFLECTION SETTINGS
// =============================================
function ReflectionSettings({ reflectionQuestions, setReflectionQuestions, recurringTasks, setRecurringTasks, theme, dayNames }) {
  const { t } = useTranslation();
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
            <div key={i} className={`flex items-center gap-2 p-2 ${theme.cardSecondary} rounded-lg`}>
              <span className={`flex-1 text-sm ${theme.textSecondary}`}>{q}</span>
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
            placeholder={t('settings.reflectionNewPlaceholder')}
            className={`flex-1 px-3 py-2 ${theme.input} rounded-lg text-sm`}
          />
          <button onClick={addQuestion} className="px-3 py-2 bg-blue-500 text-white rounded-lg">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div>
        <h4 className={`font-semibold ${theme.textSecondary} mb-3 text-sm`}>{t('settings.recurringWeekly')}</h4>
        <div className="space-y-2 mb-4">
          {recurringTasks.length === 0 ? (
            <p className={`text-sm ${theme.textMuted} text-center py-2`}>{t('settings.recurringEmpty')}</p>
          ) : (
            recurringTasks.map(rt => (
              <div key={rt.id} className={`flex items-center gap-2 p-2 ${theme.cardSecondary} rounded-lg`}>
                <Repeat className={`w-4 h-4 ${theme.textMuted}`} />
                <div className="flex-1">
                  <div className={`text-sm ${theme.textSecondary}`}>{rt.text}</div>
                  <div className={`text-xs ${theme.textMuted}`}>
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
            placeholder={t('settings.recurringExamplePlaceholder')}
            className={`w-full px-3 py-2 ${theme.input} rounded-lg text-sm`}
          />
          <div className="flex gap-1">
            {dayNames.map((day, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                className={`flex-1 py-2 rounded-lg text-xs font-medium transition ${
                  newRecurringDays.includes(i) ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
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
            {t('tasks.add')}
          </button>
        </div>
      </div>
    </div>
  );
}