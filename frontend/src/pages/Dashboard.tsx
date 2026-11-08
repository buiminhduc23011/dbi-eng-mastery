import { useEffect, useState } from 'react';
import { api, type Dashboard } from '../lib/api';
import { speak } from '../lib/speech';
import {
  Flame,
  Layers,
  PenLine,
  Trophy,
  Zap,
  AlertTriangle,
  ArrowRight,
  Volume2,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import type { TabId } from '../App';

interface Props {
  go: (tab: TabId) => void;
  onRefresh?: () => void;
}

export default function DashboardPage({ go, onRefresh }: Props) {
  const [data, setData] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadData = () => {
    setLoading(true);
    setError('');
    api
      .get<Dashboard>('/dashboard')
      .then((r) => {
        setData(r.data);
        onRefresh?.();
      })
      .catch(() => setError('Không thể kết nối đến máy chủ API backend (:8090). Vui lòng kiểm tra lại.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
        <div className="flex items-center gap-2 font-bold">
          <AlertTriangle size={20} className="text-red-500" />
          <span>Lỗi kết nối</span>
        </div>
        <p className="mt-2 text-sm">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 flex items-center gap-1.5 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-red-700"
        >
          <RefreshCw size={14} /> Thử lại
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center p-8 text-center text-slate-500">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        <div className="mt-4 text-sm font-semibold">Đang tải dữ liệu học tập…</div>
      </div>
    );
  }

  if (!data) return null;

  const maxForecast = Math.max(1, ...data.forecast.map((f) => f.count));
  const progressPct = Math.min(100, Math.round((data.todayReviewed / Math.max(1, data.dailyTarget)) * 100));

  const stats = [
    {
      icon: Flame,
      label: 'Chuỗi ngày học',
      value: `${data.streak} ngày`,
      accentBg: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400',
      badge: data.streak > 0 ? 'Đang duy trì' : 'Bắt đầu ngay',
    },
    {
      icon: Layers,
      label: 'Thẻ cần ôn',
      value: data.cardsDue,
      accentBg: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
      badge: data.cardsDue > 0 ? `${data.cardsDue} thẻ đến hạn` : 'Hoàn thành!',
      action: () => go('review'),
    },
    {
      icon: PenLine,
      label: 'Câu phản xạ',
      value: data.drillsDue,
      accentBg: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
      badge: data.drillsDue > 0 ? `${data.drillsDue} câu` : 'Đã xong',
      action: () => go('drills'),
    },
    {
      icon: Trophy,
      label: 'Đã thuộc lòng',
      value: `${data.masteredCount}/${data.totalCards}`,
      accentBg: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400',
      badge: `${Math.round((data.masteredCount / Math.max(1, data.totalCards)) * 100)}% bộ thẻ`,
      action: () => go('typing'),
    },
    {
      icon: Zap,
      label: 'Mục tiêu hôm nay',
      value: `${data.todayReviewed}/${data.dailyTarget}`,
      accentBg: 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400',
      badge: progressPct >= 100 ? 'Đạt chỉ tiêu 🎉' : `${progressPct}%`,
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Hero Motivational Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-violet-800 p-5 sm:p-7 text-white shadow-lg shadow-indigo-600/20">
        <div className="relative z-10 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold backdrop-blur-md">
                <Flame size={14} className="fill-orange-400 text-orange-400" />
                Chuỗi {data.streak} ngày liên tiếp
              </span>
              {progressPct >= 100 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-400/20 px-2.5 py-0.5 text-xs font-bold text-emerald-200">
                  <CheckCircle2 size={13} /> Hoàn thành mục tiêu ngày
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              {data.cardsDue > 0 ? `Bạn có ${data.cardsDue} thẻ từ vựng cần ôn tập` : 'Tuyệt vời! Bạn đã hoàn thành tất cả thẻ hôm nay'}
            </h1>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:shrink-0">
            {data.cardsDue > 0 ? (
              <button
                onClick={() => go('review')}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-md transition-all hover:bg-indigo-50 active:scale-95"
              >
                <span>Ôn tập ngay</span>
                <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-extrabold text-indigo-700">
                  {data.cardsDue}
                </span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => go('drills')}
                className="flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-indigo-700 shadow-md transition-all hover:bg-indigo-50 active:scale-95"
              >
                <span>Luyện phản xạ câu</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar inside banner */}
        <div className="relative z-10 mt-5 pt-4 border-t border-white/15">
          <div className="flex items-center justify-between text-xs font-medium text-indigo-100 mb-1.5">
            <span>Tiến độ mục tiêu ngày ({data.todayReviewed} / {data.dailyTarget} lượt)</span>
            <span className="font-bold">{progressPct}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/20">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all duration-700"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {/* Decorative background light */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-64 w-64 rounded-full bg-violet-400/20 blur-3xl" />
      </div>

      {/* Top 5 Stat Cards */}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.label}
            onClick={s.action}
            className={`group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm transition-all duration-200 hover:shadow-md hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827] dark:hover:border-slate-700 ${
              s.action ? 'cursor-pointer active:scale-98' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.accentBg}`}>
                <s.icon size={20} className="stroke-[2.2]" />
              </div>
              <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate max-w-[90px]">
                {s.badge}
              </span>
            </div>
            <div className="mt-3">
              <div className="text-xl sm:text-2xl font-black tracking-tight">{s.value}</div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Main Charts & Analytics Grid */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-2">
        {/* 7-day Review Forecast */}
        <div className="rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-[#111827]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-bold text-base sm:text-lg">
              <TrendingUp size={18} className="text-indigo-600 dark:text-indigo-400" />
              Lịch ôn tập 7 ngày tới
            </h2>
          </div>

          <div className="flex h-44 items-end gap-2 sm:gap-3 px-1 pt-4 pb-2 border-b border-slate-100 dark:border-slate-800/60">
            {data.forecast.map((f, i) => {
              const isToday = i === 0;
              const barHeight = Math.max(12, (f.count / maxForecast) * 110);
              return (
                <div key={f.date} className="group relative flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                  <span
                    className={`text-[11px] font-bold transition-all ${
                      isToday
                        ? 'text-indigo-600 dark:text-indigo-400 scale-110'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {f.count}
                  </span>
                  <div
                    className={`w-full rounded-t-xl transition-all duration-300 group-hover:opacity-90 ${
                      isToday
                        ? 'bg-gradient-to-t from-indigo-600 to-violet-500 shadow-sm shadow-indigo-500/30'
                        : f.count > 0
                        ? 'bg-indigo-400/80 dark:bg-indigo-600/60'
                        : 'bg-slate-200 dark:bg-slate-800'
                    }`}
                    style={{ height: `${barHeight}px` }}
                  />
                  <span
                    className={`text-[10px] font-medium truncate ${
                      isToday
                        ? 'font-bold text-indigo-600 dark:text-indigo-400'
                        : 'text-slate-500 dark:text-slate-400'
                    }`}
                  >
                    {isToday ? 'Hôm nay' : f.date}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={() => go('review')}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition-all hover:bg-indigo-700 active:scale-98"
          >
            <span>Bắt đầu phiên ôn tập</span>
            <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">
              {data.cardsDue} thẻ đến hạn
            </span>
            <ArrowRight size={16} />
          </button>
        </div>

        {/* Leech Cards (Từ vựng hay quên / cần củng cố) */}
        <div className="flex flex-col justify-between rounded-3xl border border-slate-200/80 bg-white p-4 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-[#111827]">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="flex items-center gap-2 font-bold text-base sm:text-lg">
                <AlertTriangle size={18} className="text-red-500" />
                Từ vựng cần ôn lại
              </h2>
              <span className="text-xs text-slate-500">Top 10 từ</span>
            </div>

            {data.leeches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-500">
                <CheckCircle2 size={32} className="text-emerald-500 mb-2" />
                <div className="font-bold text-sm text-slate-700 dark:text-slate-300">Không có từ khó nào!</div>
                <div className="text-xs">Bạn ghi nhớ rất tốt, không có từ nào bị đánh dấu Leech.</div>
              </div>
            ) : (
              <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 no-scrollbar">
                {data.leeches.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/70 p-2.5 transition-all hover:bg-slate-100 dark:border-slate-800/50 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => speak(l.term)}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-700 shadow-sm hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-700 dark:text-slate-200"
                        title="Nghe phát âm"
                      >
                        <Volume2 size={15} />
                      </button>
                      <div className="min-w-0">
                        <div className="font-bold text-sm tracking-tight truncate">{l.term}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{l.meaningVi}</div>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-600 dark:bg-red-950/80 dark:text-red-300">
                      ×{l.mistakeCount} lỗi
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-xs text-slate-500">
            <span>Gemini AI gọi hôm nay:</span>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {data.aiCallsToday} lượt (On-demand)
            </span>
          </div>
        </div>
      </div>

      {/* Quick Launch Cards (Mobile & Desktop) */}
      <div className="grid gap-3 sm:grid-cols-3">
        <button
          onClick={() => go('drills')}
          className="group flex flex-col justify-between rounded-2xl border border-sky-100 bg-gradient-to-br from-sky-500 to-blue-600 p-4 sm:p-5 text-left text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-98"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <PenLine size={20} />
            </div>
            <ArrowRight size={18} className="opacity-70 transition-transform group-hover:translate-x-1" />
          </div>
          <div className="mt-4">
            <div className="font-bold text-base">Luyện phản xạ câu</div>
            <div className="text-xs text-sky-100 mt-0.5">Dịch câu nhanh từ tiếng Việt sang tiếng Anh</div>
          </div>
        </button>

        <button
          onClick={() => go('shadowing')}
          className="group flex flex-col justify-between rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-500 to-teal-600 p-4 sm:p-5 text-left text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-98"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <Trophy size={20} />
            </div>
            <ArrowRight size={18} className="opacity-70 transition-transform group-hover:translate-x-1" />
          </div>
          <div className="mt-4">
            <div className="font-bold text-base">Phòng luyện Shadowing</div>
            <div className="text-xs text-emerald-100 mt-0.5">Luyện phát âm và ngữ điệu tự nhiên</div>
          </div>
        </button>

        <button
          onClick={() => go('translator')}
          className="group flex flex-col justify-between rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-600 to-purple-700 p-4 sm:p-5 text-left text-white shadow-sm transition-all hover:shadow-md hover:scale-[1.01] active:scale-98"
        >
          <div className="flex items-center justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 backdrop-blur-md">
              <Sparkles size={20} />
            </div>
            <ArrowRight size={18} className="opacity-70 transition-transform group-hover:translate-x-1" />
          </div>
          <div className="mt-4">
            <div className="font-bold text-base">Dịch AI & Lưu thẻ</div>
            <div className="text-xs text-violet-100 mt-0.5">Dịch ngữ cảnh công việc và lưu thẻ nhanh</div>
          </div>
        </button>
      </div>
    </div>
  );
}
