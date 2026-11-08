import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { KeyRound, Save } from 'lucide-react';

export default function Settings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.get('/settings').then((r) => setValues(r.data)).catch(() => undefined);
    api.get('/ai/status').then((r) => setAiStatus(r.data)).catch(() => undefined);
  }, []);

  const save = async () => {
    const payload = { ...values };
    if (apiKey && !apiKey.startsWith('***')) payload.GeminiApiKey = apiKey;
    await api.put('/settings', payload);
    setApiKey('');
    const r = await api.get('/settings');
    setValues(r.data);
    const s = await api.get('/ai/status');
    setAiStatus(s.data);
    setMsg('Settings saved. ✅');
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <h2 className="text-lg font-bold">Settings</h2>
      {msg && <div className="rounded-lg bg-emerald-100 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">{msg}</div>}

      <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h3 className="flex items-center gap-2 font-semibold"><KeyRound size={16} /> Gemini API (on-demand only)</h3>
        <p className="mt-1 text-xs text-slate-500">
          Status: {aiStatus ? (aiStatus.configured ? `✅ configured (${aiStatus.model})` : '❌ no key — AI buttons will show an error') : '…'}
          <br />Get a free key at <span className="font-mono">aistudio.google.com</span>. The app calls Gemini only when you click AI buttons.
        </p>
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          type="password"
          placeholder={values.GeminiApiKey ? `Current: ${values.GeminiApiKey}` : 'Paste Gemini API key…'}
          className="mt-2 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
        />
        <label className="mt-3 block text-xs text-slate-500">Model</label>
        <select
          value={values.GeminiModel ?? 'gemini-2.5-flash'}
          onChange={(e) => setValues({ ...values, GeminiModel: e.target.value })}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
        >
          <option value="gemini-2.5-flash">gemini-2.5-flash</option>
          <option value="gemini-1.5-flash">gemini-1.5-flash</option>
        </select>
      </div>

      <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h3 className="font-semibold">Study preferences</h3>
        <label className="mt-2 block text-xs text-slate-500">Daily review target (cards + drills)</label>
        <input
          value={values.DailyTarget ?? '20'}
          onChange={(e) => setValues({ ...values, DailyTarget: e.target.value })}
          type="number"
          min={1}
          max={500}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-transparent px-3 py-2 text-sm dark:border-slate-700"
        />
      </div>

      <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 font-semibold text-white hover:bg-indigo-700">
        <Save size={16} /> Save settings
      </button>
    </div>
  );
}
