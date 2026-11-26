export interface Phrase {
  en: string;
  vi: string;
  chunks: string;
  note: string;
  blank: string;
  answer: string;
  alternatives?: string[];
}
export interface Lesson {
  id: string;
  title: string;
  stage: string;
  goal: string;
  pattern: string;
  explanation: string;
  phrases: Phrase[];
}
export interface LessonProgress {
  lessonId: string;
  completedOn: string;
  nextReviewOn: string;
  completions: number;
  independentCount: number;
}
export type ProgressMap = Record<string, LessonProgress>;
export type StepKind = 'review' | 'teach' | 'choose' | 'cloze' | 'order' | 'recall' | 'speak';
export interface StudyStep { kind: StepKind; phrase: Phrase; options?: string[] }

export function normalizeAnswer(value: string): string {
  return value.toLowerCase().replace(/[’‘]/g, "'")
    .replace(/\bi'm\b/g, 'i am').replace(/\bit's\b/g, 'it is')
    .replace(/\bdon't\b/g, 'do not').replace(/\bcan't\b/g, 'cannot')
    .replace(/\bi'll\b/g, 'i will').replace(/\bthat's\b/g, 'that is')
    .replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ').trim();
}

export function gradeAnswer(input: string, target: string, alternatives: string[] = []) {
  const answer = normalizeAnswer(input);
  if (!answer) return { accepted: false, kind: 'empty', message: 'Bạn hãy thử viết một chút nhé. Cần giúp đỡ thì bấm Gợi ý.' };
  if (answer === normalizeAnswer(target))
    return { accepted: true, kind: 'match', message: 'Đúng rồi! Bạn đã dùng được mẫu câu này.' };
  if (alternatives.some(a => normalizeAnswer(a) === answer))
    return { accepted: true, kind: 'alternative', message: 'Đúng! Đây là một cách diễn đạt khác được chấp nhận.' };
  if (/\bi am (need|want|like|understand|have)\b/.test(answer))
    return { accepted: false, kind: 'grammar', message: 'Trong mẫu câu này, need / want / like / understand / have đã là động từ. Không thêm “am” trước chúng.' };
  const words = normalizeAnswer(target).split(' ');
  const actual = answer.split(' ');
  if (actual.length === words.length && [...actual].sort().join(' ') === [...words].sort().join(' '))
    return { accepted: false, kind: 'order', message: 'Bạn đã có đủ từ. Hãy xem lại thứ tự: ai → làm gì → phần còn lại.' };
  return { accepted: false, kind: 'compare', message: 'Câu của bạn chưa khớp mẫu đã học. Đây là so khớp câu, chưa phải kết luận câu bạn sai nghĩa hay sai ngữ pháp. Hãy xem gợi ý rồi thử lại.' };
}

export function buildSession(lesson: Lesson, reviews: Phrase[] = []): StudyStep[] {
  const steps: StudyStep[] = reviews.slice(0, 2).map(phrase => ({ kind: 'review', phrase }));
  for (const phrase of lesson.phrases) {
    steps.push({ kind: 'teach', phrase });
    // Stable choice order across the lesson; the correct position varies by phrase.
    const options = [phrase.vi, ...lesson.phrases.filter(p => p !== phrase).map(p => p.vi)].slice(0, 3);
    options.sort((a, b) => a.localeCompare(b, 'vi'));
    if (options.length > 1) steps.push({ kind: 'choose', phrase, options });
    if (phrase.blank && phrase.answer) steps.push({ kind: 'cloze', phrase });
    steps.push({ kind: 'order', phrase });
  }
  // Recall after all teaching, not immediately after seeing each answer.
  for (const phrase of lesson.phrases) steps.push({ kind: 'recall', phrase });
  for (const phrase of lesson.phrases) steps.push({ kind: 'speak', phrase });
  return steps;
}

export function selectDailyLesson(lessons: Lesson[], progress: ProgressMap, today: string) {
  const due = lessons.filter(l => progress[l.id]?.nextReviewOn <= today);
  const next = lessons.find(l => !progress[l.id]) ?? due[0] ?? lessons[0];
  const review = due.find(l => l.id !== next.id);
  return { lesson: next, reviews: review?.phrases.slice(0, 2) ?? [], dueCount: due.length };
}
