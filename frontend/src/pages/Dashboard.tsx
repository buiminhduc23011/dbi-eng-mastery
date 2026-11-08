import { useEffect, useState } from 'react';
import { api, type Dashboard } from '../lib/api';
import { Flame, Layers, PenLine, Trophy, Zap, AlertTriangle } from 'lucide-react';

export default function DashboardPage({ go }: { go: (t: 'review' | 'drills' | 'shadowing' | 'translator' | 'cards') => void }) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<Dashboard>('/dashboard')
      .then((r) => setData(r.data))
      .catch(() => setError('Cannot reach backend API. Is it running on :8090?'));
  }, []);

  if (error) return <div className="rounded-xl bg-red-100 p-6 text-red-700 dark:bg-red-950 dark:text-red-300">{error}</div>;
  if (!data) return <div className="p-6 text-slate-500">Loading dashboard…</div>;

  const maxForecast = Math.max(1, ...data.forecast.map((f) => f.count));
  const stats = [
    { icon: Flame, label: 'Day streak', value: data.streak, color: 'text-orange-500' },
    { icon: Layers, label: 'Cards due', value: data.cardsDue, color: 'text-indigo-500' },
    { icon: PenLine, label: 'Drills due', value: data.drillsDue, color: 'text-sky-500' },
    { icon: Trophy, label: 'Mastered', value: `${data.masteredCount}/${data.totalCards}`, color: 'text-emerald-500' },
    { icon: Zap, label: `Today (${data.todayReviewed}/${data.dailyTarget})`, value: data.todayReviewed, color: 'text-amber-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl bg-white p-4 shadow-sm dark:bg-slate-900">
            <s.icon size={20} className={s.color} />
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
            <div className="text-xs text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <h2 className="mb-1 font-semibold">7-day review forecast</h2>
          <p className="mb-4 text-xs text-slate-500">Cards scheduled per day (offline SM-2)</p>
          <div className="flex h-36 items-end gap-2">
            {data.forecast.map((f) => (
              <div key={f.date} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-xs font-semibold">{f.count}</span>
                <div
                  className="w-full rounded-t bg-indigo-500"
                  style={{ height: `${Math.max(4, (f.count / maxForecast) * 100)}px` }}
                />
                <span className="text-[10px] text-slate-500">{f.date}</span>
              </div>
            ))}
          </div>
          <button
            onClick={() => go('review')}
            className="mt-4 w-full rounded-lg bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Start review session ({data.cardsDue} due)
          </button>
        </div>

        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <h2 className="mb-1 flex items-center gap-2 font-semibold">
            <AlertTriangle size={16} className="text-red-500" /> Leech cards
          </h2>
          <p className="mb-3 text-xs text-slate-500">Top 10 by mistake count — consider re-learning these</p>
          {data.leeches.length === 0 ? (
            <p className="text-sm text-slate-500">No leeches. Nice work!</p>
          ) : (
            <ul className="max-h-56 space-y-2 overflow-auto">
              {data.leeches.map((l) => (
                <li key={l.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-800">
                  <div>
                    <span className="font-semibold">{l.term}</span>
                    <span className="ml-2 text-xs text-slate-500">{l.meaningVi}</span>
                  </div>
                  <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600 dark:bg-red-950 dark:text-red-300">
                    ×{l.mistakeCount}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 text-xs text-slate-500">
            Gemini calls today: <span className="font-bold text-slate-700 dark:text-slate-200">{data.aiCallsToday}</span> (on-demand only)
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <button onClick={() => go('drills')} className="rounded-xl bg-sky-600 p-4 text-left text-white hover:bg-sky-700">
          <PenLine size={20} />
          <div className="mt-1 font-semibold">Sentence reflex drills</div>
          <div className="text-xs opacity-80">Translate VI → EN, graded offline</div>
        </button>
        <button onClick={() => go('shadowing')} className="rounded-xl bg-emerald-600 p-4 text-left text-white hover:bg-emerald-700">
          <Trophy size={20} />
          <div className="mt-1 font-semibold">Shadowing studio</div>
          <div className="text-xs opacity-80">Listen at 1.0x / 0.8x, then speak</div>
        </button>
        <button onClick={() => go('translator')} className="rounded-xl bg-violet-600 p-4 text-left text-white hover:bg-violet-700">
          <Layers size={20} />
          <div className="mt-1 font-semibold">AI polish + save to deck</div>
          <div className="text-xs opacity-80">Gemini on-demand, one click</div>
        </button>
      </div>
    </div>
  );
}
