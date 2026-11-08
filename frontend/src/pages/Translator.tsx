import { useState } from 'react';
import { api, type AiPolishResult } from '../lib/api';
import { Loader2, Languages, Plus, Check, Sparkles, Briefcase, Coffee, BookMarked, AlertCircle } from 'lucide-react';

interface Props {
  onCardSaved?: () => void;
}

export default function Translator({ onCardSaved }: Props) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AiPolishResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedSet, setSavedSet] = useState<Set<number>>(new Set());
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');

  const polish = async () => {
    if (!input.trim()) return;
    setLoading(true);
    setError('');
    setSavedMsg('');
    try {
      const r = await api.post<AiPolishResult>('/ai/polish', { rawInput: input });
      setResult(r.data);
      setSavedSet(new Set());
    } catch {
      setError('Không thực hiện được dịch — vui lòng kiểm tra kết nối mạng hoặc thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const saveToDeck = async (term: string, meaningVi: string, example: string, idx: number) => {
    setSavingIdx(idx);
    try {
      await api.post('/cards', {
        term,
        phonetic: '',
        partOfSpeech: 'phrase',
        meaningVi,
        definitionEn: '',
        exampleSentence: example,
        clozeSentence: '',
        clozeHint: '',
        category: 'Daily & Casual',
      });
      setSavedSet((prev) => new Set(prev).add(idx));
      setSavedMsg(`Đã lưu "${term}" vào bộ thẻ SRS! ✅`);
      onCardSaved?.();
      setTimeout(() => setSavedMsg(''), 3000);
    } catch {
      setError('Không thể lưu thẻ vào hệ thống.');
    } finally {
      setSavingIdx(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Languages size={20} className="text-violet-600 dark:text-violet-400" />
          Dịch & Tạo thẻ từ vựng
        </h2>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-100 p-3 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {savedMsg && (
        <div className="rounded-2xl bg-emerald-100 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-2">
          <Check size={16} className="text-emerald-600" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Input Textarea */}
      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              void polish();
            }
          }}
          rows={4}
          placeholder="Ví dụ: Dự án bị delay 2 ngày do server quá tải, chúng tôi đang scale up và kiểm thử lại… (Ctrl+Enter để dịch)"
          className="w-full rounded-3xl border border-slate-300 bg-white p-4 text-base shadow-sm focus:border-violet-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 leading-relaxed"
        />

        <button
          onClick={polish}
          disabled={loading || !input.trim()}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-violet-600/25 transition hover:opacity-95 active:scale-98 disabled:opacity-40"
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Languages size={18} />}
          <span>{loading ? 'Đang phân tích & dịch…' : 'Dịch & Phân tích ngữ cảnh'}</span>
        </button>
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            {result.usedAi ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-3 py-1 font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                <Sparkles size={13} /> Gemini AI On-demand
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                🌐 Chế độ dịch dự phòng (Thêm API key trong Cài đặt để kích hoạt Gemini)
              </span>
            )}
          </div>

          {/* Business English */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 mb-1">
              <Briefcase size={14} />
              <span>Tiếng Anh công sở (Business English)</span>
            </div>
            <div className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
              {result.businessEnglish}
            </div>
          </div>

          {/* Casual English */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 mb-1">
              <Coffee size={14} />
              <span>Giao tiếp tự nhiên (Casual English)</span>
            </div>
            <div className="text-sm sm:text-base font-semibold text-slate-800 dark:text-slate-100 leading-relaxed">
              {result.casualEnglish}
            </div>
          </div>

          {/* Key Vocabulary Extraction */}
          {result.vocabulary && result.vocabulary.length > 0 && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-[#111827]">
              <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                <BookMarked size={14} />
                <span>Từ vựng & cụm từ trọng tâm trích xuất</span>
              </div>

              <div className="space-y-2">
                {result.vocabulary.map((v, i) => {
                  const isSaved = savedSet.has(i);
                  const isSaving = savingIdx === i;
                  return (
                    <div
                      key={i}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-2xl border border-slate-100 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="text-xs sm:text-sm">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {v.term} <span className="font-normal text-slate-500">· {v.meaningVi}</span>
                        </div>
                        {v.exampleSentence && (
                          <div className="mt-0.5 text-slate-600 dark:text-slate-300 italic">
                            📌 &ldquo;{v.exampleSentence}&rdquo;
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => saveToDeck(v.term, v.meaningVi, v.exampleSentence, i)}
                        disabled={isSaving || isSaved}
                        className={`flex shrink-0 items-center justify-center gap-1 rounded-xl px-3 py-1.5 text-xs font-bold transition active:scale-95 ${
                          isSaved
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-emerald-600 text-white shadow-sm hover:bg-emerald-700'
                        }`}
                      >
                        {isSaved ? <Check size={14} /> : <Plus size={14} />}
                        <span>{isSaved ? 'Đã lưu' : isSaving ? '…' : '+ Thẻ SRS'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
