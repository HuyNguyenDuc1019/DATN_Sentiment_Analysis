import { supabase } from '../supabaseClient';

const API_BASE_URL = 'http://localhost:8000';

export async function getCurrentAdminId() {
  const { data: authData, error: authError } = await supabase.auth.getUser();

  if (authError || !authData?.user) {
    throw new Error('Chưa đăng nhập!');
  }

  return authData.user.id;
}

export async function fetchAdminTransactions() {
  const adminId = await getCurrentAdminId();
  const response = await fetch(`${API_BASE_URL}/api/admin/transactions?admin_id=${adminId}`);

  if (!response.ok) {
    throw new Error('Lỗi tải dữ liệu từ máy chủ');
  }

  return response.json();
}

export async function copyTextToClipboard(text) {
  return navigator.clipboard.writeText(text);
}
