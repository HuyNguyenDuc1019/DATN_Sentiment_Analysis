import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import ResetPasswordFormCard from '../../components/auth/reset-password/ResetPasswordFormCard';

import { validateResetPasswordForm } from '../../utils/auth/authValidation';

import {
  getResetPasswordError,
  prepareRecoverySession,
  updateRecoveryPassword,
} from '../../services/auth/authService';

export default function ResetPassword() {
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingLink, setCheckingLink] = useState(true);
  const [linkReady, setLinkReady] = useState(false);
  const [linkError, setLinkError] = useState('');

  const params = useMemo(() => {
    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));

    return {
      query,
      hash,
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function run() {
      setCheckingLink(true);
      setLinkError('');

      try {
        await prepareRecoverySession(params);

        if (!mounted) return;

        setLinkReady(true);

        const type = params.hash.get('type') || params.query.get('type');

        if (type === 'recovery') {
          window.history.replaceState({}, document.title, '/reset-password');
        }
      } catch (error) {
        console.error('Prepare recovery session failed:', error);

        if (!mounted) return;

        setLinkReady(false);
        setLinkError(
          error?.message === 'missing_recovery_session'
            ? 'Không tìm thấy phiên đặt lại mật khẩu. Vui lòng bấm lại link trong email hoặc yêu cầu gửi link mới.'
            : getResetPasswordError(error),
        );
      } finally {
        if (mounted) {
          setCheckingLink(false);
        }
      }
    }

    run();

    return () => {
      mounted = false;
    };
  }, [params]);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!linkReady) {
      toast.error('Link đặt lại mật khẩu chưa sẵn sàng. Vui lòng mở lại link trong email.');
      return;
    }

    const validationError = validateResetPasswordForm({
      password,
      confirmPassword,
    });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);

    try {
      await updateRecoveryPassword(password);
      toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Update password failed:', error);
      toast.error(getResetPasswordError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 grid place-items-center p-6 font-sans">
      <ResetPasswordFormCard
        password={password}
        confirmPassword={confirmPassword}
        loading={loading}
        checkingLink={checkingLink}
        linkError={linkError}
        onPasswordChange={setPassword}
        onConfirmPasswordChange={setConfirmPassword}
        onSubmit={handleSubmit}
      />

      {linkError && (
        <Link
          to="/forgot-password"
          className="sr-only"
        >
          Gửi lại link đặt mật khẩu
        </Link>
      )}
    </main>
  );
}
