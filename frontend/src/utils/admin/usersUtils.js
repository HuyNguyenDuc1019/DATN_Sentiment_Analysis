export const API_BASE_URL = 'http://localhost:8000';

export const ITEMS_PER_PAGE = 10;
export const WINDOW_SIZE = 3;

export function getErrorMessage(data, fallback = 'Thao tác thất bại.') {
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
}

export function getPageItems(currentPage, totalPages) {
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
}

export function getUserStats(users) {
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
}

export function filterUsers({
  users,
  searchTerm,
  roleFilter,
  statusFilter,
  tierFilter,
}) {
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
}

export function formatDate(value) {
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
}

export function getActivityForUser(activitySummary, userId) {
  return activitySummary[userId] || {
    review_count: 0,
    feedback_count: 0,
    last_activity_at: null,
  };
}

export function getHistoryTitle(actionType) {
  const titles = {
    user_banned: 'Khóa tài khoản',
    user_unbanned: 'Mở khóa tài khoản',
    user_upgraded_vip: 'Nâng cấp VIP',
    user_downgraded_vip: 'Hạ gói dịch vụ',
    admin_login: 'Admin đăng nhập',
  };

  return titles[actionType] || 'Hoạt động quản trị';
}

export function exportUsersCsv({ users, activitySummary }) {
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

  const rows = users.map((user) => {
    const activity = getActivityForUser(activitySummary, user.id);

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
}
