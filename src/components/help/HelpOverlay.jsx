import React from 'react';
import { GraduationCap, Smartphone, MessageSquare, UtensilsCrossed } from 'lucide-react';
import HelpItemRow from './HelpItemRow';
import { useTranslation } from '../../i18n/useTranslation';
import { APP_VERSION } from '../../utils/appVersion';

export default function HelpOverlay({ theme, onSelect, showTour }) {
  const { t } = useTranslation();
  const helpItems = [
    showTour && {
      id: 'tour',
      icon: GraduationCap,
      title: t('help.tour'),
      description: t('help.tourDesc'),
    },
    {
      id: 'install',
      icon: Smartphone,
      title: t('help.install'),
      description: t('help.installDesc'),
    },
    // Onvoorwaardelijk zichtbaar (#150): de Voeding-tab is dat ook, en juist
    // wie de voedingsbibliotheek nog niet aan heeft staan heeft de uitleg
    // nodig.
    {
      id: 'nutrition',
      icon: UtensilsCrossed,
      title: t('help.nutrition'),
      description: t('help.nutritionDesc'),
    },
    {
      id: 'feedback',
      icon: MessageSquare,
      title: t('help.feedback'),
      description: t('help.feedbackDesc'),
    },
  ].filter(Boolean);

  return (
    <div className="space-y-2">
      {helpItems.map(item => (
        <HelpItemRow
          key={item.id}
          icon={item.icon}
          title={item.title}
          description={item.description}
          onClick={() => onSelect(item.id)}
          theme={theme}
        />
      ))}
      {APP_VERSION && (
        <div className={`pt-2 text-center text-xs ${theme.textMuted}`}>
          {t('help.version', { version: APP_VERSION })}
        </div>
      )}
    </div>
  );
}
