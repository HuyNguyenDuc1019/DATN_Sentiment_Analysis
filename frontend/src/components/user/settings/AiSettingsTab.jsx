import { Lock } from 'lucide-react';

export default function AiSettingsTab({
  isVip,
  threshold,
  setThreshold,
  stopWords,
  setStopWords,
  onUpgrade,
}) {
  return (
    <div className="relative flex-1 flex flex-col">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-white">Tùy chỉnh Trí tuệ nhân tạo</h2>
      </div>

      <div
        className={`space-y-8 flex-1 transition-all duration-300 ${
          !isVip ? 'opacity-20 blur-[3px] pointer-events-none select-none' : ''
        }`}
      >
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Ngưỡng độ nhạy phân tích ({threshold}%)
          </label>
          <div className="px-2 mt-4">
            <input
              type="range"
              min="0"
              max="100"
              value={threshold}
              onChange={(event) => setThreshold(Number(event.target.value))}
              className="w-full accent-indigo-500 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex justify-between items-center mt-3 text-xs font-semibold">
              <span className="text-rose-400">Thiên về Tiêu cực (0%)</span>
              <span className="text-emerald-400">Thiên về Tích cực (100%)</span>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Từ điển Cảnh báo đỏ (Crisis Stop-words)
          </label>
          <textarea
            rows="3"
            value={stopWords}
            onChange={(event) => setStopWords(event.target.value)}
            placeholder="Nhập các từ cách nhau bằng dấu phẩy..."
            className="w-full bg-slate-900/80 border border-slate-700 text-slate-300 text-sm rounded-xl p-4 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>
      </div>

      {!isVip && (
        <button
          type="button"
          onClick={onUpgrade}
          className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-900/40 rounded-xl"
        >
          <div className="bg-slate-800 border border-slate-600 p-8 rounded-2xl max-w-sm text-center shadow-2xl">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="text-indigo-400 w-8 h-8" />
            </div>
            <h3 className="text-white font-bold text-lg mb-2">Tính năng độc quyền VIP</h3>
            <p className="text-slate-400 text-sm">
              Nâng cấp VIP để chỉnh ngưỡng AI và từ điển cảnh báo đỏ.
            </p>
            <div className="mt-4 w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors">
              Nâng cấp ngay
            </div>
          </div>
        </button>
      )}
    </div>
  );
}
