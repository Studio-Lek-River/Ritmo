import React, { useMemo, useState } from 'react';
import { CheckCircle2, Circle, Eye, EyeOff, ExternalLink, LayoutGrid } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { buildNormalizedItems } from '../utils/normalizedItems';
import { CONNECTION_PROVIDERS } from '../sync/connections';
import { SOURCE_ICONS, getSourcePref } from '../utils/sourcePrefs';
import { getColorClasses } from '../utils/colors';
import ProgressBar from '../components/ProgressBar';
import EmptyState from '../components/EmptyState';

const DONE_STATUS = 'klaar';

// Alle bronnen die in de feed kunnen voorkomen: de bestaande externe
// providers (CONNECTION_PROVIDERS, sync/connections.js — geen tweede
// providerlijst hier) plus 'local' voor items zonder source-binding (losse
// taken en handmatig aangemaakte project-modules). `getSourcePref` valt voor
// 'local' vanzelf terug op de neutrale kleur (geen default in
// DEFAULT_SOURCE_PREFS), dus geen aparte casus nodig.
const FEED_SOURCES = [...CONNECTION_PROVIDERS, 'local'];

function itemProvider(item) {
  return item.source?.provider || 'local';
}

// Vandaag-feed (S10): alle items uit `modules` (= allModules, dus inclusief de
// afgeleide Trello-/GitHub-projecten) en `customTasks`, gegroepeerd per
// `projectKey` (normalizedItems.js) met een voortgangsbalk per groep.
// Filterchips per bron en de "toon afgeronde items"-toggle zijn lichte,
// niet-persistente UI-state — net als `tab`/`selectedDateKey` in
// ProductivitySuiteView (principe 2: geen gedrag opgelegd). Doet zelf geen
// enkele fetch: leest uitsluitend wat `buildNormalizedItems` uit de al
// aanwezige caches afleidt.
export default function FeedView({ modules, customTasks, sourcePrefs, theme }) {
  const { t } = useTranslation();
  const [activeSources, setActiveSources] = useState(() => new Set(FEED_SOURCES));
  const [showDone, setShowDone] = useState(false);

  const items = useMemo(
    () => buildNormalizedItems({ modules, customTasks }),
    [modules, customTasks]
  );

  const toggleSource = (source) => {
    setActiveSources(prev => {
      const next = new Set(prev);
      if (next.has(source)) next.delete(source); else next.add(source);
      return next;
    });
  };

  // Groeperen op `projectKey`, niet op het `project`-label: dat is precies de
  // S08-landmijn die deze slice oplost (twee Trello-borden met een
  // gelijknamige lijst horen in aparte groepen). `progress` komt al
  // kant-en-klaar van buildNormalizedItems (over alle items van de groep,
  // ongeacht filters), dus filteren op bron verandert nooit de voortgang van
  // een groep die zichtbaar blijft.
  const groups = useMemo(() => {
    const map = new Map();
    items.forEach(item => {
      const provider = itemProvider(item);
      if (!activeSources.has(provider)) return;
      let group = map.get(item.projectKey);
      if (!group) {
        group = {
          key: item.projectKey,
          label: item.project ?? t('planner.pool.groups.losseTaak'),
          provider,
          progress: item.progress,
          items: [],
        };
        map.set(item.projectKey, group);
      }
      group.items.push(item);
    });
    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label));
  }, [items, activeSources, t]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-1.5 flex-wrap">
          {FEED_SOURCES.map(source => {
            const pref = getSourcePref(sourcePrefs, source);
            const c = getColorClasses(pref.color);
            const Icon = SOURCE_ICONS[source];
            const active = activeSources.has(source);
            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                aria-pressed={active}
                className={`flex items-center gap-1.5 px-3 py-1.5 ${theme.radiusControl} text-xs font-medium transition ${
                  active ? `${c.pillBg} ${c.pillText}` : `${theme.cardSecondary} ${theme.textMuted} ${theme.hover}`
                }`}
              >
                {Icon && <Icon className="w-3.5 h-3.5" aria-hidden="true" />}
                {source === 'local' ? t('planner.feed.sources.local') : t(`connections.providers.${source}`)}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => setShowDone(v => !v)}
          aria-pressed={showDone}
          className={`flex items-center gap-1.5 px-3 py-1.5 ${theme.radiusControl} text-xs font-medium transition ${
            showDone ? `${theme.accentBg} shadow` : `${theme.cardSecondary} ${theme.textMuted} ${theme.hover}`
          }`}
        >
          {showDone ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
          {t('planner.feed.showDone')}
        </button>
      </div>

      {groups.length === 0 ? (
        <EmptyState
          icon={LayoutGrid}
          title={t('planner.feed.emptyTitle')}
          description={t('planner.feed.emptyDescription')}
          theme={theme}
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {groups.map(group => (
            <FeedGroupCard
              key={group.key}
              group={group}
              sourcePrefs={sourcePrefs}
              showDone={showDone}
              theme={theme}
              t={t}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function FeedGroupCard({ group, sourcePrefs, showDone, theme, t }) {
  const c = getColorClasses(getSourcePref(sourcePrefs, group.provider).color);
  const doneCount = group.items.filter(item => item.status === DONE_STATUS).length;
  const visibleItems = showDone ? group.items : group.items.filter(item => item.status !== DONE_STATUS);

  return (
    <div className={`${theme.card} ${theme.radiusCard} ${theme.padRow} space-y-2`}>
      <div className="flex items-center justify-between gap-2">
        <h3 className={`text-sm font-semibold ${theme.textSecondary} truncate`}>{group.label}</h3>
        <span className={`text-xs ${theme.textMuted} shrink-0`}>
          {t('planner.feed.groupCount', { done: doneCount, total: group.items.length })}
        </span>
      </div>

      <ProgressBar value={group.progress} colorKey={getSourcePref(sourcePrefs, group.provider).color} />

      {visibleItems.length === 0 ? (
        <p className={`text-xs italic ${theme.textMuted}`}>{t('planner.feed.groupAllDone')}</p>
      ) : (
        <ul className="space-y-1">
          {visibleItems.map((item, idx) => (
            <FeedItemRow key={`${group.key}:${idx}`} item={item} colorClasses={c} theme={theme} t={t} />
          ))}
        </ul>
      )}
    </div>
  );
}

function FeedItemRow({ item, colorClasses, theme, t }) {
  const isDone = item.status === DONE_STATUS;
  const providerLabel = item.source ? t(`connections.providers.${item.source.provider}`) : '';

  return (
    <li className="flex items-center gap-2 text-sm">
      {isDone
        ? <CheckCircle2 className={`w-4 h-4 shrink-0 ${colorClasses.iconText}`} aria-hidden="true" />
        : <Circle className={`w-4 h-4 shrink-0 ${theme.textMuted}`} aria-hidden="true" />}
      <span className={`flex-1 min-w-0 truncate ${isDone ? `line-through ${theme.textMuted}` : theme.textSecondary}`}>
        {item.title}
      </span>
      {item.source && item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('planner.pool.openInSource', { provider: providerLabel })}
          title={t('planner.pool.openInSource', { provider: providerLabel })}
          className={`shrink-0 p-1 rounded transition ${theme.textMuted} ${theme.hover}`}
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      )}
    </li>
  );
}
