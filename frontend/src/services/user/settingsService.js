const API_BASE_URL = 'http://localhost:8000';

async function parseError(response, fallbackMessage) {
  const errorData = await response.json().catch(() => null);
  return new Error(errorData?.detail || fallbackMessage);
}

export async function fetchUserSettings(userId) {
  const response = await fetch(`${API_BASE_URL}/api/user/settings?user_id=${userId}`);

  if (!response.ok) {
    throw await parseError(response, 'Không thể tải cấu hình');
  }

  return response.json();
}

export async function saveUserSettings(payload) {
  const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw await parseError(response, 'Lưu cấu hình thất bại');
  }

  return response.json().catch(() => null);
}

export async function clearAllUserData(userId) {
  const response = await fetch(`${API_BASE_URL}/api/user/data/clear?user_id=${userId}`, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw await parseError(response, 'Không thể xóa dữ liệu');
  }

  return response.json().catch(() => null);
}

export async function fetchUserDatasets(userId) {
  const response = await fetch(`${API_BASE_URL}/api/user/datasets?user_id=${userId}`);

  if (!response.ok) {
    throw await parseError(response, 'Không thể tải danh sách dữ liệu.');
  }

  const payload = await response.json();
  return Array.isArray(payload?.data) ? payload.data : [];
}

export async function deleteUserDataset({ userId, datasetId, sourceUrl }) {
  const query = new URLSearchParams({ user_id: userId });

  if (!datasetId && sourceUrl) {
    query.set('source_url', sourceUrl);
  }

  const endpoint = datasetId
    ? `${API_BASE_URL}/api/user/datasets/${datasetId}?${query.toString()}`
    : `${API_BASE_URL}/api/user/datasets/by-source?${query.toString()}`;

  const response = await fetch(endpoint, { method: 'DELETE' });

  if (!response.ok) {
    throw await parseError(response, 'Không thể xóa dữ liệu đã chọn.');
  }

  return response.json().catch(() => null);
}
