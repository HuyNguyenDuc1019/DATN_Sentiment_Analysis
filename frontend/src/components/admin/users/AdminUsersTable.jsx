import AdminUserRow from './AdminUserRow';
import AdminUserTableSkeletonRow from './AdminUserTableSkeletonRow';
import { getActivityForUser } from '../../../utils/admin/usersUtils';

export default function AdminUsersTable({
  isLoading,
  filteredUsers,
  paginatedUsers,
  activitySummary,
  processingId,
  onSelectUser,
  onOpenBanConfirm,
  onUserAction,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1280px] text-left border-collapse">
        <thead>
          <tr className="border-b border-slate-700/50 text-xs font-semibold uppercase tracking-wider text-slate-400 bg-slate-900/30">
            <th className="px-5 py-4">Tài khoản (Email)</th>
            <th className="px-5 py-4">Vai trò</th>
            <th className="px-5 py-4">Trạng thái</th>
            <th className="px-5 py-4">Gói dịch vụ</th>
            <th className="px-5 py-4">Hoạt động dữ liệu</th>
            <th className="px-5 py-4">Ngày tạo</th>
            <th className="px-5 py-4 text-right">Thao tác</th>
          </tr>
        </thead>

        <tbody className="divide-y divide-slate-700/50">
          {isLoading ? (
            Array(4)
              .fill(0)
              .map((_, index) => <AdminUserTableSkeletonRow key={index} />)
          ) : filteredUsers.length === 0 ? (
            <tr>
              <td colSpan="7" className="px-5 py-12 text-center text-slate-500 text-sm">
                Không có người dùng phù hợp.
              </td>
            </tr>
          ) : (
            paginatedUsers.map((user) => (
              <AdminUserRow
                key={user.id}
                user={user}
                activity={getActivityForUser(activitySummary, user.id)}
                processingId={processingId}
                onSelectUser={onSelectUser}
                onOpenBanConfirm={onOpenBanConfirm}
                onUserAction={onUserAction}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
