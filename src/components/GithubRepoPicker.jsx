import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { fetchGithubRepos } from '../sync/connections';
import { getRepoPref } from '../utils/githubRepoPrefs';
import { ERROR_KEYS } from './ConnectionsSection';

// Repo-kiezer voor de GitHub-rij in SourcesPanel (S09,
// `sourceActions.github.panel`), spiegelt TrelloBoardPicker.jsx: per repo een
// checkbox ("meetelt in de planner"). Geen altijd-lijst-select zoals Trello
// (GitHub-issues hebben geen lijsten): bij GitHub is aanvinken de enige
// opt-in (Poort-0-beslissing 3). Fetcht de repolijst pas bij het eerste
// uitklappen (principe 2: geen achtergrondverkeer zonder klik, AC3) — de
// issues per repo komen niet van hier maar van `useGithubIssues` (elders al
// gefetcht zodra een repo is aangevinkt), dus dit component doet zelf maar
// één soort netwerkcall.
export default function GithubRepoPicker({ repoPrefs, onChangeRepoPrefs, theme }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [availableRepos, setAvailableRepos] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // `loading` hoort NIET in de deps of de guard: dit effect zet het zelf, dus
  // een re-render zou de cleanup draaien en daarmee zijn eigen fetch
  // annuleren (spinner blijft dan eeuwig staan). `expanded` + `availableRepos`
  // volstaan: na een geslaagde fetch is `availableRepos` niet meer null en
  // blokkeert de guard een herhaling. Dicht- en weer openklappen na een fout
  // = een retry.
  useEffect(() => {
    if (!expanded || availableRepos !== null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchGithubRepos()
      .then((data) => {
        if (cancelled) return;
        setAvailableRepos(data?.repos || []);
      })
      .catch((err) => {
        console.warn('Ritmo github repos fetch failed', err);
        if (cancelled) return;
        setError(err.code || 'unexpected');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [expanded, availableRepos]);

  const updateRepoPref = (repoId, patch) => {
    const current = getRepoPref(repoPrefs, repoId);
    onChangeRepoPrefs((prev) => ({
      ...prev,
      repos: {
        ...(prev?.repos || {}),
        [repoId]: { ...current, ...patch },
      },
    }));
  };

  return (
    <div className={`pt-2 border-t ${theme.border} space-y-2`}>
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className={`w-full flex items-center justify-between text-xs font-medium ${theme.textMuted} hover:underline`}
      >
        {t('planner.github.reposTitle')}
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        loading ? (
          <p className={`text-xs ${theme.textMuted} flex items-center gap-1.5`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t('planner.github.loadingRepos')}
          </p>
        ) : error ? (
          <p className="text-xs text-red-500">
            {ERROR_KEYS[error] ? t(ERROR_KEYS[error]) : t('planner.github.fetchError')}
          </p>
        ) : (availableRepos || []).length === 0 ? (
          <p className={`text-xs ${theme.textMuted}`}>{t('planner.github.empty')}</p>
        ) : (
          <ul className="space-y-1.5">
            {availableRepos.map((repo) => {
              const pref = getRepoPref(repoPrefs, repo.id);
              return (
                <li key={repo.id}>
                  <label className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
                    <input
                      type="checkbox"
                      checked={pref.include}
                      onChange={(e) => updateRepoPref(repo.id, { include: e.target.checked, fullName: repo.fullName })}
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span className="truncate">{repo.fullName}</span>
                  </label>
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
