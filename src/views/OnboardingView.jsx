import React, { useState } from 'react';
import WelcomeStep from '../components/onboarding/WelcomeStep';
import AreaStep from '../components/onboarding/AreaStep';
import DoneStep from '../components/onboarding/DoneStep';
import { useTranslation } from '../i18n/useTranslation';
import { buildOnboardingResult } from '../utils/onboardingCommit';

const TOTAL_STEPS = 6;

const AREAS = [
  { id: 'modules',     step: 1 },
  { id: 'projects',    step: 2 },
  { id: 'collections', step: 3 },
  { id: 'household',   step: 4 },
];

function emptyAreaState() {
  return { tab: 'presets', selectedPresetIds: {}, presetItems: {}, custom: [] };
}

export default function OnboardingView({ onComplete, theme, darkMode }) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [areaState, setAreaState] = useState({
    modules:     emptyAreaState(),
    projects:    emptyAreaState(),
    collections: emptyAreaState(),
    household:   emptyAreaState(),
  });
  const [committing, setCommitting] = useState(false);

  const goNext = () => setStep(s => Math.min(s + 1, TOTAL_STEPS - 1));
  const goBack = () => setStep(s => Math.max(s - 1, 0));
  const skipAll = () => setStep(TOTAL_STEPS - 1);

  // Schrijft household:* direct via window.storage; settings.modules wordt
  // door App.jsx's save-effect geschreven na onComplete(nextModules).
  const handleFinish = async () => {
    if (committing) return;
    setCommitting(true);
    try {
      const { modules, chores, groceries } = buildOnboardingResult(areaState, t);
      const writes = [];
      if (chores.length > 0) {
        writes.push(window.storage.set('household:chores', JSON.stringify(chores)));
      }
      if (groceries.length > 0) {
        writes.push(window.storage.set(
          'household:groceries',
          JSON.stringify({ items: groceries, shopDay: null })
        ));
      }
      if (writes.length > 0) await Promise.all(writes);
      onComplete(modules);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className={`min-h-screen ${theme.bg} p-4 flex items-center justify-center`}>
      <div className={`${theme.card} rounded-2xl p-6 shadow-lg max-w-lg w-full`}>
        {step === 0 && (
          <WelcomeStep onStart={goNext} theme={theme} darkMode={darkMode} />
        )}

        {AREAS.map(({ id, step: areaStep }) => step === areaStep && (
          <AreaStep
            key={id}
            area={id}
            current={areaStep + 1}
            total={TOTAL_STEPS}
            title={t(`onboarding.steps.${id}.title`)}
            subtitle={t(`onboarding.steps.${id}.subtitle`)}
            state={areaState[id]}
            setState={(updater) => setAreaState(prev => ({
              ...prev,
              [id]: typeof updater === 'function' ? updater(prev[id]) : updater,
            }))}
            onBack={goBack}
            onNext={goNext}
            onSkipAll={skipAll}
            theme={theme}
            darkMode={darkMode}
          />
        ))}

        {step === TOTAL_STEPS - 1 && (
          <DoneStep
            areaState={areaState}
            onBack={goBack}
            onFinish={handleFinish}
            committing={committing}
            theme={theme}
            darkMode={darkMode}
          />
        )}
      </div>
    </div>
  );
}
