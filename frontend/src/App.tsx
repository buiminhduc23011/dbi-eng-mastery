import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { BookOpen, LayoutDashboard, Layers, PenLine, Mic, Languages, Library, Keyboard, Settings as SettingsIcon, Moon, Sun, Flame, Menu, X, Leaf } from 'lucide-react';
import { api, type Dashboard } from './lib/api';
import Learn from './pages/Learn';
import PracticeGuide from './components/PracticeGuide';
const DashboardPage = lazy(() => import('./pages/Dashboard'));
const Review = lazy(() => import('./pages/Review'));
const Drills = lazy(() => import('./pages/Drills'));
const Typing = lazy(() => import('./pages/Typing'));
const Shadowing = lazy(() => import('./pages/Shadowing'));
const Translator = lazy(() => import('./pages/Translator'));
const Cards = lazy(() => import('./pages/Cards'));
const Settings = lazy(() => import('./pages/Settings'));

export type TabId = 'learn' | 'dashboard' | 'review' | 'typing' | 'drills' | 'shadowing' | 'translator' | 'cards' | 'settings';
const tabs = [
  { id: 'learn' as const, label: 'Học hôm nay', icon: BookOpen, section: 'HỌC MỖI NGÀY' },
  { id: 'review' as const, label: 'Ôn tập từ vựng', icon: Layers },
  { id: 'drills' as const, label: 'Luyện câu', icon: PenLine },
  { id: 'typing' as const, label: 'Gõ từ & ghi nhớ', icon: Keyboard },
  { id: 'shadowing' as const, label: 'Nghe & nói', icon: Mic },
  { id: 'translator' as const, label: 'Câu của tôi', icon: Languages, section: 'GÓC CÁ NHÂN' },
  { id: 'cards' as const, label: 'Kho thẻ của tôi', icon: Library },
  { id: 'dashboard' as const, label: 'Tiến bộ của tôi', icon: LayoutDashboard },
  { id: 'settings' as const, label: 'Cài đặt', icon: SettingsIcon },
];

