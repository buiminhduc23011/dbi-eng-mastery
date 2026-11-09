import { useEffect, useState, useCallback } from 'react';
import {
  LayoutDashboard,
  Layers,
  PenLine,
  Mic,
  Languages,
  Library,
  Keyboard,
  Settings as SettingsIcon,
  Moon,
  Sun,
  Flame,
  Target,
  MoreHorizontal,
  X,
  ChevronRight,
} from 'lucide-react';
import DashboardPage from './pages/Dashboard';
import Review from './pages/Review';
import Drills from './pages/Drills';
import Typing from './pages/Typing';
import Shadowing from './pages/Shadowing';
import Translator from './pages/Translator';
import Cards from './pages/Cards';
import Settings from './pages/Settings';
import { api, type Dashboard } from './lib/api';

export type TabId = 'dashboard' | 'review' | 'typing' | 'drills' | 'shadowing' | 'translator' | 'cards' | 'settings';

interface TabItem {
  id: TabId;
  label: string;
  shortLabel: string;
  icon: typeof LayoutDashboard;
  badgeKey?: 'cardsDue' | 'drillsDue';
  description?: string;
}

const PRIMARY_TABS: TabItem[] = [
  { id: 'dashboard', label: 'Tổng quan', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'review', label: 'Ôn tập SRS', shortLabel: 'Ôn tập', icon: Layers, badgeKey: 'cardsDue' },
  { id: 'drills', label: 'Luyện câu', shortLabel: 'Luyện câu', icon: PenLine, badgeKey: 'drillsDue' },
  { id: 'typing', label: 'Gõ từ', shortLabel: 'Gõ từ', icon: Keyboard },
];

const SECONDARY_TABS: TabItem[] = [
  { id: 'shadowing', label: 'Phát âm', shortLabel: 'Phát âm', icon: Mic, description: 'Luyện nghe 1.0x / 0.8x & so khớp giọng nói' },
  { id: 'translator', label: 'Dịch AI', shortLabel: 'Dịch AI', icon: Languages, description: 'Dịch công sở/đời sống & lưu nhanh vào thẻ SRS' },
  { id: 'cards', label: 'Kho thẻ', shortLabel: 'Kho thẻ', icon: Library, description: 'Tìm kiếm, sửa, xoá và xuất/nhập dữ liệu' },
];

const ALL_TABS: TabItem[] = [...PRIMARY_TABS, ...SECONDARY_TABS];

