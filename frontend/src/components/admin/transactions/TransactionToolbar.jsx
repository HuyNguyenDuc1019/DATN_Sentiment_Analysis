import { Download, RefreshCcw, Search, X } from 'lucide-react';

const quickFilters = [
  { key: 'today', label: 'Hôm nay' },
  { key: '7days', label: '7 ngày' },
  { key: 'month', label: 'Tháng này' },
  { key: 'all', label: 'Tất cả' },
];

export default function TransactionToolbar({
  searchTerm,
  statusFilter,
  startDateFilter,
  endDateFilter,
  quickFilter,
  hasActiveFilter,
  isLoading,
  canExport,
  onSearchChange,
  onStatusFilterChange,
  onStartDateFilterChange,
  onEndDateFilterChange,
  onQuickFilter,
  onResetFilters,
  onExportCsv,
  onRefresh,
}) {
  return (
    <div className="admin-transactions-toolbar p-4 border-b border-slate-700 bg-slate-800/50 flex flex-col gap-3 2xl:flex-row 2xl:justify-between 2xl:items-center">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Tìm mã giao dịch, email..."
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="w-full lg:w-44 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="paid">Thành công</option>
          <option value="cancelled">Đã hủy</option>
          <option value="pending">Đang xử lý</option>
        </select>

        <input
          type="date"
          value={startDateFilter}
          onChange={(event) => onStartDateFilterChange(event.target.value)}
          className="w-full lg:w-40 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none [color-scheme:dark]"
          title="Từ ngày"
        />

        <input
          type="date"
          value={endDateFilter}
          onChange={(event) => onEndDateFilterChange(event.target.value)}
          className="w-full lg:w-40 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none [color-scheme:dark]"
          title="Đến ngày"
        />

        <div className="flex flex-wrap items-center gap-2">
          {quickFilters.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => onQuickFilter(item.key)}
              className={`rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${
                quickFilter === item.key
                  ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                  : 'border-slate-700 bg-slate-900 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {hasActiveFilter && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg border border-slate-700 bg-slate-900 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <X size={15} />
            Xóa lọc
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExportCsv}
          disabled={isLoading || !canExport}
          className="admin-transactions-export-btn inline-flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-700 text-slate-200 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed border border-slate-700"
        >
          <Download size={16} />
          Xuất CSV
        </button>

        <button
          type="button"
          onClick={onRefresh}
          disabled={isLoading}
          className="admin-transactions-refresh-btn inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/20"
        >
          <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
          {isLoading ? 'Đang tải...' : 'Làm mới'}
        </button>
      </div>
    </div>
  );
}
