import { AlertTriangle } from 'lucide-react';

export default function CrisisAlertCard({ settings, onChange }) {
  return (
    <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl overflow-hidden lg:col-span-2">
      <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400">
            <AlertTriangle size={20} />
          </div>
          <h2 className="text-base font-semibold text-slate-200">Hệ thống Cảnh báo Khủng hoảng (Crisis Alerts)</h2>
        </div>

        <label className="relative inline-flex items-center cursor-pointer shrink-0" title="Bật/Tắt Cảnh báo đỏ">
          <input
            type="checkbox"
            name="crisis_alert_enabled"
            checked={settings.crisis_alert_enabled}
            onChange={onChange}
            className="sr-only peer"
          />
          <div className="w-12 h-6 bg-slate-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-rose-500" />
        </label>
      </div>

      <div className="p-6">
        <label htmlFor="custom_dictionary" className="text-sm font-medium text-slate-300 block mb-2">
          Từ điển nhạy cảm tùy chỉnh (Custom Stop-words)
        </label>
        <p className="text-xs text-slate-500 mb-4">
          Hệ thống sẽ dựa vào danh sách này để tự động cắm cờ "Cần xử lý khẩn cấp". Các từ trùng lặp sẽ tự động bị xóa khi Lưu.
        </p>
        <textarea
          id="custom_dictionary"
          name="custom_dictionary"
          rows="2"
          value={settings.custom_dictionary}
          onChange={onChange}
          placeholder="Ví dụ: ngộ độc, có giòi, ruồi, thái độ lồi lõm..."
          className="w-full bg-slate-900 border border-slate-700 text-slate-200 text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition-all leading-relaxed resize-y"
        />
      </div>
    </div>
  );
}