export default function App() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [dark, setDark] = useState(() => localStorage.getItem('em-theme') !== 'light');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dashData, setDashData] = useState<Dashboard | null>(null);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('em-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const refreshDashboard = useCallback(() => {
    api
      .get<Dashboard>('/dashboard')
      .then((r) => setDashData(r.data))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    refreshDashboard();
    const interval = window.setInterval(refreshDashboard, 60000);
    return () => window.clearInterval(interval);
  }, [refreshDashboard]);

  const go = (id: TabId) => {
    setTab(id);
    setSheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isSecondaryActive = SECONDARY_TABS.some((t) => t.id === tab);

  const getBadge = (key?: 'cardsDue' | 'drillsDue') => {
    if (!dashData || !key) return null;
    const count = dashData[key];
    if (count <= 0) return null;
    return count > 99 ? '99+' : count;
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 transition-colors duration-200 dark:bg-[#0b0f19] dark:text-slate-100">
      {/* Top Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-[#0b0f19]/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2 sm:px-4 sm:py-2.5">
          {/* Logo & Brand */}
          <div
            className="flex items-center gap-2.5 cursor-pointer select-none group"
            onClick={() => go('dashboard')}
          >
            <img
              src="/dbi-logo.svg"
              alt="DBI"
              className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl shadow-xs transition-transform group-hover:scale-105"
            />
            <div>
              <div className="flex items-center gap-1.5 text-sm sm:text-base font-extrabold tracking-tight">
                EngMastery
                <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/70 dark:text-indigo-400">
                  SRS
                </span>
              </div>
              <div className="hidden sm:block text-[10px] font-medium text-slate-500 dark:text-slate-400">
                Spaced Repetition Lab
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 md:flex">
            {ALL_TABS.map((t) => {
              const badge = getBadge(t.badgeKey);
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => go(t.id)}
                  className={`relative flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60 dark:hover:text-white'
                  }`}
                >
                  <t.icon size={14} className={active ? 'stroke-[2.2]' : 'stroke-[1.8]'} />
                  <span>{t.label}</span>
                  {badge && (
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        active
                          ? 'bg-white/20 text-white dark:bg-slate-900/20 dark:text-slate-900'
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300'
                      }`}
                    >
                      {badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Header Quick Stats & Controls */}
          <div className="flex items-center gap-2">
            {/* Streak Badge */}
            {dashData && dashData.streak > 0 && (
              <div
                className="flex items-center gap-1 rounded-lg bg-orange-50 px-2 py-1 text-xs font-bold text-orange-600 border border-orange-200/60 dark:border-orange-900/40 dark:bg-orange-950/40 dark:text-orange-400"
                title={`${dashData.streak} ngày học liên tiếp!`}
              >
                <Flame size={13} className="fill-orange-500 text-orange-500" />
                <span>{dashData.streak}d</span>
              </div>
            )}

            {/* Daily Target Progress Pill */}
            {dashData && (
              <div
                className="hidden sm:flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                title="Tiến độ mục tiêu hôm nay"
              >
                <Target size={13} className="text-indigo-500 dark:text-indigo-400" />
                <span>
                  {dashData.todayReviewed}/{dashData.dailyTarget}
                </span>
              </div>
            )}

            {/* Settings button */}
            <button
              onClick={() => go('settings')}
              className={`flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ${
                tab === 'settings' ? 'ring-2 ring-indigo-500/50' : ''
              }`}
              title="Cài đặt hệ thống"
              aria-label="Cài đặt"
            >
              <SettingsIcon size={15} />
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6 pb-24 md:pb-8">
        {tab === 'dashboard' && <DashboardPage go={go} onRefresh={refreshDashboard} />}
        {tab === 'review' && <Review onSessionComplete={refreshDashboard} />}
        {tab === 'typing' && <Typing onWordMastered={refreshDashboard} />}
        {tab === 'drills' && <Drills onDrillComplete={refreshDashboard} />}
        {tab === 'shadowing' && <Shadowing />}
        {tab === 'translator' && <Translator onCardSaved={refreshDashboard} />}
        {tab === 'cards' && <Cards onCardsChanged={refreshDashboard} />}
        {tab === 'settings' && <Settings />}
      </main>

      {/* Desktop Footer */}
      <footer className="hidden md:block border-t border-slate-200/60 dark:border-slate-800/60 py-4 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between">
          <div>EngMastery · Spaced Repetition English Lab</div>
          <div>v2.0</div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Dock) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 block md:hidden border-t border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0b0f19]/95 pb-safe">
        <div className="grid grid-cols-5 h-14 items-center px-1">
          {PRIMARY_TABS.map((t) => {
            const active = tab === t.id;
            const badge = getBadge(t.badgeKey);
            return (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
                  active
                    ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                }`}
              >
                <div className="relative">
                  <t.icon size={18} className={active ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
                  {badge && (
                    <span className="absolute -top-1.5 -right-2 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-extrabold text-white">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 text-[10px] leading-tight font-medium">{t.shortLabel}</span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setSheetOpen((o) => !o)}
            className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
              isSecondaryActive || sheetOpen || tab === 'settings'
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <MoreHorizontal size={18} />
            <span className="mt-0.5 text-[10px] leading-tight font-medium">Thêm</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Sheet Modal */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end md:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSheetOpen(false)}
          />

          <div className="relative z-10 rounded-t-2xl border-t border-slate-200/80 bg-white p-4 shadow-2xl dark:border-slate-800/80 dark:bg-[#111827] pb-safe max-h-[85vh] overflow-y-auto">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />

            <div className="mb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold">Tính năng mở rộng</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Công cụ học tập & cài đặt</p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <div className="grid gap-1.5">
              {[...SECONDARY_TABS, { id: 'settings' as TabId, label: 'Cài đặt', shortLabel: 'Cài đặt', icon: SettingsIcon, description: 'Cấu hình Gemini API key và mục tiêu' }].map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => go(t.id)}
                    className={`flex items-center gap-3 rounded-xl p-2.5 text-left transition-all ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-200'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                        active
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <t.icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-xs">{t.label}</div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{t.description}</div>
                    </div>
                    <ChevronRight size={16} className="text-slate-400 shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
