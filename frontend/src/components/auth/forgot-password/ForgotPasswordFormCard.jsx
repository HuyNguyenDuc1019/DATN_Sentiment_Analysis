import { Link } from 'react-router-dom';
import { ArrowLeft, Mail } from 'lucide-react';

import AuthBrand from '../shared/AuthBrand';
import AuthInput from '../shared/AuthInput';
import AuthSubmitButton from '../shared/AuthSubmitButton';

export default function ForgotPasswordFormCard({
  email,
  loading,
  sent,
  onEmailChange,
  onSubmit,
}) {
  return (
    <div className="w-full max-w-[500px]">
      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-9">
        <AuthBrand />

        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
          <Mail className="w-6 h-6" />
        </div>

        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white mb-2">Quên mật khẩu</h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Nhập email tài khoản của bạn. Hệ thống sẽ gửi một liên kết để tạo mật khẩu mới.
          </p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <AuthInput
            label="Email"
            type="email"
            value={email}
            onChange={onEmailChange}
            placeholder="name@company.com"
            autoComplete="email"
          />

          {sent && (
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm leading-relaxed text-emerald-300">
              Link đặt lại mật khẩu đã được gửi. Hãy kiểm tra hộp thư đến hoặc thư rác.
            </div>
          )}

          <AuthSubmitButton loading={loading} loadingText="Đang gửi liên kết...">
            Gửi liên kết đặt lại mật khẩu
          </AuthSubmitButton>
        </form>

        <Link
          to="/"
          className="mt-6 flex items-center justify-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Quay lại đăng nhập
        </Link>
      </div>
    </div>
  );
}
