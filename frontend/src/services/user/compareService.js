const API_BASE_URL = 'http://localhost:8000';

async function readJson(response) {
  return response.json().catch(() => null);
}

function getApiError(data, fallbackMessage) {
  return new Error(data?.detail || data?.message || data?.error || fallbackMessage);
}

export async function fetchComparisonHistory(userId) {
  const response = await fetch(`${API_BASE_URL}/api/compare/history?user_id=${userId}`);
  const data = await readJson(response);

  if (!response.ok || data?.success === false) {
    throw getApiError(data, 'Không thể tải lịch sử so sánh.');
  }

  return Array.isArray(data?.data) ? data.data : [];
}

export async function deleteComparisonHistory({ userId, comparisonId }) {
  const response = await fetch(`${API_BASE_URL}/api/compare/history/${comparisonId}?user_id=${userId}`, {
    method: 'DELETE',
  });

  const data = await readJson(response);

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
    throw getApiError(data, 'Không thể so sánh các quán.');
  }

  return Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.results)
      ? data.results
      : [];
}

export async function saveComparison({ userId, title, items }) {
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

  if (!response.ok || data?.success === false) {
    throw getApiError(data, 'Không thể lưu kết quả so sánh.');
  }

  return data;
}
