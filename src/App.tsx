import { useEffect, useMemo, useReducer, useState } from 'react';
import {
  boardEntries,
  calculateGradeTotal,
  classLabels,
  classTypes,
  formatPoints,
  getEligibleGrades,
  getNextRank,
  getRankLabel,
  gradeEntries,
  gradePoints
} from './lib/score';
import { checkStorage, clearState, loadState, saveState, ttlMs } from './lib/storage';
import { initialState, playerSlots, reducer } from './state/reducer';
import type { ParticipantCount } from './state/reducer';

const SAVE_DEBOUNCE_MS = 300;
const MENU_ATTENTION_DELAY_MS = 2000;
const MENU_ATTENTION_DURATION_MS = 1100;
const MENU_SCROLL_THRESHOLD = 24;
const COPY_FEEDBACK_MS = 2200;
const participantCounts = [1, 2] as const satisfies readonly ParticipantCount[];

const classDescriptions = {
  general: '一般クラスとして通常の完登数だけを集計します。',
  advance: '8Q〜4Q は参加クラス設定で完登扱いにできます。対象Qの通常入力は不要です。',
  master: '8Q〜3Q は参加クラス設定で完登扱いにできます。対象Qの通常入力は不要です。'
} as const;

const getPlayerFallbackLabel = (playerId: string) =>
  playerSlots.find(({ id }) => id === playerId)?.label ?? '参加者';
