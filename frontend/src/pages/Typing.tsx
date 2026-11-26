import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type VocabCard } from '../lib/api';
import { speak, stopSpeak } from '../lib/speech';
import { Volume2, VolumeX, ArrowRight, Keyboard, Trophy, CheckCircle2, XCircle, Lightbulb, RotateCcw } from 'lucide-react';

interface TypingResult {
  passed: boolean;
  similarity: number;
  correctTerm: string;
  meaningVi: string;
  streak: number;
  requiredStreak: number;
  mastered: boolean;
  countedToday: boolean;
  nextIntervalDays?: number;
  mistakeCount?: number;
  /** Đúng nghĩa nhưng khác cụm mục tiêu (khớp một cách diễn đạt tương đương). */
  nearMiss?: boolean;
  matchedAlternative?: string | null;
  /** Còn lượt hỏi lại hôm nay không (ngân sách theo cấp: 3/2/1 lượt). */
  retryAllowed?: boolean;
  remainingRetries?: number;
  /** Lượt đúng này đến sau khi đã gõ sai/near-miss trong ngày. */
  retried?: boolean;
}

interface Props {
  onWordMastered?: () => void;
}

type TypingMode = 'all' | 'mistakes';

/** Số thẻ khác phải đi qua trước khi từ gõ sai được hỏi lại. */
const REQUEUE_GAP = 3;

interface DelayedCard {
  id: number;
  /** Số thẻ nữa thì được hỏi lại (0 = tới lượt). */
  remaining: number;
}

/** Ngân sách lượt/ngày theo cấp phản xạ — khớp với backend. */
const maxAttemptsForLevel = (level: number) => (level <= 1 ? 3 : level === 2 ? 2 : 1);

