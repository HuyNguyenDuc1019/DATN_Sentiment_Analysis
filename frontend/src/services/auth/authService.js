import { supabase } from '../supabaseClient';
import { logAdminActivity } from '../adminActivityLogger';

export function getLoginError(error) {
  const message = String(error?.message || error?.error_description || '').toLowerCase();

  if (message.includes('invalid login credentials')) {
    return 'Email hoặc mật khẩu chưa đúng. Vui lòng kiểm tra lại.';
  }

  if (message.includes('email not confirmed')) {
    return 'Tài khoản chưa xác nhận email. Vui lòng kiểm tra hộp thư.';
  }

  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi đăng nhập lại.';
  }

  return error?.message || 'Đăng nhập không thành công. Vui lòng thử lại.';
}

export function getReadableAuthError(error) {
  const rawMessage = [
    error?.message,
    error?.error_description,
    error?.details,
    typeof error === 'string' ? error : '',
  ].find(Boolean);

  const message = String(rawMessage || '').toLowerCase();
  const errorName = String(error?.name || '').toLowerCase();
  const errorStatus = Number(error?.status || error?.statusCode || 0);

  if (
    errorName.includes('authretryablefetcherror') ||
    errorStatus >= 500 ||
    message === '{}' ||
    message.includes('internal server error') ||
    message.includes('failed to fetch') ||
    message.includes('network')
  ) {
    return 'Hệ thống xác thực đang bận hoặc lỗi gửi email xác nhận. Vui lòng chờ vài phút rồi thử lại.';
  }

  if (message.includes('already registered') || message.includes('already exists')) {
    return 'Email này đã được đăng ký. Bạn hãy quay lại trang đăng nhập.';
  }

  if (message.includes('password') && (message.includes('6') || message.includes('characters'))) {
    return 'Mật khẩu cần có ít nhất 6 ký tự.';
  }

  if (message.includes('invalid') && message.includes('email')) {
    return 'Email không hợp lệ. Vui lòng kiểm tra lại.';
  }

  if (message.includes('rate limit') || message.includes('too many')) {
    return 'Bạn thao tác quá nhanh. Vui lòng chờ một lát rồi thử lại.';
  }

  return 'Không thể tạo tài khoản. Vui lòng kiểm tra thông tin và thử lại.';
}

export function getForgotPasswordError(error) {
  const message = error?.message || error?.error_description || '';

  if (message.toLowerCase().includes('rate limit')) {
    return 'Bạn yêu cầu quá nhanh. Vui lòng chờ một lát rồi thử lại.';
  }

  return message || 'Không thể gửi liên kết đặt lại mật khẩu. Vui lòng thử lại.';
}

export function getResetPasswordError(error) {
  const message = error?.message || error?.error_description || '';

  if (message.toLowerCase().includes('expired')) {
    return 'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu gửi lại link mới.';
  }

  if (message.toLowerCase().includes('invalid')) {
    return 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.';
  }

  return message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
}

export async function loadUserRoleAfterLogin(userId) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  const role = profile?.role || 'user';

  localStorage.setItem('userId', userId);
  localStorage.setItem('user_id', userId);
  localStorage.setItem('userRole', role);
  localStorage.setItem('user_role', role);

  if (role === 'admin') {
    await logAdminActivity({
      actionType: 'admin_login',
      targetType: 'admin',
      targetId: userId,
      description: 'đăng nhập vào khu vực quản trị',
    });
  }

  return role;
}

export async function registerWithEmail({
  fullName,
  email,
  password,
}) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: window.location.origin,
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    throw error;
  }

  return {
    data,
  };
}

export async function sendPasswordResetEmail(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });

  if (error) {
    throw error;
  }
}

export async function prepareRecoverySession(params) {
  const accessToken = params.hash.get('access_token');
  const refreshToken = params.hash.get('refresh_token');
  const code = params.query.get('code');

  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      throw error;
    }

    return;
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      throw error;
    }

    return;
  }

  const { data } = await supabase.auth.getSession();

  if (!data?.session) {
    throw new Error('missing_recovery_session');
  }
}

export async function updateRecoveryPassword(password) {
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    throw error;
  }

  await supabase.auth.signOut();
}
