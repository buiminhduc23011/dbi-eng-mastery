import { useEffect, useRef, useState } from 'react';
import { api, type VocabCard } from '../lib/api';
import { speak } from '../lib/speech';
import { Volume2, ArrowRight, Keyboard, Trophy, CheckCircle2, XCircle } from 'lucide-react';

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
}

interface Props {
  onWordMastered?: () => void;
}

export default function Typing({ onWordMastered }: Props) {
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [card, setCard] = useState<VocabCard | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<TypingResult | null>(null);
  const [empty, setEmpty] = useState('');
  const [loading, setLoading] = useState(false);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // Auto focus next button on result
  useEffect(() => {
    if (result) nextBtnRef.current?.focus();
  }, [result]);

  const loadNext = async (cat: string) => {
    setLoading(true);
    setEmpty('');
    try {
      const params = cat ? { params: { category: cat } } : undefined;
      const r = await api.get<VocabCard>('/typing/next', params);
      setCard(r.data);
      setInput('');
      setResult(null);
    } catch {
      setCard(null);
      setEmpty('Chưa có từ nào ở trạng thái Learning/Review trong danh sách. Hãy ôn SRS Review trước để mở khóa chế độ gõ từ!');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<string[]>('/cards/categories').then((r) => setCategories(r.data)).catch(() => undefined);
    loadNext('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const check = async () => {
    if (!card || !input.trim() || result) return;
    try {
      const r = await api.post<TypingResult>(`/typing/${card.id}/submit`, { userInput: input });
      setResult(r.data);
      if (r.data.mastered) {
        onWordMastered?.();
      }
    } catch {
      // Error handling
    }
  };

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
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Keyboard size={20} className="text-indigo-600 dark:text-indigo-400" />
          Luyện gõ từ vựng
        </h2>
      </div>

      {/* Filter and Next */}
      <div className="flex items-center justify-between gap-2">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            void loadNext(e.target.value);
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

        <button
          onClick={() => loadNext(category)}
          className="rounded-2xl border border-slate-200/80 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300"
        >
          Từ khác →
        </button>
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
        </div>
      )}

      {/* Word Card */}
      {card && !empty && !loading && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-7 shadow-md dark:border-slate-800/80 dark:bg-[#111827]">
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
          <div className="mt-5 text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white">
              {result && !result.passed ? result.meaningVi : card.meaningVi}
            </div>

            {card.clozeHint && (
              <div className="mt-2 inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300 font-medium">
                💡 {card.clozeHint}
              </div>
            )}

            {card.partOfSpeech && (
              <div className="mt-1 text-xs italic text-slate-400">
                ({card.partOfSpeech}) {card.phonetic && `· ${card.phonetic}`}
              </div>
            )}
          </div>

          {/* Input & Check */}
          {!result ? (
            <div className="mt-6 space-y-3">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void check();
                }}
                autoFocus
                placeholder="Gõ từ hoặc cụm tiếng Anh tương ứng…"
                className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3.5 text-center text-lg sm:text-xl font-bold shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
              />
              <button
                onClick={check}
                disabled={!input.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-98 disabled:opacity-40"
              >
                <span>Chấm điểm (Enter)</span>
              </button>
            </div>
          ) : (
            /* Result Panel */
            <div
              className={`mt-6 rounded-2xl p-4 sm:p-5 ${
                result.passed
                  ? 'border border-emerald-200 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/40'
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
                    ) : (
                      <span className="text-slate-500 dark:text-slate-400 italic">(Lượt luyện xoay vòng — không cộng dồn ngày)</span>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-bold text-rose-800 dark:text-rose-200 text-base">
                    <XCircle size={18} className="text-rose-600 dark:text-rose-400" />
                    <span>Chưa đúng — Đáp án: <span className="font-mono underline">{result.correctTerm}</span></span>
                  </div>
                  <div className="text-xs text-rose-700 dark:text-rose-300">
                    Bạn gõ: &ldquo;{input}&rdquo; · Chuỗi bị đặt lại về 0, sẽ hỏi lại vào ngày mai để củng cố.
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => speak(result.correctTerm)}
                  className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                >
                  <Volume2 size={15} />
                  <span>Nghe</span>
                </button>
                <button
                  ref={nextBtnRef}
                  onClick={() => loadNext(category)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-95"
                >
                  <span>Từ tiếp theo</span>
                  <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
