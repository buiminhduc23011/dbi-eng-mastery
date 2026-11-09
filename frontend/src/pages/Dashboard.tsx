import { useEffect, useState } from 'react';
import { api, type Dashboard } from '../lib/api';
import { speak } from '../lib/speech';
import StudyHeatmap from './StudyHeatmap';
import {
  Flame,
  PenLine,
  Trophy,
  AlertTriangle,
  ArrowRight,
  Volume2,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Target,
  Mic,
  Brain,
  Calendar,
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
      .catch(() => setError('Không thể kết nối đến máy chủ backend (:8090). Vui lòng kiểm tra lại.'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
        <div className="flex items-center gap-2 font-bold text-sm">
          <AlertTriangle size={18} className="text-red-500" />
          <span>Lỗi kết nối API</span>
        </div>
        <p className="mt-1.5 text-xs text-red-700 dark:text-red-300">{error}</p>
        <button
          onClick={loadData}
          className="mt-3 flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-red-700 transition"
        >
          <RefreshCw size={13} /> Thử lại
        </button>
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center p-8 text-center text-slate-500">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        <div className="mt-3 text-xs font-semibold tracking-wide uppercase text-slate-400">Đang đồng bộ dữ liệu…</div>
      </div>
    );
  }

  if (!data) return null;

  const maxForecast = Math.max(1, ...data.forecast.map((f) => f.count));
  const totalUpcoming = data.forecast.reduce((sum, f) => sum + f.count, 0);
  const progressPct = Math.min(100, Math.round((data.todayReviewed / Math.max(1, data.dailyTarget)) * 100));
  const masteryPct = Math.round((data.masteredCount / Math.max(1, data.totalCards)) * 100);

  const stats = [
    {
      label: 'Chuỗi học tập',
      value: `${data.streak} ngày`,
      sub: data.streak > 0 ? 'Đang duy trì đều đặn' : 'Bắt đầu phiên học mới',
      icon: Flame,
      iconColor: 'text-orange-500',
      iconBg: 'bg-orange-50 dark:bg-orange-950/40',
      badge: 'Streak',
    },
    {
      label: 'Mục tiêu hôm nay',
      value: `${data.todayReviewed}/${data.dailyTarget}`,
      sub: progressPct >= 100 ? 'Đã hoàn thành xuất sắc 🎉' : `Đạt ${progressPct}% chỉ tiêu ngày`,
      icon: Target,
      iconColor: 'text-indigo-500',
      iconBg: 'bg-indigo-50 dark:bg-indigo-950/40',
      badge: `${progressPct}%`,
    },
    {
      label: 'Đã thuộc lòng',
      value: `${data.masteredCount}/${data.totalCards}`,
      sub: `${masteryPct}% kho thẻ đạt mức nhớ sâu`,
      icon: Trophy,
      iconColor: 'text-emerald-500',
      iconBg: 'bg-emerald-50 dark:bg-emerald-950/40',
      badge: `${masteryPct}%`,
      action: () => go('typing'),
    },
    {
      label: 'Từ vựng cần củng cố',
      value: `${data.leeches.length} từ`,
      sub: data.leeches.length > 0 ? 'Thẻ thường xuyên quên' : 'Không có từ khó nào',
      icon: AlertTriangle,
      iconColor: data.leeches.length > 0 ? 'text-rose-500' : 'text-emerald-500',
      iconBg: data.leeches.length > 0 ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-emerald-50 dark:bg-emerald-950/40',
      badge: data.leeches.length > 0 ? 'Cần ôn' : 'Tốt',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Today's Command Center (Modern Sleek Hero) */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="relative z-10 flex flex-col justify-between gap-5 md:flex-row md:items-center">
          {/* Left info */}
          <div className="space-y-2 max-w-xl">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 font-bold text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300">
                <Calendar size={12} />
                Hôm nay
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 font-bold text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                <Flame size={12} className="fill-orange-500 text-orange-500" />
                Chuỗi {data.streak} ngày liên tục
              </span>
              {progressPct >= 100 && (
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                  <CheckCircle2 size={12} />
                  Đạt chỉ tiêu hôm nay
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              {data.cardsDue > 0 ? (
                <>
                  Bạn có <span className="text-indigo-600 dark:text-indigo-400">{data.cardsDue} thẻ</span> &{' '}
                  <span className="text-sky-600 dark:text-sky-400">{data.drillsDue} câu phản xạ</span> đến hạn
                </>
              ) : (
                <>Tất cả thẻ hôm nay đã hoàn thành! Tiếp tục luyện phản xạ.</>
              )}
            </h1>

            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Hệ thống SRS đã tối ưu lịch ôn theo đường cong quên lãng Ebbinghaus. Hoàn thành phiên ôn tập giúp đưa từ vựng vào vùng trí nhớ dài hạn.
            </p>

            {/* Daily Goal Mini Progress */}
            <div className="pt-2">
              <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                <span className="flex items-center gap-1">
                  <Target size={12} className="text-indigo-500" />
                  Tiến độ mục tiêu ngày: <strong className="text-slate-800 dark:text-slate-200">{data.todayReviewed}/{data.dailyTarget} lượt</strong>
                </span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400">{progressPct}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-700"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right Action Buttons */}
          <div className="flex flex-col sm:flex-row md:flex-col gap-2.5 shrink-0 min-w-[200px]">
            {data.cardsDue > 0 ? (
              <button
                onClick={() => go('review')}
                className="group flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm shadow-indigo-600/30 transition-all hover:bg-indigo-700 active:scale-98"
              >
                <span>Bắt đầu ôn tập ({data.cardsDue} thẻ)</span>
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </button>
            ) : (
              <button
                onClick={() => go('review')}
                className="group flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition-all hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100 active:scale-98"
              >
                <span>Ôn lại bộ thẻ</span>
                <ArrowRight size={15} className="transition-transform group-hover:translate-x-1" />
              </button>
            )}

            {data.drillsDue > 0 && (
              <button
                onClick={() => go('drills')}
                className="flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/80 active:scale-98"
              >
                <PenLine size={14} className="text-sky-500" />
                <span>Luyện {data.drillsDue} câu phản xạ</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Metrics Bento Strip */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div
            key={s.label}
            onClick={s.action}
            className={`group rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 shadow-sm transition-all duration-200 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-slate-700 ${
              s.action ? 'cursor-pointer active:scale-98' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${s.iconBg} ${s.iconColor}`}>
                <s.icon size={16} />
              </div>
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                {s.badge}
              </span>
            </div>
            <div className="mt-2.5">
              <div className="text-lg sm:text-xl font-bold tracking-tight text-slate-900 dark:text-white font-mono">
                {s.value}
              </div>
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">{s.label}</div>
              <div className="mt-0.5 text-[11px] text-slate-400 dark:text-slate-500 truncate">{s.sub}</div>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Middle Balanced Grid: Forecast & Leech Cards */}
      <div className="grid gap-4 sm:gap-5 lg:grid-cols-12 items-stretch">
        {/* Left: 7-day Review Forecast (lg:col-span-7) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 lg:col-span-7">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                  <TrendingUp size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Lịch ôn tập 7 ngày tới</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Dự báo tải ôn tập thẻ SRS theo thuật toán SM-2</p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {totalUpcoming} thẻ tổng cộng
              </span>
            </div>

            {/* Interactive Chart */}
            <div className="flex h-36 items-end gap-2 sm:gap-3 px-1 pt-6 pb-2">
              {data.forecast.map((f, i) => {
                const isToday = i === 0;
                const barHeight = Math.max(8, (f.count / maxForecast) * 85);
                return (
                  <div key={f.date} className="group relative flex flex-1 flex-col items-center gap-1.5 h-full justify-end">
                    <span
                      className={`text-[10px] font-bold transition-all ${
                        isToday
                          ? 'text-indigo-600 dark:text-indigo-400 scale-105'
                          : 'text-slate-500 dark:text-slate-400'
                      }`}
                    >
                      {f.count}
                    </span>
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 group-hover:opacity-90 ${
                        isToday
                          ? 'bg-indigo-600 dark:bg-indigo-500 shadow-sm shadow-indigo-500/30'
                          : f.count > 0
                          ? 'bg-indigo-200 dark:bg-indigo-900/60'
                          : 'bg-slate-100 dark:bg-slate-800'
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
          </div>

          {/* Forecast Insights & Distribution Summary (Eliminates the empty gap!) */}
          <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">Cao điểm ôn tập:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  Hôm nay ({data.forecast[0]?.count || 0} thẻ)
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-2 dark:bg-slate-800/40">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">6 ngày tiếp theo:</span>
                <div className="font-bold text-slate-800 dark:text-slate-200">
                  {totalUpcoming - (data.forecast[0]?.count || 0)} thẻ (Ổn định)
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-indigo-50/60 p-2.5 text-xs text-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200">
              <Brain size={16} className="shrink-0 text-indigo-600 dark:text-indigo-400" />
              <span className="text-[11px] leading-tight">
                Khoảng cách ôn tập đang giãn nở đều giúp duy trì phản xạ dài hạn với thời gian học ít nhất mỗi ngày.
              </span>
            </div>
          </div>
        </div>

        {/* Right: Leech Cards (lg:col-span-5) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80 lg:col-span-5">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800/80">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400">
                  <AlertTriangle size={15} />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white">Từ vựng cần củng cố</h2>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Các từ hay trả lời sai gần đây</p>
                </div>
              </div>
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                {data.leeches.length} từ
              </span>
            </div>

            {data.leeches.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center text-slate-500">
                <CheckCircle2 size={28} className="text-emerald-500 mb-1.5" />
                <div className="font-bold text-xs text-slate-800 dark:text-slate-200">Không có từ khó nào!</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Bạn đang ghi nhớ các bộ thẻ rất tốt.</div>
              </div>
            ) : (
              <ul className="mt-2.5 max-h-[220px] space-y-1.5 overflow-y-auto pr-1 no-scrollbar">
                {data.leeches.map((l) => (
                  <li
                    key={l.id}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-2 transition-all hover:bg-slate-100 dark:border-slate-800/60 dark:bg-slate-800/40 dark:hover:bg-slate-800/80"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => speak(l.term)}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-slate-600 shadow-xs hover:bg-indigo-50 hover:text-indigo-600 dark:bg-slate-700 dark:text-slate-300 transition"
                        title="Nghe phát âm"
                      >
                        <Volume2 size={13} />
                      </button>
                      <div className="min-w-0">
                        <div className="font-bold text-xs tracking-tight truncate text-slate-900 dark:text-white">
                          {l.term}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{l.meaningVi}</div>
                      </div>
                    </div>
                    <span className="shrink-0 rounded-md bg-rose-100/80 px-2 py-0.5 text-[10px] font-bold text-rose-700 dark:bg-rose-950/80 dark:text-rose-300">
                      ×{l.mistakeCount} lỗi
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* 4. GitHub-style Study Activity Heatmap */}
      <StudyHeatmap
        heatmap={data.heatmap ?? []}
        totalReviewed={data.totalReviewedLastYear ?? 0}
        streak={data.streak}
        masteredCount={data.masteredCount}
        totalCards={data.totalCards}
      />

      {/* 5. Supplemental Practice Modes (Sleek Modern Bento Cards) */}
      <div>
        <div className="mb-2.5 flex items-center justify-between">
          <h3 className="text-xs font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400">
            Chế độ luyện tập bổ trợ
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {/* Card 1: Sentence Drills */}
          <div
            onClick={() => go('drills')}
            className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:border-sky-400 hover:shadow-md cursor-pointer active:scale-98 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-sky-500"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400">
                <PenLine size={18} />
              </div>
              <ArrowRight size={15} className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-sky-600 dark:group-hover:text-sky-400" />
            </div>
            <div className="mt-3">
              <div className="font-bold text-sm text-slate-900 dark:text-white">Luyện phản xạ câu</div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Dịch nhanh câu giao tiếp công sở, daily meeting & kỹ thuật với AI chấm điểm tức thì.
              </p>
            </div>
          </div>

          {/* Card 2: Shadowing Studio */}
          <div
            onClick={() => go('shadowing')}
            className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:border-emerald-400 hover:shadow-md cursor-pointer active:scale-98 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-emerald-500"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Mic size={18} />
              </div>
              <ArrowRight size={15} className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400" />
            </div>
            <div className="mt-3">
              <div className="font-bold text-sm text-slate-900 dark:text-white">Phòng luyện Shadowing</div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Luyện nghe tốc độ 1.0x / 0.8x, ghi âm và so khớp phát âm bản xứ từng âm tiết.
              </p>
            </div>
          </div>

          {/* Card 3: AI Translator */}
          <div
            onClick={() => go('translator')}
            className="group flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all duration-200 hover:border-indigo-400 hover:shadow-md cursor-pointer active:scale-98 dark:border-slate-800 dark:bg-slate-900/80 dark:hover:border-indigo-500"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <Sparkles size={18} />
              </div>
              <ArrowRight size={15} className="text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
            </div>
            <div className="mt-3">
              <div className="font-bold text-sm text-slate-900 dark:text-white">Dịch AI & Tạo thẻ SRS</div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Dịch văn phong Business / Casual và lưu cụm từ vựng cần nhớ vào thẻ SRS chỉ với 1 chạm.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
