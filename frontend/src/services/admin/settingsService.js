import { supabase } from '../supabaseClient';

const API_BASE_URL = 'http://localhost:8000';

export async function getAdminId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    throw new Error('Không tìm thấy thông tin đăng nhập (Supabase Session rỗng)!');
  }

  return authData.user.id;
}

export async function fetchAdminSettings(adminId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/settings?admin_id=${adminId}`);

  if (!response.ok) {
    throw new Error('Lỗi từ phía máy chủ');
  }

  return response.json();
}

export async function saveAdminSettings({ adminId, payload }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      admin_id: adminId,
    }),
  });

  if (!response.ok) {
    throw new Error('Lỗi cập nhật API');
  }

  return response.json().catch(() => null);
}
