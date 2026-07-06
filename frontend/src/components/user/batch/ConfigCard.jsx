import { ChevronDown, Play, Settings } from 'lucide-react';

export default function ConfigCard({ columns, column, setColumn, disabled, loading, onAnalyze, isVip }) {
  const ready = !disabled || loading;

  return (
    <div className="rounded-3xl border border-slate-700 bg-slate-800/50 p-6 shadow-2xl shadow-slate-950/15 backdrop-blur-md">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-indigo-500/20 bg-indigo-500/10">
          <Settings className="h-5 w-5 text-indigo-300" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Thiết lập dữ liệu</h3>
          <p className="mt-1 text-xs text-slate-500">Chọn nguồn và cột chứa bình luận.</p>
        </div>
      </div>

      <div className="space-y-5">
        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Nguồn phản hồi</label>
          <div className="relative">
            <select className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950/60 py-3 pl-4 pr-10 text-sm font-medium text-slate-200 outline-none transition focus:border-indigo-500">
              <option>CSV Upload</option>
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">Cột chứa nội dung phản hồi</label>
          <div className="relative">
            <select
              value={column}
              onChange={(event) => setColumn(event.target.value)}
              disabled={!columns.length}
              className="w-full appearance-none rounded-xl border border-slate-700 bg-slate-950/60 py-3 pl-4 pr-10 text-sm font-medium text-slate-200 outline-none transition disabled:cursor-not-allowed disabled:text-slate-500 focus:border-indigo-500"
            >
              {columns.length ? (
                columns.map((name) => <option key={name}>{name}</option>)
              ) : (
                <option>Vui lòng tải tệp lên trước</option>
              )}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={onAnalyze}
        disabled={disabled}
        className={`mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-sm font-bold transition-all ${
          loading
            ? 'cursor-wait border border-indigo-400/60 bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
            : ready
              ? 'border border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-950/25 hover:bg-indigo-500'
              : 'cursor-not-allowed border border-slate-700 bg-slate-900/70 text-slate-500'
        }`}
      >
        <Play className="h-4 w-4" />
        {loading ? 'Đang xử lý ngầm...' : 'Bắt đầu xử lý'}
      </button>

      {loading && (
        <div className="mt-4 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3">
          <p className="mb-3 text-xs leading-5 text-indigo-100">
            Hệ thống đang xử lý ngầm. Bạn có thể chuyển sang trang khác và quay lại xem kết quả.
          </p>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-950">
            <div className="h-full w-full origin-left animate-pulse rounded-full bg-gradient-to-r from-indigo-400 via-violet-400 to-cyan-300" />
          </div>
        </div>
      )}

      {!isVip && (
        <p className="mt-4 text-center text-xs text-slate-500">Free: tối đa 50 bình luận/lần.</p>
      )}
    </div>
  );
}
