import { useMemo, useState, useRef, useEffect } from 'react';
import type { HeatmapDay } from '../lib/api';
import { CalendarDays, Trophy, Flame, BarChart2 } from 'lucide-react';

interface Props {
  heatmap: HeatmapDay[];
  totalReviewed: number;
  streak: number;
  masteredCount: number;
  totalCards: number;
}

interface DayCell {
  date: string;
  count: number;
  dayOfWeek: number; // 0=Sun, 1=Mon, ..., 6=Sat
  isFuture: boolean;
}

interface WeekColumn {
  days: DayCell[];
  monthLabel?: string;
}

const MONTH_NAMES = [
  'Thg 1', 'Thg 2', 'Thg 3', 'Thg 4', 'Thg 5', 'Thg 6',
  'Thg 7', 'Thg 8', 'Thg 9', 'Thg 10', 'Thg 11', 'Thg 12',
];

const VI_DAYS = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];

export default function StudyHeatmap({
  heatmap,
  totalReviewed,
  streak,
  masteredCount,
  totalCards,
}: Props) {
  const [hovered, setHovered] = useState<{
    date: string;
    count: number;
    dayOfWeek: number;
    x: number;
    y: number;
  } | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to latest (rightmost) on mobile mount
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [heatmap]);

  // Group days into columns of 7 days (weeks: Sun..Sat)
  const weeks = useMemo<WeekColumn[]>(() => {
    if (!heatmap || heatmap.length === 0) return [];

    const map = new Map<string, number>();
    for (const d of heatmap) {
      map.set(d.date, d.count);
    }

    const firstDateStr = heatmap[0].date;
    const lastDateStr = heatmap[heatmap.length - 1].date;

    const [fy, fm, fd] = firstDateStr.split('-').map(Number);
    const [ly, lm, ld] = lastDateStr.split('-').map(Number);

    const start = new Date(fy, fm - 1, fd);
    const end = new Date(ly, lm - 1, ld);

    // Align start to preceding Sunday
    const startSunday = new Date(start);
    startSunday.setDate(start.getDate() - start.getDay());

    // Align end to following Saturday
    const endSaturday = new Date(end);
    endSaturday.setDate(end.getDate() + (6 - end.getDay()));

    const result: WeekColumn[] = [];
    let currentWeek: DayCell[] = [];
    let lastMonth = -1;

    const cur = new Date(startSunday);
    while (cur <= endSaturday) {
      const y = cur.getFullYear();
      const m = cur.getMonth();
      const d = cur.getDate();
      const dow = cur.getDay();

      const iso = `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const count = map.get(iso) ?? 0;
      const isFuture = cur > end;

      currentWeek.push({
        date: iso,
        count,
        dayOfWeek: dow,
        isFuture,
      });

      if (dow === 6) {
        let monthLabel: string | undefined = undefined;
        const firstDayOfMonth = currentWeek.find((item) => {
          const parts = item.date.split('-');
          return parts[2] === '01';
        });

        if (firstDayOfMonth) {
          const mIdx = Number(firstDayOfMonth.date.split('-')[1]) - 1;
          monthLabel = MONTH_NAMES[mIdx];
          lastMonth = mIdx;
        } else if (currentWeek[0]) {
          const mIdx = Number(currentWeek[0].date.split('-')[1]) - 1;
          if (mIdx !== lastMonth && result.length > 0 && result.length % 4 === 0) {
            monthLabel = MONTH_NAMES[mIdx];
            lastMonth = mIdx;
          }
        }

        result.push({ days: currentWeek, monthLabel });
        currentWeek = [];
      }

      cur.setDate(cur.getDate() + 1);
    }

    if (currentWeek.length > 0) {
      result.push({ days: currentWeek });
    }

    return result;
  }, [heatmap]);

  const activeDaysCount = useMemo(() => {
    return heatmap ? heatmap.filter((d) => d.count > 0).length : 0;
  }, [heatmap]);

  const masteryPct = Math.round((masteredCount / Math.max(1, totalCards)) * 100);

  const getColorClass = (count: number, isFuture: boolean) => {
    if (isFuture) return 'invisible';
    if (count <= 0) return 'bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800';
    if (count <= 3) return 'bg-[#9be9a8] dark:bg-[#0e4429] border border-[#8ce39b]/60 dark:border-[#0e4429]';
    if (count <= 8) return 'bg-[#40c463] dark:bg-[#006d32] border border-[#37b858]/60 dark:border-[#006d32]';
    if (count <= 15) return 'bg-[#30a14e] dark:bg-[#26a641] border border-[#2a9245]/60 dark:border-[#26a641]';
    return 'bg-[#216e39] dark:bg-[#39d353] border border-[#1b5a2e]/60 dark:border-[#39d353]';
  };

  const formatDateVi = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    const dow = VI_DAYS[dateObj.getDay()];
    return `${dow}, ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y}`;
  };

  return (
    <div className="relative rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
            <BarChart2 size={16} />
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
              Nhật ký học tập & Mức độ chuyên cần
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Biểu đồ nhiệt ghi nhận số thẻ đã ôn và mức độ chuyên cần qua từng ngày
            </p>
          </div>
        </div>

        <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          52 tuần gần nhất
        </span>
      </div>

      {/* Main Content Area: Responsive Grid (Heatmap + Side Analytics) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-center">
        {/* Left: Heatmap Canvas (lg:col-span-8 or 9) */}
        <div className="lg:col-span-8 xl:col-span-9 flex flex-col justify-between">
          <div
            ref={scrollRef}
            className="overflow-x-auto pb-2 no-scrollbar"
          >
            <div className="inline-block min-w-full">
              {/* Month labels row */}
              <div className="flex text-[10px] text-slate-400 dark:text-slate-500 mb-1 pl-7">
                {weeks.map((w, idx) => (
                  <div key={idx} className="w-[12px] sm:w-[13px] mr-[3px] shrink-0 text-center">
                    {w.monthLabel ? (
                      <span className="whitespace-nowrap font-medium">{w.monthLabel}</span>
                    ) : null}
                  </div>
                ))}
              </div>

              {/* Matrix: 7 rows x 52+ columns */}
              <div className="flex">
                {/* Day of week labels */}
                <div className="flex flex-col justify-between text-[9px] text-slate-400 dark:text-slate-500 pr-1.5 shrink-0 select-none py-0.5 h-[102px] sm:h-[110px]">
                  <span className="h-[12px] sm:h-[13px] leading-[12px]"></span>
                  <span className="h-[12px] sm:h-[13px] leading-[12px]">T2</span>
                  <span className="h-[12px] sm:h-[13px] leading-[12px]"></span>
                  <span className="h-[12px] sm:h-[13px] leading-[12px]">T4</span>
                  <span className="h-[12px] sm:h-[13px] leading-[12px]"></span>
                  <span className="h-[12px] sm:h-[13px] leading-[12px]">T6</span>
                  <span className="h-[12px] sm:h-[13px] leading-[12px]"></span>
                </div>

                {/* Weeks columns */}
                <div className="flex gap-[3px]">
                  {weeks.map((week, wIdx) => (
                    <div key={wIdx} className="flex flex-col gap-[3px]">
                      {week.days.map((day) => (
                        <div
                          key={day.date}
                          onMouseEnter={(e) => {
                            if (!day.isFuture) {
                              const rect = e.currentTarget.getBoundingClientRect();
                              setHovered({
                                date: day.date,
                                count: day.count,
                                dayOfWeek: day.dayOfWeek,
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                              });
                            }
                          }}
                          onMouseLeave={() => setHovered(null)}
                          className={`w-[12px] h-[12px] sm:w-[13px] sm:h-[13px] rounded-[2.5px] transition-transform duration-100 hover:scale-125 cursor-pointer ${getColorClass(
                            day.count,
                            day.isFuture,
                          )}`}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Footer inside Heatmap Column */}
          <div className="mt-2.5 pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
            <span className="text-[11px] text-slate-400">
              Tổng {totalReviewed.toLocaleString()} thẻ đã ôn trong 52 tuần qua
            </span>

            {/* GitHub Legend */}
            <div className="flex items-center gap-1.5 text-[11px]">
              <span>Ít</span>
              <div className="flex items-center gap-[3px]">
                <span className="w-[11px] h-[11px] rounded-[2px] bg-slate-100 dark:bg-slate-800/80 border border-slate-200/50 dark:border-slate-800" />
                <span className="w-[11px] h-[11px] rounded-[2px] bg-[#9be9a8] dark:bg-[#0e4429]" />
                <span className="w-[11px] h-[11px] rounded-[2px] bg-[#40c463] dark:bg-[#006d32]" />
                <span className="w-[11px] h-[11px] rounded-[2px] bg-[#30a14e] dark:bg-[#26a641]" />
                <span className="w-[11px] h-[11px] rounded-[2px] bg-[#216e39] dark:bg-[#39d353]" />
              </div>
              <span>Nhiều</span>
            </div>
          </div>
        </div>

        {/* Right Side Stats Panel (Fills the empty space perfectly!) */}
        <div className="lg:col-span-4 xl:col-span-3 border-t lg:border-t-0 lg:border-l border-slate-100 dark:border-slate-800/80 pt-3 lg:pt-0 lg:pl-5 flex flex-col justify-between gap-3">
          {/* Stat 1: Số ngày đã học */}
          <div className="flex items-center justify-between lg:flex-col lg:items-start p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
                <CalendarDays size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Số ngày đã học
              </span>
            </div>
            <div className="text-right lg:text-left lg:mt-1">
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono">
                {activeDaysCount} ngày
              </span>
              <span className="hidden lg:block text-[10px] text-slate-400">
                Có hoạt động ôn tập trong năm
              </span>
            </div>
          </div>

          {/* Stat 2: Số thẻ đã thuộc lòng */}
          <div className="flex items-center justify-between lg:flex-col lg:items-start p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
                <Trophy size={15} />
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Số thẻ đã thuộc
              </span>
            </div>
            <div className="text-right lg:text-left lg:mt-1">
              <span className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-mono">
                {masteredCount}/{totalCards} thẻ
              </span>
              <span className="hidden lg:block text-[10px] text-slate-400">
                Đạt cấp độ Mastered ({masteryPct}%)
              </span>
            </div>
          </div>

          {/* Stat 3: Chuỗi ngày liên tục */}
          <div className="flex items-center justify-between lg:flex-col lg:items-start p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-orange-50 text-orange-600 dark:bg-orange-950/60 dark:text-orange-400">
                <Flame size={15} className="fill-orange-500 text-orange-500" />
              </div>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">
                Chuỗi học tập
              </span>
            </div>
            <div className="text-right lg:text-left lg:mt-1">
              <span className="text-base sm:text-lg font-bold text-orange-600 dark:text-orange-400 font-mono">
                {streak} ngày liên tiếp
              </span>
              <span className="hidden lg:block text-[10px] text-slate-400">
                Duy trì nhịp độ phản xạ hàng ngày
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Tooltip */}
      {hovered && (
        <div
          className="fixed z-50 pointer-events-none -translate-x-1/2 -translate-y-full rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white shadow-xl dark:bg-slate-800 border border-slate-700/80 mb-2 whitespace-nowrap"
          style={{ left: `${hovered.x}px`, top: `${hovered.y - 6}px` }}
        >
          <div className="font-bold text-emerald-400">
            {hovered.count > 0 ? `${hovered.count} thẻ đã ôn` : 'Chưa có hoạt động'}
          </div>
          <div className="text-[11px] text-slate-300">{formatDateVi(hovered.date)}</div>
        </div>
      )}
    </div>
  );
}
