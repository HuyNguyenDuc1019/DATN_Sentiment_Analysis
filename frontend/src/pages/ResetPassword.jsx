import React, { useEffect, useMemo, useState } from 'react';
import { KeyRound, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

function getReadableError(error) {
  const message = error?.message || error?.error_description || '';

  if (message.toLowerCase().includes('expired')) {
    return 'Liên kết đặt lại mật khẩu đã hết hạn. Vui lòng yêu cầu gửi lại link mới.';
  }

  if (message.toLowerCase().includes('invalid')) {
    return 'Liên kết đặt lại mật khẩu không hợp lệ hoặc đã được sử dụng.';
  }

  return message || 'Không thể đặt lại mật khẩu. Vui lòng thử lại.';
}

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
    return { query, hash };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function prepareRecoverySession() {
      setCheckingLink(true);
      setLinkError('');

      try {
        const accessToken = params.hash.get('access_token');
        const refreshToken = params.hash.get('refresh_token');
        const code = params.query.get('code');
        const type = params.hash.get('type') || params.query.get('type');

        if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (error) throw error;
        } else if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const { data } = await supabase.auth.getSession();
          if (!data?.session) {
            throw new Error('missing_recovery_session');
          }
        }

        if (!mounted) return;
        setLinkReady(true);

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
            : getReadableError(error),
        );
      } finally {
        if (mounted) setCheckingLink(false);
      }
    }

    prepareRecoverySession();

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

    if (password.length < 6) {
      toast.error('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (password !== confirmPassword) {
      toast.error('Mật khẩu xác nhận không khớp.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await supabase.auth.signOut();
      toast.success('Đặt lại mật khẩu thành công. Vui lòng đăng nhập lại.');
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Update password failed:', error);
      toast.error(getReadableError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-200 grid place-items-center p-6 font-sans">
      <section className="w-full max-w-md bg-slate-800/60 border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
          <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
        </div>

        <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5">
          <KeyRound className="w-6 h-6" />
        </div>

        <h1 className="text-2xl font-semibold text-white mb-2">Tạo mật khẩu mới</h1>
        <p className="text-sm text-slate-400 mb-7">Nhập mật khẩu mới cho tài khoản của bạn.</p>

        {checkingLink ? (
          <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-4 text-sm text-indigo-200">
            Đang kiểm tra liên kết đặt lại mật khẩu...
          </div>
        ) : linkError ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-rose-500/25 bg-rose-500/10 px-4 py-4 text-sm text-rose-200 leading-relaxed">
              {linkError}
            </div>
            <Link
              to="/forgot-password"
              className="block w-full text-center bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors"
            >
              Gửi lại link đặt mật khẩu
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <PasswordInput label="Mật khẩu mới" value={password} onChange={setPassword} />
            <PasswordInput label="Xác nhận mật khẩu" value={confirmPassword} onChange={setConfirmPassword} />

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
            >
              {loading ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </form>
        )}

        <Link to="/" className="block mt-6 text-center text-sm text-indigo-400 hover:text-indigo-300">
          Quay lại đăng nhập
        </Link>
      </section>
    </main>
  );
}

function PasswordInput({ label, value, onChange }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-slate-300 mb-2">{label}</span>
      <input
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete="new-password"
        className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
      />
    </label>
  );
}
