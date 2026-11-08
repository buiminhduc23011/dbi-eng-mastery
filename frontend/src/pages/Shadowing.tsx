import { useEffect, useState } from 'react';
import { api, type SentenceDrill, type VocabCard } from '../lib/api';
import { listenOnce, markWords, speak, speechSupported, stopSpeak, type WordMark } from '../lib/speech';
import { Volume2, Mic, Turtle } from 'lucide-react';

interface Item {
  text: string;
  sub: string;
}

export default function Shadowing() {
  const [items, setItems] = useState<Item[]>([]);
  const [index, setIndex] = useState(0);
  const [marks, setMarks] = useState<WordMark[]>([]);
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [rate, setRate] = useState(1.0);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<VocabCard[]>('/cards', { params: { take: 30 } }),
      api.get<SentenceDrill[]>('/drills', { params: { take: 30 } }),
    ])
      .then(([c, d]) => {
        const list: Item[] = [
          ...c.data.filter((x) => x.exampleSentence).map((x) => ({ text: x.exampleSentence, sub: `${x.term} — ${x.meaningVi}` })),
          ...d.data.map((x) => ({ text: x.targetEn, sub: x.promptVi })),
        ];
        setItems(list);
      })
      .catch(() => setError('Cannot reach backend.'));
    return () => stopSpeak();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowRight') setIndex((i) => (items.length ? (i + 1) % items.length : i));
      else if (e.key === 'ArrowLeft') setIndex((i) => (items.length ? (i - 1 + items.length) % items.length : i));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [items.length]);

  const item = items[index];

  const record = async () => {
    setListening(true);
    setError('');
    try {
      const text = await listenOnce('en-US');
      setTranscript(text);
      if (item) setMarks(markWords(item.text, text));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Mic failed.');
    } finally {
      setListening(false);
    }
  };

  const hitCount = marks.filter((m) => m.hit).length;
  const pct = marks.length ? Math.round((hitCount / marks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h2 className="text-lg font-bold">Shadowing & Pronunciation Studio</h2>
      {error && <div className="rounded-lg bg-red-100 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>}
      {!item && !error && <div className="text-slate-500">Loading sentences…</div>}

      {item && (
        <>
          <div className="rounded-2xl bg-white p-6 text-center shadow-md dark:bg-slate-900">
            <div className="text-xs text-slate-500">{item.sub}</div>
            <div className="mt-2 text-2xl font-semibold leading-relaxed">“{item.text}”</div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <button onClick={() => speak(item.text, rate)} className="flex items-center gap-1 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700">
                <Volume2 size={16} /> Listen {rate.toFixed(1)}x
              </button>
              <button
                onClick={() => setRate((r) => (r === 1 ? 0.8 : 1))}
                className="flex items-center gap-1 rounded-lg bg-slate-200 px-3 py-2 text-sm dark:bg-slate-700"
                title="Toggle speed"
              >
                <Turtle size={16} /> {rate === 1 ? '0.8x slow' : '1.0x'}
              </button>
            </div>
            <div className="mt-3 flex items-center justify-center gap-2">
              <button onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm dark:bg-slate-700">← Prev</button>
              <span className="text-sm text-slate-500">{index + 1} / {items.length}</span>
              <button onClick={() => setIndex((i) => (i + 1) % items.length)} className="rounded-lg bg-slate-200 px-3 py-1.5 text-sm dark:bg-slate-700">Next →</button>
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-md dark:bg-slate-900">
            {speechSupported() ? (
              <button
                onClick={record}
                disabled={listening}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
              >
                <Mic size={18} className={listening ? 'animate-pulse' : ''} />
                {listening ? 'Listening… speak now!' : '🎤 Record my shadowing'}
              </button>
            ) : (
              <div className="rounded-lg bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Speech recognition needs Chrome / Edge desktop.
              </div>
            )}
            {transcript && (
              <div className="mt-4">
                <div className="text-sm text-slate-500">You said: <i>“{transcript}”</i></div>
                <div className="mt-2 text-lg leading-relaxed">
                  {marks.map((m, i) => (
                    <span key={i} className={`mr-1 rounded px-1 ${m.hit ? 'bg-emerald-200 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100' : 'bg-red-200 text-red-900 line-through dark:bg-red-900 dark:text-red-100'}`}>
                      {m.word}
                    </span>
                  ))}
                </div>
                <div className="mt-2 text-sm font-bold">Match: {pct}% ({hitCount}/{marks.length} words)</div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
