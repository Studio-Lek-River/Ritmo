import React, { useEffect } from 'react';
import { GraduationCap, Minus, X, Check, ArrowRight, PartyPopper } from 'lucide-react';
import { useTranslation, resolveModuleName } from '../../i18n/useTranslation';

// Zwevende, niet-blokkerende rondleiding voor gezondheidsmodus. Toont per stap
// in gewone taal wat de module is en waarom die handig is, brengt je erheen, en
// vinkt vanzelf af zodra je iets hebt ingevuld. Altijd in te klappen tot een
// pil, altijd te sluiten. State (actief/ingeklapt/focus) leeft in App.jsx.
export default function HealthTour({
  steps,
  filledMap,
  theme,
  collapsed,
  welcome,
  onToggleCollapse,
  onClose,
  onGoToModule,
  onStartFromWelcome,
  onFinish,
}) {
  const { t } = useTranslation();

  const total = steps.length;
  const done = steps.filter((s) => filledMap[s.id]).length;
  const allDone = total > 0 && done === total;
  const current = steps.find((s) => !filledMap[s.id]) || null;
  const pct = total === 0 ? 0 : Math.round((done / total) * 100);

  // Escape sluit het klaar-scherm en klapt anders het paneel in (nooit hard
  // sluiten). In de pil-stand doet Escape niets. Consistent over de schermen.
  useEffect(() => {
    if (collapsed) return undefined;
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      if (allDone) onFinish();
      else onToggleCollapse();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [collapsed, allDone, onToggleCollapse, onFinish]);

  const wrap = 'fixed z-40 left-1/2 -translate-x-1/2 bottom-4 w-[calc(100%-1.5rem)] max-w-md';
  const card = `${theme.card} border ${theme.border} rounded-3xl shadow-xl`;

  // --- Zacht welkomkaartje (opt-in na de onboarding) ---
  if (welcome) {
    return (
      <div className={wrap}>
        <div className={`${card} p-5 text-center slide-in`}>
          <div className="w-14 h-14 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
            <GraduationCap className="w-7 h-7" />
          </div>
          <h3 className={`text-lg font-semibold ${theme.text} mb-1`}>{t('tour.welcome.title')}</h3>
          <p className={`text-sm ${theme.textMuted} mb-4`}>{t('tour.welcome.body')}</p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onStartFromWelcome}
              className="flex-1 py-3 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white"
            >
              {t('tour.welcome.start')}
            </button>
            <button
              type="button"
              onClick={onToggleCollapse}
              className={`px-4 py-3 rounded-xl font-medium ${theme.cardSecondary} ${theme.textSecondary}`}
            >
              {t('tour.welcome.later')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- Ingeklapt: klein pil-knopje ---
  if (collapsed) {
    return (
      <div className={wrap} style={{ pointerEvents: 'none' }}>
        <button
          type="button"
          onClick={onToggleCollapse}
          style={{ pointerEvents: 'auto' }}
          className={`${theme.card} border ${theme.border} shadow-xl rounded-full pl-3 pr-4 py-2.5 flex items-center gap-2.5 ${theme.text} font-medium text-sm`}
          aria-label={t('tour.expandAria')}
        >
          <GraduationCap className="w-4 h-4 text-blue-500" />
          <span>{t('tour.pill', { done, total })}</span>
          <span className={`w-11 h-1.5 rounded-full ${theme.progressBg} overflow-hidden`}>
            <span className="block h-full bg-emerald-500" style={{ width: `${pct}%` }} />
          </span>
        </button>
      </div>
    );
  }

  // --- Klaar: zachte felicitatie ---
  if (allDone) {
    return (
      <div className={wrap}>
        <div className={`${card} p-5 text-center slide-in`}>
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto mb-3">
            <PartyPopper className="w-7 h-7" />
          </div>
          <h3 className={`text-lg font-semibold ${theme.text} mb-1`}>{t('tour.done.title')}</h3>
          <p className={`text-sm ${theme.textMuted} mb-4`}>{t('tour.done.body')}</p>
          <button
            type="button"
            onClick={onFinish}
            className="w-full py-3 rounded-xl font-medium bg-blue-500 hover:bg-blue-600 text-white"
          >
            {t('tour.done.close')}
          </button>
        </div>
      </div>
    );
  }

  // --- Actief paneel: voortgang + huidige stap + checklist ---
  return (
    <div className={wrap}>
      <div className={`${card} overflow-hidden slide-in`}>
        <div className="flex items-center gap-2 px-4 pt-3.5 pb-2.5">
          <GraduationCap className="w-[18px] h-[18px] text-blue-500" />
          <span className={`font-semibold text-sm ${theme.text}`}>{t('tour.panelTitle')}</span>
          <span className="flex-1" />
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`w-8 h-8 rounded-lg ${theme.cardSecondary} ${theme.textSecondary} flex items-center justify-center`}
            aria-label={t('tour.collapseAria')}
          >
            <Minus className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            className={`w-8 h-8 rounded-lg ${theme.cardSecondary} ${theme.textSecondary} flex items-center justify-center`}
            aria-label={t('tour.closeAria')}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 pb-3">
          <div className={`h-2 rounded-full ${theme.progressBg} overflow-hidden`}>
            <span
              className="block h-full bg-emerald-500 transition-[width] duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className={`text-xs ${theme.textSecondary} mt-1.5 tabular-nums`}>
            {t('tour.progress', { done, total })}
          </p>
        </div>

        {current && (
          <div className="mx-4 mb-3 p-3.5 rounded-2xl bg-blue-500/10">
            <p className="text-[11px] font-bold tracking-wider uppercase text-blue-500">
              {t('tour.nowLabel')}
            </p>
            <h4 className={`text-base font-semibold ${theme.text} mt-0.5 mb-2`}>
              {resolveModuleName(current.module, t)}
            </h4>
            <p className={`text-sm ${theme.text} flex gap-2`}>
              <span className={`font-semibold ${theme.textSecondary} w-14 shrink-0`}>{t('tour.whatLabel')}</span>
              <span>{t(`tour.types.${current.typeKey}.what`)}</span>
            </p>
            <p className={`text-sm ${theme.text} flex gap-2 mt-1`}>
              <span className={`font-semibold ${theme.textSecondary} w-14 shrink-0`}>{t('tour.whyLabel')}</span>
              <span>{t(`tour.types.${current.typeKey}.why`)}</span>
            </p>
            <button
              type="button"
              onClick={() => onGoToModule(current.id)}
              className="mt-3 w-full py-2.5 rounded-xl font-medium text-sm bg-blue-500 hover:bg-blue-600 text-white flex items-center justify-center gap-2"
            >
              {t('tour.goto')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="px-2 pb-3 max-h-44 overflow-y-auto">
          <p className={`text-[11px] font-bold uppercase tracking-wide ${theme.textMuted} px-3 py-1`}>
            {t('tour.allSteps')}
          </p>
          {steps.map((s) => {
            const isDone = !!filledMap[s.id];
            const isCurrent = current && current.id === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onGoToModule(s.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left ${theme.hover} ${isCurrent ? theme.cardSecondary : ''}`}
              >
                <span
                  className={`rounded-full flex items-center justify-center shrink-0 ${
                    isDone ? 'bg-emerald-500 text-white' : `border-2 ${theme.border}`
                  }`}
                  style={{ width: 22, height: 22 }}
                >
                  {isDone && <Check className="w-3.5 h-3.5" strokeWidth={3} />}
                </span>
                <span className={`text-sm ${isDone ? theme.textSecondary : theme.text}`}>
                  {resolveModuleName(s.module, t)}
                </span>
                {isCurrent && (
                  <span className="ml-auto text-[11px] font-bold text-blue-500">{t('tour.nowTag')}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
