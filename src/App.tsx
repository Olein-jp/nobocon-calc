import { useEffect, useMemo, useReducer, useState } from 'react';
import { boardEntries, formatPoints, getRankLabel, gradeEntries } from './lib/score';
import { checkStorage, clearState, loadState, saveState, ttlMs } from './lib/storage';
import { initialState, reducer } from './state/reducer';

const SAVE_DEBOUNCE_MS = 300;
const MENU_ATTENTION_DELAY_MS = 2000;
const MENU_ATTENTION_DURATION_MS = 1100;
const MENU_SCROLL_THRESHOLD = 24;
const menuLinks = [
  { label: 'のぼコン トップページ', href: 'https://nobocon.com/', description: '公式サイト' },
  { label: '東北シリーズ', href: 'https://nobocon.com/?cat=31', description: 'シリーズ一覧' },
  { label: '北関東シリーズ', href: 'https://nobocon.com/?cat=33', description: 'シリーズ一覧' },
  { label: '東京シリーズ', href: 'https://nobocon.com/?cat=34', description: 'シリーズ一覧' },
  { label: '東海シリーズ', href: 'https://nobocon.com/?cat=37', description: 'シリーズ一覧' },
  { label: '関西シリーズ', href: 'https://nobocon.com/?cat=35', description: 'シリーズ一覧' },
  { label: '中国シリーズ', href: 'https://nobocon.com/?cat=47', description: 'シリーズ一覧' },
  { label: '九州北部北部シリーズ', href: 'https://nobocon.com/?cat=32', description: 'シリーズ一覧' },
  { label: '四国シリーズ', href: 'https://nobocon.com/?cat=50', description: 'シリーズ一覧' }
];

const App = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [storageMessage, setStorageMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuAttention, setMenuAttention] = useState(false);
  const [menuCompact, setMenuCompact] = useState(false);

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

  useEffect(() => {
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
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

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

        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          aria-label="関連ページのメニューを開く"
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
        />

        <aside
          className={`fixed right-0 top-0 z-50 flex h-full w-72 max-w-[85vw] flex-col gap-6 overflow-y-auto border-l border-slate-800 bg-slate-950/95 px-6 py-6 text-slate-100 shadow-2xl transition-transform duration-300 ${
            menuOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
          aria-hidden={!menuOpen}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-500">menu</p>
              <p className="text-lg font-semibold text-white">関連ページ</p>
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
                target="_blank"
                rel="noopener noreferrer"
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
