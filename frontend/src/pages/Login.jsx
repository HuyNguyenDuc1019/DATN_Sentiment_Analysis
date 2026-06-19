import { useState } from 'react';
import { BarChart2, Eye, EyeOff, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!email.includes('@') || password.length < 6) {
      setError('Email không hợp lệ hoặc mật khẩu chưa đủ 6 ký tự.');
      return;
    }
    setLoading(true);
    setError('');
    const { error: authError } = await signIn(email.trim(), password);
    setLoading(false);
    if (authError) return setError(authError.message);
    navigate(location.state?.from || '/dashboard', { replace: true });
  };

  return (
    <div className="flex min-h-screen bg-slate-950 font-sans text-slate-200">
      <section className="relative z-10 flex w-full items-center justify-center p-5 sm:p-8 lg:w-1/2">
        <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl backdrop-blur-md sm:p-8">
          <div className="mb-8 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-indigo-400" fill="currentColor" />
            <span className="text-xl font-bold text-white">Almotion</span>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-white">Chào mừng trở lại</h1>
          <p className="mb-7 text-sm text-slate-400">Đăng nhập bằng tài khoản Supabase của bạn</p>

          {error && <div className="mb-5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-5">
            <label className="block text-sm font-medium text-slate-300">
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" placeholder="name@company.com" className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
            </label>
            <label className="block text-sm font-medium text-slate-300">
              Mật khẩu
              <div className="relative mt-2">
                <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" />
                <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" aria-label="Hiện hoặc ẩn mật khẩu">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
              </div>
            </label>
            <button disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Đang đăng nhập...' : 'Đăng nhập'}</button>
          </form>
          <p className="mt-6 text-center text-sm text-slate-400">Chưa có tài khoản? <Link to="/register" className="font-medium text-indigo-400">Đăng ký ngay</Link></p>
        </div>
      </section>

      <section className="relative hidden w-1/2 items-center justify-center overflow-hidden bg-indigo-950 p-16 lg:flex">
        <div className="max-w-lg">
          <h2 className="mb-4 text-4xl font-bold leading-tight text-white">Khai phá sức mạnh dữ liệu cảm xúc</h2>
          <p className="text-indigo-200/80">Theo dõi phản hồi khách hàng bằng dữ liệu thật và mô hình AI.</p>
          <div className="mt-14 rounded-2xl border border-indigo-400/30 bg-slate-900/40 p-6 backdrop-blur-xl">
            <div className="mb-6 flex justify-between text-sm text-slate-300"><span>Tổng quan cảm xúc</span><BarChart2 className="h-4 w-4" /></div>
            <div className="flex h-28 items-end gap-3">{[42, 68, 35, 82, 100, 58].map((height, index) => <div key={index} className="flex-1 rounded-t bg-indigo-400" style={{ height: `${height}%`, opacity: 0.55 + index * 0.06 }} />)}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
