import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { KeyRound, Save, Check, Target, Sliders, RefreshCw, AlertTriangle } from 'lucide-react';

interface AiModel {
  id: string;
  label: string;
}

// Offline fallback (backend /api/ai/models trả danh sách thật từ Google khi đã có key).
const FALLBACK_MODELS: AiModel[] = [
  { id: 'gemini-3.8-flash', label: 'Nhanh & thông minh nhất (khuyến nghị)' },
  { id: 'gemini-3.6-flash', label: 'Bản ổn định thế hệ trước' },
  { id: 'gemini-3.5-flash-lite', label: 'Rẻ & nhanh cho tác vụ nhẹ' },
  { id: 'gemini-3.1-flash-lite', label: 'Tiết kiệm nhất' },
  { id: 'gemini-3.1-pro-preview', label: 'Suy luận sâu (preview)' },
];

export default function Settings() {
  const [values, setValues] = useState<Record<string, string>>({});
  const [apiKey, setApiKey] = useState('');
  const [aiStatus, setAiStatus] = useState<{ configured: boolean; model: string } | null>(null);
  const [models, setModels] = useState<AiModel[]>(FALLBACK_MODELS);
  const [modelsFromApi, setModelsFromApi] = useState(false);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const applyModels = useCallback((data: { fromApi: boolean; models: AiModel[] }) => {
    if (data.models?.length) {
      setModels(data.models);
      setModelsFromApi(Boolean(data.fromApi));
    } else {
      setModels(FALLBACK_MODELS);
      setModelsFromApi(false);
    }
  }, []);

  const loadModels = useCallback(async () => {
    try {
      const r = await api.get<{ fromApi: boolean; models: AiModel[] }>('/ai/models');
      applyModels(r.data);
    } catch {
      applyModels({ fromApi: false, models: FALLBACK_MODELS });
    }
  }, [applyModels]);

  useEffect(() => {
    api.get('/settings').then((r) => setValues(r.data)).catch(() => undefined);
    api.get('/ai/status').then((r) => setAiStatus(r.data)).catch(() => undefined);
    api
      .get<{ fromApi: boolean; models: AiModel[] }>('/ai/models')
      .then((r) => applyModels(r.data))
      .catch(() => applyModels({ fromApi: false, models: FALLBACK_MODELS }));
  }, [applyModels]);

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
      await loadModels();
      setMsg('Đã lưu cấu hình thành công! ✅');
      setTimeout(() => setMsg(''), 3000);
    } catch {
      setMsg('Lỗi khi lưu cấu hình.');
    } finally {
      setSaving(false);
    }
  };

  const currentModel = values.GeminiModel ?? '';
  const modelInList = models.some((m) => m.id === currentModel);
  const modelMissing = Boolean(currentModel) && !modelInList;

  return (
    <div className="mx-auto max-w-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
          <Sliders size={18} className="text-indigo-600 dark:text-indigo-400" />
          Cài đặt hệ thống
        </h2>
      </div>

      {msg && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 p-3 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:border-emerald-800 dark:text-emerald-300 flex items-center gap-2">
          <Check size={16} />
          <span>{msg}</span>
        </div>
      )}

      {/* Gemini API Key Box */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-bold text-sm">
            <KeyRound size={16} className="text-violet-600 dark:text-violet-400" />
            <span>Gemini API (On-demand)</span>
          </h3>
          {aiStatus && (
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                aiStatus.configured
                  ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300'
                  : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
              }`}
            >
              {aiStatus.configured ? `Đã cấu hình (${aiStatus.model})` : 'Chưa có key'}
            </span>
          )}
        </div>

        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Nhận key miễn phí tại <span className="font-mono text-indigo-600 dark:text-indigo-400">aistudio.google.com</span>. Hệ thống chỉ gọi Gemini khi bạn bấm các nút tính năng AI theo yêu cầu.
        </p>

        <div className="mt-3.5 space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
              API Key
            </label>
            <input
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              type="password"
              placeholder={values.GeminiApiKey ? `Hiện tại: ${values.GeminiApiKey}` : 'Dán Gemini API key vào đây…'}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs shadow-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                Mô hình AI (Model)
              </label>
              <button
                type="button"
                onClick={() => void loadModels()}
                title="Tải lại danh sách model từ Google"
                className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/60"
              >
                <RefreshCw size={11} />
                <span>{modelsFromApi ? 'Danh sách từ Google' : 'Tải lại'}</span>
              </button>
            </div>
            <select
              value={currentModel || models[0]?.id || ''}
              onChange={(e) => setValues({ ...values, GeminiModel: e.target.value })}
              className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold shadow-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80"
            >
              {modelMissing && (
                <option value={currentModel}>{currentModel} (không còn trong danh sách)</option>
              )}
              {models.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} — {m.label}
                </option>
              ))}
            </select>
            {modelMissing ? (
              <p className="mt-1.5 flex items-start gap-1.5 text-[11px] font-semibold text-rose-600 dark:text-rose-400">
                <AlertTriangle size={12} className="mt-0.5 shrink-0" />
                <span>Model đã lưu không còn trong danh sách (Google đã đổi/ngừng hỗ trợ). Chọn model mới rồi bấm Lưu cấu hình.</span>
              </p>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                Google đổi tên model khá thường xuyên — bấm biểu tượng tải lại để lấy danh sách mới nhất theo API key của bạn.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Study Preferences */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
        <h3 className="flex items-center gap-2 font-bold text-sm">
          <Target size={16} className="text-indigo-600 dark:text-indigo-400" />
          <span>Mục tiêu học tập hàng ngày</span>
        </h3>

        <div className="mt-3.5">
          <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
            Số lượt ôn tập chỉ tiêu (Thẻ từ + Câu phản xạ)
          </label>
          <input
            value={values.DailyTarget ?? '20'}
            onChange={(e) => setValues({ ...values, DailyTarget: e.target.value })}
            type="number"
            min="5"
            max="100"
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold shadow-xs focus:border-indigo-500 focus:outline-none dark:border-slate-700 dark:bg-slate-800/80"
          />
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 py-2.5 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-98 disabled:opacity-50"
      >
        <Save size={15} />
        <span>{saving ? 'Đang lưu…' : 'Lưu cấu hình'}</span>
      </button>
    </div>
  );
}
