import { supabase } from '../supabaseClient';

import {
  API_BASE_URL,
  getErrorMessage,
} from '../../utils/admin/usersUtils';

export async function getCurrentAdminId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    throw new Error('Không tìm thấy thông tin đăng nhập (Phiên hết hạn)!');
  }

  return authData.user.id;
}

export async function fetchAdminActivitySummary(adminId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/activity-summary?admin_id=${adminId}`);

  if (!response.ok) {
    console.warn('Không tải được thống kê hoạt động user:', response.status);
    return {};
  }

  const data = await response.json();

  return data.summary || data || {};
}

export async function fetchAdminUsers(adminId) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users?admin_id=${adminId}`);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Lỗi chi tiết từ Server:', errorText);
    throw new Error(`Lỗi Server: ${response.status}`);
  }

  return response.json();
}

export async function fetchUserActivityHistory({ adminId, userId }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}/activity-history?admin_id=${adminId}`);

  if (response.ok) {
    const data = await response.json();
    return data.logs || [];
  }

  const { data, error } = await supabase
    .from('admin_activity_logs')
    .select('id, admin_id, admin_name, action_type, target_type, target_id, description, created_at')
    .eq('target_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) throw error;

  return data || [];
}

export async function updateAdminUserAction({ adminId, targetUserId, action }) {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/action?admin_id=${adminId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      admin_id: adminId,
      target_user_id: targetUserId,
      action,
    }),
  });

  const responseData = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(getErrorMessage(responseData, 'Lỗi server'));
  }

  return responseData;
}
