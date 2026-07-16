import { useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { fetchTrelloBoards } from '../sync/connections';
import { getBoardPref } from '../utils/trelloBoardPrefs';

// Bord-kiezer voor de Trello-rij in SourcesPanel (S08, `sourceActions.trello.
// panel`): per bord een checkbox ("meetelt in de planner") en, zodra
// aangevinkt, een <select> voor de altijd-lijst plus de kaarten-per-lijst-
// telling. Fetcht de bordenlijst pas bij het eerste uitklappen (niet bij
// Planner-open, principe 2: geen achtergrondverkeer zonder klik) — de
// lijsten/kaarten per bord komen niet van hier maar van `cacheBoards`
// (useTrelloCards, elders al gefetcht zodra een bord is aangevinkt), dus dit
// component doet zelf maar één soort netwerkcall.
export default function TrelloBoardPicker({ boardPrefs, onChangeBoardPrefs, cacheBoards = [], theme }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [availableBoards, setAvailableBoards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!expanded || availableBoards !== null || loading) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTrelloBoards()
      .then((data) => {
        if (cancelled) return;
        setAvailableBoards(data?.boards || []);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.code || 'unexpected');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [expanded, availableBoards, loading]);

  const updateBoardPref = (boardId, patch) => {
    const current = getBoardPref(boardPrefs, boardId);
    onChangeBoardPrefs((prev) => ({
      ...prev,
      boards: {
        ...(prev?.boards || {}),
        [boardId]: { ...current, ...patch },
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
        {t('planner.trello.boardsTitle')}
        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
      </button>

      {expanded && (
        loading ? (
          <p className={`text-xs ${theme.textMuted} flex items-center gap-1.5`}>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t('planner.trello.loadingBoards')}
          </p>
        ) : error ? (
          <p className="text-xs text-red-500">{t('planner.trello.fetchError')}</p>
        ) : (availableBoards || []).length === 0 ? (
          <p className={`text-xs ${theme.textMuted}`}>{t('planner.trello.empty')}</p>
        ) : (
          <ul className="space-y-2">
            {availableBoards.map((board) => {
              const pref = getBoardPref(boardPrefs, board.id);
              const cached = cacheBoards.find((b) => b.id === board.id);
              return (
                <li key={board.id} className="space-y-1">
                  <label className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
                    <input
                      type="checkbox"
                      checked={pref.include}
                      onChange={(e) => updateBoardPref(board.id, { include: e.target.checked })}
                      className="w-3.5 h-3.5 shrink-0"
                    />
                    <span className="truncate">{board.name}</span>
                  </label>

                  {pref.include && (
                    <div className="pl-5 space-y-1">
                      {cached ? (
                        <>
                          <select
                            value={pref.alwaysListId || ''}
                            onChange={(e) => updateBoardPref(board.id, { alwaysListId: e.target.value || null })}
                            aria-label={t('planner.trello.alwaysListAria', { name: board.name })}
                            className={`text-xs px-1.5 py-1 ${theme.input} rounded`}
                          >
                            <option value="">{t('planner.trello.alwaysListNone')}</option>
                            {(cached.lists || []).map((list) => (
                              <option key={list.id} value={list.id}>{list.name}</option>
                            ))}
                          </select>
                          <p className={`text-[11px] ${theme.textMuted}`}>
                            {(cached.lists || [])
                              .map((list) => `${list.name} (${(cached.cards || []).filter((c) => c.idList === list.id).length})`)
                              .join(' · ')}
                          </p>
                        </>
                      ) : (
                        <p className={`text-[11px] ${theme.textMuted}`}>{t('planner.trello.cardsLoading')}</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )
      )}
    </div>
  );
}
