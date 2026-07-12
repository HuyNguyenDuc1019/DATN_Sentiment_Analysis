import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';

import AuthBrand from '../shared/AuthBrand';
import AuthPasswordInput from '../shared/AuthPasswordInput';
import AuthSubmitButton from '../shared/AuthSubmitButton';

export default function ResetPasswordFormCard({
  password,
  confirmPassword,
  loading,
  checkingLink,
  linkError,
  onPasswordChange,
  onConfirmPasswordChange,
  onSubmit,
}) {
  return (
    <div className="auth-form-card w-full max-w-[500px] rounded-[1.75rem] border border-cyan-200/15 bg-[#03183f]/30 p-6 shadow-xl shadow-black/15 backdrop-blur-xl sm:p-8">
      <AuthBrand />

      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400">
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
        <form onSubmit={onSubmit} className="space-y-5">
          <AuthPasswordInput
            label="Mật khẩu mới"
            value={password}
            onChange={onPasswordChange}
            showToggle={false}
          />

          <AuthPasswordInput
            label="Xác nhận mật khẩu"
            value={confirmPassword}
            onChange={onConfirmPasswordChange}
            showToggle={false}
          />

          <AuthSubmitButton loading={loading} loadingText="Đang cập nhật..." className="">
            Cập nhật mật khẩu
          </AuthSubmitButton>
        </form>
      )}

      <Link to="/" className="block mt-6 text-center text-sm text-indigo-400 hover:text-indigo-300">
        Quay lại đăng nhập
      </Link>
    </div>
  );
}
