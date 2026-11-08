import { useEffect, useState } from 'react';
import { api, emptyCard, type UpsertCard, type VocabCard } from '../lib/api';
import { Pencil, Trash2, Plus, Download, Upload, X } from 'lucide-react';

export default function Cards() {
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('');
  const [editing, setEditing] = useState<(UpsertCard & { id?: number }) | null>(null);
  const [msg, setMsg] = useState('');

  const load = async () => {
    const params: Record<string, string> = { take: '500' };
    if (query) params.q = query;
    if (category) params.category = category;
    const r = await api.get<VocabCard[]>('/cards', { params });
    setCards(r.data);
  };

  useEffect(() => {
    api.get<string[]>('/cards/categories').then((r) => setCategories(r.data)).catch(() => undefined);
    load().catch(() => setMsg('Cannot reach backend.'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = async () => {
    if (!editing || !editing.term.trim()) return;
    if (editing.id) await api.put(`/cards/${editing.id}`, editing);
    else await api.post('/cards', editing);
    setEditing(null);
    setMsg('Saved. ✅');
    await load();
    api.get<string[]>('/cards/categories').then((r) => setCategories(r.data)).catch(() => undefined);
  };

  const remove = async (id: number) => {
    if (!confirm('Delete this card?')) return;
    await api.delete(`/cards/${id}`);
    await load();
  };

  const exportJson = async () => {
    const r = await api.get('/backup/export');
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `engmastery-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  const importJson = async (f: File) => {
    try {
      const payload = JSON.parse(await f.text());
      const r = await api.post('/backup/import', payload);
      setMsg(`Imported: +${r.data.cardsAdded} cards, +${r.data.drillsAdded} drills.`);
      await load();
    } catch {
      setMsg('Import failed: invalid file.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && load()}
          placeholder="Search term / meaning…"
          className="min-w-52 flex-1 rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900"
        />
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900">
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button onClick={() => load()} className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">Search</button>
        <button onClick={() => setEditing({ ...emptyCard })} className="flex items-center gap-1 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">
          <Plus size={15} /> New
        </button>
        <button onClick={exportJson} className="flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900">
          <Download size={15} /> Export
        </button>
        <label className="flex cursor-pointer items-center gap-1 rounded-lg bg-white px-3 py-2 text-sm shadow-sm dark:bg-slate-900">
          <Upload size={15} /> Import
          <input type="file" accept=".json" className="hidden" onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        </label>
      </div>
      {msg && <div className="rounded-lg bg-slate-200 p-2 text-sm dark:bg-slate-800">{msg}</div>}
      <div className="text-sm text-slate-500">{cards.length} cards</div>

      <div className="grid gap-2 md:grid-cols-2">
        {cards.map((c) => (
          <div key={c.id} className="rounded-xl bg-white p-3 shadow-sm dark:bg-slate-900">
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="font-bold">{c.term}</span>
                <span className="ml-2 text-sm text-slate-500">{c.meaningVi}</span>
                <div className="mt-0.5 text-xs text-slate-500">{c.category} · {c.status} · rep {c.repetition} · ×{c.intervalDays}d · EF {c.easeFactor} · ❌{c.mistakeCount}</div>
              </div>
              <div className="flex shrink-0 gap-1">
                <button onClick={() => setEditing({ ...c })} className="rounded p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700"><Pencil size={15} /></button>
                <button onClick={() => remove(c.id)} className="rounded p-1.5 text-red-500 hover:bg-red-100 dark:hover:bg-red-950"><Trash2 size={15} /></button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[90vh] w-full max-w-lg overflow-auto rounded-2xl bg-white p-5 dark:bg-slate-900">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-bold">{editing.id ? 'Edit card' : 'New card'}</h3>
              <button onClick={() => setEditing(null)}><X size={18} /></button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void save();
              }}
              className="grid gap-2"
            >
              {(
                [
                  ['term', 'Term *'],
                  ['phonetic', 'Phonetic'],
                  ['partOfSpeech', 'Part of speech'],
                  ['meaningVi', 'Meaning (VI)'],
                  ['definitionEn', 'Definition (EN)'],
                  ['exampleSentence', 'Example sentence'],
                  ['clozeSentence', 'Cloze sentence (blank with ___)'],
                  ['clozeHint', 'Cloze hint'],
                  ['category', 'Category'],
                ] as const
              ).map(([k, label]) => (
                <label key={k} className="text-sm">
                  <span className="text-xs text-slate-500">{label}</span>
                  <input
                    value={editing[k] ?? ''}
                    onChange={(e) => setEditing({ ...editing, [k]: e.target.value })}
                    className="mt-0.5 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-1.5 dark:border-slate-700"
                  />
                </label>
              ))}
            </form>
            <button onClick={save} className="mt-3 w-full rounded-lg bg-indigo-600 py-2 font-semibold text-white">Save (Enter)</button>
          </div>
        </div>
      )}
    </div>
  );
}
