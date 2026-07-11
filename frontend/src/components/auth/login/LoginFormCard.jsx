import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import AuthSubmitButton from '../shared/AuthSubmitButton';

export default function LoginFormCard({
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="w-full max-w-[500px]">
      <div className="mb-8 flex items-center gap-3 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-600/25">
          <Sparkles className="h-5 w-5" fill="currentColor" />
        </div>
        <div>
          <p className="text-xl font-black tracking-tight text-white">Almotion</p>
          <p className="text-xs text-slate-500">Customer Intelligence</p>
        </div>
      </div>

      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-9">
        <div className="mb-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-semibold text-indigo-300">
            <ShieldCheck className="h-3.5 w-3.5" />
            Đăng nhập an toàn
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white sm:text-[2rem]">
            Chào mừng trở lại
          </h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            Đăng nhập để tiếp tục theo dõi và phân tích phản hồi khách hàng.
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <div>
            <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-300">
              Email
            </label>
            <div className="group relative">
              <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(event) => onEmailChange(event.target.value)}
                placeholder="name@company.com"
                autoComplete="email"
                className="h-[52px] w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 py-3.5 pl-12 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-4">
              <label htmlFor="login-password" className="block text-sm font-semibold text-slate-300">
                Mật khẩu
              </label>
              <Link
                to="/forgot-password"
                className="text-xs font-semibold text-indigo-400 transition hover:text-indigo-300"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <div className="group relative">
              <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-indigo-400" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => onPasswordChange(event.target.value)}
                placeholder="Nhập mật khẩu"
                autoComplete="current-password"
                className="h-[52px] w-full rounded-2xl border border-slate-700/80 bg-slate-950/70 py-3.5 pl-12 pr-12 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                className="absolute right-3 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-800 hover:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/40"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <input
              type="checkbox"
              id="remember"
              className="h-4 w-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-900"
            />
            <label htmlFor="remember" className="cursor-pointer select-none text-sm text-slate-400">
              Ghi nhớ đăng nhập
            </label>
          </div>

          <AuthSubmitButton
            loading={loading}
            loadingText="Đang đăng nhập..."
            className="group mt-2 flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 py-3.5 font-bold shadow-xl shadow-indigo-600/20 transition hover:-translate-y-0.5 hover:from-indigo-500 hover:to-violet-500 disabled:hover:translate-y-0"
          >
            <span>Đăng nhập</span>
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </AuthSubmitButton>
        </form>

        <div className="mt-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-800" />
          <span className="text-xs text-slate-600">Tài khoản mới?</span>
          <div className="h-px flex-1 bg-slate-800" />
        </div>

        <p className="mt-6 text-center text-sm text-slate-400">
          Chưa có tài khoản?{' '}
          <Link to="/register" className="font-bold text-indigo-400 transition hover:text-indigo-300">
            Đăng ký miễn phí
          </Link>
        </p>
      </div>

      <p className="mt-6 text-center text-xs leading-5 text-slate-600">
        Bằng việc đăng nhập, bạn đồng ý với điều khoản sử dụng và chính sách bảo mật.
      </p>
    </div>
  );
}