export default function Typing({ onWordMastered }: Props) {
  const [category, setCategory] = useState('');
  const [mode, setMode] = useState<TypingMode>('all');
  const [categories, setCategories] = useState<string[]>([]);
  const [card, setCard] = useState<VocabCard | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<TypingResult | null>(null);
  const [empty, setEmpty] = useState('');
  const [loading, setLoading] = useState(false);
  const [mistakesCount, setMistakesCount] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [autoSpeak, setAutoSpeak] = useState(() => localStorage.getItem('typing:autoSpeak') !== '0');
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Hàng chờ trong phiên: từ gõ sai chưa được hỏi lại ngay (tránh chép đáp án trên màn hình).
  const delayedRef = useRef<DelayedCard[]>([]);

  useEffect(() => () => stopSpeak(), []);

  const toggleAutoSpeak = () => {
    setAutoSpeak((v) => {
      const next = !v;
      localStorage.setItem('typing:autoSpeak', next ? '1' : '0');
      if (!next) stopSpeak();
      return next;
    });
  };

  // Đổi chủ đề / chế độ thì bỏ hàng chờ để không hỏi lại thẻ ngoài bộ lọc.
  const clearDelayed = () => {
    delayedRef.current = [];
    setPendingCount(0);
  };

  // Auto focus: đang gõ thì vào ô nhập, có kết quả thì vào "Từ tiếp theo".
  useEffect(() => {
    if (!result) inputRef.current?.focus();
    else nextBtnRef.current?.focus();
  }, [result]);

  const loadMistakesCount = useCallback(async (cat: string) => {
    try {
      const params = cat ? { params: { category: cat } } : undefined;
      const r = await api.get<{ count: number }>('/typing/mistakes/count', params);
      setMistakesCount(r.data.count);
    } catch {
      setMistakesCount(0);
    }
  }, []);

  const loadNext = useCallback(async (cat: string, m: TypingMode) => {
    setLoading(true);
    setEmpty('');
    try {
      const delayed = delayedRef.current;

      // 1) Tới lượt một từ đã gõ sai từ vài thẻ trước → hỏi lại đúng thẻ đó.
      const readyIndex = delayed.findIndex((d) => d.remaining <= 0);
      if (readyIndex >= 0) {
        const [due] = delayed.splice(readyIndex, 1);
        setPendingCount(delayed.length);
        const r = await api.get<VocabCard>(`/cards/${due.id}`);
        setCard(r.data);
        setInput('');
        setResult(null);
        return;
      }

      // 2) Chưa tới lượt → đi qua một thẻ khác và giảm thời gian chờ.
      delayed.forEach((d) => {
        if (d.remaining > 0) d.remaining -= 1;
      });

      const params: Record<string, string> = {};
      if (cat) params.category = cat;
      if (m === 'mistakes') params.mode = 'mistakes';
      if (delayed.length > 0) params.exclude = delayed.map((d) => d.id).join(',');

      let r;
      try {
        r = await api.get<VocabCard>('/typing/next', { params });
      } catch (err) {
        // Không còn thẻ nào khác (hoặc chỉ còn đúng thẻ đang chờ) → chấp nhận hỏi lại sớm.
        if (delayed.length === 0) throw err;
        const fallback: Record<string, string> = { ...params };
        delete fallback.exclude;
        r = await api.get<VocabCard>('/typing/next', { params: fallback });
      }

      // Phòng khi server vẫn trả về thẻ đang chờ: bỏ khỏi hàng chờ để không hỏi trùng.
      if (delayed.some((d) => d.id === r.data.id)) {
        delayedRef.current = delayed.filter((d) => d.id !== r.data.id);
        setPendingCount(delayedRef.current.length);
      }

      setCard(r.data);
      setInput('');
      setResult(null);
    } catch {
      setCard(null);
      setEmpty(
        m === 'mistakes'
          ? 'Chưa có từ gõ sai nào cần ôn (từ đã gõ sai mà chuỗi đúng đang = 0). Hãy luyện gõ thường, gõ sai vài từ rồi quay lại đây ôn nhé!'
          : 'Chưa có từ nào ở trạng thái Learning/Review trong danh sách. Hãy vào Ôn tập trước để mở khóa chế độ gõ từ!',
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    api.get<string[]>('/cards/categories').then((r) => setCategories(r.data)).catch(() => undefined);
    void loadNext('', 'all');
    void loadMistakesCount('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = async () => {
    if (!card || !input.trim() || result) return;
    try {
      const r = await api.post<TypingResult>(`/typing/${card.id}/submit`, { userInput: input });
      setResult(r.data);

      // Sai (hoặc near-miss) mà còn lượt → đẩy thẻ vào hàng chờ, hỏi lại sau vài thẻ khác.
      // Hết lượt thì thôi: thẻ đã về cấp 0 và hẹn gặp lại vào ngày mai.
      if (!r.data.passed && r.data.retryAllowed) {
        if (!delayedRef.current.some((d) => d.id === card.id)) {
          delayedRef.current.push({ id: card.id, remaining: REQUEUE_GAP });
        }
      } else {
        delayedRef.current = delayedRef.current.filter((d) => d.id !== card.id);
      }
      setPendingCount(delayedRef.current.length);

      if (autoSpeak) {
        speak(r.data.correctTerm);
      }
      if (r.data.mastered) {
        onWordMastered?.();
      }
      void loadMistakesCount(category);
    } catch {
      // Error handling
    }
  };

  // Keyboard shortcuts: R = nghe lại đáp án, Enter = từ tiếp theo (chỉ khi đã có kết quả).
  // Khi đang gõ (chưa có result) thì không chặn phím R để vẫn gõ chữ "r" bình thường.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!result) return;
      const target = e.target as HTMLElement | null;
      if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) return;

      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        speak(result.correctTerm);
      } else if (e.key === 'Enter') {
        // Nếu nút đang focus thì để click mặc định xử lý, tránh gọi 2 lần.
        if (document.activeElement === nextBtnRef.current) return;
        e.preventDefault();
        void loadNext(category, mode);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [result, category, mode, loadNext]);

  const streakDots = (streak: number, required = 5) => (
    <div className="flex items-center gap-1.5">
      {Array.from({ length: required }, (_, i) => {
        const filled = i < streak;
        return (
          <div
            key={i}
            className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black transition-all ${
              filled
                ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/50 scale-105'
                : 'bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-600'
            }`}
          >
            {i + 1}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl landscape-sm:max-w-4xl space-y-4 landscape-sm:space-y-2">
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Keyboard size={20} className="text-indigo-600 dark:text-indigo-400" />
          Luyện gõ từ vựng
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
              <RotateCcw size={11} />
              {pendingCount} từ chờ hỏi lại
            </span>
          )}
          {mistakesCount > 0 && (
            <span className="rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
              {mistakesCount} từ gõ sai cần ôn
            </span>
          )}
        </div>
      </div>

      {/* Filter and Next */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              clearDelayed();
              void loadMistakesCount(e.target.value);
              void loadNext(e.target.value, mode);
            }}
            className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-[#111827]"
          >
            <option value="">Tất cả chủ đề (Ngẫu nhiên)</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          <div className="flex rounded-xl bg-slate-200/80 p-0.5 dark:bg-slate-800/80 shadow-inner">
            <button
              onClick={() => {
                setMode('all');
                clearDelayed();
                void loadNext(category, 'all');
              }}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                mode === 'all'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-[#111827] dark:text-indigo-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              Ngẫu nhiên
            </button>
            <button
              onClick={() => {
                setMode('mistakes');
                clearDelayed();
                void loadNext(category, 'mistakes');
              }}
              className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                mode === 'mistakes'
                  ? 'bg-white text-rose-600 shadow-sm dark:bg-[#111827] dark:text-rose-400'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              <span>Ôn từ gõ sai</span>
              {mistakesCount > 0 && (
                <span className="rounded-full bg-rose-100 px-1.5 py-0.2 text-[10px] font-extrabold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                  {mistakesCount}
                </span>
              )}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={toggleAutoSpeak}
            title={autoSpeak ? 'Tắt tự động đọc khi có kết quả' : 'Bật tự động đọc khi có kết quả'}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold shadow-sm transition active:scale-95 ${
              autoSpeak
                ? 'border-indigo-600 bg-indigo-600 text-white shadow-indigo-600/25'
                : 'border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300'
            }`}
          >
            {autoSpeak ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span className="hidden sm:inline">{autoSpeak ? 'Tự đọc: Bật' : 'Tự đọc: Tắt'}</span>
          </button>

          <button
            onClick={() => loadNext(category, mode)}
            className="rounded-xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300"
          >
            Từ khác →
          </button>
        </div>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800/80 dark:bg-[#111827]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <div className="mt-3 text-sm font-semibold text-slate-500">Đang chuẩn bị từ vựng…</div>
        </div>
      )}

      {/* Empty State */}
      {empty && !loading && (
        <div className="rounded-3xl border border-amber-200 bg-amber-50 p-7 text-center dark:border-amber-900/60 dark:bg-amber-950/40">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-2xl dark:bg-amber-900/60">
            💡
          </div>
          <h3 className="mt-3 font-bold text-amber-900 dark:text-amber-200">Chưa có từ nào sẵn sàng gõ</h3>
          <p className="mt-1 text-xs sm:text-sm text-amber-800/90 dark:text-amber-300/90">{empty}</p>
          {mode === 'mistakes' && (
            <button
              onClick={() => {
                setMode('all');
                void loadNext(category, 'all');
              }}
              className="mt-4 rounded-2xl bg-amber-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-amber-700"
            >
              Quay lại luyện ngẫu nhiên
            </button>
          )}
        </div>
      )}

      {/* Word Card */}
      {card && !empty && !loading && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 landscape-sm:p-4 shadow-md dark:border-slate-800/80 dark:bg-[#111827]">
          {/* Card Header & Streak Progress */}
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
              {card.category}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-slate-400">Cấp độ phản xạ:</span>
              {streakDots(result ? result.streak : card.consecutiveTypingPasses ?? 0, 5)}
            </div>
          </div>

          {/* Word Prompt */}
          <div className="mt-5 landscape-sm:mt-2 text-center">
            <div className="text-2xl sm:text-3xl landscape-sm:text-xl font-extrabold text-slate-900 dark:text-white">
              {result && !result.passed ? result.meaningVi : card.meaningVi}
            </div>

            {card.clozeHint && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-medium">
                💡 {card.clozeHint}
              </div>
            )}

            {card.partOfSpeech && (
              <div className="mt-1 text-xs italic text-slate-400">
                ({card.partOfSpeech})
                {/* Phiên âm cố tình ẩn trước khi chấm để không đoán mò từ — hiện sau khi có kết quả. */}
              </div>
            )}
          </div>

          {/* Input & Check */}
          {!result ? (
            <div className="mt-6 landscape-sm:mt-3 space-y-3 landscape-sm:space-y-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void check();
                }}
                autoFocus
                placeholder="Gõ từ hoặc cụm tiếng Anh tương ứng… (không cần gõ ... ? ! . ,)"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 landscape-sm:py-2 text-center text-lg sm:text-xl landscape-sm:text-base font-bold shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                Không phân biệt hoa thường, không cần dấu câu <span className="font-mono">... ? ! . , ' -</span> — chỉ cần đúng từ.
              </p>
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                Gõ đúng nghĩa bằng cách nói khác vẫn được ghi nhận (không tính là gõ sai), nhưng chỉ đúng cụm mục tiêu mới cộng cấp độ.
              </p>
              <p className="text-center text-[11px] text-slate-400 dark:text-slate-500">
                Sai thì từ quay lại sau {REQUEUE_GAP} thẻ khác (không chép được đáp án). Cấp 1: {maxAttemptsForLevel(1)} lượt/ngày
                · cấp 2: {maxAttemptsForLevel(2)} lượt · cấp 3–5: {maxAttemptsForLevel(3)} lượt.
              </p>
              <button
                onClick={check}
                disabled={!input.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 landscape-sm:py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-98 disabled:opacity-40"
              >
                <span>Chấm điểm (Enter)</span>
              </button>
            </div>
          ) : (
            /* Result Panel */
            <div
              className={`mt-6 landscape-sm:mt-3 rounded-2xl p-4 sm:p-5 landscape-sm:p-3 animate-scale-in ${
                result.passed
                  ? 'border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40'
                  : result.nearMiss
                    ? 'border border-amber-200 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/40'
                    : 'border border-rose-200 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/40'
              }`}
            >
              {result.mastered ? (
                <div className="text-center py-2 space-y-1">
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/60">
                    <Trophy size={28} />
                  </div>
                  <div className="text-lg font-black text-emerald-800 dark:text-emerald-200">
                    🎉 ĐÃ THUỘC LÒNG! (Chuỗi 5/5)
                  </div>
                  <div className="text-xs text-emerald-700 dark:text-emerald-300">
                    Từ này đã vào vùng trí nhớ dài hạn. Hệ thống sẽ giãn cách kiểm tra lại sau {result.nextIntervalDays ?? 30} ngày để củng cố.
                  </div>
                </div>
              ) : result.passed ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-emerald-800 dark:text-emerald-200 text-base">
                    <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Chính xác! Đáp án: <span className="font-mono underline">{result.correctTerm}</span></span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
                    <span>Cấp độ: <b>{result.streak}/5</b></span>
                    <span>·</span>
                    {result.countedToday ? (
                      <span>Khoảng cách ôn tiếp theo: <b>sau {result.nextIntervalDays ?? (result.streak * 2)} ngày</b></span>
                    ) : result.retried ? (
                      <span className="text-slate-500 dark:text-slate-400 italic">(Đúng sau khi gõ lại — không cộng cấp, cấp hiện tại được giữ nguyên)</span>
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 italic">(Lượt luyện xoay vòng — không cộng dồn ngày)</span>
                    )}
                  </div>
                </div>
              ) : result.nearMiss ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-amber-800 dark:text-amber-200 text-base">
                    <Lightbulb size={18} className="text-amber-600 dark:text-amber-400" />
                    <span>Đúng nghĩa — nhưng chưa đúng cụm cần nhớ</span>
                  </div>
                  <div className="text-xs text-amber-800/90 dark:text-amber-300/90">
                    Bạn gõ: &ldquo;{input}&rdquo;
                    {result.matchedAlternative && <> (khớp cách nói <b>&ldquo;{result.matchedAlternative}&rdquo;</b>)</>}
                    {' '}· Cụm mục tiêu là <span className="font-mono font-bold underline">{result.correctTerm}</span>.
                    Lần này không bị tính là gõ sai và chuỗi giữ nguyên, nhưng cấp độ chỉ cộng ở lần gõ đúng đầu tiên trong ngày.
                    {result.retryAllowed
                      ? ` Từ này sẽ quay lại sau ${REQUEUE_GAP} thẻ nữa.`
                      : ' Đã hết lượt thử hôm nay.'}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200 text-base">
                    <XCircle size={18} className="text-rose-600 dark:text-rose-400" />
                    <span>Chưa đúng — Đáp án: <span className="font-mono underline">{result.correctTerm}</span></span>
                  </div>
                  <div className="text-xs text-rose-700 dark:text-rose-300">
                    Bạn gõ: &ldquo;{input}&rdquo; · Đã gõ sai từ này {result.mistakeCount ?? (card.mistakeCount + 1)} lần
                    {result.retryAllowed
                      ? ` · Từ này quay lại sau ${REQUEUE_GAP} thẻ nữa (còn ${result.remainingRetries ?? 0} lượt thử hôm nay).`
                      : ' · Đã hết lượt thử hôm nay — chuỗi về cấp 0, mai gặp lại để củng cố.'}
                  </div>
                </div>
              )}

              {/* Phiên âm chỉ hiện sau khi chấm — vừa học phát âm vừa chống đoán mò. */}
              {card.phonetic && (
                <div className="mt-3 text-center font-mono text-sm text-indigo-600 dark:text-indigo-400">
                  {card.phonetic}
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => speak(result.correctTerm)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Volume2 size={15} />
                  <span>Nghe (R)</span>
                </button>
                {result.retryAllowed && (
                  <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                    còn {result.remainingRetries ?? 0} lượt thử hôm nay
                  </span>
                )}
                <button
                  ref={nextBtnRef}
                  onClick={() => loadNext(category, mode)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-95"
                >
                  <span>Từ tiếp theo (Enter)</span>
                  <ArrowRight size={15} />
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center justify-center gap-3 text-[11px] text-slate-400">
                <span className="flex items-center gap-1"><kbd className="em-kbd">R</kbd> Nghe lại</span>
                <span>·</span>
                <span className="flex items-center gap-1"><kbd className="em-kbd">Enter</kbd> Từ tiếp theo</span>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