const getPlayerDisplayName = (playerId: string, name: string) => name.trim() || getPlayerFallbackLabel(playerId);

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageMessage, setStorageMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAttention, setMenuAttention] = useState(false);
  const [menuCompact, setMenuCompact] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [copyMessage, setCopyMessage] = useState('');
  const activePlayer = state.players[state.activePlayerId];
  const activePlayerLabel = getPlayerDisplayName(state.activePlayerId, activePlayer.name);

  const baseUrl = import.meta.env.BASE_URL;
  const menuLinks = useMemo(
    () => [
      { label: 'のぼコン トップページ', href: 'https://nobocon.com/', description: '公式サイト', external: true },
      { label: '東北シリーズ', href: 'https://nobocon.com/?cat=31', description: 'シリーズ一覧', external: true },
      {
        label: '北関東シリーズ',
        href: 'https://nobocon.com/?cat=33',
        description: 'シリーズ一覧',
        external: true
      },
      { label: '東京シリーズ', href: 'https://nobocon.com/?cat=34', description: 'シリーズ一覧', external: true },
      { label: '東海シリーズ', href: 'https://nobocon.com/?cat=37', description: 'シリーズ一覧', external: true },
      { label: '関西シリーズ', href: 'https://nobocon.com/?cat=35', description: 'シリーズ一覧', external: true },
      { label: '中国シリーズ', href: 'https://nobocon.com/?cat=47', description: 'シリーズ一覧', external: true },
      {
        label: '九州北部シリーズ',
        href: 'https://nobocon.com/?cat=32',
        description: 'シリーズ一覧',
        external: true
      },
      { label: '四国シリーズ', href: 'https://nobocon.com/?cat=50', description: 'シリーズ一覧', external: true },
      {
        label: 'NOBOCON CALC について',
        href: `${baseUrl}about.html`,
        description: 'このアプリの使い方と概要',
        external: false
      }
    ],
    [baseUrl]
  );

  useEffect(() => {
    const status = checkStorage();
    if (!status.available) {
      setStorageAvailable(false);
      setStorageMessage(`保存機能は無効です（${status.reason}）`);
      return;
    }

    const restored = loadState();
    if (restored) {
      dispatch({ type: 'RESTORE', payload: restored });
    }
  }, []);

  useEffect(() => {
    if (!storageAvailable) return;
    const timer = window.setTimeout(() => {
      const status = saveState(state);
      if (!status.available) {
        setStorageAvailable(false);
        setStorageMessage(`保存機能は無効です（${status.reason}）`);
      }
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, storageAvailable]);

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return;

    let attentionTimer: number | undefined;
    let clearTimer: number | undefined;
    attentionTimer = window.setTimeout(() => {
      setMenuAttention(true);
      clearTimer = window.setTimeout(() => setMenuAttention(false), MENU_ATTENTION_DURATION_MS);
    }, MENU_ATTENTION_DELAY_MS);

    return () => {
      if (attentionTimer) window.clearTimeout(attentionTimer);
      if (clearTimer) window.clearTimeout(clearTimer);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setMenuCompact(window.scrollY > MENU_SCROLL_THRESHOLD);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (menuOpen || settingsOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen, settingsOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!copyMessage) return;
    const timer = window.setTimeout(() => setCopyMessage(''), COPY_FEEDBACK_MS);
    return () => window.clearTimeout(timer);
  }, [copyMessage]);

  const eligibleGrades = useMemo(() => getEligibleGrades(activePlayer.classType), [activePlayer.classType]);
  const eligibleGradeSet = useMemo<Set<string>>(() => new Set(eligibleGrades), [eligibleGrades]);
  const visibleGradeEntries = useMemo(
    () => gradeEntries.filter(([key]) => !eligibleGradeSet.has(key)),
    [eligibleGradeSet]
  );

  const gradeTotal = useMemo(
    () =>
      calculateGradeTotal(
        Object.fromEntries(
          Object.entries(activePlayer.counts).map(([key, count]) => [key, eligibleGradeSet.has(key) ? 0 : count])
        )
      ),
    [eligibleGradeSet, activePlayer.counts]
  );
  const boardTotal = useMemo(
    () => boardEntries.reduce((sum, [key, points]) => sum + (activePlayer.boards[key] ? points : 0), 0),
    [activePlayer.boards]
  );
  const classBonusTotal = useMemo(
    () => eligibleGrades.reduce((sum, key) => sum + activePlayer.classCounts[key], 0),
    [eligibleGrades, activePlayer.classCounts]
  );
  const classBonusPoints = useMemo(
    () => eligibleGrades.reduce((sum, key) => sum + gradePoints[key] * activePlayer.classCounts[key], 0),
    [eligibleGrades, activePlayer.classCounts]
  );
  const total = gradeTotal + boardTotal + classBonusPoints;
  const rankLabel = useMemo(() => getRankLabel(total), [total]);
  const nextRank = useMemo(() => getNextRank(total), [total]);
  const rankProgress = nextRank ? Math.max(0, Math.min(100, (total / (total + nextRank.pointsNeeded)) * 100)) : 100;
  const playerSummaries = useMemo(
    () =>
      playerSlots.map(({ id }) => {
        const player = state.players[id];
        const playerEligibleGrades = getEligibleGrades(player.classType);
        const playerEligibleGradeSet = new Set<string>(playerEligibleGrades);
        const playerGradeTotal = calculateGradeTotal(
          Object.fromEntries(
            Object.entries(player.counts).map(([key, count]) => [key, playerEligibleGradeSet.has(key) ? 0 : count])
          )
        );
        const playerBoardTotal = boardEntries.reduce((sum, [key, points]) => sum + (player.boards[key] ? points : 0), 0);
        const playerClassBonusPoints = playerEligibleGrades.reduce(
          (sum, key) => sum + gradePoints[key] * player.classCounts[key],
          0
        );

        return {
          id,
          label: getPlayerDisplayName(id, player.name),
          total: playerGradeTotal + playerBoardTotal + playerClassBonusPoints
        };
      }),
    [state.players]
  );

  const allBoardsOn = Object.values(activePlayer.boards).every(Boolean);

  const handleResetActivePlayer = () => {
    if (!window.confirm(`${activePlayerLabel}の入力内容を初期化します。よろしいですか？`)) return;
    dispatch({ type: 'RESET_ACTIVE_PLAYER' });
    setSettingsOpen(false);
    setMenuOpen(false);
    setCopyMessage(`${activePlayerLabel}の入力を初期化しました。`);
  };

  const handleResetAll = () => {
    if (!window.confirm('2人分の入力内容をすべて初期化します。よろしいですか？')) return;
    dispatch({ type: 'RESET_ALL' });
    if (storageAvailable) {
      clearState();
    }
    setSettingsOpen(false);
    setMenuOpen(false);
    setCopyMessage('2人分の入力を初期化しました。');
  };

  const handleCopySummary = async () => {
    const lines = [
      'NOBOCON CALC 集計結果',
      `対象: ${activePlayerLabel}`,
      `参加枠: ${classLabels[activePlayer.classType]}`,
      `通常課題: ${formatPoints(gradeTotal)} pt`,
      `のぼコンボード: ${formatPoints(boardTotal)} pt`,
      `クラス加算: ${formatPoints(classBonusPoints)} pt`,
      `合計: ${formatPoints(total)} pt`,
      `ランク: ${rankLabel}`
    ];

    if (nextRank) {
      lines.push(`次ランク ${nextRank.label} まで: ${formatPoints(nextRank.pointsNeeded)} pt`);
    }

    try {
      await navigator.clipboard.writeText(lines.join('\n'));
      setCopyMessage('集計結果をコピーしました。');
    } catch {
      setCopyMessage('コピーに失敗しました。ブラウザの権限設定をご確認ください。');
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="pattern-grid">
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-expanded={settingsOpen}
          aria-controls="class-settings-dialog"
          className={`fixed right-0 top-0 z-30 rounded-b-2xl rounded-br-none rounded-t-none border border-cyan-400/50 border-t-0 bg-slate-950/95 px-4 py-2 text-xs font-semibold tracking-[0.08em] text-cyan-100 shadow-[0_10px_30px_rgba(8,145,178,0.2)] backdrop-blur transition hover:border-cyan-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
            settingsOpen ? 'translate-y-1 border-cyan-200 text-white' : ''
          }`}
        >
          アドバンス・マスター・利用人数設定
        </button>

        <aside
          id="class-settings-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="class-settings-title"
          className={`fixed inset-0 z-50 transition-opacity duration-300 ${
            settingsOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          aria-hidden={!settingsOpen}
        >
          <button
            type="button"
            onClick={() => setSettingsOpen(false)}
            aria-label="アドバンス・マスター・利用人数設定を閉じる"
            className="absolute inset-0 bg-slate-950"
            tabIndex={settingsOpen ? 0 : -1}
          />
          <div
            className={`relative z-10 h-full overflow-y-auto overscroll-contain px-4 pb-4 pt-14 transition-transform duration-300 ${
              settingsOpen ? 'translate-y-0' : '-translate-y-[110%]'
            }`}
            style={{ WebkitOverflowScrolling: 'touch' }}
          >
            <div className="mx-auto flex w-full max-w-3xl flex-col overflow-hidden bg-slate-950 shadow-2xl">
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950 px-5 py-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-cyan-200/70">setting</p>
                  <h2 id="class-settings-title" className="mt-1 text-lg font-semibold text-white">
                    参加クラス・利用人数設定
                  </h2>
                  <p className="mt-1 text-sm text-slate-300">{classDescriptions[activePlayer.classType]}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/80 text-lg font-semibold leading-none text-slate-100 transition hover:border-cyan-300 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                  aria-label="設定を閉じる"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-8 px-5 pb-16 pt-4">
                <fieldset className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/60 px-4 py-4">
                  <legend className="px-1 text-sm font-semibold text-slate-100">利用人数</legend>
                  <div className="grid grid-cols-2 gap-2">
                    {participantCounts.map((count) => {
                      const selected = state.participantCount === count;
                      return (
                        <label
                          key={count}
                          className={`flex min-h-[48px] items-center gap-3 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                            selected
                              ? 'border-cyan-100 bg-tide text-slate-950 shadow-[0_10px_24px_rgba(14,165,164,0.25)]'
                              : 'border-slate-700 bg-slate-950/60 text-slate-300'
                          }`}
                        >
                          <input
                            type="radio"
                            name="participant-count"
                            value={count}
                            checked={selected}
                            onChange={() => dispatch({ type: 'SET_PARTICIPANT_COUNT', count })}
                            className="h-4 w-4 accent-cyan-300"
                          />
                          {count}人で利用
                        </label>
                      );
                    })}
                  </div>

                  {state.participantCount === 2 ? (
                    <div className="grid gap-3 pt-2 sm:grid-cols-2">
                      {playerSlots.map(({ id, label }) => {
                        const player = state.players[id];
                        return (
                          <label key={id} className="block text-sm font-semibold text-slate-100">
                            {label}の名前（任意）
                            <input
                              type="text"
                              value={player.name}
                              maxLength={16}
                              placeholder={label}
                              onChange={(event) =>
                                dispatch({ type: 'SET_PLAYER_NAME', playerId: id, name: event.currentTarget.value })
                              }
                              className="mt-2 h-11 w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 text-base text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/50"
                            />
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </fieldset>

                <div className="grid gap-2">
                  {classTypes.map((classType) => {
                    const selected = activePlayer.classType === classType;
                    return (
                      <button
                        key={classType}
                        type="button"
                        onClick={() => dispatch({ type: 'SET_CLASS_TYPE', classType })}
                        className={`rounded-2xl border px-3 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                          selected
                            ? 'border-cyan-100 bg-tide text-slate-900 ring-4 ring-cyan-200/70 shadow-[0_16px_40px_rgba(6,182,212,0.45)] scale-[1.02]'
                            : 'border-slate-700 bg-slate-900/70 text-slate-300 hover:border-slate-500 hover:text-white'
                        }`}
                        aria-pressed={selected}
                      >
                        <span className="block">{classLabels[classType]}</span>
                      </button>
                    );
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => dispatch({ type: 'RESET_CLASS_SETTINGS' })}
                  className="w-full rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  この設定をリセット
                </button>

                {eligibleGrades.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-slate-100">
                        {classLabels[activePlayer.classType]}加算対象の課題数
                      </p>
                      <p className="text-xs text-slate-400">
                        合計 {formatPoints(classBonusPoints)} pt / {classBonusTotal} 課題
                      </p>
                    </div>

                    <div className="grid gap-3">
                      {eligibleGrades.map((key) => {
                        const points = gradePoints[key];
                        const count = activePlayer.classCounts[key];
                        return (
                          <article
                            key={key}
                            className="rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-base font-semibold text-white">{key}</p>
                                <p className="text-xs text-slate-400">{formatPoints(points)} pt</p>
                              </div>
                              <p className="text-2xl font-bold text-white">{count}</p>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-3">
                              <button
                                type="button"
                                onClick={() => dispatch({ type: 'DECREMENT_CLASS_COUNT', key })}
                                disabled={count === 0}
                                className="min-h-[48px] rounded-xl border border-rose-400/40 bg-rose-500/10 text-xl font-semibold text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300 disabled:cursor-not-allowed disabled:border-slate-800 disabled:bg-slate-950/50 disabled:text-slate-600"
                                aria-label={`${key} の加算課題数を減らす`}
                              >
                                -
                              </button>
                              <button
                                type="button"
                                onClick={() => dispatch({ type: 'INCREMENT_CLASS_COUNT', key })}
                                className="min-h-[48px] rounded-xl border border-cyan-200/50 bg-cyan-300 text-xl font-semibold text-slate-950 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                                aria-label={`${key} の加算課題数を増やす`}
                              >
                                +
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </aside>

        <header className="sticky top-0 z-10 border-b border-slate-800 bg-slate-950/90 pt-0 backdrop-blur">
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 px-4 pb-4 pt-12 sm:pt-4">
            {state.participantCount === 2 ? (
              <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-800 bg-slate-900/70 p-1">
                {playerSummaries.map(({ id, label, total: playerTotal }) => {
                  const selected = state.activePlayerId === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => dispatch({ type: 'SET_ACTIVE_PLAYER', playerId: id })}
                      className={`rounded-xl px-3 py-2 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${
                        selected
                          ? 'bg-tide text-slate-950 shadow-[0_10px_24px_rgba(14,165,164,0.25)]'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                      aria-pressed={selected}
                    >
                      <span className="block truncate text-sm font-semibold">{label}</span>
                      <span className={`block text-xs ${selected ? 'text-slate-800' : 'text-slate-400'}`}>
                        {formatPoints(playerTotal)} pt
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-400">nobocon calc</p>
                <p className="text-3xl font-bold text-white" aria-live="polite" aria-atomic="true">
                  合計 {formatPoints(total)} pt
                </p>
                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-slate-200">
                    対象: {activePlayerLabel}
                  </span>
                  <span className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-slate-200">
                    参加枠: {classLabels[activePlayer.classType]}
                  </span>
                  {activePlayer.classType !== 'general' ? (
                    <span className="rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-cyan-100">
                      クラス加算: {formatPoints(classBonusPoints)} pt
                    </span>
                  ) : null}
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  このスコアでランクは <span className="text-sm font-semibold text-slate-100">{rankLabel}</span>{' '}
                  です
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  {nextRank
                    ? `次のランク ${nextRank.label} まであと ${formatPoints(nextRank.pointsNeeded)} pt`
                    : '現在のランクが最上位です'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="rounded-full border border-cyan-400/40 bg-cyan-500/10 px-4 py-2 text-sm font-semibold text-cyan-100 transition hover:bg-cyan-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300"
                >
                  集計をコピー
                </button>
                <button
                  type="button"
                  onClick={handleResetActivePlayer}
                  className="rounded-full border border-rose-400/50 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                >
                  この人をリセット
                </button>
              </div>
            </div>

            <div className="overflow-hidden rounded-full bg-slate-800/80">
              <div
                className="h-2 bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-300 transition-[width] duration-500"
                style={{ width: `${rankProgress}%` }}
              />
            </div>
            {copyMessage ? <p className="text-xs text-cyan-100">{copyMessage}</p> : null}
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16 pt-6">
          <section className="grid gap-3 sm:grid-cols-3">
            <article className="card-shell rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">通常課題</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatPoints(gradeTotal)} pt</p>
            </article>
            <article className="card-shell rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">のぼコンボード</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatPoints(boardTotal)} pt</p>
            </article>
            <article className="card-shell rounded-2xl px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">クラス加算</p>
              <p className="mt-2 text-xl font-semibold text-white">{formatPoints(classBonusPoints)} pt</p>
            </article>
          </section>

          <section className="space-y-3">
            {activePlayer.classType !== 'general' ? (
              <p className="text-sm text-slate-400">
                {classLabels[activePlayer.classType]}で完登扱いになるQは上部の参加クラス設定で入力してください。
              </p>
            ) : null}
            <div className="grid gap-4">
              {visibleGradeEntries.map(([key, points], index) => {
                const count = activePlayer.counts[key];
                return (
                  <article
                    key={key}
                    className="card-shell animate-floatIn rounded-2xl px-4 py-4 shadow-glow"
                    style={{ animationDelay: `${index * 40}ms` }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xl font-semibold">{key}</p>
                        <p className="text-sm text-slate-400">{formatPoints(points)} pt</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs uppercase tracking-[0.2em] text-slate-400">完登数</p>
                        <p className="text-2xl font-bold text-white">{count}</p>
                      </div>
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'DECREMENT', key })}
                        disabled={count === 0}
                        className="min-h-[48px] rounded-xl border border-slate-600/50 bg-slate-900/80 text-xl font-semibold transition hover:border-slate-300 hover:text-white disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-950/40 disabled:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide"
                        aria-label={`${key} 完登数を減らす`}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'INCREMENT', key })}
                        className="min-h-[48px] rounded-xl bg-tide text-xl font-semibold text-slate-900 transition hover:brightness-110 disabled:cursor-not-allowed disabled:bg-slate-800 disabled:text-slate-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide"
                        aria-label={`${key} 完登数を増やす`}
                      >
                        +
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-slate-100">のぼコンボード</h2>
              <button
                type="button"
                onClick={() => dispatch({ type: 'TOGGLE_ALL' })}
                className="rounded-full border border-slate-600/60 px-4 py-2 text-sm font-semibold text-slate-100 transition hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun"
              >
                {allBoardsOn ? '全て解除' : '全て選択'}
              </button>
            </div>
            <div className="grid gap-3">
              {boardEntries.map(([key, points], index) => {
                const isOn = activePlayer.boards[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_BOARD', key })}
                    className={`card-shell animate-floatIn flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun ${
                      isOn
                        ? 'border-sun/80 bg-sun/20 text-white shadow-glow'
                        : 'border-slate-700/70 text-slate-200'
                    }`}
                    style={{ animationDelay: `${index * 30}ms` }}
                    aria-pressed={isOn}
                    aria-label={`${key} ボードを${isOn ? 'オフ' : 'オン'}にする`}
                  >
                    <div>
                      <p className="text-base font-semibold">{key}</p>
                      <p className="text-sm text-slate-400">{formatPoints(points)} pt</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
                        {isOn ? 'ON' : 'OFF'}
                      </span>
                      <span
                        className={`flex h-10 w-10 items-center justify-center rounded-full border text-lg font-semibold ${
                          isOn ? 'border-sun bg-sun text-slate-900' : 'border-slate-600 text-slate-400'
                        }`}
                      >
                        {isOn ? '✓' : '·'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="card-shell rounded-2xl px-4 py-4 text-sm text-slate-300">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p>入力は自動保存されます（保持期限 {Math.round(ttlMs / 3600000)} 時間）。</p>
              <button
                type="button"
                onClick={handleResetAll}
                className="rounded-full border border-slate-600/60 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-white hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide"
              >
                すべて初期化
              </button>
            </div>
            {!storageAvailable && storageMessage ? (
              <p className="mt-2 text-xs text-rose-300">{storageMessage}</p>
            ) : null}
          </section>
        </main>

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="関連ページのメニューを開く"
          aria-expanded={menuOpen}
          aria-controls="related-links-dialog"
          className={`fixed bottom-4 left-4 z-30 flex h-12 w-12 items-center justify-center rounded-full border border-tide/50 bg-slate-900/90 text-2xl font-semibold text-tide shadow-[0_10px_30px_rgba(14,165,164,0.25)] transition duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide ${
            menuCompact ? 'scale-90 opacity-90' : 'scale-100'
          } ${menuAttention ? 'menu-attention' : ''}`}
        >
          ≡
        </button>

        <button
          type="button"
          onClick={() => setMenuOpen(false)}
          aria-label="メニューを閉じる"
          className={`fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-sm transition-opacity duration-300 ${
            menuOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
          tabIndex={menuOpen ? 0 : -1}
        />

        <aside
          id="related-links-dialog"
          role="dialog"
          aria-modal="true"
          aria-labelledby="related-links-title"
          className={`fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-l border-slate-800 bg-slate-950/95 px-6 py-6 text-slate-100 shadow-2xl transition-transform duration-300 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-hidden={!menuOpen}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">menu</p>
              <p id="related-links-title" className="text-lg font-semibold text-white">
                関連ページ
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="rounded-full border border-slate-700/70 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-slate-200 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide"
            >
              閉じる
            </button>
          </div>
          <nav className="flex flex-col gap-3">
            {menuLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                target={link.external ? '_blank' : undefined}
                rel={link.external ? 'noopener noreferrer' : undefined}
                onClick={() => setMenuOpen(false)}
                className="rounded-2xl border border-slate-800/70 bg-slate-900/60 px-4 py-3 transition hover:border-tide/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide"
              >
                <p className="text-sm font-semibold text-slate-100">{link.label}</p>
                <p className="mt-1 text-xs text-slate-400">{link.description}</p>
              </a>
            ))}
          </nav>
        </aside>
      </div>
    </div>
  );
};

export default App;
