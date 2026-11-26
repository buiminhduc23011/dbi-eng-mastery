import { useEffect, useState } from 'react';
import { ArrowDownToLine, ArrowRight, BookOpen, Check, Clock3, Leaf, RotateCcw, Sparkles } from 'lucide-react';
import type { TabId } from '../App';
import { api } from '../lib/api';
import { curriculum } from '../data/curriculum';
import { selectDailyLesson, type Lesson, type LessonProgress, type Phrase, type ProgressMap } from '../lib/learning';
import LessonSession from '../components/LessonSession';

interface Props { go: (tab: TabId) => void; onComplete: () => void }
export default function Learn({ go, onComplete }: Props) {
  const [progress, setProgress] = useState<ProgressMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [session, setSession] = useState<{ lesson: Lesson; reviews: Phrase[] } | null>(null);
  const [today, setToday] = useState(() => new Date().toISOString().slice(0, 10));
  const load = async () => {
    try { setProgress((await api.get<ProgressMap>('/learning/progress')).data); }
    catch { setError('Chưa tải được tiến độ. Kiểm tra kết nối rồi thử lại; dữ liệu cũ không bị thay đổi.'); }
    finally { setLoading(false); }
  };
  useEffect(() => {
    const controller = new AbortController();
    api.get<ProgressMap>('/learning/progress', { signal: controller.signal })
      .then(r => setProgress(r.data))
      .catch(() => { if (!controller.signal.aborted) setError('Chưa tải được tiến độ. Kiểm tra kết nối rồi thử lại; dữ liệu cũ không bị thay đổi.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setToday(new Date().toISOString().slice(0, 10)), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const daily = selectDailyLesson(curriculum, progress, today);
  const completed = curriculum.filter(l => progress[l.id]).length;
  const stages = [...new Set(curriculum.map(lesson => lesson.stage))];
  const stageDescriptions: Record<string, string> = {
    'Bắt đầu từ đây': 'Làm quen với câu ngắn',
    'Dùng mỗi ngày': 'Tự tin trong tình huống quen thuộc',
    'Tiếng Anh công việc': 'Bắt đầu nói chuyện với đồng nghiệp',
    'Đi lại & dịch vụ': 'Tự xoay xở khi đi ra ngoài',
    'Cuộc sống & giao tiếp': 'Chia sẻ chuyện thường ngày',
    'Giao tiếp tự tin hơn': 'Nói rõ ý và trò chuyện tự nhiên',
    'Tiếng Anh công việc mở rộng': 'Phối hợp công việc rõ ràng hơn',
  };
  const lessonTotal = curriculum.length;
  if (session) return <LessonSession lesson={session.lesson} reviews={session.reviews} onExit={() => setSession(null)} onComplete={async count => {
    const r = await api.put<LessonProgress>(`/learning/lessons/${session.lesson.id}/completion`, { independentCount: count });
    setProgress(p => ({ ...p, [session.lesson.id]: r.data })); onComplete();
  }} />;

  return <div className="learn-home">
    <div className="page-intro"><div><p className="eyebrow">BẮT ĐẦU TỪ ĐÂY</p><h1>Hôm nay, mình học gì?</h1><p>Một bài ngắn. Vài câu hữu ích. Tiến bộ theo nhịp của bạn.</p></div><div className="intro-note"><Leaf size={20} /><span>Hiểu trước.<br />Luyện sau. Nhớ lâu.</span></div></div>
    {error && <div className="learning-error" role="alert">{error} <button className="quiet-button" onClick={() => { setLoading(true); setError(''); void load(); }}><RotateCcw size={16} /> Thử lại</button></div>}
    <div className="home-top-grid">
      <section className="daily-card"><div className="daily-label"><span><span className="live-dot" /> BÀI HỌC HÔM NAY</span><span><Clock3 size={15} /> Khoảng 10 phút</span></div>
        <div className="daily-body"><div><p className="daily-number">{String(curriculum.indexOf(daily.lesson) + 1).padStart(2, '0')} <span>/ {lessonTotal}</span></p><h2>{daily.lesson.title}</h2><p>{daily.lesson.goal}</p></div><div className="phrase-note" aria-hidden="true"><span>một câu bạn sẽ dùng</span><strong>{daily.lesson.phrases[0].en}</strong><small>{daily.lesson.phrases[0].vi}</small><div className="note-line" /></div></div>
        <div className="daily-bottom"><button className="cream-button" disabled={loading || !!error} onClick={() => setSession({ lesson: daily.lesson, reviews: daily.reviews })}>{loading ? 'Đang tải tiến độ…' : progress[daily.lesson.id] ? 'Ôn lại bài này' : 'Bắt đầu học hôm nay'} <ArrowRight size={18} /></button><span>Ôn nhẹ → Học câu mới → Tự viết → Nói</span></div>
      </section>
      <aside className="progress-card"><span className="eyebrow">HÀNH TRÌNH CỦA BẠN</span><div className="progress-number">{loading || error ? '—' : completed}<span>/ {lessonTotal} bài</span></div><div className="learning-progress"><div style={{ width: `${completed / lessonTotal * 100}%` }} /></div><p>{completed ? 'Bạn đang xây nền tảng, từng câu một.' : 'Bắt đầu từ những câu đơn giản nhất.'}</p><div className="progress-detail"><RotateCcw size={17} /><span>{daily.dueCount} bài nền tảng đến lịch ôn</span></div><button className="text-link" onClick={() => go('dashboard')}>Xem thống kê & lịch ôn cũ <ArrowRight size={16} /></button></aside>
    </div>
    <section className="pathway-section"><div className="section-heading"><div><p className="eyebrow">TỪ CƠ BẢN ĐẾN DÙNG ĐƯỢC</p><h2>Lộ trình dành cho bạn</h2></div><span>{lessonTotal} bài · {curriculum.reduce((sum, lesson) => sum + lesson.phrases.length, 0)} câu thực tế</span></div>
      <div className="pathway-grid">{stages.map((stage, group) => <section className="pathway-card" key={stage}><div className="pathway-heading"><span className="stage-number">{String(group + 1).padStart(2, '0')}</span><div><h3>{stage}</h3><p>{stageDescriptions[stage] ?? 'Mở rộng vốn câu và tự tin giao tiếp'}</p></div></div><div className="lesson-list">{curriculum.filter(l => l.stage === stage).map(lesson => <button disabled={loading || !!error} onClick={() => setSession({ lesson, reviews: [] })} className={`lesson-link ${lesson.id === daily.lesson.id ? 'recommended' : ''}`} key={lesson.id}><span className={`lesson-status ${progress[lesson.id] ? 'done' : ''}`}>{progress[lesson.id] ? <Check size={15} /> : String(curriculum.indexOf(lesson) + 1).padStart(2, '0')}</span><span>{lesson.title}<small>{progress[lesson.id] ? `Đã học · ${progress[lesson.id].independentCount}/3 câu tự viết` : lesson.id === daily.lesson.id ? 'Gợi ý học tiếp' : '3 câu · Có hướng dẫn'}</small></span><ArrowRight size={16} /></button>)}</div></section>)}</div>
    </section>
    <div className="home-bottom-grid"><button className="personal-banner" onClick={() => go('translator')}><span className="banner-icon"><Sparkles size={23} /></span><span><strong>“Câu này nói tiếng Anh thế nào?”</strong><small>Biến điều bạn muốn nói thành bài luyện của riêng mình.</small></span><ArrowRight size={22} /></button><div className="data-note"><BookOpen size={21} /><p>Kho thẻ và lịch sử học cũ vẫn ở đây.<br /><button className="text-link" onClick={() => go('cards')}>Mở kho thẻ <ArrowRight size={14} /></button><a className="text-link" href="/api/backup/export" download="engmastery-backup.json"><ArrowDownToLine size={14} /> Tải bản sao dữ liệu</a></p></div></div>
  </div>;
}
