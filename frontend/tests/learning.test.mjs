import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSession, gradeAnswer, normalizeAnswer, selectDailyLesson } from '../src/lib/learning.ts';
import { curriculum } from '../src/data/curriculum.ts';

test('curriculum has thirty-six stable IDs and 108 complete, distinct examples', () => {
  assert.equal(curriculum.length, 36);
  assert.equal(new Set(curriculum.map(l => l.id)).size, 36);
  assert.equal(new Set(curriculum.flatMap(l => l.phrases.map(p => p.en))).size, 108);
  curriculum.forEach((l, i) => {
    assert.equal(l.id, `foundation-${String(i + 1).padStart(2, '0')}`);
    assert.equal(l.phrases.length, 3);
    for (const p of l.phrases) {
      assert.ok(p.vi && p.chunks && p.note && p.answer);
      assert.equal(normalizeAnswer(p.blank.replace('___', p.answer)), normalizeAnswer(p.en));
    }
  });
});
test('extended lessons form seven ordered stages and keep the original lesson IDs unchanged', () => {
  assert.deepEqual([...new Set(curriculum.map(l => l.stage))], [
    'Bắt đầu từ đây', 'Dùng mỗi ngày', 'Tiếng Anh công việc', 'Đi lại & dịch vụ',
    'Cuộc sống & giao tiếp', 'Giao tiếp tự tin hơn', 'Tiếng Anh công việc mở rộng',
  ]);
  assert.deepEqual(curriculum.slice(0, 12).map(l => l.id), Array.from({ length: 12 }, (_, i) => `foundation-${String(i + 1).padStart(2, '0')}`));
  assert.equal(curriculum[12].id, 'foundation-13');
  assert.equal(curriculum.at(-1).id, 'foundation-36');
});
test('normalization accepts case, apostrophes, contractions and punctuation', () => {
  assert.equal(normalizeAnswer('  I’m   an engineer! '), 'i am an engineer');
  assert.equal(gradeAnswer("I don't understand", 'I do not understand.').accepted, true);
  assert.equal(gradeAnswer("I'll be there soon", 'I will be there soon.').accepted, true);
});
test('accepted alternatives are distinct from unknown paraphrases', () => {
  assert.equal(gradeAnswer('Could you repeat that?', 'Can you repeat that?', ['Could you repeat that?']).kind, 'alternative');
  const result = gradeAnswer('Please say that again.', 'Can you repeat that?');
  assert.equal(result.accepted, false);
  assert.equal(result.kind, 'compare');
  assert.match(result.message, /chưa phải kết luận/);
});
test('specific grammar and ordering feedback without claiming semantic understanding', () => {
  assert.equal(gradeAnswer('I am need help', 'I need help.').kind, 'grammar');
  assert.equal(gradeAnswer('help need I', 'I need help.').kind, 'order');
  assert.equal(gradeAnswer('', 'I need help.').kind, 'empty');
  assert.equal(gradeAnswer('I do not need help', 'I need help.').accepted, false);
  assert.equal(gradeAnswer('I need', 'I need help.').accepted, false);
});
test('session teaches before independent recall and limits warm-up to two phrases', () => {
  const steps = buildSession(curriculum[0], curriculum[1].phrases);
  assert.equal(steps.length, 20);
  assert.equal(steps.filter(s => s.kind === 'review').length, 2);
  assert.equal(steps.filter(s => s.kind === 'recall').length, 3);
  assert.equal(steps.filter(s => s.kind === 'speak').length, 3);
  assert.ok(steps.findIndex(s => s.kind === 'recall') > steps.map(s => s.kind).lastIndexOf('teach'));
  for (const step of steps.filter(s => s.kind === 'choose')) {
    assert.equal(new Set(step.options).size, 3);
    assert.ok(step.options.includes(step.phrase.vi));
  }
  assert.equal(new Set(steps.filter(s => s.kind === 'choose').map(s => s.options.indexOf(s.phrase.vi))).size, 3);
});
test('personal single-phrase session omits trivial choice and absent cloze', () => {
  const lesson = { ...curriculum[0], phrases: [{ ...curriculum[0].phrases[0], blank: '', answer: '' }] };
  assert.deepEqual(buildSession(lesson).map(s => s.kind), ['teach', 'order', 'recall', 'speak']);
});
test('daily lesson chooses first unlearned lesson and includes due warm-up', () => {
  const progress = { 'foundation-01': { nextReviewOn: '2026-11-25', completedOn: '2026-11-24' } };
  const before = JSON.stringify(progress);
  const daily = selectDailyLesson(curriculum, progress, '2026-11-26');
  assert.equal(daily.lesson.id, 'foundation-02');
  assert.equal(daily.reviews.length, 2);
  assert.equal(daily.dueCount, 1);
  assert.equal(JSON.stringify(progress), before);
});
test('finished pathway selects a due lesson; future reviews are not due', () => {
  const progress = Object.fromEntries(curriculum.map(l => [l.id, { nextReviewOn: '2026-12-01' }]));
  progress['foundation-05'].nextReviewOn = '2026-11-26';
  const daily = selectDailyLesson(curriculum, progress, '2026-11-26');
  assert.equal(daily.lesson.id, 'foundation-05');
  assert.equal(daily.dueCount, 1);
  assert.equal(daily.reviews.length, 0);
});
test('learners with the original twelve lessons completed continue at lesson thirteen', () => {
  const existing = Object.fromEntries(curriculum.slice(0, 12).map(l => [l.id, { completedOn: '2026-11-25', nextReviewOn: '2026-12-10' }]));
  const before = JSON.stringify(existing);
  const daily = selectDailyLesson(curriculum, existing, '2026-11-26');
  assert.equal(daily.lesson.id, 'foundation-13');
  assert.equal(daily.dueCount, 0);
  assert.equal(JSON.stringify(existing), before);
});
