const API_BASE_URL = 'http://localhost:8000';

const getErrorMessage = (data, fallback) => {
  const raw = data?.detail || data?.message || data?.error || data;

  if (!raw) return fallback;
  if (typeof raw === 'string') return raw;

  if (Array.isArray(raw)) {
    return raw.map((item) => item?.msg || item?.message || JSON.stringify(item)).join('\n');
  }

  if (typeof raw === 'object') {
    return raw.msg || raw.message || JSON.stringify(raw);
  }

  return String(raw);
};

const requestJson = async (url, options = {}, fallback = 'Yêu cầu thất bại.') => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || data?.success === false) {
    throw new Error(getErrorMessage(data, fallback));
  }

  return data;
};

export const compareRestaurants = (payload) =>
  requestJson(
    `${API_BASE_URL}/api/compare/restaurants`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'Không thể so sánh quán.'
  );

export const saveComparison = (payload) =>
  requestJson(
    `${API_BASE_URL}/api/compare/save`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
    },
    'Không thể lưu lịch sử so sánh.'
  );

export const fetchComparisonHistory = (userId) =>
  requestJson(
    `${API_BASE_URL}/api/compare/history?user_id=${userId}`,
    {},
    'Không thể tải lịch sử so sánh.'
  );

export const deleteComparisonHistory = ({ comparisonId, userId }) =>
  requestJson(
    `${API_BASE_URL}/api/compare/history/${comparisonId}?user_id=${userId}`,
    {
      method: 'DELETE',
    },
    'Không thể xóa lịch sử so sánh.'
  );