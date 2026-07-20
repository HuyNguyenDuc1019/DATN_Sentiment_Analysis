const API_BASE_URL =
  import.meta.env.VITE_FASTAPI_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PYTHON_API ||
  'http://localhost:8000';

async function readJson(response) {
  return response.json().catch(() => null);
}

function parseError(data, fallback = 'Thao tác thất bại.') {
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

function normalizeDatasets(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.datasets)) return data.datasets;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

export async function fetchUserDatasets(userId) {
  if (!userId) return [];

  const response = await fetch(
    `${API_BASE_URL}/api/user/datasets?user_id=${encodeURIComponent(userId)}`,
  );

  const data = await readJson(response);

  if (response.status === 404) return [];

  if (!response.ok || data?.success === false) {
    throw new Error(parseError(data, 'Không thể tải dữ liệu đã phân tích.'));
  }

  return normalizeDatasets(data);
}

export async function deleteUserDataset({ userId, datasetId }) {
  if (!userId || !datasetId) {
    throw new Error('Thiếu user_id hoặc dataset_id.');
  }

  const params = new URLSearchParams({
    user_id: userId,
    dataset_id: datasetId,
  });

  const response = await fetch(
    `${API_BASE_URL}/api/user/datasets/remove?${params.toString()}`,
    {
      method: 'DELETE',
    },
  );

  const data = await readJson(response);

  if (response.status === 404) {
    throw new Error('Không tìm thấy API xóa dữ liệu.');
  }

  if (!response.ok || data?.success === false) {
    throw new Error(parseError(data, 'Không thể xóa dữ liệu đã chọn.'));
  }

  return data;
}

export async function clearUserData(userId) {
  if (!userId) {
    throw new Error('Thiếu user_id.');
  }

  const response = await fetch(
    `${API_BASE_URL}/api/user/data/clear?user_id=${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
    },
  );

  const data = await readJson(response);

  if (response.status === 404) {
    throw new Error('Không tìm thấy API xóa toàn bộ dữ liệu.');
  }

  if (!response.ok || data?.success === false) {
    throw new Error(parseError(data, 'Không thể xóa toàn bộ dữ liệu.'));
  }

  return data;
}

export async function clearAllUserData(userId) {
  return clearUserData(userId);
}

export async function fetchUserSettings(userId) {
  if (!userId) return null;

  const response = await fetch(
    `${API_BASE_URL}/api/user/settings?user_id=${encodeURIComponent(userId)}`,
  );

  const data = await readJson(response);

  if (response.status === 404) return null;

  if (!response.ok || data?.success === false) {
    throw new Error(parseError(data, 'Không thể tải cấu hình người dùng.'));
  }

  return data?.data || data?.settings || data;
}

function normalizeIntegerSetting(value, fieldName) {
  const parsedValue = Number(value);

  if (!Number.isFinite(parsedValue)) {
    throw new Error(`${fieldName} must be a valid number.`);
  }

  return Math.round(parsedValue);
}

export async function saveUserSettings(payload) {
  const userId = payload?.user_id || payload?.userId;

  if (!userId) {
    throw new Error('Thiếu user_id.');
  }

  const normalizedPayload = {
    ...payload,
    user_id: userId,
  };

  if (payload?.custom_threshold != null) {
    normalizedPayload.custom_threshold = normalizeIntegerSetting(
      payload.custom_threshold,
      'custom_threshold',
    );
  }

  if (payload?.feedback_confidence_threshold != null) {
    normalizedPayload.feedback_confidence_threshold = normalizeIntegerSetting(
      payload.feedback_confidence_threshold,
      'feedback_confidence_threshold',
    );
  }

  if (payload?.retention_days != null) {
    normalizedPayload.retention_days = normalizeIntegerSetting(
      payload.retention_days,
      'retention_days',
    );
  }

  const response = await fetch(`${API_BASE_URL}/api/user/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(normalizedPayload),
  });

  const data = await readJson(response);

  if (response.status === 404) {
    throw new Error('Không tìm thấy API lưu cấu hình.');
  }

  if (!response.ok || data?.success === false) {
    throw new Error(parseError(data, 'Không thể lưu cấu hình người dùng.'));
  }

  return data;
}