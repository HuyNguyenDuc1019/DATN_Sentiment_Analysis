import React, { useState } from 'react';
import { Sparkles, BarChart2, Eye, EyeOff } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';

const toastStyle = { id: 'register-message' };

function getReadableAuthError(error) {
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
    errorName.includes('authretryablefetcherror')
    || errorStatus >= 500
    || message === '{}'
    || message.includes('internal server error')
    || message.includes('failed to fetch')
    || message.includes('network')
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

export default function RegisterScreen() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [loading, setLoading] = useState(false);

  const change = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  const handleRegister = async (event) => {
    event.preventDefault();

    const fullName = form.name.trim();
    const email = form.email.trim().toLowerCase();

    if (!fullName) {
      toast.error('Vui lòng nhập họ và tên.', toastStyle);
      return;
    }

    if (!email) {
      toast.error('Vui lòng nhập email.', toastStyle);
      return;
    }

    if (form.password.length < 6) {
      toast.error('Mật khẩu cần có ít nhất 6 ký tự.', toastStyle);
      return;
    }

    if (form.password !== form.confirm) {
      toast.error('Mật khẩu xác nhận chưa khớp.', toastStyle);
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: { full_name: fullName },
        },
      });

      if (error) {
        throw error;
      }

      const userId = data?.user?.id;

      if (userId) {
        const { error: profileError } = await supabase
          .from('profiles')
          .upsert(
            {
              id: userId,
              email,
              full_name: fullName,
              role: 'user',
              status: 'active',
              tier: 'free',
            },
            { onConflict: 'id' },
          );

        if (profileError) {
          console.error('Create profile failed:', profileError);
        }
      }

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

      <div className="min-h-screen w-full flex font-sans text-slate-200 bg-[#0f172a] overflow-hidden">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10 overflow-y-auto">
          <div className="w-full max-w-md my-8">
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
                <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
              </div>

              <div className="mb-8">
                <h1 className="text-xl font-semibold text-white mb-2">Tạo tài khoản mới</h1>
                <p className="text-sm text-slate-400">Bắt đầu quản lý phản hồi khách hàng trong một nơi.</p>
              </div>

              <form className="space-y-5" onSubmit={handleRegister}>
                <Field label="Họ và tên">
                  <input
                    type="text"
                    value={form.name}
                    onChange={change('name')}
                    placeholder="Nguyễn Văn A"
                    className="input-auth"
                    autoComplete="name"
                  />
                </Field>

                <Field label="Email doanh nghiệp">
                  <input
                    type="email"
                    value={form.email}
                    onChange={change('email')}
                    placeholder="name@company.com"
                    className="input-auth"
                    autoComplete="email"
                  />
                </Field>

                <PasswordField
                  label="Mật khẩu"
                  value={form.password}
                  onChange={change('password')}
                  visible={showPassword}
                  onToggle={() => setShowPassword((value) => !value)}
                />

                <PasswordField
                  label="Xác nhận mật khẩu"
                  value={form.confirm}
                  onChange={change('confirm')}
                  visible={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword((value) => !value)}
                />

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl mt-6 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
                >
                  {loading ? 'Đang tạo tài khoản...' : 'Tạo tài khoản'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  Đã có tài khoản?{' '}
                  <Link to="/" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Đăng nhập
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex w-1/2 relative flex-col justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a] p-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] border border-white/5 rounded-full translate-x-1/2" />
          <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] border border-white/10 rounded-full translate-x-1/3" />

          <div className="relative z-10 max-w-lg mb-16">
            <h2 className="text-4xl font-bold text-white leading-tight mb-4 drop-shadow-md">
              Hiểu khách hàng từ từng phản hồi
            </h2>
            <p className="text-indigo-200/80 text-sm leading-relaxed">
              Theo dõi khen chê, phát hiện vấn đề nổi bật và ra quyết định nhanh hơn từ dữ liệu thực tế.
            </p>
          </div>

          <div className="relative z-10 w-full max-w-sm mx-auto">
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-6 shadow-2xl relative z-10" style={{ animation: 'float 6s ease-in-out infinite' }}>
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-medium text-slate-300">Tổng quan phản hồi</span>
                <BarChart2 className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex items-end justify-between gap-3 h-24 mt-4">
                {[40, 60, 30, 80, 100, 50].map((height, index) => (
                  <div key={index} className="w-full bg-indigo-500 rounded-t-sm" style={{ height: `${height}%` }} />
                ))}
              </div>
            </div>

            <FloatingBadge className="-right-12 bottom-6" color="emerald" text="Hài lòng" value="78%" />
            <FloatingBadge className="left-8 -bottom-10" color="rose" text="Chưa hài lòng" value="12%" reverse />
          </div>
        </div>
      </div>
    </>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      {children}
    </div>
  );
}

function PasswordField({ label, value, onChange, visible, onToggle }) {
  return (
    <Field label={label}>
      <div className="relative">
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          placeholder="••••••••"
          className="input-auth pr-11"
          autoComplete="new-password"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
          aria-label={visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
        >
          {visible ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>
    </Field>
  );
}

function FloatingBadge({ className, color, text, value, reverse = false }) {
  const styles = color === 'emerald'
    ? { dot: 'bg-emerald-400', text: 'text-emerald-400' }
    : { dot: 'bg-rose-500', text: 'text-rose-400' };

  return (
    <div
      className={`absolute ${className} bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-full px-5 py-2.5 shadow-xl flex items-center gap-2 z-20`}
      style={{ animation: reverse ? 'float-reverse 7s ease-in-out infinite' : 'float-delayed 5s ease-in-out infinite 1s' }}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${styles.dot} shadow-[0_0_8px_rgba(129,140,248,0.5)]`} />
      <span className={`text-sm font-semibold ${styles.text}`}>{text}</span>
      <span className="text-sm font-medium text-slate-300 ml-1">{value}</span>
    </div>
  );
}
