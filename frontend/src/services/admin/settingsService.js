import { supabase } from '../supabaseClient';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/+$/, '');

async function readResponseBody(response) {
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => '');
  return text || null;
}

function getErrorMessage(body, fallbackMessage) {
  if (typeof body === 'string' && body.trim()) return body;
  if (body?.detail) return String(body.detail);
  if (body?.message) return String(body.message);
  if (body?.error) return String(body.error);
  return fallbackMessage;
}

async function requestJson(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers,
      },
    });
  } catch (_error) {
    throw new Error('Không thể kết nối backend. Hãy kiểm tra backend tại cổng 8000.');
  }

  const body = await readResponseBody(response);

  if (!response.ok) {
    throw new Error(
      getErrorMessage(body, `Yêu cầu thất bại (HTTP ${response.status}).`),
    );
  }

  return body;
}

export async function getAdminId() {
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw new Error(error.message || 'Không thể kiểm tra phiên đăng nhập.');
  }

  if (!data?.user?.id) {
    throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
  }

  return data.user.id;
}

export async function fetchAdminSettings(adminId) {
  if (!adminId) {
    throw new Error('Thiếu mã quản trị viên.');
  }

  const query = new URLSearchParams({ admin_id: adminId });
  return requestJson(`/api/admin/settings?${query.toString()}`);
}

export async function saveAdminSettings({ adminId, payload }) {
  if (!adminId) {
    throw new Error('Thiếu mã quản trị viên.');
  }

  if (!payload || typeof payload !== 'object') {
    throw new Error('Dữ liệu cấu hình không hợp lệ.');
  }

  return requestJson('/api/admin/settings', {
    method: 'PUT',
    body: JSON.stringify({
      ...payload,
      admin_id: adminId,
    }),
  });
}

export default {
  getAdminId,
  fetchAdminSettings,
  saveAdminSettings,
};
