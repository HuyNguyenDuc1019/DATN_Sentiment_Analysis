import { supabase } from './supabaseClient';

// Cache thông tin admin hiện tại trong phiên làm việc để tránh gọi lại
// supabase.auth.getUser() + query profiles mỗi lần ghi log.
let cachedAdmin = null;

async function getCurrentAdmin() {
  if (cachedAdmin) return cachedAdmin;

  const { data: authData } = await supabase.auth.getUser();
  const user = authData?.user;

  if (!user) {
    return { id: null, name: 'Quản trị viên' };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, email')
    .eq('id', user.id)
    .maybeSingle();

  cachedAdmin = {
    id: user.id,
    name: profile?.full_name || profile?.email || user.email || 'Quản trị viên',
  };

  return cachedAdmin;
}

/**
 * Ghi 1 dòng nhật ký hoạt động admin. Gọi hàm này NGAY SAU khi một thao tác
 * quản trị (duyệt/từ chối phản hồi, khóa/mở khóa user, nâng/hạ VIP...) đã
 * cập nhật thành công vào database.
 *
 * @param {Object} params
 * @param {string} params.actionType - Mã hành động, ví dụ 'feedback_approved'
 * @param {string} params.targetType - 'feedback' | 'user'
 * @param {string|number} [params.targetId] - ID của đối tượng bị tác động
 * @param {string} params.description - Mô tả hành động, KHÔNG kèm tên admin,
 *   ví dụ: 'duyệt phản hồi: "Đồ ăn ngon"' hoặc 'khóa tài khoản user@mail.com'
 */
export async function logAdminActivity({ actionType, targetType, targetId, description }) {
  try {
    const admin = await getCurrentAdmin();

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
    // Ghi log là hành động phụ - lỗi ở đây KHÔNG được làm gián đoạn
    // thao tác chính (duyệt/khóa/nâng cấp...) mà admin vừa thực hiện.
    console.error('Không thể ghi nhật ký hoạt động:', error);
  }
}

/**
 * Gọi hàm này khi admin đăng xuất hoặc chuyển tài khoản, để tránh cache
 * sai tên admin cho phiên làm việc kế tiếp.
 */
export function resetAdminActivityCache() {
  cachedAdmin = null;
}