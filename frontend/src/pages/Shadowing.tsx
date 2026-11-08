import { useEffect, useState } from 'react';
import { api, type SentenceDrill, type VocabCard } from '../lib/api';
import { listenOnce, markWords, speak, speechSupported, stopSpeak, type WordMark } from '../lib/speech';
import { Volume2, Mic, Turtle, ArrowLeft, ArrowRight, Award, Headphones } from 'lucide-react';

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
  const [loading, setLoading] = useState(true);

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
      .catch(() => setError('Không thể kết nối đến máy chủ backend.'))
      .finally(() => setLoading(false));

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
      setError(e instanceof Error ? e.message : 'Microphone gặp sự cố hoặc bị từ chối.');
    } finally {
      setListening(false);
    }
  };

  const hitCount = marks.filter((m) => m.hit).length;
  const pct = marks.length ? Math.round((hitCount / marks.length) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Headphones size={20} className="text-indigo-600 dark:text-indigo-400" />
          Luyện phát âm & Shadowing
        </h2>
      </div>

      {error && (
        <div className="rounded-2xl bg-red-100 p-3 text-xs font-bold text-red-700 dark:bg-red-950 dark:text-red-300">
          {error}
        </div>
      )}

      {loading && !item && (
        <div className="flex min-h-[40vh] flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800/80 dark:bg-[#111827]">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <div className="mt-3 text-sm font-semibold text-slate-500">Đang chuẩn bị câu luyện phát âm…</div>
        </div>
      )}

      {item && (
        <>
          {/* Sentence Display Card */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-6 sm:p-7 text-center shadow-md dark:border-slate-800/80 dark:bg-[#111827]">
            <span className="inline-block rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300 max-w-full truncate">
              {item.sub}
            </span>

            <div className="my-5 text-xl sm:text-2xl font-extrabold leading-relaxed text-slate-900 dark:text-white px-2">
              &ldquo;{item.text}&rdquo;
            </div>

            {/* Audio Controls */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => speak(item.text, rate)}
                className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-95"
              >
                <Volume2 size={16} />
                <span>Nghe mẫu ({rate.toFixed(1)}x)</span>
              </button>

              <button
                onClick={() => setRate((r) => (r === 1 ? 0.8 : 1))}
                className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-200"
                title="Đổi tốc độ nói"
              >
                <Turtle size={16} />
                <span>{rate === 1 ? '0.8x Chậm' : '1.0x Chuẩn'}</span>
              </button>
            </div>

            {/* Pagination */}
            <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-4 text-xs font-semibold text-slate-400 dark:border-slate-800">
              <button
                onClick={() => setIndex((i) => (i - 1 + items.length) % items.length)}
                className="flex items-center gap-1 rounded-xl px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <ArrowLeft size={14} /> Trước
              </button>
              <span>
                {index + 1} / {items.length}
              </span>
              <button
                onClick={() => setIndex((i) => (i + 1) % items.length)}
                className="flex items-center gap-1 rounded-xl px-3 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Sau <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Voice Record & Matching Studio */}
          <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-md dark:border-slate-800/80 dark:bg-[#111827]">
            {speechSupported() ? (
              <button
                onClick={record}
                disabled={listening}
                className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm text-white shadow-md transition active:scale-98 disabled:opacity-60 ${
                  listening
                    ? 'bg-rose-600 shadow-rose-600/30 animate-pulse'
                    : 'bg-emerald-600 shadow-emerald-600/25 hover:bg-emerald-700'
                }`}
              >
                <Mic size={18} className={listening ? 'animate-bounce' : ''} />
                <span>{listening ? 'Đang lắng nghe… Hãy đọc ngay!' : '🎤 Bắt đầu ghi âm Shadowing'}</span>
              </button>
            ) : (
              <div className="rounded-2xl bg-amber-50 p-4 text-xs font-medium text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                Tính năng nhận diện giọng nói cần trình duyệt Chrome hoặc Edge để hoạt động.
              </div>
            )}

            {/* Analysis Result */}
            {transcript && (
              <div className="mt-5 space-y-3 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                <div className="text-xs text-slate-500">
                  Hệ thống nhận diện được: <i className="text-slate-800 dark:text-slate-200 font-semibold">&ldquo;{transcript}&rdquo;</i>
                </div>

                <div className="text-base sm:text-lg leading-relaxed pt-1">
                  {marks.map((m, i) => (
                    <span
                      key={i}
                      className={`mr-1.5 inline-block rounded-lg px-2 py-0.5 text-xs sm:text-sm font-bold ${
                        m.hit
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          : 'bg-rose-100 text-rose-800 line-through dark:bg-rose-950 dark:text-rose-300'
                      }`}
                    >
                      {m.word}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-slate-200/60 pt-2 text-xs font-bold text-slate-700 dark:border-slate-700 dark:text-slate-200">
                  <div className="flex items-center gap-1">
                    <Award size={15} className="text-amber-500" />
                    <span>Độ chuẩn xác: {pct}%</span>
                  </div>
                  <span className="text-slate-400">
                    ({hitCount}/{marks.length} từ khớp)
                  </span>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
