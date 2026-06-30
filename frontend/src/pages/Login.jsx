import React, { useState } from 'react';
import { BarChart2, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password) {
      toast.error('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await signIn(email.trim(), password);

      if (error) {
        toast.error(error.message || 'Đăng nhập không thành công. Vui lòng kiểm tra lại email và mật khẩu.');
        return;
      }

      const authUser = data?.user || (await supabase.auth.getUser()).data?.user;

      if (!authUser?.id) {
        toast.error('Không thể xác thực thông tin tài khoản.');
        return;
      }

      let userRole = 'user';

      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .maybeSingle();

      if (roleData?.role) {
        userRole = roleData.role;
      }

      localStorage.setItem('userId', authUser.id);
      localStorage.setItem('userRole', userRole);
      localStorage.setItem('user_role', userRole);

      toast.success('Đăng nhập thành công.');
      navigate(userRole === 'admin' ? '/admin/dashboard' : '/dashboard', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Đăng nhập thành công nhưng không lấy được quyền tài khoản.');
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

      <div className="flex min-h-screen w-full overflow-hidden bg-[#0f172a] font-sans text-slate-200">
        <div className="relative z-10 flex w-full items-center justify-center p-8 lg:w-1/2">
          <div className="w-full max-w-md">
            <div className="rounded-2xl border border-slate-700 bg-slate-800/50 p-8 shadow-2xl backdrop-blur-md">
              <div className="mb-8 flex items-center gap-3">
                <Sparkles className="h-6 w-6 text-indigo-400" fill="currentColor" />
                <span className="text-xl font-bold tracking-wide text-white">Almotion</span>
              </div>

              <div className="mb-8">
                <h1 className="mb-2 text-xl font-semibold text-white">Chào mừng trở lại</h1>
                <p className="text-sm text-slate-400">
                  Đăng nhập để theo dõi phản hồi khách hàng của bạn.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Email doanh nghiệp</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <label className="block text-sm font-medium text-slate-300">Mật khẩu</label>
                    <Link to="/forgot-password" className="text-xs font-medium text-indigo-400 transition-colors hover:text-indigo-300">
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm text-slate-200 transition-all focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800"
                  />
                  <label htmlFor="remember" className="cursor-pointer text-sm text-slate-300">
                    Ghi nhớ đăng nhập
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="mt-4 w-full rounded-xl bg-indigo-600 py-3 font-medium text-white shadow-lg shadow-indigo-600/20 transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  Chưa có tài khoản?{' '}
                  <Link to="/register" className="font-medium text-indigo-400 transition-colors hover:text-indigo-300">
                    Đăng ký ngay
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative hidden w-1/2 flex-col justify-center overflow-hidden bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a] p-16 lg:flex">
          <div className="absolute right-0 top-0 h-[800px] w-[800px] -translate-y-1/2 translate-x-1/3 rounded-full bg-indigo-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-[600px] w-[600px] -translate-x-1/4 translate-y-1/3 rounded-full bg-purple-600/10 blur-3xl" />
          <div className="absolute right-0 top-1/4 h-[600px] w-[600px] translate-x-1/2 rounded-full border border-white/5" />
          <div className="absolute bottom-1/4 right-0 h-[400px] w-[400px] translate-x-1/3 rounded-full border border-white/10" />

          <div className="relative z-10 mb-16 max-w-lg">
            <h2 className="mb-4 text-4xl font-bold leading-tight text-white drop-shadow-md">
              Hiểu khách hàng từ từng phản hồi
            </h2>
            <p className="text-sm leading-relaxed text-indigo-200/80">
              Theo dõi khen chê, phát hiện vấn đề nổi bật và ra quyết định nhanh hơn từ dữ liệu thực tế.
            </p>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-sm">
            <div
              className="relative z-10 rounded-2xl border border-slate-600/50 bg-slate-800/40 p-6 shadow-2xl backdrop-blur-xl"
              style={{ animation: 'float 6s ease-in-out infinite' }}
            >
              <div className="mb-6 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-300">Tổng quan phản hồi</span>
                <BarChart2 className="h-4 w-4 text-slate-400" />
              </div>

              <div className="mt-4 flex h-24 items-end justify-between gap-3">
                {[40, 60, 30, 80, 100, 50].map((height, index) => (
                  <div key={index} className="w-full rounded-t-sm bg-indigo-500" style={{ height: `${height}%` }} />
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

function FloatingBadge({ className, color, text, value, reverse = false }) {
  const isPositive = color === 'emerald';

  return (
    <div
      className={`absolute ${className} z-20 flex items-center gap-2 rounded-full border border-slate-600/50 bg-slate-800/70 px-5 py-2.5 shadow-xl backdrop-blur-md`}
      style={{ animation: reverse ? 'float-reverse 7s ease-in-out infinite' : 'float-delayed 5s ease-in-out infinite 1s' }}
    >
      <div className={`h-2.5 w-2.5 rounded-full ${isPositive ? 'bg-emerald-400' : 'bg-rose-500'}`} />
      <span className={`text-sm font-semibold ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>{text}</span>
      <span className="ml-1 text-sm font-medium text-slate-300">{value}</span>
    </div>
  );
}
