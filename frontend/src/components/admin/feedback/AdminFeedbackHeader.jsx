import { Download, RefreshCw } from 'lucide-react';

export default function AdminFeedbackHeader({
  isLoading,
  isExporting,
  onRefresh,
  onExport,
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-wide text-white">Quản lý Phản hồi</h1>
        <p className="text-sm text-slate-400">Duyệt các nhãn người dùng chỉnh sửa để cải thiện bộ dữ liệu.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700"
          title="Làm mới"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>

        <button
          onClick={onExport}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
        >
          {isExporting ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
          <span>Xuất Dataset CSV</span>
        </button>
      </div>
    </div>
  );
}
