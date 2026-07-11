const API_BASE_URL = 'http://localhost:8000';

const getErrorMessage = (data, fallback) => {
  const raw = data?.detail ?? data?.error ?? data?.message ?? data;

  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object') return raw.message || raw.msg || JSON.stringify(raw);

  return String(raw);
};

export const getAdminId = () => {
  return (
    localStorage.getItem('admin_id') ||
    localStorage.getItem('user_id') ||
    localStorage.getItem('id') ||
    localStorage.getItem('userId')
  );
};

export const fetchAdminTransactions = async () => {
  const adminId = getAdminId();

  const url = new URL(`${API_BASE_URL}/api/admin/transactions`);

  if (adminId) {
    url.searchParams.set('admin_id', adminId);
  }

  const response = await fetch(url.toString());
  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(getErrorMessage(data, 'Không thể tải danh sách giao dịch.'));
  }

  return data;
};

export const confirmAdminTransaction = async (transactionId) => {
  const adminId = getAdminId();

  const url = new URL(`${API_BASE_URL}/api/admin/transactions/confirm`);

  if (adminId) {
    url.searchParams.set('admin_id', adminId);
  }

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      admin_id: adminId,
      transaction_id: transactionId,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(getErrorMessage(data, 'Không thể xác nhận giao dịch.'));
  }

  return data;
};

export const cancelAdminTransaction = async (transactionId) => {
  const adminId = getAdminId();

  const url = new URL(`${API_BASE_URL}/api/admin/transactions/cancel`);

  if (adminId) {
    url.searchParams.set('admin_id', adminId);
  }

  const response = await fetch(url.toString(), {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      admin_id: adminId,
      transaction_id: transactionId,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(getErrorMessage(data, 'Không thể hủy giao dịch.'));
  }

  return data;
};

export const copyTextToClipboard = async (text) => {
  await navigator.clipboard.writeText(String(text || ''));
};