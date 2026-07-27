import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { fetchTrelloBoards } from '../sync/connections';
import { getBoardPref } from '../utils/trelloBoardPrefs';
import { ERROR_KEYS } from './ConnectionsSection';

// Bord-kiezer voor de Trello-rij in SourcesPanel (S08, `sourceActions.trello.
// panel`): per bord een checkbox ("meetelt in de planner") en, zodra
// aangevinkt, een <select> voor de altijd-lijst plus de kaarten-per-lijst-
// telling. Fetcht de bordenlijst pas bij het eerste uitklappen (niet bij
// Planner-open, principe 2: geen achtergrondverkeer zonder klik) — de
// lijsten/kaarten per bord komen niet van hier maar van `cacheBoards`
// (useTrelloCards, elders al gefetcht zodra een bord is aangevinkt), dus dit
// component doet zelf maar één soort netwerkcall.
//
// #120 (meerdere Trello-accounts): `accounts` (nieuw, van App.jsx via
// ProductivitySuiteView's `trelloAccounts`) is de lijst verbonden Trello-
// accounts (`{ connectionId, label }`) — al bekend zonder de lazy
// boards-fetch, dus de kop/groepering hoeft niet op die fetch te wachten.
// `fetchTrelloBoards()` levert de borden zelf, elk met een `connectionId`
// (server-side gededupeerd op board-id, AC7). Bij meer dan één account krijgt
// elke groep een kop met de accountnaam; bij precies één account blijft de
// weergave visueel ongewijzigd (platte lijst, geen kop).
export default function TrelloBoardPicker({ accounts = [], boardPrefs, onChangeBoardPrefs, cacheBoards = [], theme }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const [availableBoards, setAvailableBoards] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // `loading` hoort NIET in de deps of de guard: dit effect zet het zelf, dus
  // een re-render zou de cleanup draaien en daarmee zijn eigen fetch annuleren
  // (spinner blijft dan eeuwig staan). `expanded` + `availableBoards` volstaan:
  // na een geslaagde fetch is `availableBoards` niet meer null en blokkeert de
  // guard een herhaling. Dicht- en weer openklappen na een fout = een retry.
  useEffect(() => {
    if (!expanded || availableBoards !== null) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchTrelloBoards()
      .then((data) => {
        if (cancelled) return;
        setAvailableBoards(data?.boards || []);
      })
      .catch((err) => {
        console.warn('Ritmo trello boards fetch failed', err);
        if (cancelled) return;
        setError(err.code || 'unexpected');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [expanded, availableBoards]);

  const boardsByConnection = useMemo(() => {
    const map = new Map();
    for (const board of (availableBoards || [])) {
      const list = map.get(board.connectionId) || [];
      list.push(board);
      map.set(board.connectionId, list);
    }
    return map;
  }, [availableBoards]);

  const updateBoardPref = (board, patch) => {
    const current = getBoardPref(boardPrefs, board.id);
    onChangeBoardPrefs((prev) => ({
      ...prev,
      boards: {
        ...(prev?.boards || {}),
        [board.id]: { ...current, connectionId: board.connectionId, ...patch },
      },
    }));
  };

  const renderBoard = (board) => {
    const pref = getBoardPref(boardPrefs, board.id);
    const cached = cacheBoards.find((b) => b.id === board.id);
    return (
      <li key={board.id} className="space-y-1">
        <label className={`flex items-center gap-2 text-sm ${theme.textSecondary}`}>
          <input
            type="checkbox"
            checked={pref.include}
            onChange={(e) => updateBoardPref(board, { include: e.target.checked })}
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
                  onChange={(e) => updateBoardPref(board, { alwaysListId: e.target.value || null })}
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
          <p className="text-xs text-red-500">
            {ERROR_KEYS[error] ? t(ERROR_KEYS[error]) : t('planner.trello.fetchError')}
          </p>
        ) : (availableBoards || []).length === 0 ? (
          <p className={`text-xs ${theme.textMuted}`}>{t('planner.trello.empty')}</p>
        ) : accounts.length > 1 ? (
          <div className="space-y-3">
            {accounts.map((account) => {
              const accountBoards = boardsByConnection.get(account.connectionId) || [];
              if (accountBoards.length === 0) return null;
              return (
                <div key={account.connectionId} className="space-y-2">
                  <p className={`text-xs font-semibold ${theme.textMuted}`}>
                    {t('planner.trello.accountHeading', { name: account.label || t('connections.providers.trello') })}
                  </p>
                  <ul className="space-y-2">
                    {accountBoards.map(renderBoard)}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <ul className="space-y-2">
            {availableBoards.map(renderBoard)}
          </ul>
        )
      )}
    </div>
  );
}
