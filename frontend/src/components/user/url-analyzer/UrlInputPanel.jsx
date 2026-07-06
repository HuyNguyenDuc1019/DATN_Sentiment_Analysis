import { BarChart2, Link as LinkIcon, Search } from 'lucide-react';

export default function UrlInputPanel({ url, setUrl, loading, analyze }) {
  return (
    <div className="lg:col-span-2 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col justify-center">
      <div className="flex items-center gap-2 mb-4 text-slate-200 font-medium">
        <LinkIcon className="w-5 h-5 text-indigo-400" />
        <h2>Đường dẫn cần theo dõi</h2>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
            <input
              type="text"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              onKeyDown={(event) => event.key === 'Enter' && !loading && analyze()}
              placeholder="Dán link Foody/Shopee vào đây..."
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 placeholder-slate-500 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            />
          </div>

          <button
            onClick={analyze}
            disabled={loading}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 px-8 font-semibold text-white transition-all shadow-lg whitespace-nowrap ${
              loading
                ? 'cursor-wait border border-indigo-300/50 bg-indigo-600 shadow-indigo-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20 hover:shadow-indigo-500/30'
            }`}
          >
            <BarChart2 className="w-5 h-5" />
            {loading ? 'ĐANG THU THẬP...' : 'THU THẬP'}
          </button>
        </div>

        {loading && (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/5 p-3">
            <div className="mb-2 flex flex-col gap-1 text-xs font-medium text-indigo-100 sm:flex-row sm:items-center sm:justify-between">
              <span>Đang nạp dữ liệu từ đường dẫn.</span>
              <span className="text-slate-300">Bạn có thể chuyển trang, hệ thống vẫn tiếp tục xử lý.</span>
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
