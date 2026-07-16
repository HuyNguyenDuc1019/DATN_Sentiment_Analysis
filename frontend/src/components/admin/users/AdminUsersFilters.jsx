import { Search } from 'lucide-react';

export default function AdminUsersFilters({
  usersCount,
  filteredCount,
  searchTerm,
  roleFilter,
  statusFilter,
  onSearchTermChange,
  onRoleFilterChange,
  onStatusFilterChange,
  onResetFilters,
}) {
  return (
    <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-md">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative w-full xl:max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => onSearchTermChange(event.target.value)}
            placeholder="Tìm email, tên, ID..."
            className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={roleFilter}
            onChange={(event) => onRoleFilterChange(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Tất cả vai trò</option>
            <option value="admin">Admin</option>
            <option value="user">User</option>
          </select>

          <select
            value={statusFilter}
            onChange={(event) => onStatusFilterChange(event.target.value)}
            className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="blocked">Bị khóa</option>
          </select>

          <button
            type="button"
            onClick={onResetFilters}
            className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 transition hover:border-indigo-400 hover:text-white"
          >
            Xóa lọc
          </button>
        </div>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Đang hiển thị {filteredCount}/{usersCount} tài khoản. Mỗi trang 10 dòng.
      </p>
    </div>
  );
}
