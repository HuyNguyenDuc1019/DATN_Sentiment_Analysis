import { Link } from 'react-router-dom';

import AuthBrand from '../shared/AuthBrand';
import AuthInput from '../shared/AuthInput';
import AuthPasswordInput from '../shared/AuthPasswordInput';
import AuthSubmitButton from '../shared/AuthSubmitButton';

export default function RegisterFormCard({
  form,
  loading,
  showPassword,
  showConfirmPassword,
  onChange,
  onSubmit,
  onTogglePassword,
  onToggleConfirmPassword,
}) {
  return (
    <div className="my-8 w-full max-w-[520px]">
      <div className="rounded-[2rem] border border-slate-800/80 bg-slate-900/75 p-6 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-9">
        <AuthBrand />

        <div className="mb-8">
          <h1 className="text-xl font-semibold text-white mb-2">Tạo tài khoản mới</h1>
          <p className="text-sm text-slate-400">Bắt đầu quản lý phản hồi khách hàng trong một nơi.</p>
        </div>

        <form className="space-y-5" onSubmit={onSubmit}>
          <AuthInput
            label="Họ và tên"
            type="text"
            value={form.name}
            onChange={onChange('name')}
            placeholder="Nguyễn Văn A"
            autoComplete="name"
          />

          <AuthInput
            label="Email"
            type="email"
            value={form.email}
            onChange={onChange('email')}
            placeholder="name@company.com"
            autoComplete="email"
          />

          <AuthPasswordInput
            label="Mật khẩu"
            value={form.password}
            onChange={onChange('password')}
            visible={showPassword}
            onToggle={onTogglePassword}
          />

          <AuthPasswordInput
            label="Xác nhận mật khẩu"
            value={form.confirm}
            onChange={onChange('confirm')}
            visible={showConfirmPassword}
            onToggle={onToggleConfirmPassword}
          />

          <AuthSubmitButton loading={loading} loadingText="Đang tạo tài khoản..." className="mt-6">
            Tạo tài khoản
          </AuthSubmitButton>
        </form>

        <div className="mt-8 border-t border-slate-800 pt-6 text-center">
          <p className="text-sm text-slate-400">
            Đã có tài khoản?{' '}
            <Link to="/" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
              Đăng nhập
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
