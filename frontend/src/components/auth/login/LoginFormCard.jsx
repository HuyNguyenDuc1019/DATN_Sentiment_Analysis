import { Link } from 'react-router-dom';

import AuthBrand from '../shared/AuthBrand';
import AuthInput from '../shared/AuthInput';
import AuthSubmitButton from '../shared/AuthSubmitButton';

export default function LoginFormCard({
  email,
  password,
  loading,
  onEmailChange,
  onPasswordChange,
  onSubmit,
}) {
  return (
    <div className="w-full max-w-md">
      <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl">
        <AuthBrand />

        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white mb-2">Chào mừng trở lại</h1>
          <p className="text-sm text-slate-400">Đăng nhập để theo dõi phản hồi khách hàng của bạn.</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <AuthInput
            label="Email doanh nghiệp"
            type="email"
            value={email}
            onChange={onEmailChange}
            placeholder="name@company.com"
            autoComplete="email"
          />

          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-slate-300">Mật khẩu</label>
              <Link
                to="/forgot-password"
                className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Quên mật khẩu?
              </Link>
            </div>

            <AuthInput
              type="password"
              value={password}
              onChange={onPasswordChange}
              hideLabel
              autoComplete="current-password"
            />
          </div>

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="remember"
              className="w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-slate-800"
            />
            <label htmlFor="remember" className="text-sm text-slate-300 cursor-pointer">
              Ghi nhớ đăng nhập
            </label>
          </div>

          <AuthSubmitButton loading={loading} loadingText="Đang đăng nhập...">
            Đăng nhập
          </AuthSubmitButton>
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
  );
}