export default function App() {
  const [tab, setTab] = useState<TabId>('learn');
  const [dark, setDark] = useState(() => localStorage.getItem('em-theme') === 'dark');
  const [menu, setMenu] = useState(false);
  const [dash, setDash] = useState<Dashboard | null>(null);
  const [reviewDeck, setReviewDeck] = useState<'due' | 'leeches'>('due');
  const [reviewStartId, setReviewStartId] = useState<number | null>(null);
  const [reviewKey, setReviewKey] = useState(0);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('em-theme', dark ? 'dark' : 'light');
  }, [dark]);
  const refreshDashboard = useCallback(() => {
    api.get<Dashboard>('/dashboard').then(r => setDash(r.data)).catch(() => undefined);
  }, []);
  useEffect(() => {
    refreshDashboard();
    const timer = window.setInterval(refreshDashboard, 60000);
    return () => window.clearInterval(timer);
  }, [refreshDashboard]);
  useEffect(() => {
    const close = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenu(false); };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, []);

  const go = (id: TabId) => {
    if (!window.dispatchEvent(new Event('engmastery:navigate', { cancelable: true }))) return;
    if (id === 'review') { setReviewDeck('due'); setReviewStartId(null); setReviewKey(k => k + 1); }
    setTab(id); setMenu(false); window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const goReviewLeeches = (startId?: number) => {
    setReviewDeck('leeches'); setReviewStartId(startId ?? null); setReviewKey(k => k + 1);
    setTab('review'); setMenu(false); window.scrollTo({ top: 0, behavior: 'instant' });
  };
  const current = tabs.find(t => t.id === tab)!;
  const navigation = <nav aria-label="Điều hướng chính">{tabs.map(t => <div key={t.id}>
    {t.section && <p className="nav-section">{t.section}</p>}
    <button className={`nav-item ${tab === t.id ? 'active' : ''}`} aria-current={tab === t.id ? 'page' : undefined} onClick={() => go(t.id)}>
      <t.icon size={19} /><span>{t.label}</span>{t.id === 'review' && !!dash?.cardsDue && <small>{dash.cardsDue > 99 ? '99+' : dash.cardsDue}</small>}
    </button>
  </div>)}</nav>;

  return <div className="app-shell">
    <a className="skip-link" href="#main-content">Bỏ qua điều hướng</a>
    <aside className="desktop-sidebar">
      <button className="brand" onClick={() => go('learn')} aria-label="EngMastery — trang học"><span className="brand-mark"><BookOpen size={24} /></span><span>engmastery<small>mỗi ngày, một chút giỏi hơn.</small></span></button>
      {navigation}
      <div className="sidebar-note"><Leaf size={21} /><p>Không cần hoàn hảo.<br /><strong>Chỉ cần tiếp tục.</strong></p></div>
      <div className="sidebar-bottom"><span>Không gian học của bạn</span><span>v3.0</span></div>
    </aside>
    <div className="app-workspace">
      <header className="workspace-header">
        <div className="header-location"><button className="icon-button mobile-menu-toggle" aria-label={menu ? 'Đóng menu' : 'Mở menu'} aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu(v => !v)}>{menu ? <X size={22} /> : <Menu size={22} />}</button><span>Không gian học <span className="breadcrumb-divider">/</span> <strong>{current.label}</strong></span></div>
        <div className="header-actions">{dash && <span className="streak-label"><Flame size={17} /><strong>{dash.streak}</strong><span> ngày liên tiếp</span></span>}<button className="icon-button" onClick={() => setDark(v => !v)} aria-label={dark ? 'Chuyển sang giao diện sáng' : 'Chuyển sang giao diện tối'}>{dark ? <Sun size={19} /> : <Moon size={19} />}</button><span className="profile-mark" title="Góc học cá nhân">D</span></div>
      </header>
      {menu && <div className="mobile-menu" id="mobile-menu">{navigation}</div>}
      <main id="main-content" tabIndex={-1} className={`workspace-content page-${tab} ${tab === 'learn' ? '' : 'tool-content'}`} key={tab}>
        {tab !== 'learn' && <div className="tool-heading"><p className="eyebrow">KHÔNG GIAN HỌC CỦA BẠN</p><h1>{current.label}</h1><p>{({ review: 'Gặp lại những từ quen, nhớ thêm một chút.', drills: 'Từng câu ngắn, từng ý rõ ràng.', typing: 'Biến điều đã học thành phản xạ.', shadowing: 'Lắng nghe, nói lại. Không cần một giọng hoàn hảo.', translator: 'Bắt đầu từ điều bạn thực sự muốn nói.', cards: 'Những từ và câu bạn đang tích lũy.', dashboard: 'Nhìn lại hành trình, không so sánh với ai khác.', settings: 'Điều chỉnh để học thoải mái hơn.' } as Partial<Record<TabId, string>>)[tab]}</p></div>}
        <div className={['typing', 'review', 'drills', 'settings'].includes(tab) ? 'page-layout with-guide' : 'page-layout'}><div className="page-primary">
        <Suspense fallback={<div className="study-surface loading-panel" role="status">Đang mở góc học của bạn…</div>}>
          {tab === 'learn' && <Learn go={go} onComplete={refreshDashboard} />}
          {tab === 'dashboard' && <DashboardPage go={go} onRefresh={refreshDashboard} onStudyLeech={goReviewLeeches} />}
          {tab === 'review' && <Review key={reviewKey} deck={reviewDeck} startId={reviewStartId} reloadKey={reviewKey} onSessionComplete={refreshDashboard} />}
          {tab === 'typing' && <Typing onWordMastered={refreshDashboard} />}
          {tab === 'drills' && <Drills onDrillComplete={refreshDashboard} />}
          {tab === 'shadowing' && <Shadowing />}
          {tab === 'translator' && <Translator onCardSaved={refreshDashboard} />}
          {tab === 'cards' && <Cards onCardsChanged={refreshDashboard} />}
          {tab === 'settings' && <Settings />}
        </Suspense>
        </div><PracticeGuide tab={tab} go={go} /></div>
      </main>
      <footer className="workspace-footer"><span>ENGMASTERY · LEARN A LITTLE, EVERY DAY</span><span>Học vì mình. Tiến bộ theo cách của mình.</span></footer>
    </div>
    <nav className="mobile-dock" aria-label="Truy cập nhanh">{[tabs[0], tabs[1], tabs[2], tabs[5]].map(t => <button key={t.id} aria-current={tab === t.id ? 'page' : undefined} className={tab === t.id ? 'active' : ''} onClick={() => go(t.id)}><t.icon size={21} /><span>{t.id === 'learn' ? 'Hôm nay' : t.id === 'review' ? 'Ôn tập' : t.label}</span></button>)}</nav>
  </div>;
}
