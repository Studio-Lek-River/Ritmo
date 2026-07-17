import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Sun, Moon, Plus, Trash2, Sparkles, Settings, BookOpen, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, X, Repeat, GripVertical, Eye, EyeOff, GraduationCap, HelpCircle, ArrowUpDown, SlidersHorizontal, BedDouble, Check, BarChart3,
} from 'lucide-react';
import './storage';
import { isSyncEnabled } from './sync/supabase';
import { onAuthChange, getCurrentUser } from './sync/auth';
import { pullUserData } from './sync/userDataStorage';
import SyncConflictDialog from './components/SyncConflictDialog';
import ProjectsModule from './modules/ProjectsModule';
import CounterModule from './modules/CounterModule';
import SleepModule from './modules/SleepModule';
import ProjectsView from './views/ProjectsView';
import CollectionsView from './views/CollectionsView';
import HealthView from './views/HealthView';
import { MedFormModal } from './views/MedicationView';
import HouseholdView from './views/HouseholdView';
import TodayView from './views/TodayView';
import InsightView from './views/InsightView';
import ProductivitySuiteView from './views/ProductivitySuiteView';
import OnboardingView from './views/OnboardingView';
import SplashScreen from './components/SplashScreen';
import RitmoLogo from './components/RitmoLogo';
import TabBar from './components/TabBar';
import DesktopShell from './components/DesktopShell';
import IsDesktopContext from './context/IsDesktopContext';
import useIsDesktop from './hooks/useIsDesktop';
import ErrorBoundary from './components/ErrorBoundary';
import HelpOverlay from './components/help/HelpOverlay';
import InstallGuide from './components/help/InstallGuide';
import BackupSection from './components/BackupSection';
import AuthSection from './components/auth/AuthSection';
import SyncStatusRow from './components/SyncStatusRow';
import ConnectionsSection from './components/ConnectionsSection';
import OAuthReturn from './components/OAuthReturn';
import useConnections from './hooks/useConnections';
import useOutlookEvents from './hooks/useOutlookEvents';
import useTrelloCards from './hooks/useTrelloCards';
import useGithubIssues from './hooks/useGithubIssues';
import { externalBlocksForDay } from './utils/outlookEvents';
import { clearAgendaCache } from './utils/agendaCache';
import { readAgendaSelection, writeAgendaSelection, clearAgendaSelection, pruneSelection } from './utils/agendaSelection';
import { readTrelloBoardPrefs, writeTrelloBoardPrefs, clearTrelloBoardPrefs, includedBoardIds } from './utils/trelloBoardPrefs';
import { clearTrelloCache } from './utils/trelloCache';
import { buildTrelloModules } from './utils/trelloModules';
import { readGithubRepoPrefs, writeGithubRepoPrefs, clearGithubRepoPrefs, includedRepoIds } from './utils/githubRepoPrefs';
import { clearGithubCache } from './utils/githubCache';
import { buildGithubModules } from './utils/githubModules';
import { DEFAULT_SOURCE_PREFS, getSourcePref } from './utils/sourcePrefs';
import { applyItemOverrides, getSourceItemPref, isSourceItemId, withItemOverride } from './utils/sourceItemPrefs';
import { DEFAULT_PRIORITY } from './utils/dayTimeline';
import { isStandalone, isIOS, onPromptAvailableChange, triggerInstallPrompt } from './utils/install';
import FeedbackForm from './components/help/FeedbackForm';
import TimeInput from './components/TimeInput';
import DurationInput from './components/DurationInput';
import DagdeelSelect from './components/DagdeelSelect';
import ChecklistModule from './modules/ChecklistModule';
import CelebrationOverlay from './components/CelebrationOverlay';
import ConfirmDialog from './components/ConfirmDialog';
import HealthTour from './components/tour/HealthTour';
import { buildTourSteps, buildFilledMap } from './utils/tourSteps';
import { CELEBRATION_ANIMATIONS, CONFETTI_CONFIG, buildConfetti } from './utils/celebrations';
import { migrateModuleConfig, migrateDayModuleData, migrateSettings } from './utils/migrate';
import { useTranslation, resolveModuleName } from './i18n/useTranslation';
import { logEvent, removeEvent, generateTagId, generateTagGroupId } from './utils/collections';
import {
  logInjection,
  removeInjectionById,
  updateInjectionPosition,
  normalizeInjectionEvent,
  makeInjectionId,
  zoneFor,
  injectableMeds,
  INJECTION_ZONES,
} from './utils/bodymap';
import { FREQUENCY_LABEL_KEYS } from './utils/medication';
import { scheduleEntryMed } from './utils/injectionSchedule';
import { ScheduleEntryFormModal } from './views/InjectionScheduleView';
import { BodymapModuleCard } from './views/BodymapView';
import { ToastProvider } from './hooks/useToast';
import Toast from './components/Toast';
import { formatAmount, formatDuration } from './utils/format';
import { MODULE_PRESETS } from './utils/presets';
import { genId } from './utils/genId';
import { moveById, reorderById } from './utils/reorder';
import { applyModulePreset } from './utils/applyModulePreset';
import { MEASUREMENT_UNITS, unitSymbol, createMetric } from './utils/measurements';
import { ICON_OPTIONS } from './utils/icons';
import { isHealthModule } from './utils/healthModules';
import { instantiateMetric } from './utils/metricLibrary';
import MetricLibraryModal from './components/MetricLibraryModal';
import {
  fmtDateKey, parseDateKey, addDays, sameDay, startOfWeek,
  isEditable, isFuture, isToday as isTodayDate,
  WEEKDAY_KEYS, shortWeekdayLabelsMondayFirst, weekdayLabelLong,
} from './utils/dates';
import { goalsForNight, isOnTarget } from './utils/sleep';
import { DEFAULT_BLOCK_MINUTES } from './utils/dayTimeline';
import { planDay } from './utils/planDay';
import { subgoalKey, taskKey, virtualTaskId, parseVirtualTaskId, parseItemKey } from './utils/itemKeys';
import {
  buildDayCellBackground, moduleStatusForDay, isDayFullyComplete,
  normalizeChecklistItemData, isChecklistItemComplete,
  canCountInStreak,
} from './utils/dayProgress';
import { getColorHex, COLOR_OPTIONS } from './utils/colors';
import ChecklistInsightCard from './components/insight/ChecklistInsightCard';
import { buildDaysWithActive } from './utils/insights';
import CounterDisplay, { DISPLAY_STYLE_KEYS } from './components/CounterDisplay';
import { DEFAULT_MODULES, instantiateDefaults, ensureStandardModules } from './utils/defaultModules';
import { playSound } from './utils/sound';

// De drie standen voor "Deel mijn dag in" (S05). Instelling, geen vaste
// keuze (principe 2): `propose` is de minst ingrijpende default. Volgt het
// `.map()`-patroon voor de segmented control in SettingsModal.
const PLAN_MODE_OPTIONS = [
  { id: 'propose', labelKey: 'settings.planModePropose' },
  { id: 'concept', labelKey: 'settings.planModeConcept' },
  { id: 'direct', labelKey: 'settings.planModeDirect' },
];

// Neutrale S06-default voor de dag-indeler-voorkeuren: energie per dagdeel
// 'neutral', geen diepwerk-vensters, geen rustbuffer — identiek aan S05-
// gedrag (principe 2: geen opgelegde verandering zonder actie van de
// gebruiker in het Voorkeuren-paneel).
const DEFAULT_PLAN_PREFS = {
  energy: { ochtend: 'neutral', middag: 'neutral', avond: 'neutral' },
  deepWorkWindows: [],
  rest: 'none',
};

// Dag-einde voor de indeler; spiegelt WeekView's HOUR_END (die module
// exporteert 'm niet). Dag-start komt per aanroep uit de slaap-wake of deze
// fallback (zie handleShareDay).
const PLAN_DAY_END = '22:00';
const PLAN_DAY_START_FALLBACK = '08:00';

