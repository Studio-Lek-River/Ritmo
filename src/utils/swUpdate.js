import { registerSW } from 'virtual:pwa-register';

/**
 * Versiecheck bij het opstarten.
 *
 * Ritmo draait als PWA achter een service worker. Zonder deze module wordt een
 * nieuwe versie wél op de achtergrond geïnstalleerd, maar pas geserveerd bij de
 * volgende cold start — je moest de app dus twee keer opstarten voor een update.
 *
 * Hier wordt bij elke start meteen een update-check gedaan. Staat er een nieuwe
 * versie klaar, dan wordt die geactiveerd en herlaadt de pagina zichzelf. Dat mag
 * alleen zolang het openingsscherm nog zichtbaar is: daarna is de gebruiker aan
 * het werk en zou een herlaadactie zijn invoer weggooien. Landt de update later,
 * dan blijft hij netjes wachten tot de volgende start.
 */

// Maximale tijd dat het opstarten op de check wacht. Een trage of hangende
// verbinding mag het openen van Ritmo nooit blokkeren.
const CHECK_TIMEOUT_MS = 4000;
// Zodra de installatie echt begonnen is mag het iets langer duren; de gebruiker
// ziet dan de update-animatie in plaats van een stilstaand scherm.
const INSTALL_TIMEOUT_MS = 10000;

let settleCheck;
/** Resolvet zodra de check klaar is (of is afgekapt). Wordt precies één keer opgelost. */
export const updateCheckDone = new Promise((resolve) => {
  settleCheck = resolve;
});

let settled = false;
let windowOpen = true;
let timer = null;
const listeners = new Set();

function settle() {
  if (settled) return;
  settled = true;
  clearTimeout(timer);
  settleCheck();
}

function closeWindow() {
  windowOpen = false;
  settle();
}

function notifyUpdating() {
  listeners.forEach((listener) => listener());
}

/**
 * Meldt de UI dat er een update geïnstalleerd wordt, zodat het openingsscherm
 * dat kan laten zien. Geeft een functie terug om je weer af te melden.
 */
export function subscribeUpdateStatus(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/**
 * Sluit het venster waarin automatisch herladen is toegestaan. Aanroepen zodra
 * het openingsscherm verdwenen is.
 */
export function markStartupDone() {
  windowOpen = false;
}

/** Registreert de service worker en checkt direct op een nieuwe versie. */
export function startUpdateCheck() {
  // In dev draait er geen service worker; wachten heeft dan geen zin.
  if (import.meta.env.DEV || !('serviceWorker' in navigator)) {
    closeWindow();
    return;
  }

  timer = setTimeout(closeWindow, CHECK_TIMEOUT_MS);

  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      if (!windowOpen) {
        // Te laat om ongemerkt te herladen — de update activeert vanzelf bij de
        // volgende keer dat Ritmo opnieuw geopend wordt.
        settle();
        return;
      }
      // Ruimte geven aan de installatie, en de splash laten zien dat er iets gebeurt.
      clearTimeout(timer);
      timer = setTimeout(closeWindow, INSTALL_TIMEOUT_MS);
      notifyUpdating();
      updateSW(true);
    },
    async onRegisteredSW(_swUrl, registration) {
      if (!registration) {
        closeWindow();
        return;
      }
      try {
        await registration.update();
      } catch {
        // Offline of geen verbinding met de server: gewoon doorstarten.
        closeWindow();
        return;
      }
      // Zonder actieve service worker is dit de eerste keer dat Ritmo geopend
      // wordt: er is dan geen oude versie om te vervangen, dus niets om op te
      // wachten. Anders: is er niets aan het installeren of wachten, dan draaien
      // we de nieuwste versie al. In de overige gevallen wachten we op
      // onNeedRefresh (of op de afkapping).
      if (!navigator.serviceWorker.controller
        || (!registration.installing && !registration.waiting)) {
        settle();
      }
    },
    onRegisterError() {
      closeWindow();
    },
  });
}
