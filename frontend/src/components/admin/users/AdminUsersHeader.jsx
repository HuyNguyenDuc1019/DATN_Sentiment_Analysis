import { Download, RefreshCw } from 'lucide-react';

export default function AdminUsersHeader({
  isLoading,
  canExport,
  onExportUsersCsv,
  onRefresh,
}) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-wide text-white">Quản lý Người dùng</h1>
        <p className="text-sm text-slate-400">Quản trị tài khoản, phân quyền và trạng thái hoạt động.</p>
      </div>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onExportUsersCsv}
          disabled={isLoading || !canExport}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          title="Xuất danh sách người dùng CSV"
        >
          <Download size={16} />
          Xuất CSV
        </button>

        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700 shrink-0"
          title="Làm mới"
        >
          <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
        </button>
      </div>
    </div>
  );
}
