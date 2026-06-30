export const ADMIN_API_BASE =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PYTHON_API ||
  'http://localhost:8000';

const readJson = (raw) => {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const pickUserId = (value) => {
  if (!value || typeof value !== 'object') return '';

  return (
    value.id ||
    value.user?.id ||
    value.session?.user?.id ||
    value.currentSession?.user?.id ||
    value.data?.user?.id ||
    value.state?.user?.id ||
    value.state?.session?.user?.id ||
    value.state?.currentSession?.user?.id ||
    ''
  );
};

export const getStoredAdminId = () => {
  const directKeys = ['userId', 'user_id', 'supabase_user_id', 'adminId', 'admin_id'];

  for (const key of directKeys) {
    const value = localStorage.getItem(key);
    if (value) return value;
  }

  const userKeys = ['user', 'currentUser', 'authUser', 'supabase_user'];

  for (const key of userKeys) {
    const id = pickUserId(readJson(localStorage.getItem(key)));
    if (id) return id;
  }

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);
    const raw = key ? localStorage.getItem(key) : '';

    if (!raw) continue;

    const shouldCheck =
      key?.startsWith('sb-') ||
      key?.includes('auth') ||
      raw.includes('access_token') ||
      raw.includes('currentSession');

    if (!shouldCheck) continue;

    const id = pickUserId(readJson(raw));
    if (id) return id;
  }

  return '';
};

export const buildAdminUrl = (path, params = {}) => {
  const url = new URL(path, ADMIN_API_BASE);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  return url.toString();
};

export const getDisplayInitials = (name = '', email = '') => {
  const source = name || email || 'Admin';
  const words = source.trim().split(/\s+/).filter(Boolean);

  if (words.length >= 2) {
    return `${words[0][0]}${words[words.length - 1][0]}`.toUpperCase();
  }

  return source.slice(0, 2).toUpperCase();
};

export const formatAdminNumber = (value) =>
  new Intl.NumberFormat('vi-VN').format(Number(value) || 0);

export const getAdminRoleLabel = (role) =>
  role === 'admin' ? 'Quản trị viên' : 'Người dùng';
