import { Shield } from 'lucide-react';

import PasswordField from './PasswordField';

export default function SecurityCard({ passwords, setPasswords, loading, onChangePassword }) {
  const change = (field) => (event) => setPasswords((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-6 flex flex-col">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-5 h-5 text-slate-300" />
        <h2 className="text-lg font-medium text-white">Bảo mật tài khoản</h2>
      </div>

      <div className="space-y-4">
        <PasswordField
          label="Mật khẩu hiện tại"
          value={passwords.current}
          onChange={change('current')}
          placeholder="Nhập mật khẩu hiện tại"
        />
        <PasswordField
          label="Mật khẩu mới"
          value={passwords.next}
          onChange={change('next')}
          placeholder="Nhập mật khẩu mới"
        />
        <PasswordField
          label="Xác nhận mật khẩu"
          value={passwords.confirm}
          onChange={change('confirm')}
          placeholder="Nhập lại mật khẩu mới"
        />
      </div>

      <button
        onClick={onChangePassword}
        disabled={loading}
        className="w-full mt-6 bg-slate-700 hover:bg-slate-600 text-white font-medium py-2.5 rounded-xl transition-colors text-sm disabled:opacity-60"
      >
        {loading ? 'Đang đổi mật khẩu...' : 'Đổi mật khẩu'}
      </button>
    </div>
  );
}
