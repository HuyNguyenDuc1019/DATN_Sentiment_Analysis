import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import RegisterFormCard from '../../components/auth/register/RegisterFormCard';
import AuthPageShell from '../../components/auth/shared/AuthPageShell';
import { normalizeEmail, validateRegisterForm } from '../../utils/auth/authValidation';
import { getReadableAuthError, registerWithEmail } from '../../services/auth/authService';

const toastStyle = { id: 'register-message' };

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const change = (field) => (value) => setForm((current) => ({ ...current, [field]: value }));

  const handleRegister = async (event) => {
    event.preventDefault();
    const fullName = form.name.trim();
    const email = normalizeEmail(form.email);
    const validationError = validateRegisterForm({ fullName, email, password: form.password, confirm: form.confirm });

    if (validationError) {
      toast.error(validationError, toastStyle);
      return;
    }

    setLoading(true);
    try {
      const { data } = await registerWithEmail({ fullName, email, password: form.password });
      toast.success(
        data?.session
          ? 'Tạo tài khoản thành công.'
          : 'Tạo tài khoản thành công. Nếu hệ thống yêu cầu xác nhận, hãy kiểm tra email trước khi đăng nhập.',
        toastStyle,
      );
      navigate(data?.session ? '/dashboard' : '/');
    } catch (error) {
      console.error('Register failed:', error);
      toast.error(getReadableAuthError(error), toastStyle);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageShell
      eyebrow="Bắt đầu cùng Almotion"
      title="Xây dựng góc nhìn khách hàng dựa trên dữ liệu"
      description="Tạo tài khoản để phân tích đánh giá nhà hàng, theo dõi xu hướng cảm xúc và quản lý phản hồi tập trung."
    >
      <RegisterFormCard
        form={form}
        loading={loading}
        showPassword={showPassword}
        showConfirmPassword={showConfirmPassword}
        onChange={change}
        onSubmit={handleRegister}
        onTogglePassword={() => setShowPassword((value) => !value)}
        onToggleConfirmPassword={() => setShowConfirmPassword((value) => !value)}
      />
    </AuthPageShell>
  );
}
