import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { KeyRound, Save, Check, Target, Sliders } from 'lucide-react';

export default function Settings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/settings').then((r) => setValues(r.data)).catch(() => undefined);
    api.get('/ai/status').then((r) => setAiStatus(r.data)).catch(() => undefined);
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...values };
      if (apiKey && !apiKey.startsWith('***')) payload.GeminiApiKey = apiKey;
      await api.put('/settings', payload);
      setApiKey('');
      const r = await api.get('/settings');
      setValues(r.data);
      const s = await api.get('/ai/status');
      setAiStatus(s.data);
      setMsg('Đã lưu cấu hình thành công! ✅');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Lỗi khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <Sliders size={20} className="text-indigo-600 dark:text-indigo-400" />
          Cài đặt hệ thống
        </h2>
      </div>

      {msg && (
        <div className="rounded-2xl bg-emerald-100 p-3 text-xs font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 flex items-center gap-2">
          <Check size={16} />
          <span>{msg}</span>
        </div>
      )}

      {/* Gemini API Key Box */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-[#111827]">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-sm sm:text-base">
            <KeyRound size={16} className="text-violet-600 dark:text-violet-400" />
            <span>Gemini API (On-demand)</span>
          </h3>
          {aiStatus && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                aiStatus.configured
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {aiStatus.configured ? `Đã cấu hình (${aiStatus.model})` : 'Chưa có key'}
            </span>
          )}
        </div>

        <p className="mt-2 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Nhận key miễn phí tại <span className="font-mono text-indigo-600 dark:text-indigo-400">aistudio.google.com</span>. Hệ thống chỉ gọi Gemini khi bạn bấm các nút tính năng AI theo yêu cầu.
        </p>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            API Key
          </label>
          <input
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            type="password"
            placeholder={values.GeminiApiKey ? `Hiện tại: ${values.GeminiApiKey}` : 'Dán Gemini API key vào đây…'}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Mô hình AI (Model)
          </label>
          <select
            value={values.GeminiModel ?? 'gemini-2.5-flash'}
            onChange={(e) => setValues({ ...values, GeminiModel: e.target.value })}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="gemini-2.5-flash">gemini-2.5-flash (Nhanh & thông minh nhất)</option>
            <option value="gemini-1.5-flash">gemini-1.5-flash (Bản ổn định)</option>
          </select>
        </div>
      </div>

      {/* Study Preferences */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 sm:p-6 shadow-sm dark:border-slate-800/80 dark:bg-[#111827]">
        <h3 className="flex items-center gap-2 font-bold text-sm sm:text-base">
          <Target size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span>Mục tiêu học tập hàng ngày</span>
        </h3>

        <div className="mt-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
            Số lượt ôn tập chỉ tiêu (Thẻ từ + Câu phản xạ)
          </label>
          <input
            value={values.DailyTarget ?? '20'}
            onChange={(e) => setValues({ ...values, DailyTarget: e.target.value })}
            type="number"
            min={1}
            max={500}
            className="w-full rounded-2xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs font-semibold shadow-sm focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="mt-1 text-[11px] text-slate-400">
            Khuyến nghị từ 15 đến 30 lượt mỗi ngày để duy trì chuỗi học và trí nhớ không bị quá tải.
          </p>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={save}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-md shadow-indigo-600/25 transition hover:bg-indigo-700 active:scale-98 disabled:opacity-50"
      >
        <Save size={16} />
        <span>{saving ? 'Đang lưu…' : 'Lưu cài đặt'}</span>
      </button>
    </div>
  );
}
