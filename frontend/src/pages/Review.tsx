import { useCallback, useEffect, useState } from 'react';
import { api, type VocabCard } from '../lib/api';
import { speak } from '../lib/speech';
import { Volume2, RotateCcw, Keyboard } from 'lucide-react';

type Mode = 'flip' | 'cloze';

function accuracy(a: string, b: string): number {
  a = a.trim().toLowerCase();
  b = b.trim().toLowerCase();
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = a.length;
  const n = b.length;
  const d: number[][] = Array.from({ length: m + 1 }, (_, i) => [i, ...Array(n).fill(0)]);
  for (let j = 0; j <= n; j++) d[0][j] = j;
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[m][n] / Math.max(m, n);
}

const RATING_LABEL = ['', 'Again', 'Hard', 'Good', 'Easy'];
const RATING_STYLE = ['', 'bg-red-600 hover:bg-red-700', 'bg-amber-600 hover:bg-amber-700', 'bg-emerald-600 hover:bg-emerald-700', 'bg-sky-600 hover:bg-sky-700'];

export default function Review() {
  const [mode, setMode] = useState<Mode>('flip');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [queue, setQueue] = useState<VocabCard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [answer, setAnswer] = useState('');
  const [clozeChecked, setClozeChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [rateError, setRateError] = useState('');

  const card = queue[index];

  const load = useCallback(async (cat: string) => {
    setLoading(true);
    setRateError('');
    try {
      const params = cat ? { params: { category: cat, take: 50 } } : { params: { take: 50 } };
      const r = await api.get<VocabCard[]>('/srs/due', params);
      setQueue(r.data);
      setIndex(0);
      setFlipped(false);
      setAnswer('');
      setClozeChecked(false);
      setDone(r.data.length === 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get<string[]>('/cards/categories').then((r) => setCategories(r.data)).catch(() => undefined);
    load('');
  }, [load]);

  const rate = useCallback(
    async (q: 1 | 2 | 3 | 4) => {
      if (!card || (mode === 'flip' && !flipped)) return;
      if (mode === 'cloze' && !clozeChecked) return;
      setRateError('');
      try {
        await api.post(`/srs/${card.id}/review`, { quality: q });
      } catch {
        setRateError('Không lưu được điểm — kiểm tra mạng/server rồi thử lại.');
        return;
      }
      if (index + 1 >= queue.length) {
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setFlipped(false);
        setAnswer('');
        setClozeChecked(false);
      }
    },
    [card, flipped, clozeChecked, index, queue.length, mode],
  );

  const speakFor = useCallback(
    (c: VocabCard, isBack: boolean) => {
      if (mode === 'flip') speak(isBack ? c.exampleSentence || c.term : c.term);
      else speak(c.exampleSentence || c.term);
    },
    [mode],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (mode === 'flip') setFlipped((f) => !f);
      } else if (e.key === 'Enter' && mode === 'flip' && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key >= '1' && e.key <= '4') {
        void rate(Number(e.key) as 1 | 2 | 3 | 4);
      } else if (e.key === 'r' || e.key === 'R') {
        if (card) speakFor(card, mode === 'flip' ? flipped : true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rate, card, mode, flipped, speakFor]);

  const clozeAcc = card ? accuracy(answer, card.term) : 0;
  const suggested = clozeAcc < 0.6 ? 1 : clozeAcc < 0.8 ? 2 : clozeAcc < 0.95 ? 3 : 4;

  const highlightedCloze = (c: VocabCard) => {
    const parts = c.clozeSentence.split(/(_+)/);
    return (
      <>
        {parts.map((p, i) =>
          /^_+$/.test(p) ? (
            <span key={i} className="rounded bg-indigo-200 px-2 font-mono font-bold text-indigo-900 dark:bg-indigo-900 dark:text-indigo-100">
              {clozeChecked ? c.term : p}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </>
    );
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-lg bg-white p-1 shadow-sm dark:bg-slate-900">
          {(['flip', 'cloze'] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setMode(m);
                setFlipped(false);
                setAnswer('');
                setClozeChecked(false);
              }}
              className={`rounded-md px-4 py-1.5 text-sm font-semibold ${mode === m ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}
            >
              {m === 'flip' ? 'Flip Card' : 'Cloze Recall'}
            </button>
          ))}
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            void load(e.target.value);
          }}
          className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={() => load(category)} className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900" title="Reload due cards">
          <RotateCcw size={15} /> Reload
        </button>
      </div>

      {loading && <div className="p-8 text-center text-slate-500">Loading due cards…</div>}

      {!loading && done && (
        <div className="rounded-xl bg-emerald-100 p-10 text-center dark:bg-emerald-950">
          <div className="text-3xl">🎉</div>
          <h2 className="mt-2 text-xl font-bold text-emerald-800 dark:text-emerald-200">Session complete!</h2>
          <p className="text-sm text-emerald-700 dark:text-emerald-300">No more due cards. Come back tomorrow — SM-2 schedules the rest.</p>
          <button onClick={() => load(category)} className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
            Check again
          </button>
        </div>
      )}

      {!loading && !done && card && (
        <>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Card {index + 1} / {queue.length}</span>
            <span className="flex items-center gap-1"><Keyboard size={14} /> Space flip · 1-4 rate · R audio</span>
          </div>

          {mode === 'flip' ? (
            <div className="perspective-1000">
              <div
                onClick={() => setFlipped((f) => !f)}
                className={`preserve-3d relative min-h-72 cursor-pointer rounded-2xl bg-white shadow-md transition-transform duration-500 dark:bg-slate-900 ${flipped ? 'rotate-y-180' : ''}`}
              >
                <div className="backface-hidden flex min-h-72 flex-col items-center justify-center gap-2 p-8 text-center">
                  <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                    {card.category} · {card.status}
                  </span>
                  <div className="text-4xl font-bold">{card.term}</div>
                  <div className="text-slate-500">{card.phonetic}</div>
                  <div className="mt-1 text-lg text-slate-600 dark:text-slate-300">{card.meaningVi}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(card.term);
                    }}
                    className="mt-2 flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-sm dark:bg-slate-700"
                  >
                    <Volume2 size={15} /> Nghe từ (R)
                  </button>
                  <div className="mt-4 text-xs text-slate-400">Click or press Space to reveal</div>
                </div>
                <div className="backface-hidden rotate-y-180 absolute inset-0 flex min-h-72 flex-col items-center justify-center gap-2 rounded-2xl bg-white p-8 text-center shadow-md dark:bg-slate-900">
                  <div className="text-sm italic text-slate-600 dark:text-slate-300">“{card.definitionEn}”</div>
                  <div className="text-base">📌 {card.exampleSentence}</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      speak(card.exampleSentence || card.term);
                    }}
                    className="mt-1 flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-1.5 text-sm dark:bg-slate-700"
                  >
                    <Volume2 size={15} /> Listen (R)
                  </button>
                  <div className="mt-1 text-xs text-slate-400">EF {card.easeFactor} · ×{card.intervalDays}d · rep {card.repetition} · ❌{card.mistakeCount}</div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-slate-900">
              <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                {card.category}
              </span>
              <div className="mt-3 text-xl">{card.meaningVi}</div>
              <div className="mt-2 text-lg leading-relaxed">{highlightedCloze(card)}</div>
              {card.clozeHint && <div className="mt-2 text-sm text-slate-500">💡 Hint: {card.clozeHint}</div>}
              <div className="mt-4 flex gap-2">
                <input
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !clozeChecked) setClozeChecked(true);
                  }}
                  placeholder="Type the missing word…"
                  className="flex-1 rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
                />
                <button
                  onClick={() => speak(card.exampleSentence || card.term)}
                  className="rounded-lg bg-slate-200 px-3 dark:bg-slate-700"
                  title="Listen"
                >
                  <Volume2 size={17} />
                </button>
              </div>
              {!clozeChecked ? (
                <button
                  onClick={() => setClozeChecked(true)}
                  disabled={!answer.trim()}
                  className="mt-3 w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white disabled:opacity-40"
                >
                  Check (Enter)
                </button>
              ) : (
                <div className={`mt-3 rounded-lg p-3 text-sm ${clozeAcc === 1 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200' : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200'}`}>
                  {clozeAcc === 1 ? (
                    <>✅ Exact match!</>
                  ) : (
                    <>
                      Your answer: <b>{answer}</b> ({Math.round(clozeAcc * 100)}% similar) — correct: <b>{card.term}</b>
                    </>
                  )}
                  <div className="mt-1">Suggested rating: <b>{RATING_LABEL[suggested]}</b> ({suggested})</div>
                </div>
              )}
            </div>
          )}

          {rateError && (
            <div className="rounded-lg bg-red-100 p-3 text-center text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
              {rateError}
            </div>
          )}
          <div className="grid grid-cols-4 gap-2">
            {([1, 2, 3, 4] as const).map((q) => {
              const enabled = mode === 'flip' ? flipped : clozeChecked;
              return (
                <button
                  key={q}
                  onClick={() => rate(q)}
                  disabled={!enabled}
                  className={`rounded-xl py-3 text-sm font-bold text-white disabled:opacity-30 ${RATING_STYLE[q]} ${mode === 'cloze' && clozeChecked && q === suggested ? 'ring-4 ring-offset-2 ring-indigo-400' : ''}`}
                >
                  {q} · {RATING_LABEL[q]}
                </button>
              );
            })}
          </div>
          {!flipped && mode === 'flip' && <p className="text-center text-xs text-slate-400">Reveal the card before rating.</p>}
        </>
      )}
    </div>
  );
}
