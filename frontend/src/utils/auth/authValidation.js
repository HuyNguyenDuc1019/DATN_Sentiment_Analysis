export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

export function validateLoginForm({ email, password }) {
  if (!email || !password) {
    return 'Vui lòng nhập email và mật khẩu.';
  }

  return '';
}

export function validateRegisterForm({
  fullName,
  email,
  password,
  confirm,
}) {
  if (!fullName) {
    return 'Vui lòng nhập họ và tên.';
  }

  if (!email) {
    return 'Vui lòng nhập email.';
  }

  if (password.length < 6) {
    return 'Mật khẩu cần có ít nhất 6 ký tự.';
  }

  if (password !== confirm) {
    return 'Mật khẩu xác nhận chưa khớp.';
  }

  return '';
}

export function validateForgotPasswordForm(email) {
  if (!email) {
    return 'Vui lòng nhập email để nhận liên kết đặt lại mật khẩu.';
  }

  return '';
}

export function validateResetPasswordForm({
  password,
  confirmPassword,
}) {
  if (password.length < 6) {
    return 'Mật khẩu mới phải có ít nhất 6 ký tự.';
  }

  if (password !== confirmPassword) {
    return 'Mật khẩu xác nhận không khớp.';
  }

  return '';
}
