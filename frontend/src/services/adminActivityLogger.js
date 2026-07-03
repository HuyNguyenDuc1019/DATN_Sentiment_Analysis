import { supabase } from './supabaseClient';

// Cache thông tin admin hiện tại trong phiên làm việc.
// Khi logout hoặc đổi tài khoản thì gọi resetAdminActivityCache().
let cachedAdmin = null;

async function getCurrentAdmin() {
  if (cachedAdmin) return cachedAdmin;

  const { data: authData, error: authError } = await supabase.auth.getUser();
  const user = authData?.user;

  if (authError || !user) {
    return {
      id: null,
      name: 'Quản trị viên',
      role: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('full_name, email, role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) {
    console.error('Không thể lấy profile admin:', profileError);
  }

  cachedAdmin = {
    id: user.id,
    name:
      profile?.full_name ||
      profile?.email ||
      user.email ||
      'Quản trị viên',
    role: profile?.role || null,
  };

  return cachedAdmin;
}

/**
 * Ghi 1 dòng nhật ký hoạt động admin.
 *
 * Chỉ ghi log nếu tài khoản hiện tại có role = admin.
 * Không làm gián đoạn thao tác chính nếu ghi log lỗi.
 *
 * Ví dụ:
 * await logAdminActivity({
 *   actionType: 'user_upgraded_vip',
 *   targetType: 'user',
 *   targetId: targetUser.id,
 *   description: `nâng cấp tài khoản ${targetUser.email} lên VIP`,
 * });
 */
export async function logAdminActivity({
  actionType,
  targetType,
  targetId = null,
  description = '',
}) {
  try {
    const admin = await getCurrentAdmin();

    if (!admin.id) {
      console.warn('Bỏ qua ghi log vì chưa có admin_id.');
      return;
    }

    if (admin.role !== 'admin') {
      console.warn('Bỏ qua ghi log vì tài khoản hiện tại không phải admin.');
      return;
    }

    const { error } = await supabase.from('admin_activity_logs').insert({
      admin_id: admin.id,
      admin_name: admin.name,
      action_type: actionType,
      target_type: targetType,
      target_id: targetId != null ? String(targetId) : null,
      description,
    });

    if (error) {
      console.error('Không thể ghi nhật ký hoạt động:', error);
    }
  } catch (error) {
    console.error('Không thể ghi nhật ký hoạt động:', error);
  }
}

/**
 * Gọi hàm này khi admin đăng xuất hoặc chuyển tài khoản.
 */
export function resetAdminActivityCache() {
  cachedAdmin = null;
}