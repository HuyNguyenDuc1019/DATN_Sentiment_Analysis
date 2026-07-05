import { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Ban,
  BadgeCheck,
  CalendarDays,
  Crown,
  Download,
  FileText,
  History,
  Loader2,
  Mail,
  MessageSquare,
  RefreshCw,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Unlock,
  UserRound,
  Users,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';
import { logAdminActivity } from '../../services/adminActivityLogger';

const API_BASE_URL = 'http://localhost:8000';

const ITEMS_PER_PAGE = 10;
const WINDOW_SIZE = 3;


const getErrorMessage = (data, fallback = 'Thao tác thất bại.') => {
  const raw = data?.detail || data?.message || data?.error || data;

  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;

  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (typeof item === 'string') return item;
        return item?.msg || item?.message || JSON.stringify(item);
      })
      .join('\n');
  }

  if (typeof raw === 'object') {
    return raw.msg || raw.message || JSON.stringify(raw);
  }

  return String(raw);
};


const getPageItems = (currentPage, totalPages) => {
  if (totalPages <= WINDOW_SIZE + 1) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  let start = currentPage;
  let end = Math.min(start + WINDOW_SIZE - 1, totalPages);

  if (end - start + 1 < WINDOW_SIZE) {
    start = Math.max(1, end - WINDOW_SIZE + 1);
  }

  const items = [];
  for (let pageNumber = start; pageNumber <= end; pageNumber += 1) {
    items.push(pageNumber);
  }

  if (end < totalPages - 1) {
    items.push('dots-right');
    items.push(totalPages);
  } else if (end < totalPages) {
    items.push(totalPages);
  }

  return items;
};

