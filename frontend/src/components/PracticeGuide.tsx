import { ArrowUpRight, Lightbulb, Check, Keyboard } from 'lucide-react';
import type { TabId } from '../App';

const guides: Partial<Record<TabId, { title: string; steps: string[]; tip: string; keys?: string }>> = {
  typing: { title: 'Nhớ từ bằng phản xạ', steps: ['Đọc nghĩa tiếng Việt.', 'Tự gõ từ tiếng Anh, không cần vội.', 'Xem đáp án và thử lại những từ sai.'], tip: 'Từ gõ sai sẽ được hỏi lại sau vài từ khác. Nhớ lại sau một khoảng nghỉ giúp bạn nhớ lâu hơn.', keys: 'Enter · Chấm điểm / tiếp tục' },
  review: { title: 'Một thẻ, một lần nhớ', steps: ['Thử nhớ trước khi xem đáp án.', 'Lật thẻ để kiểm tra.', 'Chọn mức độ đúng với khả năng nhớ.'], tip: 'Chọn “Khó” không phải thất bại. App cần biết đúng mức độ để hẹn bạn ôn lại.', keys: 'Space · Lật thẻ     1–4 · Đánh giá' },
  drills: { title: 'Nói điều bạn nghĩ', steps: ['Đọc tình huống bằng tiếng Việt.', 'Viết một câu tiếng Anh ngắn.', 'So sánh và đọc lại câu mẫu.'], tip: 'Đừng cố dịch từng chữ. Hãy bắt đầu bằng câu đơn giản, đủ ý rồi mới mở rộng.' },
  settings: { title: 'Học theo nhịp của bạn', steps: ['Chọn mục tiêu vừa sức mỗi ngày.', 'AI là tùy chọn, không bắt buộc.', 'Bấm Lưu cấu hình khi thay đổi xong.'], tip: 'Để sao lưu từ vựng và tiến độ, mở Kho thẻ của tôi → Xuất. Không cần thay API key khi đổi mục tiêu.' },
};

export default function PracticeGuide({ tab, go }: { tab: TabId; go: (tab: TabId) => void }) {
  const guide = guides[tab];
  if (!guide) return null;
  return <aside className="practice-guide" aria-label="Hướng dẫn học">
    <section className="guide-steps"><span className="guide-kicker">CÁCH HỌC</span><h2>{guide.title}</h2>
      <ol>{guide.steps.map((step, index) => <li key={step}><span>{index + 1}</span><p>{step}</p></li>)}</ol>
    </section>
    <section className="guide-tip"><Lightbulb size={20} /><h3>Một mẹo nhỏ</h3><p>{guide.tip}</p></section>
    {guide.keys && <div className="guide-keys"><Keyboard size={18} /><span>{guide.keys}</span></div>}
    <button className="guide-back" onClick={() => go('learn')}><Check size={17} /><span>Về lộ trình cơ bản</span><ArrowUpRight size={17} /></button>
  </aside>;
}