export default function Ritmo() {
  const { t, language, languageSetting, setLanguage } = useTranslation();
  const [view, setView] = useState('today');
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedCollectionId, setSelectedCollectionId] = useState(null);
  const [activeDate, setActiveDate] = useState(new Date());
  const todayKey = fmtDateKey(new Date());
  const activeDateKey = fmtDateKey(activeDate);
  const today = todayKey;
  const editable = isEditable(activeDate);
  const skipNextSaveRef = useRef(false);
  const [loading, setLoading] = useState(true);
  const [splashDone, setSplashDone] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [uiStyle, setUiStyle] = useState('strak');
  const [showSettings, setShowSettings] = useState(false);
  const [openSettingsToHelp, setOpenSettingsToHelp] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState(null);
  const [editingModule, setEditingModule] = useState(null);
  const [hasOnboarded, setHasOnboarded] = useState(true);
  const [modules, setModules] = useState(() => instantiateDefaults(DEFAULT_MODULES));
  const [moduleData, setModuleData] = useState({}); // per-module daily state
  const [history, setHistory] = useState({});
  const [customTasks, setCustomTasks] = useState([]);
  const [recurringTasks, setRecurringTasks] = useState([]);
  const [newTask, setNewTask] = useState('');
  const [newTaskTime, setNewTaskTime] = useState('');
  const [streakSettings, setStreakSettings] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [soundVolume, setSoundVolume] = useState(80);
  const [goldenBorderEnabled, setGoldenBorderEnabled] = useState(true);
  const [appMode, setAppMode] = useState('standard');
  const [planMode, setPlanMode] = useState('propose');
  const [planPrefs, setPlanPrefs] = useState(DEFAULT_PLAN_PREFS);
  const [sourcePrefs, setSourcePrefs] = useState(DEFAULT_SOURCE_PREFS);
  // Prioriteit-chipkleuren (S03b): eigen settings-key naast `sourcePrefs`,
  // zelfde read-time-merge-patroon (zie utils/priorityPrefs.js) — een lege
  // `{}` is een geldige startwaarde, `getPriorityColor` vult ontbrekende
  // niveaus zelf aan met de default, dus geen migratie nodig.
  const [priorityPrefs, setPriorityPrefs] = useState({});
  // Duur en tijd die de gebruiker zet op een item van een gekoppelde bron
  // (Trello-kaart, GitHub-issue). Die items zijn afgeleid en dragen zelf geen
  // gebruikerswaarden, dus dit is hun enige opslag — zie utils/sourceItemPrefs.js
  // (inclusief waarom deze map wél in settings mag terwijl de bron-cache dat
  // niet doet). Lege `{}` is een geldige startwaarde, geen migratie nodig.
  const [sourceItemPrefs, setSourceItemPrefs] = useState({});
  // Heeft de gebruiker de Outlook-agenda al eens laten zien? Sinds S07d een
  // gepersisteerde setting (zie de Outlook-agenda-sectie verderop voor het
  // gedrag). Staat hier bij de andere settings-state omdat de save-effect
  // hieronder hem in zijn dependency-array leest: die array wordt tijdens de
  // render geëvalueerd, dus de declaratie moet eraan voorafgaan.
  const [agendaShown, setAgendaShown] = useState(false);
  // Ephemere uitkomst van "Deel mijn dag in" (propose/concept-standen). Nooit
  // gepersisteerd — alleen bij expliciete acceptatie schrijft een handler via
  // de bestaande moveItemToDay/setTaskTime. Shape: { dateKey, mode, items }.
  const [pendingPlan, setPendingPlan] = useState(null);
  const isDesktop = useIsDesktop();
  const [onboardingProfile, setOnboardingProfile] = useState('full');
  const [hasUsedSwipe, setHasUsedSwipe] = useState(false);
  const [hasDismissedInstallBanner, setHasDismissedInstallBanner] = useState(false);
  const [hasSeenHealthTour, setHasSeenHealthTour] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [tourCollapsed, setTourCollapsed] = useState(false);
  const [tourWelcome, setTourWelcome] = useState(false);
  const [tourFocusId, setTourFocusId] = useState(null);
  const [confetti, setConfetti] = useState([]);
  const [celebrationMsg, setCelebrationMsg] = useState(null);
  const [celebrationOverlay, setCelebrationOverlay] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [pendingConflicts, setPendingConflicts] = useState(null);
  const conflictResolverRef = useRef(null);

  const previousCompletionRef = useRef(null);
  const prevModuleStatusRef = useRef({});

  useEffect(() => {
    const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setDarkMode(isDark);
  }, []);

  // Zet het thema op <html>, zodat de CSS-variabele token-laag (index.css)
  // de juiste oppervlakte-kleuren kiest. De look is altijd Monday
  // (data-style is niet meer instelbaar); alleen dark/light varieert nog.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', darkMode ? 'dark' : 'light');
    root.setAttribute('data-style', 'monday');
  }, [darkMode]);

  // Auth state
  useEffect(() => {
    if (!isSyncEnabled()) return;

    getCurrentUser().then(user => setCurrentUser(user));
    const unsub = onAuthChange(user => setCurrentUser(user));
    return unsub;
  }, []);

  const loadFromStorage = useCallback(async () => {
    let loadedModules = null;
    const todayKeyForLoad = fmtDateKey(new Date());

    try {
      const settingsResult = await window.storage.get('settings');
      if (settingsResult?.value) {
        const settings = migrateSettings(JSON.parse(settingsResult.value));
        if (settings.modules) {
          loadedModules = settings.modules.map(migrateModuleConfig);
        }
        if (settings.darkMode !== undefined) setDarkMode(settings.darkMode);
        if (settings.uiStyle !== undefined) setUiStyle(settings.uiStyle);
        if (settings.recurringTasks) setRecurringTasks(settings.recurringTasks);
        if (settings.streakSettings) setStreakSettings(settings.streakSettings);
        if (settings.soundEnabled !== undefined) setSoundEnabled(settings.soundEnabled);
        if (settings.soundVolume !== undefined) setSoundVolume(settings.soundVolume);
        if (settings.goldenBorderEnabled !== undefined) setGoldenBorderEnabled(settings.goldenBorderEnabled);
        if (settings.appMode !== undefined) setAppMode(settings.appMode);
        if (settings.planMode !== undefined) setPlanMode(settings.planMode);
        if (settings.planPrefs !== undefined) setPlanPrefs(settings.planPrefs);
        if (settings.sourcePrefs !== undefined) setSourcePrefs(settings.sourcePrefs);
        if (settings.priorityPrefs !== undefined) setPriorityPrefs(settings.priorityPrefs);
        if (settings.sourceItemPrefs !== undefined) setSourceItemPrefs(settings.sourceItemPrefs);
        if (settings.agendaShown !== undefined) setAgendaShown(settings.agendaShown);
        if (settings.onboardingProfile !== undefined) setOnboardingProfile(settings.onboardingProfile);
        if (settings.hasUsedSwipe !== undefined) setHasUsedSwipe(settings.hasUsedSwipe);
        if (settings.hasDismissedInstallBanner !== undefined) setHasDismissedInstallBanner(settings.hasDismissedInstallBanner);
        if (settings.hasSeenHealthTour !== undefined) setHasSeenHealthTour(settings.hasSeenHealthTour);
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
      const result = await window.storage.get(`day:${todayKeyForLoad}`);
      if (result?.value) {
        const data = migrateDayData(JSON.parse(result.value));
        setModuleData(data.moduleData || {});
        setCustomTasks(data.customTasks || []);
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
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const userId = currentUser?.id;
  useEffect(() => {
    if (!isSyncEnabled() || !userId) return;
    let cancelled = false;
    (async () => {
      const result = await pullUserData(userId, (conflicts) =>
        new Promise((resolve) => {
          conflictResolverRef.current = resolve;
          setPendingConflicts(conflicts);
        }),
      );
      if (cancelled) return;
      if (result.pulled > 0 || result.conflicts > 0) {
        skipNextSaveRef.current = true;
        await loadFromStorage();
      }
    })();
    return () => { cancelled = true; };
  }, [userId, loadFromStorage]);

  const handleResolveConflict = useCallback((choice) => {
    const resolver = conflictResolverRef.current;
    conflictResolverRef.current = null;
    setPendingConflicts(null);
    resolver?.(choice);
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
        };
        await window.storage.set(`day:${activeDateKey}`, JSON.stringify(dayData));
        setHistory(prev => ({ ...prev, [activeDateKey]: dayData }));
      } catch (e) {
        console.error('Save failed', e);
      }
    };
    saveData();
  }, [moduleData, customTasks, loading, activeDateKey, editable]);

  // Save settings
  useEffect(() => {
    if (loading) return;
    const saveSettings = async () => {
      try {
        await window.storage.set('settings', JSON.stringify({
          darkMode,
          uiStyle,
          recurringTasks,
          streakSettings,
          soundEnabled,
          soundVolume,
          goldenBorderEnabled,
          appMode,
          planMode,
          planPrefs,
          sourcePrefs,
          priorityPrefs,
          sourceItemPrefs,
          agendaShown,
          onboardingProfile,
          hasUsedSwipe,
          hasDismissedInstallBanner,
          hasSeenHealthTour,
          modules,
          hasOnboarded,
          language: languageSetting,
        }));
      } catch {}
    };
    saveSettings();
  }, [darkMode, uiStyle, recurringTasks, streakSettings, soundEnabled, soundVolume, goldenBorderEnabled, appMode, planMode, planPrefs, sourcePrefs, priorityPrefs, sourceItemPrefs, agendaShown, onboardingProfile, hasUsedSwipe, hasDismissedInstallBanner, hasSeenHealthTour, modules, hasOnboarded, languageSetting, loading]);

  // Health-modus toont alleen een deel van de tabs; als de gebruiker naar
  // Health wisselt terwijl een verborgen tab actief is, val terug op Vandaag.
  useEffect(() => {
    const allowed = ['today', 'insight', 'household'];
    if (appMode === 'health' && !allowed.includes(view)) setView('today');
  }, [appMode, view]);

  // De Productivity Suite Dag-view toont/schrijft altijd de échte vandaag,
  // nooit de dag die de gebruiker via DayNavigator op Vandaag aan het bekijken
  // was (activeDate is globale state en reset niet vanzelf bij view-wissel).
  // Guard voorkomt een render-loop: alleen setten als het nog niet vandaag is.
  useEffect(() => {
    if (view === 'productivity' && activeDateKey !== todayKey) setActiveDate(new Date());
  }, [view, activeDateKey, todayKey]);

  // De rondleiding hoort alleen in gezondheidsmodus met minstens één
  // gezondheidsmodule. Zet hij aan buiten die context (mode gewisseld, laatste
  // module verwijderd, of gestart zonder modules), sluit dan stil af zodat er
  // nooit later een ongevraagd paneel opduikt.
  useEffect(() => {
    if (!tourActive) return;
    if (appMode !== 'health' || buildTourSteps(modules).length === 0) {
      setTourActive(false);
    }
  }, [tourActive, appMode, modules]);

  const consumeTourFocus = useCallback(() => setTourFocusId(null), []);

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
            done: false,
            ...(rt.time ? { time: rt.time } : {}),
            ...(rt.duration ? { duration: rt.duration } : {}),
            ...(rt.window ? { window: rt.window } : {}),
            ...(rt.autoPlan ? { autoPlan: rt.autoPlan } : {}),
            ...(rt.deepWork ? { deepWork: rt.deepWork } : {}),
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

  // Bron-handler voor het afvinken van een project-subgoal ("projecttaak") vanuit
  // de Productivity Suite Dag-view. Zelfde mutatie-patroon als ProjectsView's
  // lokale toggleSubgoal, hier op App-niveau zodat de Dag-view (die meerdere
  // projectmodules tegelijk toont) er ook bij kan.
  const toggleProjectSubgoal = (projectId, subjectId, goalId) => {
    setModules(prev => prev.map(m => {
      if (m.id !== projectId) return m;
      return {
        ...m,
        subjects: (m.subjects || []).map(s => s.id !== subjectId ? s : {
          ...s,
          subgoals: (s.subgoals || []).map(g => g.id !== goalId ? g : { ...g, completed: !g.completed }),
        }),
      };
    }));
    updateModuleData(projectId, prev => ({ ...prev, touchedToday: true }));
  };

  // Zet de Kanban-status van een project-subgoal ("projecttaak"). Houdt
  // `completed` consistent met de bestaande toggle (Today/Dag-view): `klaar`
  // zet `completed = true`, elke andere kolom zet het weer op false.
  const setSubgoalStatus = (projectId, subjectId, goalId, status) => {
    setModules(prev => prev.map(m => {
      if (m.id !== projectId) return m;
      return {
        ...m,
        subjects: (m.subjects || []).map(s => s.id !== subjectId ? s : {
          ...s,
          subgoals: (s.subgoals || []).map(g => g.id !== goalId ? g : {
            ...g,
            status,
            completed: status === 'klaar',
          }),
        }),
      };
    }));
    updateModuleData(projectId, prev => ({ ...prev, touchedToday: true }));
  };

  // Zet de duur van een project-subgoal ("projecttaak") vanuit de takenpool.
  // Zelfde mutatie-patroon als ProjectsView's lokale setSubgoalDuration, hier
  // op App-niveau zodat de Planner (die meerdere projectmodules tegelijk toont)
  // er ook bij kan — zie toggleProjectSubgoal hierboven. Geen `touchedToday`:
  // een duur bijstellen is geen voortgang op het project (zelfde keuze als
  // ProjectsView's setSubgoalTime). `String(g.id)` omdat de aanroeper zijn
  // goalId uit een item-key haalt (altijd een string), terwijl een opgeslagen
  // id een getal kan zijn — zie moveItemToDay.
  const setSubgoalDuration = (projectId, subjectId, goalId, duration) => {
    setModules(prev => prev.map(m => {
      if (m.id !== projectId) return m;
      return {
        ...m,
        subjects: (m.subjects || []).map(s => s.id !== subjectId ? s : {
          ...s,
          subgoals: (s.subgoals || []).map(g => String(g.id) !== String(goalId) ? g : {
            ...g,
            duration: duration || undefined,
          }),
        }),
      };
    }));
  };

  // Voegt een nieuw project-subgoal ("projecttaak") toe aan een bestaand project,
  // gebruikt door het kaart-toevoegveld in de Planner (Kanban). Nieuwe subgoals
  // hebben geen status/completed en belanden zo via deriveTaskStatus in Te doen.
  // `extra` (duration/window/autoPlan) is optioneel en wordt weggelaten als
  // leeg; de Kanban-kaartvorm zelf blijft ongewijzigd (geen UI voor deze
  // velden daar), maar de creator kan ze al dragen zoals de andere bronnen.
  const addProjectSubgoal = (projectId, subjectId, label, extra = {}) => {
    const trimmed = (label || '').trim();
    if (!trimmed) return;
    const { duration, window, autoPlan, deepWork } = extra;
    setModules(prev => prev.map(m => {
      if (m.id !== projectId) return m;
      return {
        ...m,
        subjects: (m.subjects || []).map(s => s.id !== subjectId ? s : {
          ...s,
          subgoals: [...(s.subgoals || []), {
            id: Date.now(),
            label: trimmed,
            completed: false,
            ...(duration ? { duration } : {}),
            ...(window ? { window } : {}),
            ...(autoPlan ? { autoPlan } : {}),
            ...(deepWork ? { deepWork } : {}),
          }],
        }),
      };
    }));
  };

  // Terug naar de Standaard-app: vul eerst de ontbrekende standaard-modules aan
  // (een health-geonboarde gebruiker heeft er nog geen), daarna de modus. Niet-
  // destructief: health-modules en -data blijven staan. Voor een gebruiker die de
  // defaults al heeft is de aanvulling een no-op.
  const switchToStandard = () => {
    setModules(prev => ensureStandardModules(prev));
    setAppMode('standard');
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

  // ---- medication handlers -----------------------------------------------

  const updateMedicationModule = (moduleId, mutator) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId || m.type !== 'medication') return m;
      return mutator(m);
    }));
  };

  const addMed = (moduleId, med) => {
    if (!med || !med.name || !med.name.trim()) return null;
    updateMedicationModule(moduleId, (m) => ({
      ...m,
      meds: [...(m.meds || []), med],
    }));
    return med;
  };

  const updateMed = (moduleId, medId, patch) => {
    updateMedicationModule(moduleId, (m) => ({
      ...m,
      meds: (m.meds || []).map((med) => (med.id === medId ? { ...med, ...patch } : med)),
    }));
  };

  const deleteMed = (moduleId, medId) => {
    updateMedicationModule(moduleId, (m) => ({
      ...m,
      meds: (m.meds || []).filter((med) => med.id !== medId),
    }));
  };

  // "besteld": verhoogt de voorraad van dat medicijn.
  const orderMed = (moduleId, medId, amount) => {
    updateMedicationModule(moduleId, (m) => ({
      ...m,
      meds: (m.meds || []).map((med) =>
        med.id === medId ? { ...med, supply: (med.supply || 0) + (Number(amount) || 0) } : med
      ),
    }));
  };

  // H10: logt een inname op het dagrooster van dit medicijn (géén
  // voorraad-mutatie — dat blijft de "besteld"-flow). Retourneert een
  // { entry, undo } paar zodat de aanroeper (de dagrooster-kaart) meteen een
  // undo-toast kan tonen die exact deze logregel weer verwijdert.
  const logMedIntake = (moduleId, medId, time) => {
    const entry = { date: todayKey, time };
    updateMedicationModule(moduleId, (m) => ({
      ...m,
      meds: (m.meds || []).map((med) =>
        med.id === medId ? { ...med, intakeLog: [...(med.intakeLog || []), entry] } : med
      ),
    }));
    const undo = () => {
      updateMedicationModule(moduleId, (m) => ({
        ...m,
        meds: (m.meds || []).map((med) => {
          if (med.id !== medId) return med;
          const log = med.intakeLog || [];
          const idx = log.lastIndexOf(entry);
          if (idx === -1) return med;
          return { ...med, intakeLog: [...log.slice(0, idx), ...log.slice(idx + 1)] };
        }),
      }));
    };
    return { entry, undo };
  };

  // ---- bodymap handlers ---------------------------------------------------

  const updateBodymapModule = (moduleId, mutator) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId || m.type !== 'bodymap') return m;
      return mutator(m);
    }));
  };

  // Bewaart het gekozen heat-venster (30d/14d/all) op de bodymap-module.
  const setBodymapHeatWindow = (moduleId, windowId) => {
    updateBodymapModule(moduleId, m => ({ ...m, heatWindow: windowId }));
  };

  // Eén pass die atomair de prik logt én de voorraad van het bronmedicijn
  // verlaagt (geklemd op 0), zodat log en voorraad nooit uit de pas lopen.
  // `date` mag worden meegegeven (undo van een verwijdering herstelt zo de
  // oorspronkelijke datum); zonder `date` wordt vandaag gebruikt. H12: `id`/
  // `x`/`y`/`view` zijn de precieze plaatsing; `id` mag worden meegegeven
  // (undo re-logt zo exact hetzelfde event) anders wordt er een nieuwe gemaakt.
  const logInjectionEvent = (bodymapModuleId, { id, zoneId, x, y, view, medId, medModuleId, medName, date } = {}) => {
    const event = {
      id: id || makeInjectionId(),
      date: date || todayKey,
      zoneId,
      x,
      y,
      view: view || 'front',
      medId,
      medModuleId,
      medName,
    };
    setModules(prev => prev.map(m => {
      if (m.id === bodymapModuleId && m.type === 'bodymap') {
        return logInjection(m, event);
      }
      if (m.id === medModuleId && m.type === 'medication') {
        return {
          ...m,
          meds: (m.meds || []).map((med) =>
            med.id === medId ? { ...med, supply: Math.max(0, (med.supply || 0) - 1) } : med
          ),
        };
      }
      return m;
    }));
    return event;
  };

  // H12: verplaatst een bestaande prik (verslepen). De zone wordt opnieuw
  // afgeleid uit het nieuwe punt; voorraad blijft ongemoeid.
  const moveInjectionEvent = (bodymapModuleId, id, { x, y, view } = {}) => {
    const zoneId = zoneFor(x, y, view || 'front');
    setModules(prev => prev.map(m => {
      if (m.id === bodymapModuleId && m.type === 'bodymap') {
        return updateInjectionPosition(m, id, { x, y, zoneId });
      }
      return m;
    }));
  };

  // Verwijdert de logregel (op id, H12) én herstelt de voorraad van het
  // bronmedicijn met 1. Als het event of het bronmedicijn niet meer bestaat:
  // alleen de logregel verwijderen, voorraad met rust laten (defensief). De
  // log wordt eerst genormaliseerd zodat ook pre-H12 events (zonder eigen id)
  // op dezelfde gesynthetiseerde id matchen als de view gebruikte.
  const removeInjectionEvent = (bodymapModuleId, id) => {
    const bodymapModule = modules.find(m => m.id === bodymapModuleId && m.type === 'bodymap');
    const normalizedLog = (bodymapModule?.log || []).map((event, index) => normalizeInjectionEvent(event, index));
    const removedEvent = normalizedLog.find((event) => event.id === id) || null;
    setModules(prev => prev.map(m => {
      if (m.id === bodymapModuleId && m.type === 'bodymap') {
        return removeInjectionById(m, id);
      }
      if (removedEvent && m.id === removedEvent.medModuleId && m.type === 'medication') {
        return {
          ...m,
          meds: (m.meds || []).map((med) =>
            med.id === removedEvent.medId ? { ...med, supply: (med.supply || 0) + 1 } : med
          ),
        };
      }
      return m;
    }));
    return removedEvent;
  };

  // ---- injection schedule handlers ---------------------------------------

  const updateInjectionScheduleModule = (moduleId, mutator) => {
    setModules(prev => prev.map(m => {
      if (m.id !== moduleId || m.type !== 'injectionSchedule') return m;
      return mutator(m);
    }));
  };

  const addScheduleEntry = (moduleId, entry) => {
    if (!entry) return null;
    updateInjectionScheduleModule(moduleId, (m) => ({
      ...m,
      entries: [...(m.entries || []), entry],
    }));
    return entry;
  };

  const updateScheduleEntry = (moduleId, entryId, patch) => {
    updateInjectionScheduleModule(moduleId, (m) => ({
      ...m,
      entries: (m.entries || []).map((e) => (e.id === entryId ? { ...e, ...patch } : e)),
    }));
  };

  const deleteScheduleEntry = (moduleId, entryId) => {
    updateInjectionScheduleModule(moduleId, (m) => ({
      ...m,
      entries: (m.entries || []).filter((e) => e.id !== entryId),
    }));
  };

  // ---- measurements handlers --------------------------------------------

  const updateMeasurementsModule = (updatedModule) => {
    setModules(prev => prev.map(m =>
      m.id === updatedModule.id && m.type === 'measurements' ? updatedModule : m
    ));
  };

  // Eén-klik bundel: measurements (Health metrics preset) + medication + bijwerkingen
  // (checklist-preset, health) + beweging (counter-preset, health). Bestaande
  // modules van hetzelfde type/preset blijven ongemoeid, geen duplicaten.
  const setupWeightLossBundle = useCallback(() => {
    setModules(prev => {
      const next = [...prev];
      const hasPresetModule = (type, nameKey) => next.some(m => m.type === type && m.nameKey === nameKey);

      const healthPreset = (MODULE_PRESETS.measurements || []).find(p => p.nameKey === 'presets.health.name');
      if (healthPreset && !hasPresetModule('measurements', healthPreset.nameKey)) {
        next.push(applyModulePreset(
          { type: 'measurements', id: genId('measurements'), enabled: true, countInStreak: false },
          healthPreset
        ));
      }

      if (!next.some(m => m.type === 'medication')) {
        next.push({
          id: genId('medication'),
          nameKey: 'modules.types.medication',
          icon: 'Cross',
          color: 'blue',
          enabled: true,
          countInStreak: false,
          type: 'medication',
          meds: [],
        });
      }

      if (!next.some(m => m.type === 'bodymap')) {
        next.push({
          id: genId('bodymap'),
          nameKey: 'modules.types.bodymap',
          icon: 'Target',
          color: 'purple',
          enabled: true,
          countInStreak: false,
          type: 'bodymap',
          log: [],
          heatWindow: '30d',
        });
      }

      if (!next.some(m => m.type === 'injectionSchedule')) {
        next.push({
          id: genId('injectionSchedule'),
          nameKey: 'modules.types.injectionSchedule',
          icon: 'CalendarClock',
          color: 'indigo',
          enabled: true,
          countInStreak: false,
          type: 'injectionSchedule',
          entries: [],
        });
      }

      const bijwerkingenPreset = (MODULE_PRESETS.checklist || []).find(p => p.nameKey === 'presets.bijwerkingen.name');
      if (bijwerkingenPreset && !hasPresetModule('checklist', bijwerkingenPreset.nameKey)) {
        next.push(applyModulePreset(
          { type: 'checklist', id: genId('checklist'), enabled: true, countInStreak: false },
          bijwerkingenPreset
        ));
      }

      const bewegingPreset = (MODULE_PRESETS.counter || []).find(p => p.nameKey === 'presets.beweging.name');
      if (bewegingPreset && !hasPresetModule('counter', bewegingPreset.nameKey)) {
        next.push(applyModulePreset(
          { type: 'counter', id: genId('counter'), enabled: true, countInStreak: false },
          bewegingPreset
        ));
      }

      return next;
    });
  }, [setModules]);

  const openModuleEditor = (type) => {
    const defaultIcon = type === 'projects'
      ? 'GraduationCap'
      : type === 'measurements'
        ? 'Heart'
        : type === 'medication'
          ? 'Cross'
          : type === 'bodymap'
            ? 'Target'
            : type === 'injectionSchedule'
              ? 'CalendarClock'
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
      ...(type === 'medication' ? {
        meds: [],
      } : {}),
      ...(type === 'bodymap' ? {
        log: [],
        heatWindow: '30d',
      } : {}),
      ...(type === 'injectionSchedule' ? {
        entries: [],
      } : {}),
    });
  };

  const openBlankModuleEditor = () => {
    setEditingModule({
      id: `mod_${Date.now()}`,
      name: '',
      icon: 'Star',
      color: 'blue',
      enabled: true,
      countInStreak: false,
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

  // Kern-functie: voegt een losse taak toe. Hergebruikt door zowel het
  // Tasks-module-invoerveld (addTask) als het toevoeg-veld in de Planner
  // (TaskListPanel / Kanban Te doen-kolom).
  // `dateKey` staat standaard op de actieve dag, zodat elke bestaande aanroeper
  // ongewijzigd op vandaag blijft schrijven. De Planner geeft de geselecteerde
  // dag mee: die kan sinds de weeknavigatie in een andere week liggen dan
  // vandaag. Schrijven gaat via `writeTasksForDay` en niet meer rechtstreeks via
  // `setCustomTasks`, want dat laatste raakt per definitie alleen de actieve dag.
  const addCustomTask = (text, time, extra = {}, dateKey = activeDateKey) => {
    const trimmed = (text || '').trim();
    if (!trimmed) return;
    const { duration, window, autoPlan, deepWork, priority } = extra;
    const task = {
      id: Date.now(),
      text: trimmed,
      done: false,
      ...(time ? { time } : {}),
      ...(duration ? { duration } : {}),
      ...(window ? { window } : {}),
      ...(autoPlan ? { autoPlan } : {}),
      ...(deepWork ? { deepWork } : {}),
      ...(priority && priority !== DEFAULT_PRIORITY ? { priority } : {}),
    };
    writeTasksForDay(dateKey, prev => [...prev, task]);
  };

  const addTask = () => {
    if (newTask.trim()) {
      addCustomTask(newTask, newTaskTime || undefined);
      setNewTask('');
      setNewTaskTime('');
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

  const setTaskTime = (id, time) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, time: time || undefined } : t));
  };

  const setTaskDuration = (id, duration) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, duration: duration || undefined } : t));
  };

  const setTaskWindow = (id, windowValue) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, window: windowValue || undefined } : t));
  };

  const setTaskAutoPlan = (id, autoPlan) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, autoPlan: autoPlan || undefined } : t));
  };

  const setTaskDeepWork = (id, deepWork) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, deepWork: deepWork || undefined } : t));
  };

  // `normaal` wordt niet opgeslagen (zelfde '' = geen-waarde-conventie als
  // `window`/`duration`, zie utils/dayTimeline.js): schrijven laat de default
  // weg, lezen valt terug op `DEFAULT_PRIORITY`. Geen migratie nodig.
  const setTaskPriority = (id, priority) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, priority: priority === DEFAULT_PRIORITY ? undefined : priority } : t));
  };

  // Zet de Kanban-status van een losse taak. Houdt `done` consistent met de
  // bestaande toggle (Today/Dag-view): `klaar` zet `done = true`, elke andere
  // kolom zet het weer op false.
  const setTaskStatus = (id, status) => {
    setCustomTasks(prev => prev.map(t => t.id === id ? { ...t, status, done: status === 'klaar' } : t));
  };

  // ---- WeekView (Planner) handlers ---------------------------------------
  // De WeekView toont alle dagen van de huidige week, niet alleen de actieve
  // dag. Deze twee helpers lezen/schrijven de customTasks van een willekeurige
  // dag: de actieve dag via de live state (customTasks/setCustomTasks, zoals
  // de rest van de app), elke andere dag rechtstreeks via history + storage.
  // Hierop bouwen zowel het afvinken op een niet-actieve dag als de
  // cross-day-drag (verplaatsen + tijd zetten) voort.
  const readTasksForDay = useCallback((dateKey) => {
    if (dateKey === activeDateKey) return customTasks;
    return history[dateKey]?.customTasks || [];
  }, [activeDateKey, customTasks, history]);

  const writeTasksForDay = useCallback((dateKey, updater) => {
    if (dateKey === activeDateKey) {
      setCustomTasks(prev => updater(prev));
      return;
    }
    setHistory(prev => {
      const day = prev[dateKey] || { moduleData: {}, customTasks: [] };
      const nextCustomTasks = updater(day.customTasks || []);
      const nextDay = { ...day, customTasks: nextCustomTasks };
      window.storage.set(`day:${dateKey}`, JSON.stringify(nextDay)).catch(() => {});
      return { ...prev, [dateKey]: nextDay };
    });
  }, [activeDateKey]);

  // Afvinken van een losse taak op een willekeurige dag van de zichtbare week.
  // Op de actieve dag hergebruikt dit de bestaande toggleTask (incl. geluid);
  // op elke andere dag schrijft het rechtstreeks naar dat day:<date>-record.
  const toggleTaskInDay = useCallback((dateKey, taskId) => {
    if (dateKey === activeDateKey) { toggleTask(taskId); return; }
    writeTasksForDay(dateKey, tasks => tasks.map(t =>
      String(t.id) === String(taskId) ? { ...t, done: !t.done } : t
    ));
  }, [activeDateKey, writeTasksForDay]);

  // De ene nieuwe cross-day-handler uit de S03-spec: verplaatst een pool-item
  // (losse taak of projecttaak) naar een dag + tijd. Losse taken verhuizen
  // tussen day:<date>-records; project-subgoals leven niet per dag maar op de
  // module zelf, dus daar past deze handler `deadline` + `time` aan. Een nog
  // niet gematerialiseerde recurring-instantie (virtual, zie weekDays) wordt
  // pas nu voor het eerst als echte taak opgeslagen — nooit eager (principe 2).
  //
  // Geeft de id terug van een taak die hier voor het eerst gematerialiseerd is,
  // anders `null`. Alleen "deel mijn dag in" gebruikt dat (om precies díé taak
  // te kunnen terugdraaien in plaats van elke instantie van dezelfde
  // recurring); sleep-aanroepers negeren de returnwaarde.
  const moveItemToDay = useCallback((itemKey, sourceDateKey, targetDateKey, time) => {
    const parsed = parseItemKey(itemKey);

    if (parsed.kind === 'subgoal') {
      const { moduleId: projectId, subjectId, goalId: goalIdRaw } = parsed;

      // Een item van een gekoppelde bron zit niet in `modules` (het is
      // afgeleid), dus dag en tijd landen in de override-map. De dag gaat mee:
      // zonder binding zou een vrij blok in élke dagkolom van het rooster
      // verschijnen (zie sourceItemPrefs.js).
      if (isSourceItemId(goalIdRaw)) {
        setSourceItemPrefs(prev => withItemOverride(prev, goalIdRaw, {
          dateKey: targetDateKey,
          time: time || undefined,
        }));
        return null;
      }

      setModules(prev => prev.map(m => {
        if (m.id !== projectId) return m;
        return {
          ...m,
          subjects: (m.subjects || []).map(s => s.id !== subjectId ? s : {
            ...s,
            subgoals: (s.subgoals || []).map(g => String(g.id) !== goalIdRaw ? g : {
              ...g,
              deadline: targetDateKey,
              time: time || undefined,
            }),
          }),
        };
      }));
      return null;
    }

    if (parsed.kind !== 'task') return null;
    const taskId = parsed.taskId;

    let moved = null;
    let isVirtual = false;
    const virtual = parseVirtualTaskId(taskId);
    if (virtual) {
      if (virtual.dateKey === sourceDateKey) {
        const rt = recurringTasks.find(r => String(r.id) === virtual.recurringId);
        if (rt) {
          moved = {
            recurringId: rt.id,
            text: rt.text,
            done: false,
            ...(rt.time ? { time: rt.time } : {}),
            ...(rt.duration ? { duration: rt.duration } : {}),
            ...(rt.window ? { window: rt.window } : {}),
            ...(rt.autoPlan ? { autoPlan: rt.autoPlan } : {}),
            ...(rt.deepWork ? { deepWork: rt.deepWork } : {}),
          };
          isVirtual = true;
        }
      }
    } else {
      moved = readTasksForDay(sourceDateKey).find(t => String(t.id) === taskId) || null;
    }
    if (!moved) return null;

    const nextTask = { ...moved, time: time || undefined, ...(isVirtual ? { id: genId('task') } : {}) };
    const createdTaskId = isVirtual ? String(nextTask.id) : null;

    if (sourceDateKey === targetDateKey) {
      writeTasksForDay(targetDateKey, tasks => tasks.some(t => String(t.id) === taskId)
        ? tasks.map(t => String(t.id) === taskId ? nextTask : t)
        : [...tasks, nextTask]);
      return createdTaskId;
    }

    writeTasksForDay(targetDateKey, tasks => [...tasks, nextTask]);
    if (!isVirtual) {
      writeTasksForDay(sourceDateKey, tasks => tasks.filter(t => String(t.id) !== taskId));
    }
    return createdTaskId;
  }, [readTasksForDay, writeTasksForDay, recurringTasks]);

  // Zet de duur van één pool-item, ongeacht soort. Zusje van moveItemToDay:
  // dezelfde item-key -> kind-dispatch, en dezelfde dag-bewuste schrijfweg.
  // Bewust NIET via setTaskDuration: die schrijft alleen de actieve dag, en de
  // takenpool toont een willekeurige dag van de zichtbare week — een duur op
  // een kaart van morgen zou dan stil op vandaag landen. `duration ||
  // undefined` houdt de "leeg = geen waarde"-conventie aan (zie dayTimeline).
  const setItemDuration = useCallback((itemKey, dateKey, duration) => {
    const parsed = parseItemKey(itemKey);

    if (parsed.kind === 'subgoal') {
      // Bronitem: zie moveItemToDay — afgeleid, dus de duur gaat naar de
      // override-map in plaats van naar `modules`.
      if (isSourceItemId(parsed.goalId)) {
        setSourceItemPrefs(prev => withItemOverride(prev, parsed.goalId, { duration: duration || undefined }));
        return;
      }
      setSubgoalDuration(parsed.moduleId, parsed.subjectId, parsed.goalId, duration);
      return;
    }

    if (parsed.kind !== 'task') return;
    // Een nog niet gematerialiseerde recurring-instantie heeft geen record om
    // op te schrijven; materialiseren om enkel een duur te zetten zou een
    // eager write zijn. De kaart toont daar een statisch label (TaskPoolPanel).
    if (parseVirtualTaskId(parsed.taskId)) return;

    writeTasksForDay(dateKey, tasks => tasks.map(t =>
      String(t.id) === parsed.taskId ? { ...t, duration: duration || undefined } : t
    ));
  }, [writeTasksForDay]);

  // Haalt alle eigen aanpassingen van een bronitem weg, zodat het weer volledig
  // door Trello/GitHub wordt bepaald (de due-datum, en een vrij blok dat op elke
  // dag mag staan). De enige weg terug: dag en tijd komen uit een override die
  // de bron overstemt, en zonder deze actie zou een eenmaal gezette dag blijven
  // staan ook als de kaart in Trello verschuift.
  const resetSourceItem = useCallback((itemKey) => {
    const parsed = parseItemKey(itemKey);
    if (parsed.kind !== 'subgoal' || !isSourceItemId(parsed.goalId)) return;
    setSourceItemPrefs(prev => withItemOverride(prev, parsed.goalId, {
      duration: undefined,
      dateKey: undefined,
      time: undefined,
    }));
  }, []);

  // Welke week het rooster toont, in hele weken t.o.v. deze week (0 = deze
  // week, 1 = volgende, -1 = vorige). Bewust alleen hier: `activeDate` blijft
  // binnen de Planner op vandaag staan (zie de guard hierboven), want de
  // opslag-effect schrijft alleen weg voor vandaag/gisteren (`isEditable`). Een
  // andere week bekijken mag dus nooit de actieve dag verzetten — alle
  // schrijfacties op zo'n dag lopen via `writeTasksForDay`, die het dagrecord
  // rechtstreeks wegschrijft zonder datumgrens.
  const [weekOffset, setWeekOffset] = useState(0);

  // Zichtbare week voor de WeekView: de 7 dagen (ma-zo) van de week die
  // `weekOffset` aanwijst. De actieve dag (altijd "vandaag" binnen de Planner,
  // zie de view==='productivity'-guard hierboven) leest de live customTasks-state;
  // elke andere dag leest de al-in-geheugen history-map. Voor dagen ná vandaag
  // worden terugkerende taken die daar nog niet gematerialiseerd zijn er
  // alleen virtueel (in-memory, `virtual: true`) bijgevoegd zodat de week zich
  // als agenda gedraagt — pas een gebruikersactie (slepen/tijd zetten, via
  // moveItemToDay) schrijft zo'n instantie echt naar het dagrecord. Zo blijft
  // het tonen van een toekomstige dag veilig voor bestaande opslag (principe 2).
  const weekDays = useMemo(() => {
    const monday = addDays(startOfWeek(new Date()), weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const date = addDays(monday, i);
      const dateKey = fmtDateKey(date);
      const stored = dateKey === activeDateKey ? customTasks : (history[dateKey]?.customTasks || []);

      let dayTasks = stored;
      if (dateKey > todayKey) {
        const missing = recurringTasks
          .filter(rt => rt.days.includes(i))
          .filter(rt => !stored.some(t => t.recurringId === rt.id))
          .map(rt => ({
            id: virtualTaskId(rt.id, dateKey),
            recurringId: rt.id,
            text: rt.text,
            done: false,
            virtual: true,
            ...(rt.time ? { time: rt.time } : {}),
            ...(rt.duration ? { duration: rt.duration } : {}),
            ...(rt.window ? { window: rt.window } : {}),
            ...(rt.autoPlan ? { autoPlan: rt.autoPlan } : {}),
            ...(rt.deepWork ? { deepWork: rt.deepWork } : {}),
          }));
        dayTasks = [...stored, ...missing];
      }

      return { date, dateKey, customTasks: dayTasks };
    });
  }, [activeDateKey, customTasks, history, recurringTasks, todayKey, weekOffset]);

  // ---- Outlook-agenda (S07 / S07a, persistent sinds S07d) ------------------
  // Eigen useConnections-instantie (naast die van ConnectionsSection) puur om
  // hier te kunnen afleiden of Outlook verbonden is; App.jsx zelf schrijft er
  // niets mee weg. Agenda-ophalen is een no-op zonder verbonden Outlook,
  // buiten de Planner-view, of zolang de gebruiker de agenda niet eerder
  // heeft laten zien (principe 2, S07a: geen fetch bij Planner-open zonder
  // klik). `agendaShown` leeft sinds S07d in `settings` (zelfde patroon als
  // `planPrefs`/`sourcePrefs`, en gedeclareerd naast die twee), zodat een
  // eenmaal geïmporteerde agenda niet elke sessie opnieuw een klik vraagt; een
  // ontbrekende key valt terug op `false`, dus geen migratie nodig.
  const connectionState = useConnections(currentUser?.id);
  const outlookConnection = connectionState.connections.find(
    c => c.provider === 'outlook' && c.status === 'connected'
  ) || null;
  // Mag de agenda meedoen? Een nog-ladende koppelingsstatus telt als "ja", zodat
  // de cache-seed bij een herlaad niet op het netwerk hoeft te wachten; een
  // uitsluitsel "niet verbonden" zet hem uit en maakt daarmee `eventsByDate`
  // leeg — de enige plek waar dat geregeld hoeft te worden.
  const agendaActive = agendaShown && (connectionState.loading || !!outlookConnection);
  const {
    eventsByDate: outlookEventsByDate,
    loading: outlookAgendaLoading,
    error: outlookAgendaError,
    lastSyncedAt: outlookLastSyncedAt,
    refetch: refetchOutlookAgenda,
  } = useOutlookEvents({
    active: agendaActive,
    enabled: agendaActive && !!outlookConnection && view === 'productivity',
    weekDays,
    connectionId: outlookConnection?.id,
    todayKey,
  });

  // Geen wees-afspraken van een verbroken koppeling (S07d): zodra deze
  // instantie leert dat Outlook niet meer verbonden is terwijl dat eerder wel
  // zo was, wist dit zowel de device-local cache als de "getoond"-vlag. Een
  // nog-onbekende status (netwerk nog bezig, offline) telt bewust niet als
  // "verbroken" — anders zou een tijdelijke laad-hik al de cache wissen.
  const wasOutlookConnectedRef = useRef(false);
  useEffect(() => {
    if (connectionState.loading) return;
    if (wasOutlookConnectedRef.current && !outlookConnection) {
      clearAgendaCache();
      // De meenemen-selectie hoort bij de agendadata en gaat dus mee weg: geen
      // wees-ids van afspraken die niemand meer kan zien.
      clearAgendaSelection();
      setAgendaSelection([]);
      setAgendaShown(false);
    }
    wasOutlookConnectedRef.current = !!outlookConnection;
  }, [outlookConnection, connectionState.loading]);

  const handleImportOrRefreshAgenda = useCallback(() => {
    if (!agendaShown) {
      setAgendaShown(true);
    } else {
      refetchOutlookAgenda();
    }
  }, [agendaShown, refetchOutlookAgenda]);

  // ---- Trello-borden (S08) --------------------------------------------------
  // Hergebruikt de bestaande useConnections-instantie hierboven (geen tweede,
  // zie de slice-spec) om ook de Trello-connectie af te leiden.
  const trelloConnection = connectionState.connections.find(
    c => c.provider === 'trello' && c.status === 'connected'
  ) || null;
  const trelloVisible = getSourcePref(sourcePrefs, 'trello').visible;

  // Bordkeuze (welk bord telt mee, en welke lijst daarbinnen "altijd" is) is
  // device-local (zie utils/trelloBoardPrefs.js) en overleeft dus geen sync,
  // net als agendaSelection hierboven. Geseed uit opslag bij mount en telkens
  // wanneer de connectie verandert (na opnieuw koppelen nooit andermans
  // bordselectie hergebruiken, zie readTrelloBoardPrefs).
  const [trelloBoardPrefs, setTrelloBoardPrefsState] = useState({ boards: {} });
  useEffect(() => {
    let cancelled = false;
    readTrelloBoardPrefs(trelloConnection?.id).then(prefs => {
      if (!cancelled) setTrelloBoardPrefsState(prefs);
    });
    return () => { cancelled = true; };
  }, [trelloConnection?.id]);

  // Setter die zowel de state als de opslag bijwerkt (zelfde vorm als
  // `setSourcePrefs`: accepteert een updater-functie of een waarde).
  const setTrelloBoardPrefs = useCallback((updater) => {
    setTrelloBoardPrefsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeTrelloBoardPrefs({ connectionId: trelloConnection?.id, boards: next.boards });
      return next;
    });
  }, [trelloConnection?.id]);

  const trelloIncludedBoardIds = useMemo(
    () => includedBoardIds(trelloBoardPrefs),
    [trelloBoardPrefs]
  );

  // Mag Trello meedoen? Een nog-ladende koppelingsstatus telt als "ja"
  // (zelfde reden als agendaActive hierboven: de cache-seed hoeft niet op het
  // netwerk te wachten). De oog-toggle op de Trello-rij is de aan/uit-
  // schakelaar voor heel Trello (zie de kernbeslissing in de slice-spec).
  const trelloActive = trelloVisible && (connectionState.loading || !!trelloConnection);
  const {
    boards: trelloCacheBoards,
    loading: trelloCardsLoading,
    error: trelloCardsError,
    lastSyncedAt: trelloLastSyncedAt,
    refetch: refetchTrelloCards,
  } = useTrelloCards({
    active: trelloActive,
    enabled: trelloActive && !!trelloConnection && trelloIncludedBoardIds.length > 0,
    boardIds: trelloIncludedBoardIds,
    connectionId: trelloConnection?.id,
  });

  // Geen wees-projecten van een verbroken koppeling (AC15): zowel de
  // kaarten-cache als de bordkeuze gaan mee weg zodra deze instantie leert
  // dat Trello niet meer verbonden is terwijl dat eerder wel zo was.
  const wasTrelloConnectedRef = useRef(false);
  useEffect(() => {
    if (connectionState.loading) return;
    if (wasTrelloConnectedRef.current && !trelloConnection) {
      clearTrelloCache();
      clearTrelloBoardPrefs();
      setTrelloBoardPrefsState({ boards: {} });
    }
    wasTrelloConnectedRef.current = !!trelloConnection;
  }, [trelloConnection, connectionState.loading]);

  // Afgeleide Trello-projects-modules (de kernbeslissing in de slice-spec):
  // leven alleen in het geheugen, nooit in `modules`/settings, dus
  // `setModules` raakt ze nooit (read-only is daarmee afdwingbaar). Gated op
  // de oog-toggle: uit betekent geen Trello-projecten, nergens. `allModules`
  // is de lijst die de Vandaag-feed, de auto-planner, ProjectsView en de
  // Planner gebruiken; `modules` (settings-only) blijft voor SettingsModal,
  // ModuleEditor, CollectionsView en InsightView (zie de prop-routing-tabel
  // in de slice-spec).
  // De mapper blijft puur "cache + prefs -> modules"; de duur/tijd die de
  // gebruiker zelf op een kaart zette wordt er hier read-time overheen
  // gemerged (sourceItemPrefs.js). Zo hoeft geen enkele consumer
  // (dayTimeline, TaskPoolPanel, de indeler) van het bestaan te weten.
  const trelloModules = useMemo(() => {
    if (!trelloVisible) return [];
    return applyItemOverrides(buildTrelloModules(
      { boards: trelloCacheBoards },
      trelloBoardPrefs,
      { connectionId: trelloConnection?.id, color: getSourcePref(sourcePrefs, 'trello').color },
    ), sourceItemPrefs);
  }, [trelloVisible, trelloCacheBoards, trelloBoardPrefs, trelloConnection, sourcePrefs, sourceItemPrefs]);

  // ---- GitHub-repo's (S09) --------------------------------------------------
  // Hergebruikt dezelfde useConnections-instantie (connectionState) om ook de
  // GitHub-connectie af te leiden — spiegelt de Trello-blok hierboven.
  const githubConnection = connectionState.connections.find(
    c => c.provider === 'github' && c.status === 'connected'
  ) || null;
  const githubVisible = getSourcePref(sourcePrefs, 'github').visible;

  // Repo-keuze (welke repo telt mee) is device-local (zie
  // utils/githubRepoPrefs.js) en overleeft dus geen sync, net als
  // trelloBoardPrefs hierboven. Geseed uit opslag bij mount en telkens
  // wanneer de connectie verandert (na opnieuw koppelen nooit andermans
  // repo-selectie hergebruiken, zie readGithubRepoPrefs).
  const [githubRepoPrefs, setGithubRepoPrefsState] = useState({ repos: {} });
  useEffect(() => {
    let cancelled = false;
    readGithubRepoPrefs(githubConnection?.id).then(prefs => {
      if (!cancelled) setGithubRepoPrefsState(prefs);
    });
    return () => { cancelled = true; };
  }, [githubConnection?.id]);

  const setGithubRepoPrefs = useCallback((updater) => {
    setGithubRepoPrefsState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      writeGithubRepoPrefs({ connectionId: githubConnection?.id, repos: next.repos });
      return next;
    });
  }, [githubConnection?.id]);

  const githubIncludedRepoIds = useMemo(
    () => includedRepoIds(githubRepoPrefs),
    [githubRepoPrefs]
  );

  // Mag GitHub meedoen? Een nog-ladende koppelingsstatus telt als "ja"
  // (zelfde reden als trelloActive hierboven). De oog-toggle op de
  // GitHub-rij is de aan/uit-schakelaar voor heel GitHub (AC8).
  const githubActive = githubVisible && (connectionState.loading || !!githubConnection);
  const {
    repos: githubCacheRepos,
    loading: githubIssuesLoading,
    error: githubIssuesError,
    lastSyncedAt: githubLastSyncedAt,
    refetch: refetchGithubIssues,
  } = useGithubIssues({
    active: githubActive,
    enabled: githubActive && !!githubConnection && githubIncludedRepoIds.length > 0,
    repoIds: githubIncludedRepoIds,
    connectionId: githubConnection?.id,
  });

  // Geen wees-projecten van een verbroken koppeling (AC11): zowel de
  // issues-cache als de repo-keuze gaan mee weg zodra deze instantie leert
  // dat GitHub niet meer verbonden is terwijl dat eerder wel zo was.
  const wasGithubConnectedRef = useRef(false);
  useEffect(() => {
    if (connectionState.loading) return;
    if (wasGithubConnectedRef.current && !githubConnection) {
      clearGithubCache();
      clearGithubRepoPrefs();
      setGithubRepoPrefsState({ repos: {} });
    }
    wasGithubConnectedRef.current = !!githubConnection;
  }, [githubConnection, connectionState.loading]);

  // Afgeleide GitHub-projects-modules (zelfde kernbeslissing als Trello):
  // leven alleen in het geheugen, nooit in `modules`/settings, dus
  // `setModules` raakt ze nooit (AC12, read-only is daarmee afdwingbaar).
  const githubModules = useMemo(() => {
    if (!githubVisible) return [];
    return applyItemOverrides(buildGithubModules(
      { repos: githubCacheRepos },
      githubRepoPrefs,
      { connectionId: githubConnection?.id, color: getSourcePref(sourcePrefs, 'github').color },
    ), sourceItemPrefs);
  }, [githubVisible, githubCacheRepos, githubRepoPrefs, githubConnection, sourcePrefs, sourceItemPrefs]);

  const allModules = useMemo(
    () => [...modules, ...trelloModules, ...githubModules],
    [modules, trelloModules, githubModules]
  );

  // Welke agendapunten als bezette tijd meetellen bij "deel mijn dag in".
  // Opt-in (leeg = niets telt mee) en device-local, zie utils/agendaSelection.js
  // — daarom eigen state en niet in `settings` zoals `agendaShown`/`sourcePrefs`.
  const [agendaSelection, setAgendaSelection] = useState([]);
  useEffect(() => {
    let cancelled = false;
    readAgendaSelection().then(ids => {
      if (!cancelled) setAgendaSelection(ids);
    });
    return () => { cancelled = true; };
  }, []);

  const handleToggleAgendaBlock = useCallback((blockId) => {
    const next = agendaSelection.includes(blockId)
      ? agendaSelection.filter(id => id !== blockId)
      : [...agendaSelection, blockId];
    // Snoeien tegen de nu bekende agenda, zodat ids van verlopen of
    // geannuleerde afspraken bij elke klik vanzelf wegvallen.
    const knownIds = new Set(
      Object.values(outlookEventsByDate || {}).flat().map(b => b.id)
    );
    const pruned = pruneSelection(next, knownIds);
    setAgendaSelection(pruned);
    writeAgendaSelection(pruned);
  }, [agendaSelection, outlookEventsByDate]);

  const handleOpenConnections = useCallback(() => {
    setSettingsInitialTab('account');
    setShowSettings(true);
  }, []);

  // ---- "Deel mijn dag in" (S05) -------------------------------------------
  // Bouwt de input voor de pure planDay-motor voor één dag: candidates zijn
  // pool-items (autoPlan === true, zonder tijd), fixed zijn items die al een
  // tijd hebben. Spiegelt dayTimeline.js' bronnen (project-subgoals +
  // customTasks, incl. gematerialiseerde recurring via weekDays) maar geeft
  // ook `autoPlan` door — dat veld heeft de Dag-tijdlijn zelf niet nodig.
  // `meta` onthoudt per key de weergave-info (label/kleur/soort) voor de
  // pending-blokken; planDay zelf blijft puur en krijgt alleen platte data.
  const buildPlanInputs = useCallback((dateKey) => {
    const dayTasks = weekDays.find(d => d.dateKey === dateKey)?.customTasks || [];
    const candidates = [];
    const fixed = [];
    const meta = {};
    let order = 0;

    // allModules (niet modules): een Trello-subgoal met een due-datum vandaag
    // of uit de altijd-lijst heeft `autoPlan: true` (trelloModules.js), en een
    // open GitHub-issue heeft dat sowieso (githubModules.js, S09 AC5) — beide
    // mogen dus meedoen aan "deel mijn dag in", ook al is de module zelf niet
    // in settings te vinden. Toepassen werkt daar ook echt: de tijd landt in
    // sourceItemPrefs in plaats van op de module (zie moveItemToDay).
    allModules.forEach(mod => {
      if (!mod.enabled || mod.type !== 'projects') return;
      (mod.subjects || []).forEach(subject => {
        (subject.subgoals || []).forEach(goal => {
          const isFreeBlock = !!goal.freeBlock;
          const isDueToday = goal.deadline === dateKey;
          if (!isFreeBlock && !isDueToday) return;
          const key = subgoalKey(mod.id, subject.id, goal.id);
          meta[key] = { label: goal.label, color: mod.color, kind: 'projecttaak' };
          if (goal.time) {
            fixed.push({ time: goal.time, duration: goal.duration });
          } else if (goal.autoPlan) {
            candidates.push({ key, duration: goal.duration, window: goal.window || '', deepWork: !!goal.deepWork, order: order++ });
          }
        });
      });
    });

    const tasksModuleColor = modules.find(m => m.enabled && m.type === 'tasks')?.color;
    dayTasks.forEach(task => {
      const key = taskKey(task.id);
      meta[key] = { label: task.text, color: tasksModuleColor, kind: 'losseTaak' };
      if (task.time) {
        fixed.push({ time: task.time, duration: task.duration });
      } else if (task.autoPlan) {
        candidates.push({ key, duration: task.duration, window: task.window || '', deepWork: !!task.deepWork, order: order++ });
      }
    });

    return { candidates, fixed, meta };
  }, [weekDays, allModules, modules]);

  // Past één plan-toewijzing toe via de bestaande cross-day-handler
  // (moveItemToDay dekt zowel losse taken, gematerialiseerde recurring als
  // project-subgoals) — dezelfde dag als bron en doel, want de indeler werkt
  // op de geselecteerde dag zelf (geen dag-wissel). Reikt de id door van een
  // taak die hierbij voor het eerst gematerialiseerd is (zie moveItemToDay).
  const applyPendingAssignment = useCallback((dateKey, key, time) => (
    moveItemToDay(key, dateKey, dateKey, time)
  ), [moveItemToDay]);

  // Legt de HUIDIGE staat van één item vast, vóór het indelen erover heen
  // schrijft. Bewust een echte snapshot en geen reconstructie: moveItemToDay
  // zet naast `time` ook `deadline`, dus "de tijd weer wissen" laat een
  // deadline achter die een vrij-blok-taak nooit had. Nooit uit pendingPlan
  // lezen — die is bij het indeel-moment gevuld en kan in de propose-stand
  // verouderd zijn.
  const snapshotItem = useCallback((dateKey, itemKey) => {
    const parsed = parseItemKey(itemKey);

    if (parsed.kind === 'subgoal') {
      // Bronitem: de override-map is hier de bron van waarheid, want de bron
      // zelf (Trello/GitHub) kent geen dag-binding en geen tijd. `duration`
      // blijft buiten de snapshot: de indeler raakt die niet aan.
      if (isSourceItemId(parsed.goalId)) {
        const pref = getSourceItemPref(sourceItemPrefs, parsed.goalId);
        return { kind: 'sourceItem', goalId: parsed.goalId, dateKey: pref.dateKey, time: pref.time };
      }

      // Lokale subgoals staan in `modules`, niet in `allModules`.
      const mod = modules.find(m => m.id === parsed.moduleId);
      const subject = (mod?.subjects || []).find(s => s.id === parsed.subjectId);
      const goal = (subject?.subgoals || []).find(g => String(g.id) === parsed.goalId);
      if (!goal) return null;
      return {
        kind: 'subgoal',
        moduleId: parsed.moduleId,
        subjectId: parsed.subjectId,
        goalId: parsed.goalId,
        deadline: goal.deadline,
        time: goal.time,
      };
    }

    if (parsed.kind !== 'task') return null;
    // Een virtuele instantie bestaat nog niet; die levert bij het toepassen een
    // 'createdTask'-entry op (zie applyAssignments), niet een 'task'-entry.
    if (parseVirtualTaskId(parsed.taskId)) return null;
    const task = readTasksForDay(dateKey).find(t => String(t.id) === parsed.taskId);
    if (!task) return null;
    return { kind: 'task', taskId: parsed.taskId, time: task.time };
  }, [modules, sourceItemPrefs, readTasksForDay]);

  // Past een reeks toewijzingen toe en levert de undo-entries. Eén weg voor
  // zowel de direct-stand als "alles overnemen". De snapshots worden binnen
  // dezelfde render-closure gelezen, dus elke entry ziet de staat van vóór de
  // hele indeling — React verwerkt de setStates pas na afloop.
  const applyAssignments = useCallback((dateKey, assignments) => {
    const entries = [];
    assignments.forEach(a => {
      const before = snapshotItem(dateKey, a.key);
      const createdTaskId = applyPendingAssignment(dateKey, a.key, a.time);
      if (createdTaskId) entries.push({ kind: 'createdTask', taskId: createdTaskId });
      else if (before) entries.push(before);
    });
    return entries;
  }, [snapshotItem, applyPendingAssignment]);

  // Zet een snapshot terug: per bron één schrijfactie, niet één per item. Een
  // item dat er inmiddels niet meer is matcht simpelweg niet en wordt stil
  // overgeslagen — nooit opnieuw aanmaken.
  const restorePlanSnapshot = useCallback(({ dateKey, entries }) => {
    const subgoalEntries = entries.filter(e => e.kind === 'subgoal');
    const sourceEntries = entries.filter(e => e.kind === 'sourceItem');
    const taskEntries = entries.filter(e => e.kind === 'task');
    const createdIds = entries.filter(e => e.kind === 'createdTask').map(e => e.taskId);

    // `withItemOverride` normaliseert mee, dus het terugdraaien van een
    // eerste-keer-tijd laat geen lege entry achter in de map.
    if (sourceEntries.length) {
      setSourceItemPrefs(prev => sourceEntries.reduce(
        (acc, e) => withItemOverride(acc, e.goalId, { dateKey: e.dateKey, time: e.time }),
        prev,
      ));
    }

    if (subgoalEntries.length) {
      setModules(prev => prev.map(m => {
        const forModule = subgoalEntries.filter(e => e.moduleId === m.id);
        if (!forModule.length) return m;
        return {
          ...m,
          subjects: (m.subjects || []).map(s => {
            const forSubject = forModule.filter(e => e.subjectId === s.id);
            if (!forSubject.length) return s;
            return {
              ...s,
              subgoals: (s.subgoals || []).map(g => {
                const entry = forSubject.find(e => e.goalId === String(g.id));
                return entry ? { ...g, deadline: entry.deadline, time: entry.time } : g;
              }),
            };
          }),
        };
      }));
    }

    if (taskEntries.length || createdIds.length) {
      writeTasksForDay(dateKey, tasks => tasks
        .filter(t => !createdIds.includes(String(t.id)))
        .map(t => {
          const entry = taskEntries.find(e => e.taskId === String(t.id));
          return entry ? { ...t, time: entry.time } : t;
        }));
    }
  }, [writeTasksForDay]);

  // Snapshot van de laatste indeling. Ephemeer, net als pendingPlan: na een
  // herlaadbeurt is er niets meer terug te draaien. Eén tegelijk — een nieuwe
  // indeling vervangt de vorige.
  const [planUndo, setPlanUndo] = useState(null);
  // Ref-spiegel omdat de toast zijn onAction in state bewaart: undoLastPlan
  // moet daarom een stabiele identiteit hebben én zelf idempotent zijn. Zonder
  // deze guard zou "toast-undo" gevolgd door "knop-undo" de snapshot twee keer
  // toepassen.
  const planUndoRef = useRef(null);

  const rememberPlanUndo = useCallback((snapshot) => {
    planUndoRef.current = snapshot;
    setPlanUndo(snapshot);
  }, []);

  const undoLastPlan = useCallback(() => {
    const snapshot = planUndoRef.current;
    if (!snapshot) return;
    planUndoRef.current = null;
    setPlanUndo(null);
    restorePlanSnapshot(snapshot);
  }, [restorePlanSnapshot]);

  // Hoofd-handler: verzamelt candidates/fixed voor `dateKey`, leidt dayStart
  // af uit een actieve slaap-module (of de nette fallback) en vertakt op
  // planMode. `notify` is optioneel en alleen nodig voor de ongedaan-maken-
  // toast van de direct-stand; App.jsx zelf zit niet onder ToastProvider, dus
  // de aanroeper (ProductivitySuiteView, wél een ToastProvider-kind) geeft
  // zijn eigen `showToast` mee.
  const handleShareDay = useCallback((dateKey, notify) => {
    const { candidates, fixed, meta } = buildPlanInputs(dateKey);
    if (candidates.length === 0) return;

    const sleepModule = modules.find(m => m.enabled && m.type === 'sleep');
    const wake = sleepModule ? goalsForNight(sleepModule.goals, parseDateKey(dateKey)).wake : null;
    const dayStart = wake || PLAN_DAY_START_FALLBACK;

    // Twee onafhankelijke filters bepalen wat bezette tijd is. Het oog per bron
    // (SourcesPanel) zegt of de bron überhaupt meedoet — dat filter houdt "deel
    // mijn dag in" gelijk aan wat er in het rooster staat (WeekView filtert
    // dezelfde blokken op dezelfde manier). Het vinkje per agendapunt zegt
    // daarbinnen of díé afspraak de dag dichtzet; niet aangevinkt betekent dat
    // de planner er gewoon overheen mag plannen.
    const visibleAgendaBlocks = (outlookEventsByDate[dateKey] || []).filter(
      (b) => getSourcePref(sourcePrefs, b.source?.provider).visible
        && agendaSelection.includes(b.id)
    );

    const { assignments } = planDay({
      candidates,
      fixed,
      external: externalBlocksForDay(visibleAgendaBlocks, dateKey),
      dayStart,
      dayEnd: PLAN_DAY_END,
      slotStep: DEFAULT_BLOCK_MINUTES,
      prefs: planPrefs,
    });
    if (assignments.length === 0) return;

    if (planMode === 'direct') {
      const entries = applyAssignments(dateKey, assignments);
      if (entries.length) rememberPlanUndo({ dateKey, entries });
      if (typeof notify === 'function') {
        notify({
          message: t('planner.toast.planned'),
          actionLabel: t('common.undo'),
          onAction: undoLastPlan,
        });
      }
      return;
    }

    setPendingPlan({
      dateKey,
      mode: planMode,
      items: assignments.map(a => ({
        ...a,
        label: meta[a.key]?.label || '',
        color: meta[a.key]?.color,
        kind: meta[a.key]?.kind,
      })),
    });
  }, [buildPlanInputs, modules, planMode, planPrefs, sourcePrefs, agendaSelection, applyAssignments, rememberPlanUndo, undoLastPlan, t, outlookEventsByDate]);

  // Eén voorstel-/concept-blok overnemen resp. vastzetten: schrijft via de
  // bestaande handler en haalt het item uit de ephemere pendingPlan-state.
  const acceptPendingItem = useCallback((key) => {
    setPendingPlan(prev => {
      if (!prev) return prev;
      const item = prev.items.find(i => i.key === key);
      if (item) applyPendingAssignment(prev.dateKey, key, item.time);
      const items = prev.items.filter(i => i.key !== key);
      return items.length ? { ...prev, items } : null;
    });
  }, [applyPendingAssignment]);

  const discardPendingItem = useCallback((key) => {
    setPendingPlan(prev => {
      if (!prev) return prev;
      const items = prev.items.filter(i => i.key !== key);
      return items.length ? { ...prev, items } : null;
    });
  }, []);

  // Bulk "alles overnemen" (propose-stand). Dit is hetzelfde moment als een
  // directe indeling — de hele dag wordt in één klik weggeschreven — dus het
  // levert dezelfde snapshot en dezelfde ongedaan-maken-toast op.
  //
  // De toewijzingen worden bewust búíten de setPendingPlan-updater toegepast:
  // een updater hoort puur te zijn, en onder StrictMode wordt hij dubbel
  // aangeroepen — wat de indeling twee keer zou toepassen.
  const acceptAllPending = useCallback((notify) => {
    if (!pendingPlan) return;
    const { dateKey, items } = pendingPlan;
    const entries = applyAssignments(dateKey, items);
    setPendingPlan(null);
    if (entries.length) rememberPlanUndo({ dateKey, entries });
    if (typeof notify === 'function') {
      notify({
        message: t('planner.toast.planned'),
        actionLabel: t('common.undo'),
        onAction: undoLastPlan,
      });
    }
  }, [pendingPlan, applyAssignments, rememberPlanUndo, undoLastPlan, t]);

  const discardAllPending = useCallback(() => setPendingPlan(null), []);

  // Concept-blokken zijn aanpasbaar vóór vastzetten (S03-slepen hergebruikt,
  // zie WeekView): dit verandert alleen de ephemere tijd in pendingPlan, nooit
  // de echte opslag — pas acceptPendingItem/acceptAllPending schrijft.
  const movePendingItem = useCallback((key, time) => {
    setPendingPlan(prev => {
      if (!prev) return prev;
      return { ...prev, items: prev.items.map(i => i.key === key ? { ...i, time } : i) };
    });
  }, []);

  // Streak calculation. moduleData is the source of truth for the active
  // date; for any other day, fall back to history (which is updated on save).
  const calculateStreak = (checkFn) => {
    const todayStr = fmtDateKey(new Date());
    const todayData = activeDateKey === todayStr ? { moduleData } : history[todayStr];
    const todayDone = todayData ? checkFn(todayData, new Date()) : false;

    let streak = todayDone ? 1 : 0;
    let d = addDays(new Date(), -1);

    while (true) {
      const dateStr = fmtDateKey(d);
      const dayData = dateStr === activeDateKey ? { moduleData } : history[dateStr];
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

  // Current calendar week, used by Today-side widgets like CounterModule's
  // "deze week" totals, die altijd de echte huidige week weerspiegelen.
  const currentWeekDates = Array.from({ length: 7 }, (_, i) => {
    return fmtDateKey(addDays(startOfWeek(new Date()), i));
  });
  const weekDates = currentWeekDates;

  const dayNames = shortWeekdayLabelsMondayFirst();

  // Oppervlakte-kleuren komen uit de CSS-variabele token-laag (index.css),
  // gekozen via data-style + data-theme op <html>. Het theme-object verwijst
  // naar de r-* helper-classes; light/dark en de weergavestijl worden dus in
  // CSS bepaald, niet meer via een darkMode-ternary hier.
  const theme = {
    bg: 'r-bg',
    card: 'r-card',
    cardSecondary: 'r-card-2',
    text: 'r-text',
    textSecondary: 'r-text-2',
    textMuted: 'r-text-muted',
    border: 'r-border',
    input: 'r-input',
    hover: 'r-hover',
    progressBg: 'r-progress',
    radiusCard: 'r-radius-card',
    radiusControl: 'r-radius-control',
    padCard: 'r-pad-card',
    padRow: 'r-pad-row',
    accentBg: 'r-accent-bg',
    accentText: 'r-accent-text',
    accentRing: 'r-accent-ring',
    accentWeak: 'r-accent-weak',
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
    return <OnboardingView onComplete={(selectedModules, profile) => {
      setModules(selectedModules);
      setHasOnboarded(true);
      setOnboardingProfile(profile);
      if (profile === 'health') {
        setAppMode('health');
        // Bied de rondleiding zacht aan (opt-in): start met het welkomkaartje.
        setTourWelcome(true);
        setTourCollapsed(false);
        setTourActive(true);
      }
    }} theme={theme} darkMode={darkMode} />;
  }

  const baseEnabledModules = allModules.filter(m => m.enabled && m.type !== 'collection' && m.type !== 'measurements' && m.type !== 'medication' && m.type !== 'bodymap' && m.type !== 'injectionSchedule');
  const enabledModules = appMode === 'health' ? baseEnabledModules.filter(isHealthModule) : baseEnabledModules;

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
          // Een Trello-project (`mod.source`) is afgeleid en leeft niet in
          // `modules`/settings: `ModuleEditor`'s onSave zou hem anders bij het
          // opslaan alsnog aan `settings.modules` toevoegen (AC13). Geen
          // instellingen-knop dus, net als de rest van het read-only-pad.
          onEdit={mod.source ? undefined : () => setEditingModule(mod)}
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
        newTaskTime={newTaskTime}
        setNewTaskTime={setNewTaskTime}
        addTask={addTask}
        toggleTask={toggleTask}
        deleteTask={deleteTask}
        setTaskTime={setTaskTime}
        theme={theme}
        darkMode={darkMode}
      />
    );
  };

  // Prop-bundels voor Today en Health, gedeeld tussen de losse tabs (standard
  // mode) en het gecombineerde Health-scherm (health mode).
  const todayViewProps = {
    t, theme, activeDate, setActiveDate, editable, goldenBorderEnabled,
    todayFullyComplete, hasDismissedInstallBanner, setHasDismissedInstallBanner,
    enabledModules, todayVisibleModules, getModuleStreak, renderTodayModule,
    totalCompletionItems, completedItems, overallPercentage, setShowSettings,
    setView, StreakBadge,
    modules, onLogMedIntake: logMedIntake,
  };
  // Gezondheids-rondleiding: stappen + ingevuld-status live afgeleid uit data.
  const tourSteps = tourActive ? buildTourSteps(modules) : [];
  const tourFilledMap = tourActive ? buildFilledMap(tourSteps, moduleData, history) : {};
  const startHealthTour = () => {
    setTourWelcome(false);
    setTourCollapsed(false);
    setTourFocusId(null);
    setTourActive(true);
  };
  const goToTourModule = (id) => {
    setView('today');
    setTourFocusId(id);
    // Klap in tot het pil-knopje zodat de module en de hint vrij zichtbaar zijn
    // en de gebruiker meteen een waarde kan toevoegen.
    setTourCollapsed(true);
  };
  const finishHealthTour = () => {
    setTourActive(false);
    setHasSeenHealthTour(true);
  };

  const healthViewProps = {
    modules,
    focusModuleId: tourFocusId,
    onFocusConsumed: consumeTourFocus,
    tourActive: appMode === 'health' && tourActive,
    onUpdateMeasurementsModule: updateMeasurementsModule,
    onAddModule: openBlankModuleEditor,
    onEditModule: (mod) => setEditingModule(mod),
    onSetupWeightLoss: setupWeightLossBundle,
    onAddMed: addMed,
    onUpdateMed: updateMed,
    onDeleteMed: deleteMed,
    onOrderMed: orderMed,
    onLogMedIntake: logMedIntake,
    onLogInjection: logInjectionEvent,
    onRemoveInjection: removeInjectionEvent,
    onMoveInjection: moveInjectionEvent,
    onSetHeatWindow: setBodymapHeatWindow,
    onAddScheduleEntry: addScheduleEntry,
    onUpdateScheduleEntry: updateScheduleEntry,
    onDeleteScheduleEntry: deleteScheduleEntry,
    renderLogModule: renderTodayModule,
    appMode,
    theme,
  };

  return (
    <ToastProvider>
    <div className={`min-h-screen ${theme.bg} p-4 transition-colors duration-300 relative overflow-hidden`}>
      <Toast theme={theme} />
      <OAuthReturn onConnected={connectionState.refresh} />
      <SyncConflictDialog
        open={Boolean(pendingConflicts && pendingConflicts.length > 0)}
        conflicts={pendingConflicts || []}
        onResolve={handleResolveConflict}
        theme={theme}
      />

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

      {appMode === 'health' && tourActive && tourSteps.length > 0 && (
        <HealthTour
          steps={tourSteps}
          filledMap={tourFilledMap}
          theme={theme}
          collapsed={tourCollapsed}
          welcome={tourWelcome}
          onToggleCollapse={() => { setTourWelcome(false); setTourCollapsed(c => !c); }}
          onStartFromWelcome={() => { setTourWelcome(false); setTourCollapsed(false); }}
          onGoToModule={goToTourModule}
          onClose={finishHealthTour}
          onFinish={finishHealthTour}
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

      <IsDesktopContext.Provider value={isDesktop}>
      {(() => {
        const mobileHeader = (
          <>
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
                  onClick={() => { setOpenSettingsToHelp(true); setShowSettings(true); }}
                  aria-label={t('help.title')}
                  className={`p-2 ${theme.card} rounded-xl shadow-sm ${theme.hover} transition`}
                >
                  <HelpCircle className={`w-5 h-5 ${theme.textSecondary}`} />
                </button>
                <button
                  onClick={() => setShowSettings(true)}
                  className={`p-2 ${theme.card} rounded-xl shadow-sm ${theme.hover} transition`}
                >
                  <Settings className={`w-5 h-5 ${theme.textSecondary}`} />
                </button>
              </div>
            </div>

            <TabBar view={view} setView={setView} theme={theme} appMode={appMode} />
          </>
        );
        const viewContent = (
          <>
        <ErrorBoundary key={view} darkMode={darkMode} onReset={() => setView('today')}>
        {view === 'today' && (
          appMode === 'health'
            ? <HealthView {...healthViewProps} />
            : <TodayView {...todayViewProps} />
        )}

        {view === 'projects' && (
          <ProjectsView
            modules={allModules}
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

        {view === 'measurements' && appMode !== 'health' && (
          <HealthView {...healthViewProps} />
        )}

        {view === 'household' && (
          <HouseholdView
            theme={theme}
            darkMode={darkMode}
          />
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

        {view === 'productivity' && (
          <ProductivitySuiteView
            modules={allModules}
            customTasks={customTasks}
            weekDays={weekDays}
            weekOffset={weekOffset}
            onWeekOffsetChange={setWeekOffset}
            todayKey={todayKey}
            agendaByDate={outlookEventsByDate}
            includedAgendaIds={agendaSelection}
            onToggleAgendaBlock={handleToggleAgendaBlock}
            outlookConnected={!!outlookConnection}
            connections={connectionState.connections}
            sourcePrefs={sourcePrefs}
            setSourcePrefs={setSourcePrefs}
            priorityPrefs={priorityPrefs}
            setPriorityPrefs={setPriorityPrefs}
            agendaShown={agendaShown}
            agendaLoading={outlookAgendaLoading}
            agendaError={outlookAgendaError}
            agendaLastSyncedAt={outlookLastSyncedAt}
            onImportOrRefreshAgenda={handleImportOrRefreshAgenda}
            trelloConnected={!!trelloConnection}
            trelloBoardPrefs={trelloBoardPrefs}
            onChangeTrelloBoardPrefs={setTrelloBoardPrefs}
            trelloCacheBoards={trelloCacheBoards}
            trelloCardsLoading={trelloCardsLoading}
            trelloCardsError={trelloCardsError}
            trelloLastSyncedAt={trelloLastSyncedAt}
            onRefreshTrelloCards={refetchTrelloCards}
            githubConnected={!!githubConnection}
            githubRepoPrefs={githubRepoPrefs}
            onChangeGithubRepoPrefs={setGithubRepoPrefs}
            githubIssuesLoading={githubIssuesLoading}
            githubIssuesError={githubIssuesError}
            githubLastSyncedAt={githubLastSyncedAt}
            onRefreshGithubIssues={refetchGithubIssues}
            onOpenConnections={handleOpenConnections}
            onAddTask={addCustomTask}
            onAddSubgoal={addProjectSubgoal}
            onToggleTask={toggleTask}
            onDeleteTask={deleteTask}
            onSetTaskTime={setTaskTime}
            onSetTaskDuration={setTaskDuration}
            onSetTaskWindow={setTaskWindow}
            onSetTaskAutoPlan={setTaskAutoPlan}
            onSetTaskDeepWork={setTaskDeepWork}
            onSetTaskPriority={setTaskPriority}
            onToggleProjectSubgoal={toggleProjectSubgoal}
            onSetTaskStatus={setTaskStatus}
            onSetSubgoalStatus={setSubgoalStatus}
            onToggleTaskInDay={toggleTaskInDay}
            onMoveItem={moveItemToDay}
            onSetItemDuration={setItemDuration}
            onResetItem={resetSourceItem}
            pendingPlan={pendingPlan}
            onShareDay={handleShareDay}
            planUndoDateKey={planUndo?.dateKey || null}
            onUndoPlan={undoLastPlan}
            onAcceptPendingItem={acceptPendingItem}
            onDiscardPendingItem={discardPendingItem}
            onAcceptAllPending={acceptAllPending}
            onDiscardAllPending={discardAllPending}
            onMovePendingItem={movePendingItem}
            planPrefs={planPrefs}
            setPlanPrefs={setPlanPrefs}
            theme={theme}
          />
        )}

        </ErrorBoundary>

        <div className={`text-center text-xs ${theme.textMuted} mt-6 pb-4`}>
          {t('app.autosave')}
        </div>
        {/* Ruimte onderaan zodat de zwevende rondleiding de inhoud niet afdekt. */}
        {appMode === 'health' && tourActive && !tourCollapsed && (
          <div className="h-80" aria-hidden="true" />
        )}
          </>
        );
        if (isDesktop) {
          return (
            <DesktopShell
              view={view}
              setView={setView}
              theme={theme}
              appMode={appMode}
              darkMode={darkMode}
              setDarkMode={setDarkMode}
              setShowSettings={setShowSettings}
              onOpenHelp={() => { setOpenSettingsToHelp(true); setShowSettings(true); }}
            >
              {viewContent}
            </DesktopShell>
          );
        }
        return (
          <div className="max-w-2xl mx-auto relative">
            {mobileHeader}
            {viewContent}
          </div>
        );
      })()}
      </IsDesktopContext.Provider>

      {showSettings && (
        <SettingsModal
          onClose={() => {
            setShowSettings(false);
            setSettingsInitialTab(null);
            setOpenSettingsToHelp(false);
            // Ververst de Outlook-koppelingsstatus na een bezoek aan
            // Instellingen → Account: een verbreken daar gebeurt via een
            // eigen useConnections-instantie (ConnectionsSection) en bereikt
            // deze instantie anders pas na een volledige herlaad (S07d).
            connectionState.refresh();
          }}
          initialTab={settingsInitialTab}
          initialHelp={openSettingsToHelp}
          currentUser={currentUser}
          modules={modules}
          setModules={setModules}
          recurringTasks={recurringTasks}
          setRecurringTasks={setRecurringTasks}
          streakSettings={streakSettings}
          setStreakSettings={setStreakSettings}
          darkMode={darkMode}
          setDarkMode={setDarkMode}
          uiStyle={uiStyle}
          setUiStyle={setUiStyle}
          soundEnabled={soundEnabled}
          setSoundEnabled={setSoundEnabled}
          soundVolume={soundVolume}
          setSoundVolume={setSoundVolume}
          goldenBorderEnabled={goldenBorderEnabled}
          setGoldenBorderEnabled={setGoldenBorderEnabled}
          appMode={appMode}
          setAppMode={setAppMode}
          planMode={planMode}
          setPlanMode={setPlanMode}
          switchToStandard={switchToStandard}
          theme={theme}
          dayNames={dayNames}
          setEditingModule={setEditingModule}
          onStartTour={() => { setShowSettings(false); setSettingsInitialTab(null); startHealthTour(); }}
        />
      )}

      {editingModule && (
        <ModuleEditor
          module={editingModule}
          modules={modules}
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
function ModuleRenderer({ module: mod, data, editable = true, onChecklistToggle, onChecklistIncrement, onChecklistNote, onChoiceToggle, onChoiceOptionSet, onEdit, weekDates, history, customTasks, newTask, setNewTask, newTaskTime, setNewTaskTime, addTask, toggleTask, deleteTask, setTaskTime, theme, darkMode }) {
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
            <TimeInput value={newTaskTime} onChange={setNewTaskTime} theme={theme} />
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
                {editable ? (
                  <TimeInput value={task.time} onChange={(v) => setTaskTime(task.id, v)} theme={theme} className="w-24" />
                ) : task.time ? (
                  <span className={`text-xs ${theme.textMuted}`}>{task.time}</span>
                ) : null}
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
// SETTINGS MODAL
// =============================================
function SettingsModal({ onClose, modules, setModules, recurringTasks, setRecurringTasks, streakSettings, setStreakSettings, darkMode, setDarkMode, uiStyle, setUiStyle, soundEnabled, setSoundEnabled, soundVolume, setSoundVolume, goldenBorderEnabled, setGoldenBorderEnabled, appMode, setAppMode, planMode, setPlanMode, switchToStandard, theme, dayNames, setEditingModule, initialTab, initialHelp, currentUser, onStartTour }) {
  const { t, languageSetting, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState(initialTab || 'modules');
  const [helpView, setHelpView] = useState(initialHelp ? 'list' : null); // null | 'list' | 'install' | 'feedback'
  const [reorderMode, setReorderMode] = useState(false);
  const [androidPromptable, setAndroidPromptable] = useState(false);
  useEffect(() => {
    return onPromptAvailableChange(setAndroidPromptable);
  }, []);
  const [draggingId, setDraggingId] = useState(null);
  const [dragOverId, setDragOverId] = useState(null);

  const moveModule = (id, dir) => {
    setModules(prev => moveById(prev, id, dir));
  };

  const reorderModules = (fromId, toId) => {
    setModules(prev => reorderById(prev, fromId, toId));
  };

  const openBlankModuleEditor = () => {
    setEditingModule({
      id: `mod_${Date.now()}`,
      name: '',
      icon: 'Star',
      color: 'blue',
      enabled: true,
      countInStreak: false,
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
          <HelpOverlay
            theme={theme}
            showTour={appMode === 'health' && modules.some((m) => m.enabled && isHealthModule(m))}
            onSelect={(id) => { if (id === 'tour') { onStartTour?.(); } else { setHelpView(id); } }}
          />
        )}

        {helpView === 'install' && (
          <InstallGuide theme={theme} />
        )}

        {helpView === 'feedback' && (
          <FeedbackForm theme={theme} onBack={() => setHelpView('list')} />
        )}

        {helpView === null && (
        <>
        <div className="mb-6 space-y-1">
          {[
            [
              { id: 'modules', label: t('settings.tabModules') },
              { id: 'streaks', label: t('settings.tabStreaks') },
              { id: 'recurring', label: t('settings.tabRecurring') },
              { id: 'theme', label: t('settings.tabTheme') },
            ],
            [
              { id: 'language', label: t('settings.tabLanguage') },
              { id: 'install', label: t('install.settingsHeader') },
              { id: 'account', label: t('settings.tabAccount') },
            ],
          ].map((row, rowIndex) => (
            <div key={rowIndex} className={`flex gap-1 ${theme.cardSecondary} rounded-xl p-1`}>
              {row.map(tab => (
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

            {reorderMode ? (
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
                      draggable
                      onDragStart={() => setDraggingId(mod.id)}
                      onDragEnd={() => { setDraggingId(null); setDragOverId(null); }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverId(mod.id); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggingId && draggingId !== mod.id) reorderModules(draggingId, mod.id);
                        setDraggingId(null);
                        setDragOverId(null);
                      }}
                      className={`flex items-center gap-2 p-3 ${theme.cardSecondary} rounded-lg transition cursor-default ${isDragging ? 'opacity-40' : ''} ${isDragOver ? `ring-2 ring-${mod.color}-400` : ''}`}
                    >
                      <span className={`${theme.textMuted} touch-none cursor-grab active:cursor-grabbing`} aria-hidden>
                        <GripVertical className="w-4 h-4" />
                      </span>
                      <Icon className={`w-4 h-4 ${mod.enabled ? `text-${mod.color}-500` : theme.textMuted}`} />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${mod.enabled ? theme.textSecondary : theme.textMuted}`}>
                          {resolveModuleName(mod, t)}
                        </div>
                      </div>
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
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mb-4 space-y-4">
                {[
                  { key: 'today', types: ['checklist', 'choice', 'counter', 'tasks', 'sleep', 'projects'] },
                  { key: 'collections', types: ['collection'] },
                  { key: 'measurements', types: ['measurements', 'medication', 'bodymap', 'injectionSchedule'] },
                ].map(group => {
                  const groupMods = modules.filter(m => group.types.includes(m.type));
                  return (
                    <div key={group.key}>
                      <h4 className={`text-xs font-semibold uppercase tracking-wide ${theme.textMuted} mb-2`}>
                        {t(`settings.moduleGroups.${group.key}`)}
                      </h4>
                      {groupMods.length === 0 ? (
                        <p className={`text-xs ${theme.textMuted}`}>
                          {t(`settings.moduleGroups.${group.key}Empty`)}
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {groupMods.map(mod => {
                            const Icon = ICON_OPTIONS[mod.icon] || Sparkles;
                            return (
                              <div
                                key={mod.id}
                                onClick={() => setEditingModule(mod)}
                                className={`flex items-center gap-2 p-3 ${theme.cardSecondary} rounded-lg transition cursor-pointer`}
                              >
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
                                    {mod.type === 'medication' && t('modules.summary.medication', { count: (mod.meds || []).length })}
                                    {mod.type === 'bodymap' && t('modules.summary.bodymap', { count: (mod.log || []).length })}
                                    {mod.type === 'injectionSchedule' && t('modules.summary.injectionSchedule', { count: (mod.entries || []).length })}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                <p className={`text-xs ${theme.textMuted} mt-2`}>
                  {t('settings.moduleGroups.householdNote')}
                </p>
              </div>
            )}

            {!reorderMode && (
              <button
                onClick={openBlankModuleEditor}
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

                      {isActive && mod.type === 'sleep' && (
                        <p className={`text-xs ${theme.textMuted}`}>
                          {t('settings.streakSleepHint')}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {activeTab === 'recurring' && (
          <div>
            <RecurringSettings
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
              <h3 className={`font-semibold ${theme.textSecondary} mb-1`}>{t('settings.appMode')}</h3>
              <p className={`text-xs ${theme.textMuted} mb-3`}>{t('settings.appModeHint')}</p>
              <div className="flex gap-2">
                <button
                  onClick={switchToStandard}
                  className={`flex-1 py-3 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                    appMode !== 'health' ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                  }`}
                >
                  {t('settings.appModeStandard')}
                </button>
                <button
                  onClick={() => setAppMode('health')}
                  className={`flex-1 py-3 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                    appMode === 'health' ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                  }`}
                >
                  {t('settings.appModeHealth')}
                </button>
              </div>
            </div>

            <div className={`mt-6 pt-6 border-t ${theme.border}`}>
              <h3 className={`font-semibold ${theme.textSecondary} mb-1`}>{t('settings.planMode')}</h3>
              <p className={`text-xs ${theme.textMuted} mb-3`}>{t('settings.planModeHint')}</p>
              <div className="flex gap-2">
                {PLAN_MODE_OPTIONS.map(({ id, labelKey }) => (
                  <button
                    key={id}
                    onClick={() => setPlanMode(id)}
                    className={`flex-1 py-3 px-3 rounded-lg text-sm font-medium transition flex items-center justify-center gap-2 ${
                      planMode === id ? 'bg-blue-500 text-white' : `${theme.cardSecondary} ${theme.textMuted}`
                    }`}
                  >
                    {t(labelKey)}
                  </button>
                ))}
              </div>
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

        {activeTab === 'account' && (
          <div className="space-y-4">
            {isSyncEnabled() && (
              <AuthSection theme={theme} />
            )}
            <SyncStatusRow theme={theme} signedIn={!!currentUser} userId={currentUser?.id} />
            {isSyncEnabled() && currentUser && (
              <ConnectionsSection theme={theme} accountId={currentUser.id} />
            )}
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
    { id: 'medication', label: t('modules.types.medication'), desc: t('modules.types.medicationDesc') },
    { id: 'bodymap', label: t('modules.types.bodymap'), desc: t('modules.types.bodymapDesc') },
    { id: 'injectionSchedule', label: t('modules.types.injectionSchedule'), desc: t('modules.types.injectionScheduleDesc') },
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

function ModuleEditor({ module: mod, modules, onSave, onCancel, onDelete, theme }) {
  const { t } = useTranslation();
  const TYPE_OPTIONS = useMemo(() => getTypeOptions(t), [t]);
  const [editing, setEditing] = useState(mod);
  const [newItem, setNewItem] = useState('');
  const [expandedItemId, setExpandedItemId] = useState(null);
  const [removingMetric, setRemovingMetric] = useState(null);
  const [metricLibraryOpen, setMetricLibraryOpen] = useState(false);
  const [addingMedInline, setAddingMedInline] = useState(false);
  const [addingEntryInline, setAddingEntryInline] = useState(false);
  const injMeds = injectableMeds(modules);
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
      ...(typeId === 'medication' ? {
        meds: Array.isArray(prev.meds) ? prev.meds : [],
        countInStreak: false,
      } : {}),
      ...(typeId === 'bodymap' ? {
        log: Array.isArray(prev.log) ? prev.log : [],
        countInStreak: false,
      } : {}),
      ...(typeId === 'injectionSchedule' ? {
        entries: Array.isArray(prev.entries) ? prev.entries : [],
        countInStreak: false,
      } : {}),
    }));
    // Types zonder suggesties (bv. medication/bodymap/injectionSchedule) slaan
    // de suggesties-stap over en gaan direct naar "Zelf maken".
    const hasPresets = (MODULE_PRESETS[typeId] || []).length > 0;
    if (hasPresets) {
      setStep('preset');
      setPresetTab('suggestions');
    } else {
      setStep('config');
    }
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
                onClick={() => {
                  const hasPresets = (MODULE_PRESETS[editing.type] || []).length > 0;
                  setStep(step === 'config' && hasPresets ? 'preset' : 'type');
                }}
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

          {(editing.type === 'choice' || editing.type === 'counter') && (
            <div>
              <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{t('productivity.time')}</label>
              <TimeInput
                value={editing.time}
                onChange={(v) => update('time', v || undefined)}
                theme={theme}
                className="w-full"
              />
            </div>
          )}

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

              <label className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
                <input
                  type="checkbox"
                  checked={!!editing.health}
                  onChange={(e) => update('health', e.target.checked)}
                />
                {t('modules.healthModeEnabled')}
              </label>

              <div>
                <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{t('common.items')}</label>
                <div className="space-y-2 mb-2">
                  {(editing.items || []).map(item => {
                    const isExpanded = expandedItemId === item.id;
                    return (
                      <div key={item.id} className={`${theme.cardSecondary} rounded-lg`}>
                        <div className="flex items-center gap-2 p-2">
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => updateItem(item.id, { label: e.target.value })}
                            className={`flex-1 px-2 py-1 ${theme.input} rounded text-sm focus:outline-none focus:ring-2 focus:ring-${editing.color}-300`}
                          />
                          {/* Instellingen-knop staat altijd aan: naast de optionele
                              beschrijving/sets zit hier ook het optionele tijdstip
                              (voor de Dag-view), dat los staat van allowDescriptions/allowTargets. */}
                          <button
                            onClick={() => setExpandedItemId(isExpanded ? null : item.id)}
                            className={`p-1.5 rounded transition ${
                              isExpanded ? `bg-${editing.color}-500 text-white` : `${theme.textMuted} ${theme.hover}`
                            }`}
                            title={t('modules.itemSettings')}
                          >
                            <SlidersHorizontal className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeEntry('items', item.id)}
                            className="text-slate-400 hover:text-red-500 p-1.5"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        {isExpanded && (
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
                            <div>
                              <label className={`text-xs font-medium ${theme.textMuted} mb-1 block`}>{t('productivity.time')}</label>
                              <TimeInput
                                value={item.time}
                                onChange={(v) => updateItem(item.id, { time: v || undefined })}
                                theme={theme}
                              />
                            </div>
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
            const display = editing.counterDisplay ?? 'bar';
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
                  <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>{t('modules.counterDisplay')}</label>
                  <div className="grid grid-cols-4 gap-2">
                    {DISPLAY_STYLE_KEYS.map((key) => {
                      const active = display === key;
                      const labelKey = `counterDisplay${key.charAt(0).toUpperCase()}${key.slice(1)}`;
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => update('counterDisplay', key)}
                          aria-pressed={active}
                          className={`flex flex-col items-center gap-1 px-2 py-2 rounded-lg text-xs font-medium transition border ${
                            active
                              ? `border-${editing.color}-500 ${theme.cardSecondary}`
                              : `border-transparent ${theme.cardSecondary} ${theme.hover}`
                          }`}
                        >
                          <span className="flex items-center justify-center h-9">
                            <CounterDisplay
                              displayStyle={key}
                              value={6}
                              goal={10}
                              colorKey={active ? editing.color : null}
                              size={28}
                            />
                          </span>
                          <span className={active ? `text-${editing.color}-600` : theme.textSecondary}>
                            {t(`modules.${labelKey}`)}
                          </span>
                        </button>
                      );
                    })}
                  </div>
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

                <label className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
                  <input
                    type="checkbox"
                    checked={!!editing.health}
                    onChange={(e) => update('health', e.target.checked)}
                  />
                  {t('modules.healthModeEnabled')}
                </label>

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
            const metrics = (editing.metrics || []).filter(Boolean);
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
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMetricLibraryOpen(true)}
                    className={`px-3 py-2 ${theme.cardSecondary} ${theme.textSecondary} rounded-lg text-sm font-medium flex items-center justify-center gap-1 ${theme.hover}`}
                  >
                    <BookOpen className="w-4 h-4" />
                    {t('modules.measurements.fromLibrary')}
                  </button>
                  <button
                    type="button"
                    onClick={addMetric}
                    className="px-3 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    {t('modules.measurements.customMetric')}
                  </button>
                </div>
                {metricLibraryOpen && (
                  <MetricLibraryModal
                    onPick={(libraryKey) => {
                      const newMetric = instantiateMetric(libraryKey);
                      if (!newMetric) return;
                      setEditing(prev => ({ ...prev, metrics: [...(prev.metrics || []), newMetric] }));
                      setMetricLibraryOpen(false);
                    }}
                    onClose={() => setMetricLibraryOpen(false)}
                    theme={theme}
                    t={t}
                  />
                )}
              </div>
            );
          })()}

          {editing.type === 'medication' && (
            <div>
              <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                {t('medication.myMeds')}
              </label>
              {(editing.meds || []).length > 0 && (
                <ul className="space-y-2 mb-2">
                  {(editing.meds || []).map((med) => (
                    <li key={med.id} className={`flex items-center gap-2 p-2 ${theme.cardSecondary} rounded-lg`}>
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: getColorHex(med.color) }}
                        aria-hidden="true"
                      />
                      <span className={`flex-1 text-sm ${theme.textSecondary} truncate`}>{med.name}</span>
                      <button
                        type="button"
                        onClick={() => setEditing(prev => ({ ...prev, meds: (prev.meds || []).filter(m => m.id !== med.id) }))}
                        className="text-slate-400 hover:text-red-500 p-1.5"
                        aria-label={t('common.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setAddingMedInline(true)}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-lg text-sm font-medium`}
              >
                <Plus className="w-4 h-4" />
                {t('medication.addMed')}
              </button>
              <p className={`text-xs ${theme.textMuted} mt-2`}>
                {t('modules.medicationEditorNote')}
              </p>
              <MedFormModal
                open={addingMedInline}
                mode="add"
                module={editing}
                onClose={() => setAddingMedInline(false)}
                onSave={(med) => setEditing(prev => ({ ...prev, meds: [...(prev.meds || []), med] }))}
                theme={theme}
              />
            </div>
          )}

          {editing.type === 'bodymap' && (
            injMeds.length > 0 ? (
              <BodymapModuleCard
                module={editing}
                meds={injMeds}
                iconOptions={ICON_OPTIONS}
                onLogInjection={(modId, event) => setEditing(prev => logInjection(prev, event))}
                onRemoveInjection={(modId, id) => setEditing(prev => removeInjectionById(prev, id))}
                onMoveInjection={(modId, id, patch) => setEditing(prev => updateInjectionPosition(prev, id, {
                  x: patch.x,
                  y: patch.y,
                  zoneId: zoneFor(patch.x, patch.y, patch.view || 'front'),
                }))}
                onSetHeatWindow={(modId, windowId) => setEditing(prev => ({ ...prev, heatWindow: windowId }))}
                theme={theme}
              />
            ) : (
              <p className={`text-xs ${theme.textMuted}`}>
                {t('modules.bodymapEditorNote')}
              </p>
            )
          )}

          {editing.type === 'injectionSchedule' && (
            <div>
              <label className={`text-sm font-medium ${theme.textSecondary} mb-2 block`}>
                {t('injectionSchedule.entryCount', { count: (editing.entries || []).length })}
              </label>
              {(editing.entries || []).length > 0 && (
                <ul className="space-y-2 mb-2">
                  {(editing.entries || []).map((entry) => {
                    const entryMed = scheduleEntryMed(entry, injMeds);
                    const entryZone = INJECTION_ZONES.find((z) => z.id === entry.zone);
                    return (
                      <li key={entry.id} className={`flex items-center gap-2 p-2 ${theme.cardSecondary} rounded-lg`}>
                        <span
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: getColorHex(entryMed?.color) }}
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <span className={`block text-sm ${theme.textSecondary} truncate`}>
                            {entryMed?.name || t('injectionSchedule.unknownMed')}
                          </span>
                          <span className={`text-xs ${theme.textMuted}`}>
                            {entryZone ? t(entryZone.labelKey) : entry.zone}
                            {' · '}
                            {t(`medication.${FREQUENCY_LABEL_KEYS[entry.frequencyId] || FREQUENCY_LABEL_KEYS.weekly}`)}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setEditing(prev => ({ ...prev, entries: (prev.entries || []).filter(e => e.id !== entry.id) }))}
                          className="text-slate-400 hover:text-red-500 p-1.5"
                          aria-label={t('common.delete')}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
              {(editing.entries || []).length === 0 && (
                <p className={`text-xs ${theme.textMuted} mb-2`}>
                  {t('injectionSchedule.emptyEntries')}
                </p>
              )}
              <button
                type="button"
                onClick={() => setAddingEntryInline(true)}
                className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 ${theme.cardSecondary} ${theme.hover} ${theme.textSecondary} rounded-lg text-sm font-medium`}
              >
                <Plus className="w-4 h-4" />
                {t('injectionSchedule.addEntry')}
              </button>
              <p className={`text-xs ${theme.textMuted} mt-2`}>
                {t('modules.injectionScheduleEditorNote')}
              </p>
              <ScheduleEntryFormModal
                open={addingEntryInline}
                mode="add"
                meds={injMeds}
                onClose={() => setAddingEntryInline(false)}
                onSave={(entry) => setEditing(prev => ({ ...prev, entries: [...(prev.entries || []), entry] }))}
                theme={theme}
              />
            </div>
          )}
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
// RECURRING SETTINGS
// =============================================
function RecurringSettings({ recurringTasks, setRecurringTasks, theme, dayNames }) {
  const { t } = useTranslation();
  const [newRecurringText, setNewRecurringText] = useState('');
  const [newRecurringDays, setNewRecurringDays] = useState([]);
  const [newRecurringTime, setNewRecurringTime] = useState('');
  const [newRecurringDuration, setNewRecurringDuration] = useState(undefined);
  const [newRecurringWindow, setNewRecurringWindow] = useState('');
  const [newRecurringAutoPlan, setNewRecurringAutoPlan] = useState(false);
  const [newRecurringDeepWork, setNewRecurringDeepWork] = useState(false);

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
        days: newRecurringDays,
        ...(newRecurringTime ? { time: newRecurringTime } : {}),
        ...(newRecurringDuration ? { duration: newRecurringDuration } : {}),
        ...(newRecurringWindow ? { window: newRecurringWindow } : {}),
        ...(newRecurringAutoPlan ? { autoPlan: true } : {}),
        ...(newRecurringDeepWork ? { deepWork: true } : {}),
      }]);
      setNewRecurringText('');
      setNewRecurringDays([]);
      setNewRecurringTime('');
      setNewRecurringDuration(undefined);
      setNewRecurringWindow('');
      setNewRecurringAutoPlan(false);
      setNewRecurringDeepWork(false);
    }
  };

  const removeRecurring = (id) => {
    setRecurringTasks(prev => prev.filter(t => t.id !== id));
  };

  const setRecurringTime = (id, time) => {
    setRecurringTasks(prev => prev.map(rt => rt.id === id ? { ...rt, time: time || undefined } : rt));
  };

  const setRecurringDuration = (id, duration) => {
    setRecurringTasks(prev => prev.map(rt => rt.id === id ? { ...rt, duration: duration || undefined } : rt));
  };

  const setRecurringWindow = (id, windowValue) => {
    setRecurringTasks(prev => prev.map(rt => rt.id === id ? { ...rt, window: windowValue || undefined } : rt));
  };

  const setRecurringAutoPlan = (id, autoPlan) => {
    setRecurringTasks(prev => prev.map(rt => rt.id === id ? { ...rt, autoPlan: autoPlan || undefined } : rt));
  };

  const setRecurringDeepWork = (id, deepWork) => {
    setRecurringTasks(prev => prev.map(rt => rt.id === id ? { ...rt, deepWork: deepWork || undefined } : rt));
  };

  return (
    <div className="space-y-6">
      <div>
        <h4 className={`font-semibold ${theme.textSecondary} mb-3 text-sm`}>{t('settings.recurringWeekly')}</h4>
        <div className="space-y-2 mb-4">
          {recurringTasks.length === 0 ? (
            <p className={`text-sm ${theme.textMuted} text-center py-2`}>{t('settings.recurringEmpty')}</p>
          ) : (
            recurringTasks.map(rt => (
              <div key={rt.id} className={`flex items-center gap-2 flex-wrap p-2 ${theme.cardSecondary} rounded-lg`}>
                <Repeat className={`w-4 h-4 ${theme.textMuted}`} />
                <div className="flex-1">
                  <div className={`text-sm ${theme.textSecondary}`}>{rt.text}</div>
                  <div className={`text-xs ${theme.textMuted}`}>
                    {rt.days.map(d => dayNames[d]).join(', ')}
                  </div>
                </div>
                <TimeInput value={rt.time} onChange={(v) => setRecurringTime(rt.id, v)} theme={theme} className="w-24" />
                <DurationInput value={rt.duration} onChange={(v) => setRecurringDuration(rt.id, v)} theme={theme} className="w-16" />
                <DagdeelSelect value={rt.window} onChange={(v) => setRecurringWindow(rt.id, v)} theme={theme} />
                <label className={`flex items-center gap-1 text-[11px] ${theme.textMuted}`}>
                  <input
                    type="checkbox"
                    checked={!!rt.autoPlan}
                    onChange={(e) => setRecurringAutoPlan(rt.id, e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  {t('planner.autoPlan.short')}
                </label>
                <label className={`flex items-center gap-1 text-[11px] ${theme.textMuted}`}>
                  <input
                    type="checkbox"
                    checked={!!rt.deepWork}
                    onChange={(e) => setRecurringDeepWork(rt.id, e.target.checked)}
                    className="w-3.5 h-3.5"
                  />
                  {t('planner.deepWork.short')}
                </label>
                <button onClick={() => removeRecurring(rt.id)} className="text-slate-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="space-y-2">
          <div className="flex gap-2 flex-wrap">
            <input
              type="text"
              value={newRecurringText}
              onChange={(e) => setNewRecurringText(e.target.value)}
              placeholder={t('settings.recurringExamplePlaceholder')}
              className={`flex-1 min-w-[8rem] px-3 py-2 ${theme.input} rounded-lg text-sm`}
            />
            <TimeInput value={newRecurringTime} onChange={setNewRecurringTime} theme={theme} />
            <DurationInput value={newRecurringDuration} onChange={setNewRecurringDuration} theme={theme} className="w-20" />
            <DagdeelSelect value={newRecurringWindow} onChange={setNewRecurringWindow} theme={theme} />
          </div>
          <label className={`flex items-center gap-1.5 text-xs ${theme.textMuted}`}>
            <input
              type="checkbox"
              checked={newRecurringAutoPlan}
              onChange={(e) => setNewRecurringAutoPlan(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            {t('planner.autoPlan.label')}
          </label>
          <label className={`flex items-center gap-1.5 text-xs ${theme.textMuted}`}>
            <input
              type="checkbox"
              checked={newRecurringDeepWork}
              onChange={(e) => setNewRecurringDeepWork(e.target.checked)}
              className="w-3.5 h-3.5"
            />
            {t('planner.deepWork.label')}
          </label>
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