const PaginationControls = ({ page, totalPages, onPageChange }) => {
  const safeTotalPages = Math.max(1, totalPages || 1);
  const safePage = Math.min(Math.max(1, page || 1), safeTotalPages);
  const pageItems = getPageItems(safePage, safeTotalPages);

  const goToPage = (nextPage) => {
    const boundedPage = Math.min(Math.max(1, nextPage), safeTotalPages);
    if (boundedPage !== safePage) {
      onPageChange(boundedPage);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <button
        type="button"
        onClick={() => goToPage(safePage - 1)}
        disabled={safePage <= 1}
        className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-700 px-2 text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title="Trang trước"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageItems.map((item) =>
        typeof item === 'string' ? (
          <span key={item} className="flex h-9 min-w-9 items-center justify-center px-1 text-slate-500">
            ...
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => goToPage(item)}
            className={`flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-semibold transition-colors ${
              item === safePage
                ? 'border-indigo-500 bg-indigo-600 text-white shadow-lg shadow-indigo-600/20'
                : 'border-slate-700 text-slate-300 hover:bg-slate-800'
            }`}
            aria-current={item === safePage ? 'page' : undefined}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => goToPage(safePage + 1)}
        disabled={safePage >= safeTotalPages}
        className="flex h-9 min-w-9 items-center justify-center rounded-lg border border-slate-700 px-2 text-slate-300 transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        title="Trang sau"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
};

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [activitySummary, setActivitySummary] = useState({});
  const [userHistory, setUserHistory] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const [pendingBanUser, setPendingBanUser] = useState(null);
  const [banReason, setBanReason] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [page, setPage] = useState(1);

  const getCurrentAdminId = async () => {
    const { data: authData, error: authError } = await supabase.auth.getUser();

    if (authError || !authData?.user) {
      throw new Error('Không tìm thấy thông tin đăng nhập (Phiên hết hạn)!');
    }

    return authData.user.id;
  };

  const fetchActivitySummary = async (adminId) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/users/activity-summary?admin_id=${adminId}`);

      if (!res.ok) {
        console.warn('Không tải được thống kê hoạt động user:', res.status);
        setActivitySummary({});
        return;
      }

      const data = await res.json();
      setActivitySummary(data.summary || data || {});
    } catch (error) {
      console.warn('Không tải được thống kê hoạt động user:', error);
      setActivitySummary({});
    }
  };

  const fetchUsers = async () => {
    try {
      setIsLoading(true);

      const adminId = await getCurrentAdminId();
      const res = await fetch(`${API_BASE_URL}/api/admin/users?admin_id=${adminId}`);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Lỗi chi tiết từ Server:', errorText);
        throw new Error(`Lỗi Server: ${res.status}`);
      }

      const data = await res.json();

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
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUserHistory = async (userId) => {
    if (!userId) return;

    setIsHistoryLoading(true);

    try {
      const adminId = await getCurrentAdminId();
      const res = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/activity-history?admin_id=${adminId}`);

      if (res.ok) {
        const data = await res.json();
        setUserHistory(data.logs || []);
        return;
      }

      const { data, error } = await supabase
        .from('admin_activity_logs')
        .select('id, admin_id, admin_name, action_type, target_type, target_id, description, created_at')
        .eq('target_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setUserHistory(data || []);
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

  const userStats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((user) => user.role === 'admin').length;
    const normalUsers = users.filter((user) => user.role !== 'admin').length;
    const vipUsers = users.filter((user) => String(user.tier || '').toLowerCase() === 'vip').length;

    return {
      total,
      admins,
      normalUsers,
      vipUsers,
    };
  }, [users]);

  const filteredUsers = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return users.filter((user) => {
      const email = String(user.email || '').toLowerCase();
      const name = String(user.full_name || '').toLowerCase();
      const id = String(user.id || '').toLowerCase();
      const role = String(user.role || 'user').toLowerCase();
      const status = user.status === 'blocked' ? 'blocked' : 'active';
      const tier = String(user.tier || 'free').toLowerCase();

      const matchSearch =
        !keyword ||
        email.includes(keyword) ||
        name.includes(keyword) ||
        id.includes(keyword) ||
        role.includes(keyword) ||
        status.includes(keyword) ||
        tier.includes(keyword);

      const matchRole = roleFilter === 'all' ? true : role === roleFilter;
      const matchStatus = statusFilter === 'all' ? true : status === statusFilter;
      const matchTier = tierFilter === 'all' ? true : tier === tierFilter;

      return matchSearch && matchRole && matchStatus && matchTier;
    });
  }, [searchTerm, users, roleFilter, statusFilter, tierFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const paginatedUsers = useMemo(() => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, roleFilter, statusFilter, tierFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const handleAction = async (targetUser, action, reason = '') => {
    setProcessingId(targetUser.id);

    try {
      const adminId = await getCurrentAdminId();

      const res = await fetch(`${API_BASE_URL}/api/admin/users/action?admin_id=${adminId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_id: adminId,
          target_user_id: targetUser.id,
          action,
        }),
      });

      const responseData = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(getErrorMessage(responseData, 'Lỗi server'));
      }

      const updatePayload =
        action === 'ban'
          ? { status: 'blocked' }
          : action === 'unban'
            ? { status: 'active' }
            : action === 'upgrade_vip'
              ? { tier: 'vip' }
              : { tier: 'free' };

      setUsers((current) =>
        current.map((user) => (user.id === targetUser.id ? { ...user, ...updatePayload } : user)),
      );

      setSelectedUser((current) =>
        current && current.id === targetUser.id ? { ...current, ...updatePayload } : current,
      );

      toast.success(responseData?.message || 'Thao tác thành công!', {
        id: `admin-user-action-${targetUser.id}-${action}`,
      });

      const targetLabel = targetUser.email || targetUser.full_name || targetUser.id;
      const reasonText = reason.trim() ? ` Lý do: ${reason.trim()}` : '';
      const actionMeta = {
        ban: { type: 'user_banned', text: `khóa tài khoản ${targetLabel}.${reasonText}` },
        unban: { type: 'user_unbanned', text: `mở khóa tài khoản ${targetLabel}` },
        upgrade_vip: { type: 'user_upgraded_vip', text: `nâng cấp tài khoản ${targetLabel} lên VIP` },
        downgrade_vip: { type: 'user_downgraded_vip', text: `hạ tài khoản ${targetLabel} xuống gói Free` },
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
      toast.error(`Thất bại: ${error.message}`, {
        id: `admin-user-action-error-${action}`,
      });
    } finally {
      setProcessingId(null);
    }
  };

  const formatDate = (value) => {
    if (!value) return '—';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return '—';
    }

    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const resetFilters = () => {
    setSearchTerm('');
    setRoleFilter('all');
    setStatusFilter('all');
    setTierFilter('all');
  };

  const getStatusBadge = (status) => {
    const isActive = status !== 'blocked';

    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium border ${
          isActive
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}
      >
        {isActive ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
        {isActive ? 'Hoạt động' : 'Bị khóa'}
      </span>
    );
  };

  const getTierBadge = (tier) => {
    const safeTier = String(tier || 'free').toLowerCase();
    const isVIP = safeTier === 'vip';

    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2.5 py-1 text-xs rounded-full font-medium border ${
          isVIP
            ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
            : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
        }`}
      >
        {isVIP && <Crown size={12} />}
        {isVIP ? 'VIP' : 'Free'}
      </span>
    );
  };

  const getActivityForUser = (userId) => {
    return activitySummary[userId] || {
      review_count: 0,
      feedback_count: 0,
      last_activity_at: null,
    };
  };

  const getHistoryTitle = (actionType) => {
    const titles = {
      user_banned: 'Khóa tài khoản',
      user_unbanned: 'Mở khóa tài khoản',
      user_upgraded_vip: 'Nâng cấp VIP',
      user_downgraded_vip: 'Hạ gói dịch vụ',
      admin_login: 'Admin đăng nhập',
    };

    return titles[actionType] || 'Hoạt động quản trị';
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

  const exportUsersCsv = () => {
    const escapeCsv = (value) => {
      const text = String(value ?? '').replaceAll('"', '""');
      return `"${text}"`;
    };

    const formatCsvDate = (value) => {
      if (!value) return '';

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return '';
      }

      return date.toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    };

    const headers = [
      'email',
      'full_name',
      'role',
      'status',
      'tier',
      'review_count',
      'feedback_count',
      'last_activity',
      'created_at',
    ];

    const rows = filteredUsers.map((user) => {
      const activity = getActivityForUser(user.id);

      return {
        email: user.email || '',
        full_name: user.full_name || '',
        role: user.role || 'user',
        status: user.status === 'blocked' ? 'blocked' : 'active',
        tier: user.tier || 'free',
        review_count: activity.review_count || 0,
        feedback_count: activity.feedback_count || 0,
        last_activity: formatCsvDate(activity.last_activity_at || activity.last_activity),
        created_at: formatCsvDate(user.created_at),
      };
    });

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(',')),
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], {
      type: 'text/csv;charset=utf-8;',
    });

    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = `users_export_${new Date().toISOString().slice(0, 10)}.csv`;

    document.body.appendChild(link);
    link.click();
    link.remove();

    window.URL.revokeObjectURL(url);

    toast.success('Đã xuất danh sách người dùng CSV.');
  };

  return (
    <div className="p-8 space-y-6 animate-in fade-in duration-500 font-sans">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-semibold tracking-wide text-white">Quản lý Người dùng</h1>
          <p className="text-sm text-slate-400">Quản trị tài khoản, phân quyền và nâng cấp dịch vụ.</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportUsersCsv}
            disabled={isLoading || filteredUsers.length === 0}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:border-indigo-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            title="Xuất danh sách người dùng CSV"
          >
            <Download size={16} />
            Xuất CSV
          </button>

          <button
            onClick={fetchUsers}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-700 shrink-0"
            title="Làm mới"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Tổng tài khoản</h3>
            <Users className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="mt-4 text-4xl font-bold text-white">{userStats.total}</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Admin</h3>
            <Shield className="h-5 w-5 text-indigo-400" />
          </div>
          <p className="mt-4 text-4xl font-bold text-indigo-400">{userStats.admins}</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">User thường</h3>
            <UserRound className="h-5 w-5 text-sky-400" />
          </div>
          <p className="mt-4 text-4xl font-bold text-sky-400">{userStats.normalUsers}</p>
        </div>

        <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md">
          <div className="flex items-start justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">VIP</h3>
            <Crown className="h-5 w-5 text-violet-400" />
          </div>
          <p className="mt-4 text-4xl font-bold text-violet-400">{userStats.vipUsers}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-4 backdrop-blur-md">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative w-full xl:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Tìm email, tên, ID..."
              className="w-full bg-slate-950/50 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-4 py-2 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder-slate-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={roleFilter}
              onChange={(event) => setRoleFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Tất cả vai trò</option>
              <option value="admin">Admin</option>
              <option value="user">User</option>
            </select>

            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Hoạt động</option>
              <option value="blocked">Bị khóa</option>
            </select>

            <select
              value={tierFilter}
              onChange={(event) => setTierFilter(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">Tất cả gói</option>
              <option value="free">Free</option>
              <option value="vip">VIP</option>
            </select>

            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-700 bg-slate-950/50 px-3 py-2 text-sm text-slate-300 transition hover:border-indigo-400 hover:text-white"
            >
              Xóa lọc
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-500">
          Đang hiển thị {filteredUsers.length}/{users.length} tài khoản. Mỗi trang {ITEMS_PER_PAGE} dòng.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700 bg-slate-800/50 backdrop-blur-md overflow-hidden">
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
                  .map((_, index) => (
                    <tr key={index}>
                      <td className="px-5 py-4"><div className="w-40 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="w-16 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="w-24 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="w-16 h-6 bg-slate-700/50 rounded-full animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="w-36 h-10 bg-slate-700/50 rounded animate-pulse" /></td>
                      <td className="px-5 py-4"><div className="w-28 h-4 bg-slate-700/50 rounded animate-pulse" /></td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
                          <div className="w-8 h-8 bg-slate-700/50 rounded animate-pulse" />
                        </div>
                      </td>
                    </tr>
                  ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center text-slate-500 text-sm">
                    Không có người dùng phù hợp.
                  </td>
                </tr>
              ) : (
                paginatedUsers.map((user) => {
                  const activity = getActivityForUser(user.id);

                  return (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="hover:bg-slate-800/30 transition-colors group cursor-pointer"
                    >
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className="text-sm text-slate-300 font-medium">
                            {user.email || user.full_name || 'Chưa có email'}
                          </span>
                          <span className="text-xs text-slate-500 mt-0.5 font-mono" title={user.id}>
                            ID: {String(user.id || '').substring(0, 8)}...
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-sm text-slate-400 capitalize">{user.role || 'user'}</span>
                      </td>

                      <td className="px-5 py-4">{getStatusBadge(user.status)}</td>
                      <td className="px-5 py-4">{getTierBadge(user.tier)}</td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 text-xs text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <FileText className="h-3.5 w-3.5 text-indigo-400" />
                            Review: <span className="font-semibold text-slate-200">{activity.review_count || 0}</span>
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <MessageSquare className="h-3.5 w-3.5 text-emerald-400" />
                            Feedback: <span className="font-semibold text-slate-200">{activity.feedback_count || 0}</span>
                          </span>
                          <span className="text-[11px] text-slate-500">
                            Lần cuối: {formatDate(activity.last_activity_at)}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-400">
                        {formatDate(user.created_at)}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                          {user.status !== 'blocked' ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openBanConfirm(user);
                              }}
                              disabled={processingId === user.id || user.role === 'admin'}
                              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title={user.role === 'admin' ? 'Không thể khóa Admin' : 'Khóa tài khoản'}
                            >
                              {processingId === user.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Ban size={18} />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleAction(user, 'unban');
                              }}
                              disabled={processingId === user.id}
                              className="p-1.5 text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Mở khóa tài khoản"
                            >
                              {processingId === user.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Unlock size={18} />
                              )}
                            </button>
                          )}

                          {String(user.tier || '').toLowerCase() !== 'vip' ? (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleAction(user, 'upgrade_vip');
                              }}
                              disabled={processingId === user.id || user.status === 'blocked'}
                              className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Nâng cấp lên VIP"
                            >
                              {processingId === user.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Crown size={18} />
                              )}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                handleAction(user, 'downgrade_vip');
                              }}
                              disabled={processingId === user.id}
                              className="p-1.5 text-indigo-400 hover:text-slate-400 hover:bg-slate-500/10 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              title="Hạ xuống gói Free"
                            >
                              {processingId === user.id ? (
                                <Loader2 size={18} className="animate-spin" />
                              ) : (
                                <Crown size={18} fill="currentColor" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {!isLoading && filteredUsers.length > 0 && (
          <div className="flex flex-col gap-3 border-t border-slate-700/50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-400">
              Hiển thị <span className="font-semibold text-slate-200">{(page - 1) * ITEMS_PER_PAGE + 1}</span> -{' '}
              <span className="font-semibold text-slate-200">{Math.min(page * ITEMS_PER_PAGE, filteredUsers.length)}</span> /{' '}
              <span className="font-semibold text-slate-200">{filteredUsers.length}</span> tài khoản
            </p>
            <PaginationControls page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between border-b border-slate-700 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-white">Chi tiết người dùng</h2>
                <p className="mt-1 text-sm text-slate-400">
                  {selectedUser.email || 'Không có email'}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-4 p-6 md:grid-cols-2">
                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Mail className="h-4 w-4" />
                    Email
                  </div>
                  <p className="break-all text-sm font-medium text-slate-200">
                    {selectedUser.email || '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Users className="h-4 w-4" />
                    ID tài khoản
                  </div>
                  <p className="break-all font-mono text-xs text-slate-300">
                    {selectedUser.id || '—'}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Shield className="h-4 w-4" />
                    Vai trò
                  </div>
                  <span className="inline-flex rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-xs font-bold text-indigo-300">
                    {selectedUser.role === 'admin' ? 'Admin' : 'User'}
                  </span>
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <BadgeCheck className="h-4 w-4" />
                    Trạng thái
                  </div>
                  {getStatusBadge(selectedUser.status)}
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <Crown className="h-4 w-4" />
                    Gói dịch vụ
                  </div>
                  {getTierBadge(selectedUser.tier)}
                </div>

                <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-4">
                  <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500">
                    <CalendarDays className="h-4 w-4" />
                    Ngày tạo
                  </div>
                  <p className="text-sm text-slate-300">
                    {formatDate(selectedUser.created_at)}
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-700 px-6 py-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-slate-300">
                  <History className="h-4 w-4 text-indigo-400" />
                  Lịch sử thao tác user
                </h3>

                {isHistoryLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((item) => (
                      <div key={item} className="h-16 animate-pulse rounded-xl border border-slate-800 bg-slate-950/50" />
                    ))}
                  </div>
                ) : userHistory.length === 0 ? (
                  <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-5 text-center text-sm text-slate-500">
                    Chưa có lịch sử thao tác quản trị cho tài khoản này.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {userHistory.map((log) => (
                      <div key={log.id} className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="text-sm font-semibold text-slate-200">
                            {getHistoryTitle(log.action_type)}
                          </p>
                          <span className="text-xs text-slate-500">
                            {formatDate(log.created_at)}
                          </span>
                        </div>
                        <p className="mt-1 text-sm leading-6 text-slate-400">
                          <span className="font-medium text-slate-300">{log.admin_name || 'Admin'}</span> vừa {log.description || 'thực hiện thao tác'}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {pendingBanUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-rose-500/30 bg-slate-900 shadow-2xl">
            <div className="flex items-start gap-3 border-b border-slate-700 px-6 py-5">
              <div className="mt-0.5 rounded-xl bg-rose-500/10 p-2 text-rose-300">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Xác nhận khóa tài khoản</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Tài khoản: <span className="text-slate-200">{pendingBanUser.email || pendingBanUser.full_name || pendingBanUser.id}</span>
                </p>
              </div>
            </div>

            <div className="p-6">
              <label className="mb-2 block text-sm font-medium text-slate-300">
                Lý do khóa tài khoản
              </label>
              <textarea
                value={banReason}
                onChange={(event) => setBanReason(event.target.value)}
                rows={4}
                placeholder="Ví dụ: Spam, vi phạm chính sách, dữ liệu bất thường..."
                className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
              <button
                type="button"
                onClick={() => {
                  setPendingBanUser(null);
                  setBanReason('');
                }}
                className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={confirmBanUser}
                disabled={processingId === pendingBanUser.id}
                className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
              >
                {processingId === pendingBanUser.id ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Đang khóa...
                  </span>
                ) : (
                  'Xác nhận khóa'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
