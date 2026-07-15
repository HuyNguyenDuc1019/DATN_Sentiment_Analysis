import { Download, RefreshCw, Sparkles } from 'lucide-react';

export default function AdminFeedbackHeader({
  isLoading,
  isExporting,
  isAutoReviewing,
  onRefresh,
  onExport,
  onAutoReview,
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
          onClick={onAutoReview}
          disabled={isLoading || isAutoReviewing}
          className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20 disabled:cursor-not-allowed disabled:opacity-60"
          title="Tự duyệt các trường hợp người dùng xác nhận AI đúng; các trường hợp sửa nhãn vẫn để admin kiểm tra"
        >
          {isAutoReviewing ? <RefreshCw size={18} className="animate-spin" /> : <Sparkles size={18} />}
          <span>{isAutoReviewing ? 'Đang xử lý...' : 'Tự động xử lý an toàn'}</span>
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
