import { BarChart2, CalendarDays, Link as LinkIcon, Search, Square } from 'lucide-react';

export default function UrlInputPanel({
  url,
  setUrl,
  loading,
  analyze,
  stop,
  customDate,
  setCustomDate,
}) {
  return (
    <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-4 text-slate-200 font-medium">
        <LinkIcon className="w-5 h-5 text-indigo-400" />
        <h2>Đường dẫn cần theo dõi</h2>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />

            <input
              type="text"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && !loading && analyze()}
              placeholder="Dán link Foody hoặc Google Maps vào đây..."
              disabled={loading}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:cursor-not-allowed disabled:opacity-70"
            />
          </div>

          {loading ? (
            <button
              type="button"
              onClick={stop}
              className="flex items-center justify-center gap-2 rounded-xl py-3 px-8 font-semibold text-white transition-all shadow-lg whitespace-nowrap border border-rose-300/50 bg-rose-600 hover:bg-rose-500 shadow-rose-600/30"
            >
              <Square className="w-4 h-4" />
              DỪNG
            </button>
          ) : (
            <button
              type="button"
              onClick={analyze}
              className="flex items-center justify-center gap-2 rounded-xl py-3 px-8 font-semibold text-white transition-all shadow-lg whitespace-nowrap bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 hover:shadow-indigo-500/30"
            >
              <BarChart2 className="w-5 h-5" />
              THU THẬP
            </button>
          )}
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-200">
            <CalendarDays className="h-4 w-4 text-indigo-400" />
            <span>Mốc thời gian bắt đầu cào</span>
            <span className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2 py-0.5 text-[11px] font-semibold text-amber-200">
              Tùy chọn
            </span>
          </div>

          <input
            type="date"
            value={customDate}
            onChange={(event) => setCustomDate(event.target.value)}
            disabled={loading}
            className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-4 py-3 text-sm font-medium text-slate-200 outline-none transition disabled:cursor-not-allowed disabled:text-slate-500 focus:border-indigo-500"
          />

          <p className="mt-3 text-xs leading-5 text-slate-500">
            Bỏ trống nếu muốn tự động nối tiếp dữ liệu. Chỉ chọn ngày nếu quán đổi chủ hoặc menu.
          </p>
        </div>

        {loading && (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
            <div className="mb-2 flex flex-col gap-1 text-xs font-medium text-indigo-100 sm:flex-row sm:items-center sm:justify-between">
              <span>Đang nạp dữ liệu từ đường dẫn.</span>

              <span className="text-slate-300">
                Có thể bấm Dừng để ngắt tác vụ hiện tại.
              </span>
            </div>

            <div className="h-2 overflow-hidden rounded-full bg-slate-900">
              <div className="h-full w-full origin-left animate-pulse rounded-full bg-gradient-to-r from-indigo-500 via-violet-400 to-cyan-300" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}