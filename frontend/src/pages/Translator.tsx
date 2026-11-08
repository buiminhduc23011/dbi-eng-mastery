import { useState } from 'react';
import { api, type AiPolishResult } from '../lib/api';
import { Loader2, Languages, Plus } from 'lucide-react';

export default function Translator() {
  const [input, setInput] = useState('');
  const [result, setResult] = useState<AiPolishResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState<number | null>(null);
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
    } catch {
      setError('Không dịch được — kiểm tra mạng rồi thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const saveToDeck = async (term: string, meaningVi: string, example: string, idx: number) => {
    setSaving(idx);
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
      setSavedMsg(`Saved "${term}" to SRS deck. ✅`);
    } catch {
      setError('Could not save card.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-lg font-bold">AI Quick Translator & Card Generator</h2>
      <p className="text-sm text-slate-500">Nhập tiếng Việt hoặc tiếng Anh bồi → bấm <b>Dịch</b> (có AI key thì dùng Gemini, chưa có thì backend tự dịch miễn phí) → lưu cụm từ hay vào bộ SRS.</p>
      {error && <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>}
      {savedMsg && <div className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{savedMsg}</div>}

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
        placeholder="VD: hôm qua line A bị dừng máy 2 tiếng vì kẹt sensor, tôi đã reset và chạy lại ok… (Ctrl+Enter để dịch)"
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900"
      />
      <button
        onClick={polish}
        disabled={loading || !input.trim()}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 py-3 font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
      >
        {loading ? <Loader2 size={18} className="animate-spin" /> : <Languages size={18} />}
        {loading ? 'Đang dịch…' : 'Dịch'}
      </button>

      {result && (
        <div className="space-y-3">
          <div className="text-xs">
            {result.usedAi ? (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 font-bold text-violet-700 dark:bg-violet-950 dark:text-violet-300">✨ Gemini AI</span>
            ) : (
              <span className="rounded-full bg-slate-200 px-2.5 py-1 font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">🌐 Dịch tự động (chưa có AI key — vào Settings để thêm)</span>
            )}
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">💼 Business</div>
            <div className="mt-1">{result.businessEnglish}</div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="text-xs font-bold uppercase tracking-wide text-slate-500">☕ Casual</div>
            <div className="mt-1">{result.casualEnglish}</div>
          </div>
          <div className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Key vocabulary</div>
            <div className="space-y-2">
              {result.vocabulary.map((v, i) => (
                <div key={i} className="flex items-start justify-between gap-2 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-800">
                  <div className="text-sm">
                    <span className="font-bold">{v.term}</span>
                    <span className="ml-2 text-slate-500">{v.meaningVi}</span>
                    <div className="mt-0.5 text-slate-600 dark:text-slate-300">📌 {v.exampleSentence}</div>
                  </div>
                  <button
                    onClick={() => saveToDeck(v.term, v.meaningVi, v.exampleSentence, i)}
                    disabled={saving === i}
                    className="flex shrink-0 items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
                    title="Save to SRS deck"
                  >
                    <Plus size={14} /> {saving === i ? '…' : 'SRS'}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
