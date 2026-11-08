import { useEffect, useRef, useState } from 'react';
import { api, type VocabCard } from '../lib/api';
import { speak } from '../lib/speech';
import { Volume2, ArrowRight, Keyboard, Trophy } from 'lucide-react';

interface TypingResult {
  passed: boolean;
  similarity: number;
  correctTerm: string;
  meaningVi: string;
  streak: number;
  requiredStreak: number;
  mastered: boolean;
  countedToday: boolean;
}

export default function Typing() {
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [card, setCard] = useState<VocabCard | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<TypingResult | null>(null);
  const [empty, setEmpty] = useState('');
  const [loading, setLoading] = useState(false);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  // Enter on the result panel = next word (button is auto-focused).
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
      setEmpty('Chưa có card nào ở trạng thái Learning/Review — hãy ôn SRS Review trước để mở khóa chế độ gõ từ.');
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
    const r = await api.post<TypingResult>(`/typing/${card.id}/submit`, { userInput: input });
    setResult(r.data);
  };

  const dots = (streak: number, required: number) =>
    Array.from({ length: required }, (_, i) => (
      <span key={i} className={`inline-block h-3 w-3 rounded-full ${i < streak ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`} />
    ));

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold"><Keyboard size={20} /> Typing Practice — gõ từ đã học</h2>
        <p className="text-sm text-slate-500">
          Gõ đúng từ tiếng Anh cho nghĩa tiếng Việt. <b>Pass 5 lần liên tiếp vào 5 ngày khác nhau</b> → card tự đánh dấu <b>Mastered</b>, không hiện lại nữa. Gõ sai hoặc trùng ngày không tính chuỗi.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            void loadNext(e.target.value);
          }}
          className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900"
        >
          <option value="">All categories (random)</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={() => loadNext(category)} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900">
          Câu khác →
        </button>
      </div>

      {loading && <div className="p-8 text-center text-slate-500">Đang lấy từ ngẫu nhiên…</div>}
      {empty && <div className="rounded-xl bg-amber-100 p-6 text-center text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">{empty}</div>}

      {card && !empty && (
        <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-indigo-100 px-3 py-0.5 text-xs font-semibold text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              {card.category}
            </span>
            <span className="flex items-center gap-1 text-xs text-slate-500" title="Số ngày pass liên tiếp / 5">
              {dots(result ? result.streak : card.consecutiveTypingPasses ?? 0, 5)}
              <span className="ml-1">{result ? result.streak : (card.consecutiveTypingPasses ?? 0)}/5</span>
            </span>
          </div>

          <div className="mt-3 text-2xl font-semibold">🇻🇳 {result && !result.passed ? result.meaningVi : card.meaningVi}</div>
          {card.clozeHint && <div className="mt-1 text-sm text-slate-500">💡 {card.clozeHint}</div>}
          {card.partOfSpeech && <div className="mt-1 text-xs italic text-slate-400">({card.partOfSpeech}) · {card.phonetic}</div>}

          {!result ? (
            <>
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void check();
                }}
                autoFocus
                placeholder="Gõ từ/cụm tiếng Anh… (Enter để chấm)"
                className="mt-4 w-full rounded-lg border border-slate-300 bg-transparent px-4 py-3 text-lg dark:border-slate-700"
              />
              <button
                onClick={check}
                disabled={!input.trim()}
                className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-40"
              >
                Chấm (Enter)
              </button>
            </>
          ) : (
            <div className={`mt-4 rounded-xl p-4 ${result.passed ? 'bg-emerald-100 dark:bg-emerald-950' : 'bg-red-100 dark:bg-red-950'}`}>
              {result.mastered ? (
                <div className="text-center">
                  <Trophy size={28} className="mx-auto text-amber-500" />
                  <div className="mt-1 text-lg font-bold text-emerald-700 dark:text-emerald-200">🎉 ĐÃ THUỘC! Đủ 5 ngày pass liên tiếp.</div>
                  <div className="text-sm text-emerald-700 dark:text-emerald-300">Card này đã Mastered, sẽ không hiện lại nữa.</div>
                </div>
              ) : result.passed ? (
                <div className="text-emerald-800 dark:text-emerald-200">
                  <div className="font-bold">✅ Đúng! <span className="font-mono">{result.correctTerm}</span></div>
                  <div className="mt-1 text-sm">
                    Chuỗi: {result.streak}/5 {result.countedToday ? '(+1 ngày hôm nay)' : '(hôm nay đã tính rồi — quay lại ngày mai để +chuỗi)'}
                  </div>
                </div>
              ) : (
                <div className="text-red-800 dark:text-red-200">
                  <div className="font-bold">❌ Sai — đáp án: <span className="font-mono">{result.correctTerm}</span></div>
                  <div className="text-sm">Bạn gõ: “{input}” ({Math.round(result.similarity * 100)}% giống). Chuỗi reset về 0.</div>
                </div>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => speak(result.correctTerm)}
                  className="flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-2 text-sm dark:bg-slate-700"
                >
                  <Volume2 size={15} /> Nghe
                </button>
                <button
                  ref={nextBtnRef}
                  onClick={() => loadNext(category)}
                  className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-indigo-600 py-2 font-semibold text-white"
                >
                  Từ tiếp theo <ArrowRight size={16} /> (Enter)
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
