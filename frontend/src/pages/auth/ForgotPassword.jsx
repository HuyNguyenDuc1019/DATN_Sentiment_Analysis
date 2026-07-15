import React, { useState } from 'react';
import toast from 'react-hot-toast';

import ForgotPasswordFormCard from '../../components/auth/forgot-password/ForgotPasswordFormCard';
import AuthPageShell from '../../components/auth/shared/AuthPageShell';
import { normalizeEmail, validateForgotPasswordForm } from '../../utils/auth/authValidation';
import { getForgotPasswordError, sendPasswordResetEmail } from '../../services/auth/authService';

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
    <AuthPageShell
      eyebrow="Khôi phục tài khoản"
      title="Trở lại không gian phân tích của bạn"
      description="Liên kết bảo mật sẽ được gửi tới email để bạn nhanh chóng tiếp tục theo dõi và phân tích phản hồi khách hàng."
    >
      <ForgotPasswordFormCard
        email={email}
        loading={loading}
        sent={sent}
        onEmailChange={handleEmailChange}
        onSubmit={handleSubmit}
      />
    </AuthPageShell>
  );
}
