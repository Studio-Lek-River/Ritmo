import React from 'react';
import { Share, Plus, MoreVertical, CheckCircle2 } from 'lucide-react';

function InlineIcon({ icon: Icon }) {
  return (
    <span className="inline-flex items-center justify-center align-middle w-5 h-5 mx-0.5 rounded bg-blue-50 text-blue-600">
      <Icon className="w-3.5 h-3.5" />
    </span>
  );
}

function isStandalone() {
  if (typeof window === 'undefined') return false;
  const matchStandalone = window.matchMedia && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = window.navigator && window.navigator.standalone === true;
  return Boolean(matchStandalone || iosStandalone);
}

export default function InstallGuide({ t }) {
  if (isStandalone()) {
    return (
      <div className={`p-4 rounded-xl bg-green-50 border border-green-200 flex items-start gap-3`}>
        <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-green-800">Ritmo staat al op je beginscherm</p>
          <p className="text-xs text-green-700 mt-1">
            Je gebruikt Ritmo als geïnstalleerde app. Niets meer te doen.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <p className={`text-sm ${t.textSecondary}`}>
        Door Ritmo op je beginscherm te zetten open je de app sneller en voelt het alsof het een echte app is.
      </p>

      <section>
        <h3 className={`text-sm font-semibold ${t.text} mb-1`}>Op iPhone of iPad</h3>
        <p className={`text-xs ${t.textMuted} mb-3`}>
          Werkt alleen in Safari, niet in Chrome of andere browsers.
        </p>
        <ol className={`space-y-2 text-sm ${t.textSecondary} list-decimal pl-5`}>
          <li>
            Tik op het deel-icoon <InlineIcon icon={Share} /> onderin Safari.
          </li>
          <li>
            Scroll omlaag en kies <span className={`font-medium ${t.text}`}>Zet op beginscherm</span> <InlineIcon icon={Plus} />.
          </li>
          <li>
            Tik rechtsboven op <span className={`font-medium ${t.text}`}>Voeg toe</span>.
          </li>
        </ol>
      </section>

      <section>
        <h3 className={`text-sm font-semibold ${t.text} mb-1`}>Op Android</h3>
        <p className={`text-xs ${t.textMuted} mb-3`}>
          Werkt het soepelst in Chrome.
        </p>
        <ol className={`space-y-2 text-sm ${t.textSecondary} list-decimal pl-5`}>
          <li>
            Tik op het menu-icoon <InlineIcon icon={MoreVertical} /> rechtsboven.
          </li>
          <li>
            Kies <span className={`font-medium ${t.text}`}>App installeren</span> of <span className={`font-medium ${t.text}`}>Toevoegen aan startscherm</span>.
          </li>
          <li>
            Bevestig met <span className={`font-medium ${t.text}`}>Installeren</span>.
          </li>
        </ol>
      </section>
    </div>
  );
}
