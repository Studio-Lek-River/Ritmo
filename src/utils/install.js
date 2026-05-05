let deferredInstallPrompt = null;
const promptListeners = new Set();

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
    promptListeners.forEach((cb) => cb(true));
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    promptListeners.forEach((cb) => cb(false));
  });
}

export function isStandalone() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) {
    return true;
  }
  if (typeof navigator !== 'undefined' && navigator.standalone === true) {
    return true;
  }
  return false;
}

export function isIOS() {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIPad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || isIPad;
}

export function canPromptInstall() {
  return deferredInstallPrompt !== null;
}

export async function triggerInstallPrompt() {
  if (!deferredInstallPrompt) return { outcome: 'unavailable' };
  try {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice;
    deferredInstallPrompt = null;
    promptListeners.forEach((cb) => cb(false));
    return { outcome: choice.outcome };
  } catch {
    return { outcome: 'error' };
  }
}

export function onPromptAvailableChange(callback) {
  promptListeners.add(callback);
  callback(deferredInstallPrompt !== null);
  return () => promptListeners.delete(callback);
}
