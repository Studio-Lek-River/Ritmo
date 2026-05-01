import React from 'react';
import { Smartphone, MessageSquare } from 'lucide-react';
import HelpItemRow from './HelpItemRow';

const helpItems = [
  {
    id: 'install',
    icon: Smartphone,
    title: 'App op beginscherm zetten',
    description: 'Open Ritmo sneller, vanaf jouw startscherm',
  },
  {
    id: 'feedback',
    icon: MessageSquare,
    title: 'Feedback geven',
    description: 'Probleem melden of een idee delen',
  },
];

export default function HelpOverlay({ t, onSelect }) {
  return (
    <div className="space-y-2">
      {helpItems.map(item => (
        <HelpItemRow
          key={item.id}
          icon={item.icon}
          title={item.title}
          description={item.description}
          onClick={() => onSelect(item.id)}
          t={t}
        />
      ))}
    </div>
  );
}
