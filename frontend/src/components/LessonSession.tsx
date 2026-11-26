import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Ear, Lightbulb, Mic, RotateCcw, Volume2 } from 'lucide-react';
import { buildSession, gradeAnswer, type Lesson, type Phrase } from '../lib/learning';
import { listenOnce, speak, speechSupported, stopSpeak } from '../lib/speech';

interface Props {
  lesson: Lesson;
  reviews?: Phrase[];
  onExit: () => void;
  onComplete: (independentCount: number) => Promise<void>;
  exitLabel?: string;
  savedMessage?: string;
}
const labels = { review: 'Khởi động · Ôn câu cũ', teach: 'Hiểu câu trước', choose: 'Nhận ra ý nghĩa', cloze: 'Điền một từ', order: 'Ghép thành câu', recall: 'Tự viết lại', speak: 'Nghe & nói' };

export default function LessonSession({ lesson, reviews = [], onExit, onComplete, exitLabel = 'Về lộ trình', savedMessage = 'Đã lưu tiến độ. Hẹn bạn ở buổi học tiếp theo!' }: Props) {
  const [steps] = useState(() => buildSession(lesson, reviews));
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [hint, setHint] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [feedback, setFeedback] = useState<ReturnType<typeof gradeAnswer> | null>(null);
  const [independent, setIndependent] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const mounted = useRef(true);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stopSpeak(); }; }, []);
  useEffect(() => {
    if (saved) return;
    const beforeUnload = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    const beforeNavigate = (event: Event) => {
      if (!window.confirm('Rời bài học? Tiến độ buổi này chưa lưu sẽ mất; dữ liệu học cũ vẫn giữ nguyên.')) event.preventDefault();
    };
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('engmastery:navigate', beforeNavigate);
    return () => { window.removeEventListener('beforeunload', beforeUnload); window.removeEventListener('engmastery:navigate', beforeNavigate); };
  }, [saved]);
  useEffect(() => { heading.current?.focus(); }, [index]);
  const step = steps[index];
  const finished = index >= steps.length;
  const words = step?.phrase.en.replace(/[.?!,]/g, '').split(/\s+/).filter(Boolean) ?? [];
  // Stable reverse ordering, index-based selection also handles repeated words.
  const tiles = [...words].reverse();

  const next = useCallback(() => {
    stopSpeak();
    setIndex(i => i + 1); setInput(''); setPicked([]); setHint(false);
    setAttempted(false); setFeedback(null); setHeard(''); setError('');
  }, []);
  useEffect(() => {
    if (!feedback?.accepted) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' || event.repeat || event.isComposing) return;
      const target = event.target;
      if (target instanceof HTMLElement && (target.closest('button, a, textarea, select, [contenteditable="true"]') || (target instanceof HTMLInputElement && !target.disabled))) return;
      event.preventDefault();
      next();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [feedback?.accepted, next]);
  const check = (value = input) => {
    const target = step.kind === 'cloze' ? step.phrase.answer : step.phrase.en;
    const result = step.kind === 'choose'
      ? { accepted: value === step.phrase.vi, kind: 'meaning', message: value === step.phrase.vi ? 'Đúng nghĩa rồi! Tiếp tục nhé.' : 'Chưa đúng nghĩa câu này. Xem phần giải thích rồi thử lại nhé.' }
      : gradeAnswer(value, target, step.kind === 'cloze' ? [] : step.phrase.alternatives);
    if (result.accepted && step.kind === 'recall' && !hint && !attempted)
      setIndependent(items => items.includes(step.phrase.en) ? items : [...items, step.phrase.en]);
    setAttempted(true); setFeedback(result);
  };
  const record = async () => {
    setListening(true); setError(''); stopSpeak();
    try { const transcript = await listenOnce(); if (mounted.current) setHeard(transcript); }
    catch { if (mounted.current) setError('Chưa nghe rõ hoặc chưa được cấp quyền micro. Bạn có thể tự đọc thành tiếng rồi tiếp tục.'); }
    finally { if (mounted.current) setListening(false); }
  };
  const save = async () => {
    setSaving(true); setError('');
    try { await onComplete(independent.length); if (mounted.current) setSaved(true); }
    catch { if (mounted.current) setError('Chưa lưu được tiến độ. Giữ màn hình này và bấm thử lưu lại khi có kết nối.'); }
    finally { if (mounted.current) setSaving(false); }
  };

  return <div className="lesson-session">
    <div className="session-top"><button className="quiet-button" onClick={() => {
      if (saved || window.confirm('Rời bài học? Tiến độ buổi này chưa lưu sẽ mất; dữ liệu học cũ vẫn giữ nguyên.')) onExit();
    }}><ArrowLeft size={18} /> {exitLabel}</button><span>{finished ? 'Tổng kết buổi học' : `${index + 1} / ${steps.length} bước`}</span></div>
    <div className="learning-progress" role="progressbar" aria-label="Tiến độ bài học" aria-valuemin={0} aria-valuemax={steps.length} aria-valuenow={Math.min(index, steps.length)}><div style={{ width: `${index / steps.length * 100}%` }} /></div>
    {finished ? <section className="study-surface completion-panel">
      <div className="completion-icon"><CheckCircle2 size={38} /></div>
      <p className="eyebrow">MỖI BƯỚC NHỎ ĐỀU CÓ Ý NGHĨA</p>
      <h1 ref={heading} tabIndex={-1}>Bạn vừa học thêm một điều mới.</h1>
      <p>Bài “{lesson.title}” · Tự viết đúng ngay lần đầu, không gợi ý: <strong>{independent.length}/{lesson.phrases.length} câu</strong>.</p>
      <div className="summary-phrases">{lesson.phrases.map(p => <div key={p.en}><Check size={18} /><span><strong lang="en">{p.en}</strong><small>{p.vi}</small></span></div>)}</div>
      <p className="muted">Câu cần gợi ý cũng là một bước tiến. Hãy quay lại ôn để nhớ chắc hơn.</p>
      {error && <p role="alert" className="learning-error">{error}</p>}
      {saved ? <><p role="status" className="learning-feedback success">{savedMessage}</p><button className="primary-button" onClick={onExit}>{exitLabel} <ArrowRight size={18} /></button></>
        : <button className="primary-button" onClick={save} disabled={saving}>{saving ? 'Đang lưu…' : 'Lưu & hoàn thành buổi học'} <Check size={18} /></button>}
    </section> : <section className="study-surface exercise-panel" key={index}>
      <p className="eyebrow">{lesson.title} <span> / </span> {labels[step.kind]}</p>
      <h1 ref={heading} tabIndex={-1}>{step.kind === 'teach' ? 'Một câu nhỏ, dùng được ngay.' : step.kind === 'choose' ? 'Câu này có nghĩa là gì?' : step.kind === 'cloze' ? 'Bạn điền từ còn thiếu nhé.' : step.kind === 'order' ? 'Sắp xếp các từ thành câu.' : step.kind === 'speak' ? 'Nghe một lần. Nói theo cách của bạn.' : 'Thử nói điều này bằng tiếng Anh.'}</h1>
      {step.kind === 'teach' ? <>
        <div className="phrase-display"><p lang="en">{step.phrase.en}</p><span>{step.phrase.vi}</span></div>
        <div className="button-row"><button className="secondary-button" onClick={() => speak(step.phrase.en)}><Volume2 size={18} /> Nghe câu mẫu</button><button className="quiet-button" onClick={() => speak(step.phrase.en, .75)}>Nghe chậm</button></div>
        <div className="explanation-box"><strong>Tách nhỏ để dễ hiểu</strong><p>{step.phrase.chunks}</p><p>{step.phrase.note}</p></div>
      </> : step.kind === 'speak' ? <>
        <div className="phrase-display"><p lang="en">{step.phrase.en}</p><span>{step.phrase.vi}</span></div>
        <div className="button-row"><button className="secondary-button" disabled={listening} onClick={() => speak(step.phrase.en, .8)}><Ear size={18} /> Nghe chậm</button><button className="secondary-button" disabled={listening || !speechSupported()} onClick={record}><Mic size={18} />{listening ? 'Đang nghe…' : 'Thử nói câu này'}</button></div>
        {heard && <div className="explanation-box" role="status"><strong>Máy nghe được:</strong><p lang="en">{heard}</p></div>}
        <p className="muted">Nhận dạng giọng nói không phải điểm phát âm; có thể cần mạng và quyền micro. Không có micro? Bạn cứ đọc thành tiếng, hoặc bỏ qua phần nói.</p>
        {error && <p className="learning-error" role="alert">{error}</p>}
      </> : <>
        <div className="exercise-prompt" lang={step.kind === 'choose' || step.kind === 'cloze' ? 'en' : 'vi'}>{step.kind === 'choose' ? step.phrase.en : step.kind === 'cloze' ? step.phrase.blank : step.phrase.vi}</div>
        {step.kind === 'choose' ? <div className="answer-options">{step.options?.map(option => <button key={option} className={`answer-option ${input === option ? 'selected' : ''}`} disabled={!!feedback?.accepted} onClick={() => { setInput(option); check(option); }}>{option}{input === option && feedback?.accepted && <Check size={18} />}</button>)}</div>
          : step.kind === 'order' ? <>
            <div className="word-answer" aria-label="Câu bạn đang ghép" aria-live="polite">{picked.length ? picked.map((tile, i) => <button className="word-tile" key={tile} disabled={!!feedback?.accepted} onClick={() => { setPicked(items => items.filter((_, n) => n !== i)); setFeedback(null); }}>{tiles[tile]}</button>) : <span>Bấm các từ bên dưới để ghép câu…</span>}</div>
            <div className="word-bank">{tiles.map((word, i) => <button key={i} className="word-tile" disabled={picked.includes(i) || !!feedback?.accepted} onClick={() => { setPicked(items => [...items, i]); setFeedback(null); }}>{word}</button>)}</div>
          </> : <form onSubmit={e => { e.preventDefault(); check(); }}>
            <label className="input-label" htmlFor="lesson-answer">{step.kind === 'cloze' ? 'Từ còn thiếu' : 'Câu trả lời của bạn'}</label>
            <input id="lesson-answer" className="learning-input" value={input} onChange={e => { setInput(e.target.value); setFeedback(null); }} placeholder={step.kind === 'cloze' ? 'Nhập một từ…' : 'Không cần hoàn hảo. Cứ thử nhé…'} autoComplete="off" spellCheck={false} disabled={!!feedback?.accepted} />
          </form>}
      </>}
      {step.kind !== 'speak' && <button className="hint-button" onClick={() => setHint(true)}><Lightbulb size={17} />{step.kind === 'teach' ? 'Mình chưa hiểu' : 'Cho mình gợi ý'}</button>}
      {hint && <div className="explanation-box" role="status"><strong>{lesson.pattern}</strong><p>{lesson.explanation}</p><p>{step.phrase.chunks}</p>{step.kind !== 'teach' && <p>Câu mẫu: <span lang="en">{step.phrase.en}</span></p>}<small>Dùng gợi ý không bị phạt. Câu này sẽ được tính là đã luyện có hỗ trợ.</small></div>}
      {feedback && <div className={`learning-feedback ${feedback.accepted ? 'success' : 'retry'}`} role="status"><strong>{feedback.accepted ? 'Tốt lắm.' : 'Mình thử lại nhé.'}</strong><p>{feedback.message}</p>{!feedback.accepted && <p>{step.phrase.note}</p>}</div>}
      <div className="exercise-footer"><span>Không tính giờ. Không mất điểm khi thử lại.</span>
        {step.kind === 'teach' || step.kind === 'speak' || feedback?.accepted
          ? <button className="primary-button" disabled={listening} onClick={next}>{step.kind === 'teach' ? 'Hiểu rồi, thử nhé' : step.kind === 'speak' ? (heard ? 'Tiếp tục' : 'Đã tự đọc / Bỏ qua') : feedback?.accepted ? 'Tiếp tục (Enter)' : 'Tiếp tục'}<ArrowRight size={18} /></button>
          : <div className="button-row">{feedback && !feedback.accepted && <button className="quiet-button" onClick={() => { setInput(''); setPicked([]); setFeedback(null); }}><RotateCcw size={16} /> Thử lại</button>}{step.kind !== 'choose' && <button className="primary-button" disabled={step.kind === 'order' ? !picked.length : !input.trim()} onClick={() => check(step.kind === 'order' ? picked.map(i => tiles[i]).join(' ') : input)}>Kiểm tra <Check size={18} /></button>}{hint && <button className="quiet-button" onClick={next}>Đã xem mẫu, luyện tiếp <ArrowRight size={16} /></button>}</div>}
      </div>
    </section>}
  </div>;
}
