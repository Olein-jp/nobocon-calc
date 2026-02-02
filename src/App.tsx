import { useEffect, useMemo, useReducer, useState } from 'react';
import { boardEntries, formatPoints, getRankLabel, gradeEntries } from './lib/score';
import { checkStorage, clearState, loadState, saveState, ttlMs } from './lib/storage';
import { initialState, reducer } from './state/reducer';

const SAVE_DEBOUNCE_MS = 300;

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageMessage, setStorageMessage] = useState('');

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
      saveState(state);
    }, SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [state, storageAvailable]);

  const total = useMemo(() => {
    const gradeTotal = gradeEntries.reduce(
      (sum, [key, points]) => sum + state.counts[key] * points,
      0
    );
    const boardTotal = boardEntries.reduce(
      (sum, [key, points]) => sum + (state.boards[key] ? points : 0),
      0
    );
    return gradeTotal + boardTotal;
  }, [state]);
  const rankLabel = useMemo(() => getRankLabel(total), [total]);

  const allBoardsOn = Object.values(state.boards).every(Boolean);

  const handleReset = () => {
    dispatch({ type: 'RESET' });
    if (storageAvailable) {
      clearState();
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="pattern-grid">
        <header className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur border-b border-slate-800">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 py-4">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-slate-400">nobocon calc</p>
              <p className="text-3xl font-bold text-white">合計 {formatPoints(total)} pt</p>
              <p className="mt-1 text-xs text-slate-400">
                このスコアでランクは{' '}
                <span className="text-sm font-semibold text-slate-100">{rankLabel}</span> になります
              </p>
            </div>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-rose-400/50 bg-rose-500/10 px-4 py-2 text-sm font-semibold text-rose-100 transition hover:bg-rose-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
            >
              リセット
            </button>
          </div>
        </header>

        <main className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-4 pb-16 pt-6">
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-slate-100">級・段カウンター</h2>
              <span className="text-xs text-slate-400">完登数 × 点数</span>
            </div>
            <div className="grid gap-4">
              {gradeEntries.map(([key, points], index) => {
                const count = state.counts[key];
                return (
                  <article
                    key={key}
                    className="card-shell rounded-2xl px-4 py-4 shadow-glow animate-floatIn"
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
                        className="min-h-[48px] rounded-xl border border-slate-600/50 bg-slate-900/80 text-xl font-semibold transition hover:border-slate-300 hover:text-white disabled:cursor-not-allowed disabled:border-slate-700 disabled:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide"
                        aria-label={`${key} 完登数を減らす`}
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => dispatch({ type: 'INCREMENT', key })}
                        className="min-h-[48px] rounded-xl bg-tide text-xl font-semibold text-slate-900 transition hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tide"
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
                const isOn = state.boards[key];
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => dispatch({ type: 'TOGGLE_BOARD', key })}
                    className={`card-shell flex w-full items-center justify-between rounded-2xl px-4 py-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sun ${
                      isOn
                        ? 'border-sun/80 bg-sun/20 text-white shadow-glow'
                        : 'border-slate-700/70 text-slate-200'
                    } animate-floatIn`}
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
                onClick={handleReset}
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
      </div>
    </div>
  );
};

export default App;
