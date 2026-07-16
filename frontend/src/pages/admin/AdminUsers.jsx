import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';

import { logAdminActivity } from '../../services/adminActivityLogger';

import AdminUsersHeader from '../../components/admin/users/AdminUsersHeader';
import AdminUsersStatsGrid from '../../components/admin/users/AdminUsersStatsGrid';
import AdminUsersFilters from '../../components/admin/users/AdminUsersFilters';
import AdminUsersTable from '../../components/admin/users/AdminUsersTable';
import UserDetailModal from '../../components/admin/users/UserDetailModal';
import BanConfirmModal from '../../components/admin/users/BanConfirmModal';
import PaginationControls from '../../components/admin/users/PaginationControls';

import {
  ITEMS_PER_PAGE,
  exportUsersCsv,
  filterUsers,
  formatDate,
  getErrorMessage,
  getHistoryTitle,
  getUserStats,
} from '../../utils/admin/usersUtils';

import {
  fetchAdminActivitySummary,
  fetchAdminUsers,
  fetchUserActivityHistory,
  getCurrentAdminId,
  updateAdminUserAction,
} from '../../services/admin/usersService';

function getUserActionSuccessMessage(action) {
  const messages = {
    ban: 'Đã khóa tài khoản người dùng thành công.',
    unban: 'Đã mở khóa tài khoản người dùng thành công.',
  };

  return messages[action] || 'Đã cập nhật tài khoản người dùng thành công.';
}

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [activitySummary, setActivitySummary] = useState({});
  const [userHistory, setUserHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [pendingBanUser, setPendingBanUser] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [page, setPage] = useState(1);

  const fetchActivitySummary = useCallback(async (adminId) => {
    try {
      const summary = await fetchAdminActivitySummary(adminId);
      setActivitySummary(summary);
    } catch (error) {
      console.warn('Không tải được thống kê hoạt động user:', error);
      setActivitySummary({});
    }
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true);

      const adminId = await getCurrentAdminId();
      const data = await fetchAdminUsers(adminId);

      if (Array.isArray(data)) {
        setUsers(data);
      } else if (data && Array.isArray(data.data)) {
        setUsers(data.data);
      } else {
        console.error('Dữ liệu trả về không phải mảng:', data);
        setUsers([]);
      }

      await fetchActivitySummary(adminId);
    } catch (error) {
      console.error('Lỗi quá trình tải:', error);
      toast.error(error.message || 'Không thể tải danh sách người dùng từ máy chủ.');
      setUsers([]);
      setActivitySummary({});
    } finally {
      setIsLoading(false);
    }
  }, [fetchActivitySummary]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const fetchUserHistory = async (userId) => {
    if (!userId) return;

    setIsHistoryLoading(true);

    try {
      const adminId = await getCurrentAdminId();
      const logs = await fetchUserActivityHistory({
        adminId,
        userId,
      });

      setUserHistory(logs);
    } catch (error) {
      console.error('Không thể tải lịch sử thao tác user:', error);
      setUserHistory([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUser?.id) {
      fetchUserHistory(selectedUser.id);
    } else {
      setUserHistory([]);
    }
  }, [selectedUser?.id]);

  const userStats = useMemo(() => getUserStats(users), [users]);

  const filteredUsers = useMemo(
    () =>
      filterUsers({
        users,
        searchTerm,
        roleFilter,
        statusFilter,
      }),
    [searchTerm, users, roleFilter, statusFilter],
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));

  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  const handleAction = async (targetUser, action, reason = '') => {
    setProcessingId(targetUser.id);

    try {
      const adminId = await getCurrentAdminId();

      await updateAdminUserAction({
        adminId,
        targetUserId: targetUser.id,
        action,
      });

      const updatePayload = action === 'ban'
        ? { status: 'blocked' }
        : { status: 'active' };

      setUsers((current) =>
        current.map((user) => (user.id === targetUser.id ? { ...user, ...updatePayload } : user)),
      );

      setSelectedUser((current) =>
        current && current.id === targetUser.id ? { ...current, ...updatePayload } : current,
      );

      toast.success(getUserActionSuccessMessage(action), {
        id: `admin-user-action-${targetUser.id}-${action}`,
      });

      const targetLabel = targetUser.email || targetUser.full_name || targetUser.id;
      const reasonText = reason.trim() ? ` Lý do: ${reason.trim()}` : '';

      const actionMeta = {
        ban: { type: 'user_banned', text: `khóa tài khoản ${targetLabel}.${reasonText}` },
        unban: { type: 'user_unbanned', text: `mở khóa tài khoản ${targetLabel}` },
      }[action];

      if (actionMeta) {
        await logAdminActivity({
          actionType: actionMeta.type,
          targetType: 'user',
          targetId: targetUser.id,
          description: actionMeta.text,
        });
      }

      if (selectedUser?.id === targetUser.id) {
        await fetchUserHistory(targetUser.id);
      }
    } catch (error) {
      console.error('Lỗi thao tác user:', error);
      toast.error(`Thất bại: ${getErrorMessage(error.message || error)}`, {
        id: `admin-user-action-error-${action}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const openBanConfirm = (user) => {
    setPendingBanUser(user);
    setBanReason('');
  };

  const confirmBanUser = async () => {
    if (!pendingBanUser) return;

    if (!banReason.trim()) {
      toast.error('Vui lòng nhập lý do khóa tài khoản.');
      return;
    }

    await handleAction(pendingBanUser, 'ban', banReason);
    setPendingBanUser(null);
    setBanReason('');
  };

  const handleExportUsersCsv = () => {
    exportUsersCsv({
      users: filteredUsers,
      activitySummary,
    });

    toast.success('Đã xuất danh sách người dùng CSV.');
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <AdminUsersHeader
        isLoading={isLoading}
        canExport={filteredUsers.length > 0}
        onExportUsersCsv={handleExportUsersCsv}
        onRefresh={fetchUsers}
      />

      <AdminUsersStatsGrid userStats={userStats} />

      <AdminUsersFilters
        usersCount={users.length}
        filteredCount={filteredUsers.length}
        searchTerm={searchTerm}
        roleFilter={roleFilter}
        statusFilter={statusFilter}
        onSearchTermChange={setSearchTerm}
        onRoleFilterChange={setRoleFilter}
        onStatusFilterChange={setStatusFilter}
        onResetFilters={resetFilters}
      />

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md overflow-hidden">
        <AdminUsersTable
          isLoading={isLoading}
          filteredUsers={filteredUsers}
          paginatedUsers={paginatedUsers}
          activitySummary={activitySummary}
          processingId={processingId}
          onSelectUser={setSelectedUser}
          onOpenBanConfirm={openBanConfirm}
          onUserAction={handleAction}
        />

        {!isLoading && filteredUsers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-700/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Hiển thị <span className="font-semibold text-slate-200">{(page - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
              <span className="font-semibold text-slate-200">{Math.min(page * ITEMS_PER_PAGE, filteredUsers.length)}</span> /{' '}
              <span className="font-semibold text-slate-200">{filteredUsers.length}</span> tài khoản
            </p>

            <PaginationControls
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {selectedUser && (
        <UserDetailModal
          selectedUser={selectedUser}
          userHistory={userHistory}
          isHistoryLoading={isHistoryLoading}
          onClose={() => setSelectedUser(null)}
          formatDate={formatDate}
          getHistoryTitle={getHistoryTitle}
        />
      )}

      {pendingBanUser && (
        <BanConfirmModal
          pendingBanUser={pendingBanUser}
          banReason={banReason}
          processingId={processingId}
          onBanReasonChange={setBanReason}
          onCancel={() => {
            setPendingBanUser(null);
            setBanReason('');
          }}
          onConfirm={confirmBanUser}
        />
      )}
    </div>
  );
}
