import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type VocabCard } from '../lib/api';
import { speak, stopSpeak } from '../lib/speech';
import {
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ThumbsUp,
  Layers,
  HelpCircle,
  ArrowRight,
  SlidersHorizontal,
} from 'lucide-react';

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
    for (let j = 1; j <= n; j++)
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return Math.max(0, 1 - d[m][n] / Math.max(m, n));
}

function highlightTermInSentence(sentence: string, term: string) {
  if (!sentence || !term.trim()) return sentence;
  const escaped = term.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(`(${escaped})`, 'gi');
  const parts = sentence.split(regex);
  if (parts.length === 1) return sentence;
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark
        key={i}
        className="rounded-md bg-indigo-100 px-1.5 py-0.5 font-bold text-indigo-700 dark:bg-indigo-950/90 dark:text-indigo-300"
      >
        {part}
      </mark>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

const RATING_CONFIG = [
  null,
  {
    label: 'Again',
    sub: 'Quên hẳn',
    icon: RotateCcw,
    color:
      'border border-rose-200/80 bg-rose-50 text-rose-700 hover:bg-rose-500 hover:text-white hover:border-rose-500 dark:border-rose-900/60 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-600 dark:hover:text-white',
  },
  {
    label: 'Hard',
    sub: 'Hơi khó',
    icon: AlertCircle,
    color:
      'border border-amber-200/80 bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white hover:border-amber-500 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-600 dark:hover:text-white',
  },
  {
    label: 'Good',
    sub: 'Nhớ tốt',
    icon: ThumbsUp,
    color:
      'border border-emerald-200/80 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:hover:bg-emerald-600 dark:hover:text-white',
  },
  {
    label: 'Easy',
    sub: 'Rất dễ',
    icon: Sparkles,
    color:
      'border border-sky-200/80 bg-sky-50 text-sky-700 hover:bg-sky-600 hover:text-white hover:border-sky-600 dark:border-sky-900/60 dark:bg-sky-950/50 dark:text-sky-300 dark:hover:bg-sky-600 dark:hover:text-white',
  },
] as const;

interface Props {
  onSessionComplete?: () => void;
  deck?: 'due' | 'leeches';
  startId?: number | null;
  reloadKey?: number;
}

export default function Review({ onSessionComplete, deck = 'due', startId = null, reloadKey = 0 }: Props) {
  const [mode, setMode] = useState<Mode>('flip');
  const [queueFilter, setQueueFilter] = useState<'due' | 'leeches'>(deck);
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
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem('review:autoSpeak') !== '0');

  const card = queue[index];

  const answerRef = useRef<HTMLInputElement>(null);

  // After checking an answer, drop focus out of the textbox so 1-4 / Enter / R
  // go to the global shortcuts instead of typing into the field.
  const doCheck = () => {
    if (!answer.trim() || clozeChecked) return;
    setClozeChecked(true);
    answerRef.current?.blur();
    (document.activeElement as HTMLElement | null)?.blur?.();
  };

  // Focus the answer box whenever a fresh cloze card appears.
  useEffect(() => {
    if (mode === 'cloze' && !clozeChecked && !loading && !done && card) {
      answerRef.current?.focus();
    }
  }, [mode, clozeChecked, loading, done, card, index, queue]);

  const load = useCallback(async (cat: string, filter: 'due' | 'leeches', focusId?: number | null) => {
    setLoading(true);
    setRateError('');
    try {
      const endpoint = filter === 'leeches' ? '/srs/leeches' : '/srs/due';
      const params = cat ? { params: { category: cat, take: 50 } } : { params: { take: 50 } };
      const r = await api.get<VocabCard[]>(endpoint, params);
      let list = r.data;
      // Shuffle so cards don't appear in insertion order (belt & braces:
      // the API already shuffles, this guards cached/proxied responses too).
      for (let i = list.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [list[i], list[j]] = [list[j], list[i]];
      }
      // Start at the clicked word so review begins exactly where the user tapped.
      if (focusId) {
        const i = list.findIndex((c) => c.id === focusId);
        if (i > 0) list = [...list.slice(i), ...list.slice(0, i)];
      }
      setQueue(list);
      setIndex(0);
      setFlipped(false);
      setAnswer('');
      setClozeChecked(false);
      setDone(list.length === 0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get<string[]>('/cards/categories').then((r) => setCategories(r.data)).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reload whenever the parent requests a deck (e.g. clicking a leech on Dashboard).
  useEffect(() => {
    setQueueFilter(deck);
    void load(category, deck, startId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, startId, reloadKey]);

  const playAudio = (text: string) => {
    setIsSpeaking(true);
    speak(text);
    setTimeout(() => setIsSpeaking(false), 1200);
  };

  const toggleAutoSpeak = () => {
    setAutoSpeak((v) => {
      const next = !v;
      localStorage.setItem('review:autoSpeak', next ? '1' : '0');
      if (!next) stopSpeak();
      return next;
    });
  };

  // Auto-read the new card aloud when enabled: flip mode reads the term on arrival,
  // cloze mode reads it after the user checks (so the answer isn't spoiled upfront).
  useEffect(() => {
    if (!autoSpeak || loading || done || !card || mode !== 'flip') return;
    playAudio(card.term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, loading, done, card?.id, index, mode]);

  useEffect(() => {
    if (!autoSpeak || mode !== 'cloze' || !clozeChecked || !card) return;
    playAudio(card.term);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSpeak, mode, clozeChecked, card?.id]);

  // Stop any ongoing speech when leaving the review screen.
  useEffect(() => () => stopSpeak(), []);

  const rate = useCallback(
    async (q: 1 | 2 | 3 | 4) => {
      if (!card) return;
      if (mode === 'flip' && !flipped) {
        setFlipped(true);
        return;
      }
      if (mode === 'cloze' && !clozeChecked) return;

      setRateError('');
      try {
        await api.post(`/srs/${card.id}/review`, { quality: q });
        onSessionComplete?.();
      } catch {
        setRateError('Không lưu được điểm ôn — vui lòng thử lại.');
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
    [card, flipped, clozeChecked, index, queue.length, mode, onSessionComplete],
  );

  const speakFor = useCallback(
    (c: VocabCard, isBack: boolean) => {
      if (mode === 'flip') playAudio(isBack ? c.exampleSentence || c.term : c.term);
      else playAudio(c.exampleSentence || c.term);
    },
    [mode],
  );

  const clozeAcc = card ? accuracy(answer, card.term) : 0;
  const suggested = clozeAcc < 0.6 ? 1 : clozeAcc < 0.8 ? 2 : clozeAcc < 0.95 ? 3 : 4;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (mode === 'flip') setFlipped((f) => !f);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (mode === 'flip') {
          if (!flipped) setFlipped(true);
          else void rate(3); // Enter default Good
        } else if (mode === 'cloze' && clozeChecked) {
          void rate(suggested); // Enter applies the suggested rating
        }
      } else if (e.key >= '1' && e.key <= '4') {
        void rate(Number(e.key) as 1 | 2 | 3 | 4);
      } else if (e.key === 'r' || e.key === 'R') {
        if (card) speakFor(card, mode === 'flip' ? flipped : true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rate, card, mode, flipped, clozeChecked, suggested, speakFor]);

  const highlightedCloze = (c: VocabCard) => {
    const parts = c.clozeSentence.split(/(_+)/);
    return (
      <>
        {parts.map((p, i) =>
          /^_+$/.test(p) ? (
            <span
              key={i}
              className="mx-1 inline-block rounded-lg bg-indigo-100 px-2.5 py-0.5 font-mono font-bold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 ring-2 ring-indigo-400/40"
            >
              {clozeChecked ? c.term : '______'}
            </span>
          ) : (
            <span key={i}>{p}</span>
          ),
        )}
      </>
    );
  };

  const progress = queue.length > 0 ? Math.round(((index + 1) / queue.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl landscape-sm:max-w-4xl space-y-3.5 sm:space-y-4 landscape-sm:space-y-2">
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        {/* Mode Segmented Switch */}
        <div className="flex rounded-2xl bg-slate-200/80 p-1 dark:bg-slate-800/80 shadow-inner">
          <button
            onClick={() => {
              setMode('flip');
              setFlipped(false);
              setAnswer('');
              setClozeChecked(false);
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              mode === 'flip'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-[#111827] dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Lật thẻ (Flip)
          </button>
          <button
            onClick={() => {
              setMode('cloze');
              setFlipped(false);
              setAnswer('');
              setClozeChecked(false);
            }}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              mode === 'cloze'
                ? 'bg-white text-indigo-600 shadow-sm dark:bg-[#111827] dark:text-indigo-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            Điền từ (Cloze)
          </button>
        </div>

        {/* Category & Reload */}
        <div className="flex items-center gap-1.5 ml-auto">
          <div className="flex rounded-xl bg-slate-200/80 p-0.5 dark:bg-slate-800/80 shadow-inner">
            <button
              onClick={() => {
                setQueueFilter('due');
                void load(category, 'due');
              }}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                queueFilter === 'due'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-[#111827] dark:text-indigo-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Đến hạn
            </button>
            <button
              onClick={() => {
                setQueueFilter('leeches');
                void load(category, 'leeches');
              }}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-bold transition-all ${
                queueFilter === 'leeches'
                  ? 'bg-white text-rose-600 shadow-sm dark:bg-[#111827] dark:text-rose-400'
                  : 'text-slate-600 dark:text-slate-400'
              }`}
            >
              Từ hay sai
            </button>
          </div>
          <div className="relative">
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                void load(e.target.value, queueFilter);
              }}
              className="appearance-none rounded-xl border border-slate-200/80 bg-white py-1.5 pl-3 pr-8 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-[#111827]"
            >
              <option value="">Tất cả chủ đề</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <SlidersHorizontal size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          </div>

          <button
            onClick={() => load(category, queueFilter)}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300"
            title="Tải lại danh sách thẻ"
          >
            <RotateCcw size={14} />
          </button>

          <button
            onClick={toggleAutoSpeak}
            title={autoSpeak ? 'Tắt tự động đọc thẻ mới' : 'Bật tự động đọc mỗi thẻ mới'}
            className={`flex h-8 items-center gap-1.5 rounded-xl border px-2.5 text-[11px] font-bold shadow-sm transition active:scale-95 ${
              autoSpeak
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-600/25'
                : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300'
            }`}
          >
            {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">{autoSpeak ? 'Tự đọc: Bật' : 'Tự đọc: Tắt'}</span>
          </button>
        </div>
      </div>

      {/* Priority Mistake Banner */}
      {!loading && !done && card && card.mistakeCount > 0 && (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-rose-200/80 bg-rose-50/80 px-3.5 py-2 text-xs font-semibold text-rose-800 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-200">
          <span>
            🔥 Từ hay sai được trộn dày hơn trong phiên này (<b>{queue.length} thẻ</b>)
          </span>
          <span className="shrink-0 rounded-md bg-rose-100 px-2 py-0.5 font-mono text-[11px] font-bold text-rose-700 dark:bg-rose-900/60 dark:text-rose-300">
            ×{card.mistakeCount} lỗi
          </span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="flex min-h-[360px] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-8 text-center shadow-sm dark:border-slate-800/80 dark:bg-[#111827] animate-pulse">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <div className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-400">Đang chuẩn bị thẻ ôn tập…</div>
        </div>
      )}

      {/* Session Completed State */}
      {!loading && done && (
        <div className="rounded-3xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-teal-50 to-white p-8 text-center shadow-sm dark:border-emerald-900/60 dark:from-emerald-950/40 dark:via-[#111827] dark:to-[#111827]">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-3xl shadow-inner dark:bg-emerald-900/60">
            🎉
          </div>
          <h2 className="mt-4 text-xl font-black text-emerald-800 dark:text-emerald-200">
            Hoàn thành xuất sắc phiên ôn tập!
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs sm:text-sm text-emerald-700/90 dark:text-emerald-300/90">
            {queueFilter === 'leeches'
              ? 'Bạn đã ôn xong toàn bộ từ hay sai. Bấm nút dưới để ôn lại một vòng nữa cho chắc!'
              : 'Bạn đã ôn tập xong toàn bộ thẻ đến hạn hôm nay. Hãy quay lại vào ngày mai nhé!'}
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={() => load(category, queueFilter)}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-95"
            >
              <RotateCcw size={14} /> {queueFilter === 'leeches' ? 'Ôn lại vòng nữa' : 'Kiểm tra thẻ mới'}
            </button>
          </div>
        </div>
      )}

      {/* Active Card Studying */}
      {!loading && !done && card && (
        <>
          {/* Progress Header */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Layers size={14} className="text-indigo-600 dark:text-indigo-400" />
                Thẻ {index + 1} / {queue.length}
              </span>
              <span className="hidden sm:inline-block font-normal text-[11px] text-slate-400">
                Space lật · 1-4 chấm điểm · R nghe
              </span>
              <span className="font-extrabold text-indigo-600 dark:text-indigo-400">{progress}%</span>
            </div>
            {/* Visual Progress Bar */}
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-violet-500 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Flashcard Component */}
          {mode === 'flip' ? (
            <div className="perspective-1000 select-none">
              <div
                onClick={() => setFlipped((f) => !f)}
                className={`preserve-3d relative min-h-[350px] sm:min-h-[380px] landscape-sm:min-h-[185px] cursor-pointer rounded-3xl border border-slate-200/80 bg-white p-6 landscape-sm:p-4 shadow-md transition-all duration-500 hover:shadow-lg dark:border-slate-800/80 dark:bg-[#111827] ${
                  flipped ? 'rotate-y-180' : ''
                }`}
              >
                {/* Front Side */}
                <div className="backface-hidden flex min-h-[300px] sm:min-h-[330px] landscape-sm:min-h-[150px] flex-col items-center justify-between text-center">
                  <div className="flex w-full items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                        {card.category}
                      </span>
                      {card.partOfSpeech && (
                        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold italic text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {card.partOfSpeech}
                        </span>
                      )}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {card.status}
                    </span>
                  </div>

                  <div className="my-auto py-4 landscape-sm:py-1 space-y-2.5 landscape-sm:space-y-1">
                    <div className="text-3xl sm:text-4xl landscape-sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
                      {card.term}
                    </div>
                    {card.phonetic && (
                      <div className="font-mono text-sm landscape-sm:text-xs text-indigo-600 dark:text-indigo-400">
                        {card.phonetic}
                      </div>
                    )}
                    <div className="text-lg sm:text-xl landscape-sm:text-base font-medium text-slate-700 dark:text-slate-200 pt-1 landscape-sm:pt-0">
                      {card.meaningVi}
                    </div>

                    <div className="pt-2 landscape-sm:pt-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(card.term);
                        }}
                        className={`inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-2 landscape-sm:px-3 landscape-sm:py-1 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 active:scale-95 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200 ${
                          isSpeaking ? 'ring-2 ring-indigo-500' : ''
                        }`}
                      >
                        <Volume2 size={16} className={isSpeaking ? 'animate-bounce text-indigo-600' : ''} />
                        <span>Nghe từ</span>
                        <kbd className="em-kbd ml-0.5">R</kbd>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs landscape-sm:hidden font-medium text-slate-400">
                    <HelpCircle size={14} />
                    <span>Chạm vào thẻ hoặc nhấn Space để xem ví dụ</span>
                  </div>
                </div>

                {/* Back Side */}
                <div className="backface-hidden rotate-y-180 absolute inset-0 flex flex-col justify-between rounded-3xl bg-white p-6 landscape-sm:p-4 shadow-md dark:bg-[#111827] overflow-y-auto">
                  <div className="flex w-full items-center justify-between">
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
                      Đáp án & Ví dụ ngữ cảnh
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {card.category}
                    </span>
                  </div>

                  <div className="my-auto py-4 landscape-sm:py-1 space-y-3.5 landscape-sm:space-y-1.5 text-center">
                    <div className="text-xl landscape-sm:text-lg font-extrabold text-slate-900 dark:text-white">
                      {card.term}
                      {card.phonetic && (
                        <span className="ml-2 font-mono text-xs font-normal text-indigo-600 dark:text-indigo-400">
                          {card.phonetic}
                        </span>
                      )}
                    </div>

                    {card.definitionEn && (
                      <div className="rounded-2xl border border-slate-100 bg-slate-50/90 p-3.5 landscape-sm:p-2 text-xs sm:text-sm landscape-sm:text-xs italic text-slate-600 dark:border-slate-800/80 dark:bg-slate-800/40 dark:text-slate-300 leading-relaxed">
                        &ldquo;{card.definitionEn}&rdquo;
                      </div>
                    )}

                    <div className="text-sm sm:text-base landscape-sm:text-sm font-medium text-slate-800 dark:text-slate-100 leading-relaxed px-2">
                      {highlightTermInSentence(card.exampleSentence, card.term)}
                    </div>

                    <div className="pt-1 landscape-sm:pt-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          playAudio(card.exampleSentence || card.term);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100/80 px-4 py-2 landscape-sm:px-3 landscape-sm:py-1 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-emerald-50 hover:text-emerald-600 hover:border-emerald-200 active:scale-95 dark:border-slate-800 dark:bg-slate-800/80 dark:text-slate-200"
                      >
                        <Volume2 size={16} />
                        <span>Nghe cả câu</span>
                        <kbd className="em-kbd ml-0.5">R</kbd>
                      </button>
                    </div>
                  </div>

                  <div className="text-center text-[11px] font-medium text-slate-400 landscape-sm:hidden">
                    Chạm để lật lại · Chọn mức độ nhớ bên dưới
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Cloze Mode */
            <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-md dark:border-slate-800/80 dark:bg-[#111827]">
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                  {card.category}
                </span>
                <button
                  onClick={() => playAudio(card.exampleSentence || card.term)}
                  className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                >
                  <Volume2 size={16} />
                </button>
              </div>

              <div className="mt-3">
                <div className="text-lg sm:text-xl font-bold text-slate-800 dark:text-slate-100">
                  {card.meaningVi}
                </div>
              </div>

              <div className="mt-4 rounded-2xl bg-slate-50 p-4 dark:bg-slate-800/40">
                <div className="text-base sm:text-lg leading-relaxed text-slate-900 dark:text-white">
                  {highlightedCloze(card)}
                </div>
                {card.clozeHint && (
                  <div className="mt-2.5 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-400 font-medium">
                    <Sparkles size={13} />
                    <span>Gợi ý: {card.clozeHint}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 space-y-2">
                <input
                  ref={answerRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !clozeChecked && answer.trim()) doCheck();
                  }}
                  placeholder="Gõ từ còn thiếu vào đây…"
                  className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-base shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                />

                {!clozeChecked ? (
                  <button
                    onClick={doCheck}
                    disabled={!answer.trim()}
                    className="w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 disabled:opacity-40"
                  >
                    Kiểm tra đáp án (Enter)
                  </button>
                ) : (
                  <div
                    className={`rounded-2xl p-4 text-sm ${
                      clozeAcc >= 0.95
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-900 dark:bg-emerald-950/60 dark:border-emerald-900/60 dark:text-emerald-200'
                        : 'bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/60 dark:border-amber-900/60 dark:text-amber-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 font-bold text-base">
                      {clozeAcc >= 0.95 ? (
                        <>
                          <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                          <span>Chính xác tuyệt đối!</span>
                        </>
                      ) : (
                        <>
                          <AlertCircle size={18} className="text-amber-600 dark:text-amber-400" />
                          <span>Chưa hoàn toàn chuẩn xác</span>
                        </>
                      )}
                    </div>
                    <div className="mt-2 text-xs sm:text-sm">
                      Bạn gõ: <span className="font-bold underline">{answer}</span> ({Math.round(clozeAcc * 100)}% giống)
                      <br />
                      Đáp án đúng: <span className="font-bold text-indigo-600 dark:text-indigo-400">{card.term}</span>
                    </div>
                    <div className="mt-2 text-xs font-semibold">
                      Gợi ý: <span className="font-extrabold">{RATING_CONFIG[suggested]?.label}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Rating Error Alert */}
          {rateError && (
            <div className="rounded-2xl bg-red-100 p-3 text-center text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
              {rateError}
            </div>
          )}

          {/* Thumb Rating Section (Mobile & Desktop) */}
          {mode === 'flip' && !flipped ? (
            /* Tap to reveal CTA for easy one-hand thumb use on phone */
            <button
              onClick={() => setFlipped(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 landscape-sm:py-2 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-700 active:scale-98"
            >
              <span>Lật xem đáp án (Space)</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            /* 4 Rating Buttons */
            <div className="grid grid-cols-4 gap-2 sm:gap-2.5">
              {([1, 2, 3, 4] as const).map((q) => {
                const cfg = RATING_CONFIG[q];
                const isSuggested = mode === 'cloze' && clozeChecked && q === suggested;
                return (
                  <button
                    key={q}
                    onClick={() => rate(q)}
                    className={`group relative flex flex-col items-center justify-center rounded-2xl py-3 landscape-sm:py-1.5 px-1.5 font-bold shadow-sm transition-all active:scale-95 ${
                      cfg.color
                    } ${isSuggested ? 'ring-2 ring-offset-2 ring-indigo-500 dark:ring-offset-[#0b0f19]' : ''}`}
                  >
                    <span className="em-kbd absolute right-1.5 top-1.5 hidden sm:inline-flex opacity-70">{q}</span>
                    <cfg.icon size={18} className="mb-1 landscape-sm:hidden transition-transform group-hover:scale-110" />
                    <span className="text-xs sm:text-sm">{cfg.label}</span>
                    <span className="text-[10px] font-medium opacity-80 hidden sm:inline-block landscape-sm:hidden">{cfg.sub}</span>
                  </button>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
