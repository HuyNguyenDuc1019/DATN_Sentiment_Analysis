import { supabase } from '../supabaseClient';

const API_BASE_URL = 'http://localhost:8000';

export async function getCurrentUserId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    throw new Error('Chưa đăng nhập!');
  }

  return authData.user.id;
}

export async function upgradeUserToVip({ userId, amount }) {
  const response = await fetch(`${API_BASE_URL}/api/user/upgrade`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      user_id: userId,
      amount,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.detail || 'Lỗi từ máy chủ Backend');
  }

  return response.json().catch(() => null);
}
