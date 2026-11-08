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
  Zap,
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
  { id: 'dashboard', label: 'Dashboard', shortLabel: 'Tổng quan', icon: LayoutDashboard },
  { id: 'review', label: 'SRS Review', shortLabel: 'Ôn tập', icon: Layers, badgeKey: 'cardsDue' },
  { id: 'typing', label: 'Typing', shortLabel: 'Gõ từ', icon: Keyboard },
  { id: 'drills', label: 'Sentence Drills', shortLabel: 'Luyện câu', icon: PenLine, badgeKey: 'drillsDue' },
];

const SECONDARY_TABS: TabItem[] = [
  { id: 'shadowing', label: 'Shadowing Studio', shortLabel: 'Phát âm', icon: Mic, description: 'Luyện nghe 1.0x / 0.8x và ghi âm so khớp giọng' },
  { id: 'translator', label: 'AI Translator', shortLabel: 'Dịch AI', icon: Languages, description: 'Dịch công sở/đời sống và lưu cụm từ vào thẻ SRS' },
  { id: 'cards', label: 'Card Manager', shortLabel: 'Thẻ từ', icon: Library, description: 'Tìm kiếm, sửa, xoá và xuất/nhập file dữ liệu' },
  { id: 'settings', label: 'Cài đặt', shortLabel: 'Cài đặt', icon: SettingsIcon, description: 'Cấu hình Gemini API key và mục tiêu học tập hàng ngày' },
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
        <div className="mx-auto flex max-w-6xl items-center justify-between px-3 py-2.5 sm:px-4 sm:py-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => go('dashboard')}>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-500 to-violet-500 text-white font-extrabold shadow-sm shadow-indigo-500/30">
              E
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-base font-extrabold tracking-tight">
                EngMastery
                <span className="hidden rounded-full bg-indigo-100 px-1.5 py-0.2 text-[10px] font-semibold text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300 sm:inline-block">
                  SRS
                </span>
              </div>
              <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                Spaced Repetition Lab
              </div>
            </div>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-1 lg:flex">
            {ALL_TABS.map((t) => {
              const badge = getBadge(t.badgeKey);
              const active = tab === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => go(t.id)}
                  className={`relative flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-all ${
                    active
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <t.icon size={15} />
                  <span>{t.label}</span>
                  {badge && (
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                        active
                          ? 'bg-white/20 text-white'
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
                className="flex items-center gap-1 rounded-full bg-gradient-to-r from-orange-500/10 to-amber-500/10 px-2.5 py-1 text-xs font-bold text-orange-600 border border-orange-200/50 dark:border-orange-900/50 dark:text-orange-400"
                title={`${dashData.streak} ngày học liên tiếp!`}
              >
                <Flame size={14} className="fill-orange-500 text-orange-500" />
                <span>{dashData.streak}</span>
              </div>
            )}

            {/* Daily Target Progress Pill */}
            {dashData && (
              <div
                className="hidden sm:flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-800/80 dark:text-slate-300"
                title="Số thẻ & câu hoàn thành hôm nay / mục tiêu"
              >
                <Zap size={13} className="text-amber-500" />
                <span>
                  {dashData.todayReviewed}/{dashData.dailyTarget}
                </span>
              </div>
            )}

            {/* Dark / Light Toggle */}
            <button
              onClick={() => setDark((d) => !d)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/80 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
              aria-label="Toggle theme"
            >
              {dark ? <Sun size={17} className="text-amber-400" /> : <Moon size={17} />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-3 py-4 sm:px-4 sm:py-6 pb-28 md:pb-8">
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
      <footer className="hidden md:block border-t border-slate-200/60 dark:border-slate-800/60 py-5 text-center text-xs text-slate-400 dark:text-slate-500">
        <div className="mx-auto max-w-6xl px-4 flex items-center justify-between">
          <div>EngMastery · Spaced Repetition English Lab</div>
          <div>v2.0</div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Dock) */}
      <nav className="fixed bottom-0 inset-x-0 z-40 block lg:hidden border-t border-slate-200/80 bg-white/90 backdrop-blur-xl dark:border-slate-800/80 dark:bg-[#0b0f19]/95 pb-safe">
        <div className="grid grid-cols-5 h-16 items-center px-1">
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
                  <div
                    className={`flex h-8 w-11 items-center justify-center rounded-full transition-all ${
                      active ? 'bg-indigo-50 dark:bg-indigo-950/80' : ''
                    }`}
                  >
                    <t.icon size={20} className={active ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
                  </div>
                  {badge && (
                    <span className="absolute -top-0.5 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-extrabold text-white shadow-sm ring-2 ring-white dark:ring-[#0b0f19]">
                      {badge}
                    </span>
                  )}
                </div>
                <span className="mt-0.5 text-[11px] leading-tight font-medium">{t.shortLabel}</span>
              </button>
            );
          })}

          {/* More Button */}
          <button
            onClick={() => setSheetOpen((o) => !o)}
            className={`relative flex flex-col items-center justify-center py-1 transition-all active:scale-95 ${
              isSecondaryActive || sheetOpen
                ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <div
              className={`flex h-8 w-11 items-center justify-center rounded-full transition-all ${
                isSecondaryActive || sheetOpen ? 'bg-indigo-50 dark:bg-indigo-950/80' : ''
              }`}
            >
              <MoreHorizontal size={20} className={isSecondaryActive ? 'stroke-[2.4]' : 'stroke-[1.8]'} />
            </div>
            <span className="mt-0.5 text-[11px] leading-tight font-medium">Thêm</span>
          </button>
        </div>
      </nav>

      {/* Mobile "More" Sheet Modal */}
      {sheetOpen && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
            onClick={() => setSheetOpen(false)}
          />

          {/* Bottom Sheet Content */}
          <div className="relative z-10 rounded-t-3xl border-t border-slate-200/80 bg-white p-5 shadow-2xl dark:border-slate-800/80 dark:bg-[#111827] pb-safe max-h-[85vh] overflow-y-auto">
            {/* Drag Handle */}
            <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 dark:bg-slate-700" />

            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">Tính năng mở rộng</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">Công cụ học tập & cấu hình</p>
              </div>
              <button
                onClick={() => setSheetOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-2">
              {SECONDARY_TABS.map((t) => {
                const active = tab === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => go(t.id)}
                    className={`flex items-center gap-3.5 rounded-2xl p-3.5 text-left transition-all ${
                      active
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-200 dark:border-indigo-800/60'
                        : 'bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/40 dark:hover:bg-slate-800/80'
                    }`}
                  >
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                        active
                          ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30'
                          : 'bg-white text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200'
                      }`}
                    >
                      <t.icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold text-sm">{t.label}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{t.description}</div>
                    </div>
                    <ChevronRight size={18} className="text-slate-400 shrink-0" />
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
