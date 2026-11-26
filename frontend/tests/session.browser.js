// Browser smoke scenario. Start foundation-01 on an isolated test instance first.
// Run with agent-browser eval -b (base64 of this file), not against learner data.
(async () => {
  const wait = () => new Promise(r => setTimeout(r, 70));
  const click = async text => {
    const button = [...document.querySelectorAll('main button')].find(b => b.textContent.trim() === text);
    if (!button) throw Error('Missing button: ' + text);
    button.click(); await wait();
  };
  const fill = async text => {
    const input = document.querySelector('#lesson-answer');
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, text);
    input.dispatchEvent(new Event('input', { bubbles: true })); await wait();
  };
  const enter = async () => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
    await wait();
  };
  const examples = [
    ['I need help.', 'Tôi cần giúp đỡ.', 'need'],
    ['I need more time.', 'Tôi cần thêm thời gian.', 'time'],
    ['I need a break.', 'Tôi cần nghỉ một chút.', 'break'],
  ];
  const visited = [];
  let testedWrong = false;
  for (let n = 0; n < 30; n++) {
    if (document.querySelector('.completion-panel')) break;
    const label = document.querySelector('.exercise-panel .eyebrow').textContent;
    visited.push(label);
    if (label.includes('Hiểu câu trước')) { await click('Hiểu rồi, thử nhé'); continue; }
    if (label.includes('Nhận ra ý nghĩa')) {
      const en = document.querySelector('.exercise-prompt').textContent;
      await click(examples.find(x => x[0] === en)[1]); await enter(); continue;
    }
    if (label.includes('Điền một từ')) {
      const prompt = document.querySelector('.exercise-prompt').textContent;
      const example = examples.find(x => x[0] === prompt.replace('___', x[2]));
      await fill(example[2]); await click('Kiểm tra'); await enter(); continue;
    }
    if (label.includes('Ghép thành câu')) {
      for (const button of [...document.querySelectorAll('.word-bank button')].reverse()) { button.click(); await wait(); }
      await click('Kiểm tra'); await enter(); continue;
    }
    if (label.includes('Tự viết lại')) {
      const vi = document.querySelector('.exercise-prompt').textContent;
      if (!testedWrong) {
        await fill('I am need help.'); await click('Kiểm tra');
        if (!document.querySelector('.learning-feedback.retry')?.textContent.includes('Không thêm')) throw Error('Missing Vietnamese grammar feedback');
        const wrongStep = document.querySelector('.session-top > span').textContent;
        await enter();
        if (document.querySelector('.session-top > span').textContent !== wrongStep) throw Error('Enter advanced after a wrong answer');
        testedWrong = true;
      }
      await fill(examples.find(x => x[1] === vi)[0]); await click('Kiểm tra'); await enter(); continue;
    }
    if (label.includes('Nghe & nói')) { await click('Đã tự đọc / Bỏ qua'); continue; }
    throw Error('Unexpected step ' + label);
  }
  const summary = document.querySelector('.completion-panel')?.textContent;
  if (!summary?.includes('2/3 câu')) throw Error('Wrong independent recall count: ' + summary);
  await click('Lưu & hoàn thành buổi học');
  await new Promise(r => setTimeout(r, 600));
  if (!document.querySelector('.completion-panel')?.textContent.includes('Đã lưu tiến độ')) throw Error('Completion not persisted');
  return { steps: visited.length, wrongAnswerFeedback: testedWrong, independent: '2/3', persisted: true };
})();
