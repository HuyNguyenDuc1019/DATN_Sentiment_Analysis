import { Filter, Search, SlidersHorizontal } from 'lucide-react';

export default function FeedbackToolbar({
  isLoading,
  count,
  search,
  statusFilter,
  showAdvancedFilters,
  onSearchChange,
  onStatusFilterChange,
  onToggleAdvancedFilters,
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-3 border-b border-slate-700/50 bg-slate-900/30 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Filter size={16} />
        <span>{isLoading ? 'Đang tải...' : `${count} phản hồi trong trang này`}</span>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Tìm theo nội dung, email, tên... (cách nhau bởi dấu phẩy)"
            className="w-full sm:w-72 rounded-lg border border-slate-700 bg-slate-900 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => onStatusFilterChange(event.target.value)}
          className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs font-medium text-slate-200 outline-none focus:border-indigo-500"
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="pending">Chờ duyệt</option>
          <option value="approved">Đã duyệt</option>
          <option value="rejected">Đã từ chối</option>
        </select>

        <button
          onClick={onToggleAdvancedFilters}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
            showAdvancedFilters
              ? 'border-indigo-500 bg-indigo-500/10 text-indigo-300'
              : 'border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600'
          }`}
        >
          <SlidersHorizontal size={14} />
          Lọc nâng cao
        </button>
      </div>
    </div>
  );
}
