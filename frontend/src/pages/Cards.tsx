import { useEffect, useState } from 'react';
import { api, emptyCard, type UpsertCard, type VocabCard } from '../lib/api';
import { Pencil, Trash2, Plus, Download, Upload, X, Search, BookOpen, SlidersHorizontal, Check } from 'lucide-react';

interface Props {
  onCardsChanged?: () => void;
}

export default function Cards({ onCardsChanged }: Props) {
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<(UpsertCard & { id?: number }) | null>(null);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { take: '2000' };
      if (query) params.q = query;
      if (category) params.category = category;
      const r = await api.get<VocabCard[]>('/cards', { params });
      setCards(r.data);
    } catch {
      setMsg('Không thể kết nối đến máy chủ backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get<string[]>('/cards/categories').then((r) => setCategories(r.data)).catch(() => undefined);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!editing || !editing.term.trim()) return;
    try {
      if (editing.id) await api.put(`/cards/${editing.id}`, editing);
      else await api.post('/cards', editing);
      setEditing(null);
      setMsg('Đã lưu thẻ từ vựng thành công! ✅');
      setTimeout(() => setMsg(''), 3000);
      await load();
      onCardsChanged?.();
      api.get<string[]>('/cards/categories').then((r) => setCategories(r.data)).catch(() => undefined);
    } catch {
      setMsg('Lỗi khi lưu thẻ.');
    }
  };

  const remove = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xoá thẻ từ vựng này?')) return;
    try {
      await api.delete(`/cards/${id}`);
      await load();
      onCardsChanged?.();
    } catch {
      setMsg('Lỗi khi xoá thẻ.');
    }
  };

  const exportJson = async () => {
    try {
      const r = await api.get('/backup/export');
      const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `engmastery-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
    } catch {
      setMsg('Không thể xuất file sao lưu.');
    }
  };

  const importJson = async (f: File) => {
    try {
      const payload = JSON.parse(await f.text());
      const r = await api.post('/backup/import', payload);
      setMsg(`Đã nhập dữ liệu: +${r.data.cardsAdded} thẻ, +${r.data.drillsAdded} câu luyện tập.`);
      await load();
      onCardsChanged?.();
    } catch {
      setMsg('Nhập file thất bại: Định dạng file không hợp lệ.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <BookOpen size={20} className="text-indigo-600 dark:text-indigo-400" />
          Quản lý thẻ từ vựng ({cards.length})
        </h2>

        <button
          onClick={() => setEditing({ ...emptyCard })}
          className="flex items-center justify-center gap-1.5 rounded-2xl bg-indigo-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-95"
        >
          <Plus size={16} />
          <span>Tạo thẻ mới</span>
        </button>
      </div>

      {/* Filter and Actions Bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && load()}
            placeholder="Tìm kiếm từ hoặc nghĩa…"
            className="w-full rounded-2xl border border-slate-200/80 bg-white py-2 pl-9 pr-3 text-xs shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-800 dark:bg-[#111827]"
          />
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <div className="relative">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
            }}
            className="appearance-none rounded-2xl border border-slate-200/80 bg-white py-2 pl-3 pr-8 text-xs font-semibold shadow-sm dark:border-slate-800 dark:bg-[#111827]"
          >
            <option value="">Tất cả chủ đề</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <SlidersHorizontal size={13} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
        </div>

        <button
          onClick={() => load()}
          className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-bold text-white dark:bg-slate-700"
        >
          Tìm
        </button>

        <div className="flex items-center gap-1 ml-auto">
          <button
            onClick={exportJson}
            className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300"
            title="Xuất file backup JSON"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Xuất</span>
          </button>

          <label className="flex cursor-pointer items-center gap-1 rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50 dark:border-slate-800 dark:bg-[#111827] dark:text-slate-300">
            <Upload size={14} />
            <span className="hidden sm:inline">Nhập</span>
            <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
          </label>
        </div>
      </div>

      {msg && (
        <div className="rounded-2xl bg-slate-200 p-3 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Check size={14} />
          <span>{msg}</span>
        </div>
      )}

      {/* Cards List Grid */}
      <div className="grid gap-2.5 sm:grid-cols-2">
        {cards.map((c) => (
          <div
            key={c.id}
            className="group flex items-start justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-3.5 shadow-sm transition-all hover:border-slate-300 dark:border-slate-800/80 dark:bg-[#111827]"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white">
                  {c.term}
                </span>
                {c.phonetic && <span className="font-mono text-xs text-indigo-600 dark:text-indigo-400">{c.phonetic}</span>}
                <span className="rounded-full bg-slate-100 px-2 py-0.2 text-[10px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                  {c.category}
                </span>
              </div>

              <div className="mt-1 text-xs sm:text-sm text-slate-600 dark:text-slate-300 truncate">
                {c.meaningVi}
              </div>

              {c.exampleSentence && (
                <div className="mt-1 text-[11px] text-slate-400 truncate italic">
                  &ldquo;{c.exampleSentence}&rdquo;
                </div>
              )}

              <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                <span className="font-semibold text-indigo-600 dark:text-indigo-400">{c.status}</span>
                <span>•</span>
                <span>Lặp {c.repetition}</span>
                <span>•</span>
                <span>Khoảng cách: {c.intervalDays}d</span>
                {c.mistakeCount > 0 && <span className="text-red-500 font-bold">❌ {c.mistakeCount}</span>}
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <button
                onClick={() => setEditing({ ...c })}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                title="Chỉnh sửa"
              >
                <Pencil size={14} />
              </button>
              <button
                onClick={() => remove(c.id)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300"
                title="Xoá"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {cards.length === 0 && !loading && (
        <div className="rounded-3xl border border-slate-200/80 bg-white p-8 text-center text-xs text-slate-500 dark:border-slate-800/80 dark:bg-[#111827]">
          Không tìm thấy thẻ từ vựng nào khớp với bộ lọc.
        </div>
      )}

      {/* Edit / New Card Modal Drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 sm:p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-2xl dark:border-slate-800 dark:bg-[#111827]">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <h3 className="font-bold text-base">{editing.id ? 'Chỉnh sửa thẻ' : 'Thêm thẻ từ mới'}</h3>
              <button
                onClick={() => setEditing(null)}
                className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={16} />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="space-y-3"
            >
              {(
                [
                  ['term', 'Từ vựng tiếng Anh (Term) *'],
                  ['phonetic', 'Phiên âm (Phonetic)'],
                  ['partOfSpeech', 'Từ loại (noun, verb, adj, phrase...)'],
                  ['meaningVi', 'Nghĩa tiếng Việt (Meaning VI) *'],
                  ['definitionEn', 'Định nghĩa tiếng Anh (Definition EN)'],
                  ['exampleSentence', 'Câu ví dụ tiếng Anh (Example sentence)'],
                  ['clozeSentence', 'Câu điền từ khuyết (dùng ___ để che từ)'],
                  ['clozeHint', 'Gợi ý khi điền từ (Hint)'],
                  ['category', 'Chủ đề (Category)'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="block text-xs">
                  <span className="font-semibold text-slate-600 dark:text-slate-400">{label}</span>
                  <input
                    value={editing[k] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
                  />
                </label>
              ))}

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-2xl border border-slate-200 bg-slate-100 py-3 text-xs font-bold text-slate-700 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-indigo-600 py-3 text-xs font-bold text-white shadow-md shadow-indigo-600/25 hover:bg-indigo-700 active:scale-95"
                >
                  Lưu thẻ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
