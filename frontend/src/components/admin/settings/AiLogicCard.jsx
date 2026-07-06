import { BrainCircuit } from 'lucide-react';

export default function AiLogicCard({ settings, onChange }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden flex flex-col">
      <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center gap-3">
        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
          <BrainCircuit size={20} />
        </div>
        <h2 className="text-base font-semibold text-slate-200">Cài đặt cấu hình AI (AI Logic)</h2>
      </div>

      <div className="p-6 flex-1 space-y-6">
        <div>
          <div className="flex justify-between items-end mb-2">
            <label className="text-sm font-medium text-slate-300">Ngưỡng độ nhạy phân tích (Thresholds)</label>
            <span className="px-3 py-1 rounded-md bg-slate-900 text-indigo-400 font-mono text-sm border border-slate-700">
              {(settings.ai_threshold * 100).toFixed(0)}%
            </span>
          </div>

          <p className="text-xs text-slate-500 mb-6">Điều chỉnh điểm số để phân loại Tích cực / Trung tính / Tiêu cực.</p>

          <input
            id="ai_threshold"
            name="ai_threshold"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={settings.ai_threshold}
            onChange={onChange}
            className="w-full h-2 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-indigo-500"
          />

          <div className="flex justify-between text-xs font-medium mt-3">
            <span className="text-rose-400">Thiên về Tiêu cực</span>
            <span className="text-emerald-400">Thiên về Tích cực</span>
          </div>
        </div>
      </div>
    </div>
  );
}
