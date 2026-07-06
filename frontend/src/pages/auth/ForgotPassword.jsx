import React, { useState } from 'react';
import toast from 'react-hot-toast';

import ForgotPasswordFormCard from '../../components/auth/forgot-password/ForgotPasswordFormCard';
import AuthHeroPanel from '../../components/auth/shared/AuthHeroPanel';

import {
  normalizeEmail,
  validateForgotPasswordForm,
} from '../../utils/auth/authValidation';

import {
  getForgotPasswordError,
  sendPasswordResetEmail,
} from '../../services/auth/authService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleEmailChange = (value) => {
    setEmail(value);
    setSent(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    const validationError = validateForgotPasswordForm(normalizedEmail);

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      await sendPasswordResetEmail(normalizedEmail);
      setSent(true);
      toast.success('Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư email.');
    } catch (error) {
      console.error('Reset password email failed:', error);
      toast.error(getForgotPasswordError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AuthAnimationStyle />

      <div className="min-h-screen w-full flex font-sans text-slate-200 bg-[#0f172a] overflow-hidden">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
          <ForgotPasswordFormCard
            email={email}
            loading={loading}
            sent={sent}
            onEmailChange={handleEmailChange}
            onSubmit={handleSubmit}
          />
        </div>

        <AuthHeroPanel
          title="Khôi phục quyền truy cập tài khoản"
          description="Bảo vệ dữ liệu phân tích của bạn bằng quy trình đặt lại mật khẩu qua email xác thực."
          variant="recovery"
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
      `}
    </style>
  );
}
