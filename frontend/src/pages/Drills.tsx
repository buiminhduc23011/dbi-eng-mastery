import { useEffect, useRef, useState } from 'react';
import { api, scoreColor, type DrillResult, type SentenceDrill } from '../lib/api';
import { listenOnce, speak, speechSupported } from '../lib/speech';
import { Volume2, Mic, Sparkles, Loader2, CheckCircle } from 'lucide-react';

export default function Drills() {
  const [drills, setDrills] = useState<SentenceDrill[]>([]);
  const [current, setCurrent] = useState<SentenceDrill | null>(null);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<DrillResult | null>(null);
  const [ai, setAi] = useState<import('../lib/api').AiSentenceResult | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const nextBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (result) nextBtnRef.current?.focus();
  }, [result]);

  const load = async () => {
    const r = await api.get<SentenceDrill[]>('/drills/due', { params: { take: 30 } });
    setDrills(r.data);
    if (!current && r.data.length > 0) pick(r.data[0]);
  };

  useEffect(() => {
    load().catch(() => setError('Cannot reach backend.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pick = (d: SentenceDrill) => {
    setCurrent(d);
    setInput('');
    setResult(null);
    setAi(null);
  };

  const submit = async () => {
    if (!current || !input.trim()) return;
    const r = await api.post<DrillResult>(`/drills/${current.id}/submit`, { userInput: input });
    setResult(r.data);
    setAi(null);
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
      const r = await api.post('/ai/evaluate-sentence', { userInput: input, drillId: current.id });
      setAi(r.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'AI call failed. Set your Gemini key in Settings.');
    } finally {
      setAiLoading(false);
    }
  };

  const dictate = async () => {
    setListening(true);
    try {
      const text = await listenOnce('en-US');
      setInput((v) => (v ? v + ' ' : '') + text);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mic failed.');
    } finally {
      setListening(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-sm text-slate-500">Due drills:</span>
        {drills.map((d, i) => (
          <button
            key={d.id}
            onClick={() => pick(d)}
            className={`shrink-0 rounded-lg px-3 py-1.5 text-sm font-semibold ${current?.id === d.id ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-900'}`}
          >
            #{i + 1} {d.lastScore > 0 && <span className="opacity-70">({d.lastScore})</span>}
          </button>
        ))}
        {drills.length === 0 && <span className="text-sm text-slate-500">All caught up. 🎉</span>}
      </div>
      {error && <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>}

      {current && (
        <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <span className="rounded-full bg-sky-100 px-3 py-0.5 text-xs font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-300">
              {current.category}
            </span>
            <button onClick={() => speak(current.targetEn)} className="flex items-center gap-1 text-sm text-slate-500 hover:text-indigo-500" title="Hear native answer (hidden until graded)">
              <Volume2 size={15} /> native
            </button>
          </div>
          <h2 className="mt-3 text-xl">🇻🇳 {current.promptVi}</h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {current.keywords.map((k) => (
              <span key={k} className="rounded bg-slate-200 px-2 py-0.5 font-mono text-xs dark:bg-slate-700">🔑 {k}</span>
            ))}
          </div>

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
            placeholder="Type your English translation… (Ctrl+Enter để chấm, hoặc dictate với mic)"
            className="mt-4 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 dark:border-slate-700"
          />
          <div className="mt-2 flex gap-2">
            <button onClick={submit} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-indigo-600 py-2 font-semibold text-white hover:bg-indigo-700">
              <CheckCircle size={16} /> Grade offline (free)
            </button>
            {result && (
              <button ref={nextBtnRef} onClick={nextDrill} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700">
                Câu tiếp theo → (Enter)
              </button>
            )}
            {speechSupported() && (
              <button onClick={dictate} disabled={listening} className="flex items-center gap-1 rounded-lg bg-slate-200 px-4 py-2 text-sm font-semibold dark:bg-slate-700">
                <Mic size={16} className={listening ? 'animate-pulse text-red-500' : ''} /> {listening ? 'Listening…' : 'Speak'}
              </button>
            )}
          </div>

          {result && (
            <div className="mt-4 space-y-3 rounded-xl bg-slate-50 p-4 dark:bg-slate-800">
              <div className="flex items-center gap-3">
                <span className={`text-4xl font-black ${scoreColor(result.score)}`}>{result.score}</span>
                <div className="text-sm">
                  <div>Keywords: {result.keywordsMatched}/{result.keywordsTotal} · Similarity: {Math.round(result.similarity * 100)}%</div>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {result.matchedWords.map((w) => (
                      <span key={w} className="rounded bg-emerald-200 px-1.5 text-xs text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100">{w}</span>
                    ))}
                    {result.missedWords.map((w) => (
                      <span key={w} className="rounded bg-red-200 px-1.5 text-xs text-red-900 dark:bg-red-900 dark:text-red-100">{w}✕</span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-sm">
                <div className="font-semibold text-emerald-600 dark:text-emerald-300">Native: {result.targetEn}</div>
                {result.alternativesEn.map((a) => (
                  <div key={a} className="text-slate-500">↳ {a}</div>
                ))}
                {result.grammarNote && <div className="mt-1 text-slate-600 dark:text-slate-300">📝 {result.grammarNote}</div>}
              </div>
              <button
                onClick={askGemini}
                disabled={aiLoading}
                className="flex w-full items-center justify-center gap-1 rounded-lg border-2 border-dashed border-violet-400 py-2 text-sm font-semibold text-violet-600 hover:bg-violet-50 dark:text-violet-300 dark:hover:bg-violet-950"
              >
                {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {aiLoading ? 'Asking Gemini…' : 'Ask Gemini to Polish (uses API quota)'}
              </button>
              {ai && ai.usedAi === false && (
                <div className="text-xs text-slate-500">🌐 Chưa có AI key — đang dùng chấm offline. Vào Settings để thêm key.</div>
              )}
              {ai && (
                <div className="rounded-lg bg-violet-50 p-3 text-sm dark:bg-violet-950">
                  <div><b>Corrected:</b> {ai.corrected}</div>
                  <div className="mt-1">Grammar {ai.grammarScore} · Naturalness {ai.naturalnessScore}</div>
                  <div className="mt-1">{ai.feedback}</div>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div><b className="text-xs">CASUAL</b>{ai.casualVersions.map((v) => <div key={v}>• {v}</div>)}</div>
                    <div><b className="text-xs">PROFESSIONAL</b>{ai.professionalVersions.map((v) => <div key={v}>• {v}</div>)}</div>
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
