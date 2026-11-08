import { useEffect, useRef, useState } from 'react';
import { api, scoreColor, type DrillResult, type SentenceDrill, type AiSentenceResult } from '../lib/api';
import { listenOnce, speak, speechSupported } from '../lib/speech';
import {
  Volume2,
  Mic,
  Sparkles,
  Loader2,
  CheckCircle2,
  ArrowRight,
  BookOpen,
  AlertCircle,
} from 'lucide-react';

interface Props {
  onDrillComplete?: () => void;
}

export default function Drills({ onDrillComplete }: Props) {
  const [drills, setDrills] = useState<SentenceDrill[]>([]);
  const [current, setCurrent] = useState<SentenceDrill | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<DrillResult | null>(null);
  const [ai, setAi] = useState<AiSentenceResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (result) nextBtnRef.current?.focus();
  }, [result]);

  const load = async () => {
    setLoading(true);
    try {
      const r = await api.get<SentenceDrill[]>('/drills/due', { params: { take: 30 } });
      setDrills(r.data);
      if (!current && r.data.length > 0) pick(r.data[0]);
    } catch {
      setError('Không kết nối được với máy chủ backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (d: SentenceDrill) => {
    setCurrent(d);
    setInput('');
    setResult(null);
    setAi(null);
    setError('');
  };

  const submit = async () => {
    if (!current || !input.trim()) return;
    try {
      const r = await api.post<DrillResult>(`/drills/${current.id}/submit`, { userInput: input });
      setResult(r.data);
      setAi(null);
      onDrillComplete?.();
    } catch {
      setError('Không chấm điểm được — vui lòng thử lại.');
    }
  };

  const nextDrill = () => {
    if (drills.length === 0) return;
    const i = drills.findIndex((d) => d.id === current?.id);
    pick(drills[(i + 1) % drills.length]);
  };

  const askGemini = async () => {
    if (!current) return;
    setAiLoading(true);
    try {
      const r = await api.post<AiSentenceResult>('/ai/evaluate-sentence', {
        userInput: input,
        drillId: current.id,
      });
      setAi(r.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Gọi AI thất bại. Vui lòng kiểm tra API key trong Cài đặt.');
    } finally {
      setAiLoading(false);
    }
  };

  const dictate = async () => {
    setListening(true);
    setError('');
    try {
      const text = await listenOnce('en-US');
      setInput((v) => (v ? v + ' ' : '') + text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Microphone không khả dụng hoặc bị từ chối.');
    } finally {
      setListening(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      {/* Header Info */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400" />
          Luyện phản xạ câu
        </h2>
      </div>

      {/* Due Drills Horizontal Chip Slider */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
        <span className="shrink-0 text-xs font-semibold text-slate-400 mr-1">Danh sách câu:</span>
        {drills.map((d, i) => {
          const isSelected = current?.id === d.id;
          return (
            <button
              key={d.id}
              onClick={() => pick(d)}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                  : 'border border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300'
              }`}
            >
              #{i + 1} {d.lastScore > 0 && <span className="opacity-75">({d.lastScore}đ)</span>}
            </button>
          );
        })}
        {!loading && drills.length === 0 && (
          <span className="rounded-xl bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            Đã hoàn thành hết tất cả câu luyện tập! 🎉
          </span>
        )}
      </div>

      {error && (
        <div className="rounded-2xl bg-red-100 p-3 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300 flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {current && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-md dark:border-slate-800/80 dark:bg-[#111827]">
          {/* Category & Audio */}
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700 dark:bg-sky-950/80 dark:text-sky-300">
              {current.category}
            </span>
            <button
              onClick={() => speak(current.targetEn)}
              className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 dark:bg-slate-800 dark:text-slate-300"
              title="Nghe câu tiếng Anh mẫu"
            >
              <Volume2 size={14} />
              <span>Nghe mẫu</span>
            </button>
          </div>

          {/* Prompt */}
          <div className="mt-4">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white leading-relaxed">
              {current.promptVi}
            </h3>
          </div>

          {/* Required Keywords */}
          {current.keywords.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-medium text-slate-400">Từ khóa cần có:</span>
              {current.keywords.map((k) => (
                <span
                  key={k}
                  className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                >
                  🔑 {k}
                </span>
              ))}
            </div>
          )}

          {/* Translation Textarea */}
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={3}
            placeholder="Gõ bản dịch tiếng Anh của bạn… (Bấm Chấm điểm hoặc dùng Mic để đọc)"
            className="mt-4 w-full rounded-2xl border border-slate-300 bg-white p-3.5 text-base shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 leading-relaxed"
          />

          {/* Action Button Bar */}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={submit}
              disabled={!input.trim()}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-98 disabled:opacity-40"
            >
              <CheckCircle2 size={18} />
              <span>Chấm điểm</span>
            </button>

            {speechSupported() && (
              <button
                onClick={dictate}
                disabled={listening}
                className={`flex items-center gap-1.5 rounded-2xl border px-4 py-3 text-sm font-bold shadow-sm transition active:scale-95 ${
                  listening
                    ? 'border-red-400 bg-red-50 text-red-600 dark:bg-red-950/80 dark:border-red-800 dark:text-red-300'
                    : 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200'
                }`}
                title="Đọc tiếng Anh bằng giọng nói"
              >
                <Mic size={18} className={listening ? 'animate-pulse text-red-500' : ''} />
                <span>{listening ? 'Đang nghe…' : 'Nói (Mic)'}</span>
              </button>
            )}

            {result && (
              <button
                ref={nextBtnRef}
                onClick={nextDrill}
                className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/25 transition hover:bg-emerald-700 active:scale-95"
              >
                <span>Câu tiếp theo</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>

          {/* Grading Result Breakdown */}
          {result && (
            <div className="mt-5 space-y-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-800/40">
              {/* Score Header */}
              <div className="flex items-center gap-3.5">
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white text-2xl font-black shadow-sm dark:bg-slate-900 ${scoreColor(
                    result.score,
                  )}`}
                >
                  {result.score}
                </div>
                <div className="text-xs sm:text-sm">
                  <div className="font-bold text-slate-800 dark:text-slate-200">
                    Từ khóa: {result.keywordsMatched}/{result.keywordsTotal} · Độ tương đồng:{' '}
                    {Math.round(result.similarity * 100)}%
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.matchedWords.map((w) => (
                      <span
                        key={w}
                        className="rounded-md bg-emerald-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                      >
                        ✓ {w}
                      </span>
                    ))}
                    {result.missedWords.map((w) => (
                      <span
                        key={w}
                        className="rounded-md bg-rose-100 px-1.5 py-0.5 font-mono text-[11px] font-bold text-rose-800 dark:bg-rose-950 dark:text-rose-300 line-through"
                      >
                        ✕ {w}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Native Answer */}
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex items-start justify-between gap-2 rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
                  <div>
                    <div className="font-bold text-emerald-700 dark:text-emerald-400">
                      Đáp án chuẩn: {result.targetEn}
                    </div>
                    {result.alternativesEn.map((a) => (
                      <div key={a} className="mt-0.5 text-slate-500">
                        ↳ {a}
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => speak(result.targetEn)}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 hover:text-emerald-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <Volume2 size={15} />
                  </button>
                </div>
                {result.grammarNote && (
                  <div className="rounded-xl bg-indigo-50/70 p-3 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
                    💡 <b>Ngữ pháp:</b> {result.grammarNote}
                  </div>
                )}
              </div>

              {/* Ask Gemini Button */}
              <button
                onClick={askGemini}
                disabled={aiLoading}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-violet-400 bg-violet-50/50 py-2.5 text-xs sm:text-sm font-bold text-violet-700 transition hover:bg-violet-100/60 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-300"
              >
                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                <span>
                  {aiLoading ? 'Đang nhờ Gemini nhận xét…' : 'Nhờ Gemini chuốt tự nhiên & sửa ngữ pháp'}
                </span>
              </button>

              {/* Gemini Evaluation Result */}
              {ai && (
                <div className="rounded-2xl border border-violet-200 bg-white p-4 shadow-sm dark:border-violet-900 dark:bg-slate-900 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">
                      <Sparkles size={13} /> Nhận xét từ Gemini AI
                    </span>
                    <span className="text-xs text-slate-400">
                      Ngữ pháp: {ai.grammarScore}/100 · Tự nhiên: {ai.naturalnessScore}/100
                    </span>
                  </div>

                  <div className="text-xs sm:text-sm text-slate-700 dark:text-slate-200">
                    <b>Bản sửa chuẩn:</b> {ai.corrected}
                  </div>
                  {ai.feedback && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      {ai.feedback}
                    </div>
                  )}

                  <div className="grid gap-2 sm:grid-cols-2 pt-1 border-t border-slate-100 dark:border-slate-800 text-xs">
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">💼 Professional (Công sở)</div>
                      {ai.professionalVersions.map((v) => (
                        <div key={v} className="text-slate-600 dark:text-slate-400">• {v}</div>
                      ))}
                    </div>
                    <div className="rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/50">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1">☕ Casual (Giao tiếp thường)</div>
                      {ai.casualVersions.map((v) => (
                        <div key={v} className="text-slate-600 dark:text-slate-400">• {v}</div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
