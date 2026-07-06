import { Download, RefreshCcw } from 'lucide-react';

export default function AdminDashboardHeader({ isLoading, onExportPdf, onRefresh }) {
  return (
    <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-wide text-white">Tổng quan hệ thống</h1>
        <p className="text-sm text-slate-400">
          Theo dõi các chỉ số quan trọng của toàn bộ hệ thống.
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3 md:mt-0">
        <button
          type="button"
          onClick={onExportPdf}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-black text-slate-200 shadow-lg transition hover:border-indigo-400 hover:text-white"
        >
          <Download className="h-4 w-4" />
          Xuất Báo cáo PDF
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 disabled:opacity-60"
        >
          <RefreshCcw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Làm mới dữ liệu
        </button>
      </div>
    </div>
  );
}
