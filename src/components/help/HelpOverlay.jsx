import React from 'react';
import { Smartphone, MessageSquare } from 'lucide-react';
import HelpItemRow from './HelpItemRow';
import { useTranslation } from '../../i18n/useTranslation';

export default function HelpOverlay({ theme, onSelect }) {
  const { t } = useTranslation();
  const helpItems = [
    {
      id: 'install',
      icon: Smartphone,
      title: t('help.install'),
      description: t('help.installDesc'),
    },
    {
      id: 'feedback',
      icon: MessageSquare,
      title: t('help.feedback'),
      description: t('help.feedbackDesc'),
    },
  ];

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
    </div>
  );
}
