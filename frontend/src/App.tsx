import { useEffect, useState } from 'react';
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
  Menu,
  X,
} from 'lucide-react';
import Dashboard from './pages/Dashboard';
import Review from './pages/Review';
import Drills from './pages/Drills';
import Typing from './pages/Typing';
import Shadowing from './pages/Shadowing';
import Translator from './pages/Translator';
import Cards from './pages/Cards';
import Settings from './pages/Settings';

const TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'review', label: 'SRS Review', icon: Layers },
  { id: 'typing', label: 'Typing', icon: Keyboard },
  { id: 'drills', label: 'Sentence Drills', icon: PenLine },
  { id: 'shadowing', label: 'Shadowing', icon: Mic },
  { id: 'translator', label: 'AI Translator', icon: Languages },
  { id: 'cards', label: 'Card Manager', icon: Library },
  { id: 'settings', label: 'Settings', icon: SettingsIcon },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function App() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [dark, setDark] = useState(() => localStorage.getItem('em-theme') !== 'light');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('em-theme', dark ? 'dark' : 'light');
  }, [dark]);

  const go = (id: TabId) => {
    setTab(id);
    setMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button className="rounded p-2 hover:bg-slate-200 dark:hover:bg-slate-800 md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Menu">
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">E</div>
            <div>
              <div className="text-sm font-bold leading-tight">EngMastery</div>
              <div className="text-[11px] leading-tight text-slate-500 dark:text-slate-400">SRS English Lab</div>
            </div>
          </div>
          <nav className="ml-4 hidden flex-wrap items-center gap-1 md:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  tab === t.id
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => setDark((d) => !d)}
            className="ml-auto rounded-lg p-2 hover:bg-slate-200 dark:hover:bg-slate-800"
            aria-label="Toggle theme"
          >
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
        {menuOpen && (
          <nav className="grid gap-1 px-4 pb-3 md:hidden">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
                  tab === t.id ? 'bg-indigo-600 text-white' : 'hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
              >
                <t.icon size={16} />
                {t.label}
              </button>
            ))}
          </nav>
        )}
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === 'dashboard' && <Dashboard go={go} />}
        {tab === 'review' && <Review />}
        {tab === 'typing' && <Typing />}
        {tab === 'drills' && <Drills />}
        {tab === 'shadowing' && <Shadowing />}
        {tab === 'translator' && <Translator />}
        {tab === 'cards' && <Cards />}
        {tab === 'settings' && <Settings />}
      </main>

      <footer className="mx-auto max-w-6xl px-4 pb-8 text-center text-xs text-slate-500 dark:text-slate-500">
        90% offline-first: SRS + grading run locally. Gemini is strictly on-demand.
      </footer>
    </div>
  );
}
