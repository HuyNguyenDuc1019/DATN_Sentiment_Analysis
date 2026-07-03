import React, { useState } from 'react';
import { Sparkles, BarChart2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';
import { logAdminActivity } from '../services/adminActivityLogger';
function getLoginError(error) {
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

export default function LoginScreen() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      toast.error('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setLoading(true);
    const { data, error } = await signIn(normalizedEmail, password);
    setLoading(false);

    if (error) {
      toast.error(getLoginError(error));
      return;
    }

    const userId = data?.user?.id || data?.session?.user?.id;

if (userId) {
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
}

navigate('/dashboard');
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
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-md">
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
                <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
              </div>

              <div className="mb-8">
                <h1 className="text-xl font-semibold text-white mb-2">Chào mừng trở lại</h1>
                <p className="text-sm text-slate-400">Đăng nhập để theo dõi phản hồi khách hàng của bạn.</p>
              </div>

              <form className="space-y-5" onSubmit={handleLogin}>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email doanh nghiệp</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 px-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">Mật khẩu</label>
                    <Link to="/forgot-password" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                      Quên mật khẩu?
                    </Link>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="remember"
                    className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800"
                  />
                  <label htmlFor="remember" className="text-sm text-slate-300 cursor-pointer">Ghi nhớ đăng nhập</label>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl mt-4 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
                >
                  {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  Chưa có tài khoản?{' '}
                  <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                    Đăng ký ngay
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

function FloatingBadge({ className, color, text, value, reverse = false }) {
  const colorClass = color === 'emerald' ? 'bg-emerald-400 text-emerald-400' : 'bg-rose-500 text-rose-400';
  return (
    <div
      className={`absolute ${className} bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-full px-5 py-2.5 shadow-xl flex items-center gap-2 z-20`}
      style={{ animation: reverse ? 'float-reverse 7s ease-in-out infinite' : 'float-delayed 5s ease-in-out infinite 1s' }}
    >
      <div className={`w-2.5 h-2.5 rounded-full ${colorClass.split(' ')[0]} shadow-[0_0_8px_rgba(129,140,248,0.5)]`} />
      <span className={`text-sm font-semibold ${colorClass.split(' ')[1]}`}>{text}</span>
      <span className="text-sm font-medium text-slate-300 ml-1">{value}</span>
    </div>
  );
}
