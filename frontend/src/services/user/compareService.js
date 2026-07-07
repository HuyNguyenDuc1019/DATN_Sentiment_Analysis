const API_BASE_URL =
  import.meta.env.VITE_FASTAPI_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PYTHON_API ||
  'http://localhost:8000';

async function readJson(response) {
  return response.json().catch(() => null);
}

function getApiError(data, fallbackMessage) {
  const raw = data?.detail || data?.message || data?.error || data;

  if (!raw) return new Error(fallbackMessage);
  if (typeof raw === 'string') return new Error(raw);

  if (Array.isArray(raw)) {
    return new Error(
      raw
        .map((item) => {
          if (typeof item === 'string') return item;
          return item?.msg || item?.message || JSON.stringify(item);
        })
        .join('\n'),
    );
  }

  if (typeof raw === 'object') {
    return new Error(raw.msg || raw.message || JSON.stringify(raw));
  }

  return new Error(String(raw));
}

function normalizeListResponse(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.history)) return data.history;
  return [];
}

export async function fetchComparisonHistory(userId) {
  if (!userId) return [];

  const response = await fetch(`${API_BASE_URL}/api/compare/history?user_id=${userId}`);
  const data = await readJson(response);

  if (response.status === 404) {
    return [];
  }

  if (!response.ok || data?.success === false) {
    throw getApiError(data, 'Không thể tải lịch sử so sánh.');
  }

  return normalizeListResponse(data);
}

export async function deleteComparisonHistory({ userId, comparisonId }) {
  if (!userId || !comparisonId) return null;

  const response = await fetch(`${API_BASE_URL}/api/compare/history/${comparisonId}?user_id=${userId}`, {
    method: 'DELETE',
  });

  const data = await readJson(response);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok || data?.success === false) {
    throw getApiError(data, 'Không thể xóa lịch sử so sánh.');
  }

  return data;
}

export async function compareRestaurants({ userId, restaurants, signal }) {
  const response = await fetch(`${API_BASE_URL}/api/compare/restaurants`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal,
    body: JSON.stringify({
      user_id: userId,
      mode: 'temporary',
      restaurants,
    }),
  });

  const data = await readJson(response);

  if (!response.ok || data?.success === false) {
    throw getApiError(data, 'Không thể so sánh các quán. Kiểm tra backend đã include router /api/compare chưa.');
  }

  return normalizeListResponse(data);
}

export async function saveComparison({ userId, title, items }) {
  if (!userId || !items?.length) return null;

  const response = await fetch(`${API_BASE_URL}/api/compare/save`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      title,
      items,
    }),
  });

  const data = await readJson(response);

  if (response.status === 404) {
    return null;
  }

  if (!response.ok || data?.success === false) {
    throw getApiError(data, 'Không thể lưu kết quả so sánh.');
  }

  return data;
}
