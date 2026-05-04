// Lichtgewicht i18n-hook voor Ritmo. Geen externe library.
// - Default-taal komt uit browser; user-keuze via settings.language overschrijft.
// - 'auto' resolved naar 'nl' als navigator.language met 'nl' begint, anders 'en'.
// - Onbekende key valt eerst terug op de andere taal en daarna op de key zelf.
// - Module-level cache + listeners houdt alle hooks gesynchroniseerd zonder context-provider.

import { useEffect, useState, useCallback } from 'react';
import nl from './nl';
import en from './en';

const dictionaries = { nl, en };

function detectBrowserLanguage() {
  if (typeof navigator === 'undefined') return 'en';
  const lang = navigator.language || navigator.userLanguage || 'en';
  return lang.toLowerCase().startsWith('nl') ? 'nl' : 'en';
}

function resolveLanguage(setting) {
  if (setting === 'nl' || setting === 'en') return setting;
  return detectBrowserLanguage();
}

function lookup(dict, key) {
  return key.split('.').reduce((acc, part) => {
    if (acc && typeof acc === 'object') return acc[part];
    return undefined;
  }, dict);
}

function interpolate(value, vars) {
  if (typeof value !== 'string' || !vars) return value;
  return value.replace(/\{(\w+)\}/g, (_, name) =>
    vars[name] !== undefined ? String(vars[name]) : `{${name}}`
  );
}

let currentSetting = 'auto';
const listeners = new Set();

async function loadInitialSetting() {
  if (typeof window === 'undefined' || !window.storage) return;
  try {
    const result = await window.storage.get('settings');
    if (result?.value) {
      const settings = JSON.parse(result.value);
      if (typeof settings.language === 'string') {
        currentSetting = settings.language;
        listeners.forEach(fn => fn());
      }
    }
  } catch {
    // settings nog niet beschikbaar; default 'auto' is correct voor first-run
  }
}
loadInitialSetting();

export function useTranslation() {
  const [, force] = useState(0);

  useEffect(() => {
    const fn = () => force(n => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);

  const language = resolveLanguage(currentSetting);

  const t = useCallback((key, vars) => {
    const primary = lookup(dictionaries[language], key);
    if (primary !== undefined) return interpolate(primary, vars);

    const otherLang = language === 'nl' ? 'en' : 'nl';
    const fallback = lookup(dictionaries[otherLang], key);
    if (fallback !== undefined) return interpolate(fallback, vars);

    return key;
  }, [language]);

  const setLanguage = useCallback(async (next) => {
    currentSetting = next;
    let settings = {};
    try {
      const result = await window.storage.get('settings');
      if (result?.value) settings = JSON.parse(result.value);
    } catch {
      settings = {};
    }
    settings.language = next;
    await window.storage.set('settings', JSON.stringify(settings));
    listeners.forEach(fn => fn());
  }, []);

  return { t, language, setLanguage, languageSetting: currentSetting };
}

// Voor niet-component code (utils) die nog wel taal-aware moet zijn.
export function getCurrentLanguage() {
  return resolveLanguage(currentSetting);
}

export function getLocale() {
  return getCurrentLanguage() === 'nl' ? 'nl-NL' : 'en-GB';
}

// Synchrone t() voor utils. Volgt dezelfde fallback-keten als de hook.
export function t(key, vars) {
  const lang = getCurrentLanguage();
  const primary = lookup(dictionaries[lang], key);
  if (primary !== undefined) return interpolate(primary, vars);
  const otherLang = lang === 'nl' ? 'en' : 'nl';
  const fallback = lookup(dictionaries[otherLang], key);
  if (fallback !== undefined) return interpolate(fallback, vars);
  return key;
}
