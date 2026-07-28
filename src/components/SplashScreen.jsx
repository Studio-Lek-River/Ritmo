import React, { useEffect, useState } from 'react';
import RitmoLogo from './RitmoLogo';
import { useTranslation } from '../i18n/useTranslation';
import { APP_VERSION } from '../utils/appVersion';

/**
 * SplashScreen - eerste scherm dat verschijnt bij het openen van Ritmo.
 *
 * Toont het geanimeerde logo en de tagline. Verdwijnt automatisch na `minDuration`
 * milliseconden, of wanneer `ready` true wordt (afhankelijk van wat het laatst is).
 *
 * Props:
 *   ready        - boolean, wordt true zodra de app klaar is om te tonen
 *                  (bijv. nadat localStorage is geladen). Default true (geen wacht).
 *   minDuration  - minimale tijd in ms dat de splash zichtbaar blijft.
 *                  Default 1800ms = ongeveer één rotatie van de stip.
 *   onDone       - callback die wordt aangeroepen wanneer de splash mag verdwijnen
 *   darkMode     - boolean voor dark-mode-aware styling
 *   updating     - boolean, true terwijl er een nieuwe versie geïnstalleerd wordt.
 *                  De stip blijft dan doorlopend draaien en de tagline maakt plaats
 *                  voor een melding; direct daarna herlaadt de app zichzelf.
 *
 * Gebruik (in App.jsx):
 *   const [appReady, setAppReady] = useState(false);
 *   const [splashDone, setSplashDone] = useState(false);
 *
 *   useEffect(() => {
 *     // Laad initial data
 *     loadSettings().then(() => setAppReady(true));
 *   }, []);
 *
 *   if (!splashDone) {
 *     return <SplashScreen ready={appReady} onDone={() => setSplashDone(true)} darkMode={darkMode} />;
 *   }
 *   // ...rest van app
 */
export default function SplashScreen({
  ready = true,
  minDuration = 1800,
  onDone,
  darkMode = false,
  updating = false,
}) {
  const { t } = useTranslation();
  const [fading, setFading] = useState(false);
  const [shouldRender, setShouldRender] = useState(true);

  useEffect(() => {
    if (!ready) return undefined;

    let fadeTimer = null;

    const minTimer = setTimeout(() => {
      setFading(true);
      // Wacht op fade-out animatie voor we de component unmounten
      fadeTimer = setTimeout(() => {
        setShouldRender(false);
        onDone?.();
      }, 400);
    }, minDuration);

    // Zonder opruimen start elke re-render een nieuwe klok en wordt onDone
    // meerdere keren aangeroepen.
    return () => {
      clearTimeout(minTimer);
      clearTimeout(fadeTimer);
    };
  }, [ready, minDuration, onDone]);

  if (!shouldRender) return null;

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 transition-opacity duration-400 ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${darkMode ? 'bg-stone-900' : 'bg-stone-50'}`}
      style={{ transitionDuration: '400ms' }}
    >
      <RitmoLogo
        size={140}
        variant={darkMode ? 'light' : 'dark'}
        animated={updating ? 'spin' : 'splash'}
      />
      <p
        className={`text-sm tracking-wide ${
          darkMode ? 'text-stone-400' : 'text-stone-500'
        }`}
        style={{
          opacity: 0,
          // De update-melding komt direct in beeld; de tagline houdt zijn rustige
          // vertraging zodat het openen zonder update onveranderd aanvoelt.
          animation: updating
            ? 'ritmo-tagline-fade 0.4s ease-out forwards'
            : 'ritmo-tagline-fade 0.8s ease-out 1.2s forwards',
        }}
      >
        {updating ? t('splash.updating') : t('splash.tagline')}
      </p>
      {APP_VERSION && (
        <p
          className={`text-xs tracking-wide ${
            darkMode ? 'text-stone-600' : 'text-stone-400'
          }`}
          style={{
            opacity: 0,
            animation: 'ritmo-tagline-fade 0.8s ease-out 1.2s forwards',
          }}
        >
          {t('splash.version', { version: APP_VERSION })}
        </p>
      )}
      <style>{`
        @keyframes ritmo-tagline-fade {
          to { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
