import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import RegisterFormCard from '../../components/auth/register/RegisterFormCard';
import AuthHeroPanel from '../../components/auth/shared/AuthHeroPanel';

import {
  normalizeEmail,
  validateRegisterForm,
} from '../../utils/auth/authValidation';

import {
  getReadableAuthError,
  registerWithEmail,
} from '../../services/auth/authService';

const toastStyle = { id: 'register-message' };

export default function RegisterScreen() {
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);

  const change = (field) => (value) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleRegister = async (event) => {
    event.preventDefault();

    const fullName = form.name.trim();
    const email = normalizeEmail(form.email);

    const validationError = validateRegisterForm({
      fullName,
      email,
      password: form.password,
      confirm: form.confirm,
    });

    if (validationError) {
      toast.error(validationError, toastStyle);
      return;
    }

    setLoading(true);

    try {
      const { data } = await registerWithEmail({
        fullName,
        email,
        password: form.password,
      });

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
    <>
      <AuthAnimationStyle />

      <div className="flex h-screen w-full overflow-y-auto bg-slate-950 font-sans text-slate-200">
        <div className="relative z-10 flex w-full items-center justify-center px-5 py-8 sm:px-8 lg:w-[46%] lg:px-12">
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
        </div>

        <AuthHeroPanel
          title="Hiểu khách hàng từ từng phản hồi"
          description="Theo dõi khen chê, phát hiện vấn đề nổi bật và ra quyết định nhanh hơn từ dữ liệu thực tế."
          variant="chart"
        />
      </div>
    </>
  );
}

function AuthAnimationStyle() {
  return (
    <style>
      {`
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }
        @keyframes float-delayed {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes float-reverse {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(12px); }
        }
      `}
    </style>
  );
}
