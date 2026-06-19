import { useState } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Register() {
  const { signUp } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const change = (key) => (event) => setForm((current) => ({ ...current, [key]: event.target.value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (form.name.trim().length < 2 || !form.email.includes('@') || form.password.length < 6 || form.password !== form.confirm) {
      setMessage({ type: 'error', text: 'Vui lòng kiểm tra họ tên, email và hai mật khẩu.' });
      return;
    }
    setLoading(true);
    const { data, error } = await signUp(form.email.trim(), form.password, form.name.trim());
    setLoading(false);
    if (error) return setMessage({ type: 'error', text: error.message });
    if (data.session) navigate('/dashboard', { replace: true });
    else setMessage({ type: 'success', text: 'Đăng ký thành công. Hãy kiểm tra email xác nhận rồi đăng nhập.' });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 p-5 text-slate-200">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-800/60 p-6 shadow-2xl backdrop-blur-md sm:p-8">
        <div className="mb-7 flex items-center gap-3"><Sparkles className="h-6 w-6 text-indigo-400" fill="currentColor" /><span className="text-xl font-bold text-white">Almotion</span></div>
        <h1 className="mb-2 text-xl font-semibold text-white">Tạo tài khoản mới</h1>
        <p className="mb-6 text-sm text-slate-400">Thông tin được xác thực và lưu bởi Supabase</p>
        {message.text && <div className={`mb-5 rounded-lg border p-3 text-sm ${message.type === 'error' ? 'border-rose-500/30 bg-rose-500/10 text-rose-300' : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'}`}>{message.text}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Họ và tên" value={form.name} onChange={change('name')} />
          <Field label="Email" type="email" value={form.email} onChange={change('email')} />
          <label className="block text-sm font-medium text-slate-300">Mật khẩu<div className="relative mt-2"><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={change('password')} className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 pr-11 outline-none focus:border-indigo-500" /><button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button></div></label>
          <Field label="Xác nhận mật khẩu" type="password" value={form.confirm} onChange={change('confirm')} />
          <button disabled={loading} className="w-full rounded-xl bg-indigo-600 py-3 font-medium text-white transition hover:bg-indigo-700 disabled:opacity-60">{loading ? 'Đang đăng ký...' : 'Tạo tài khoản'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-400">Đã có tài khoản? <Link to="/" className="font-medium text-indigo-400">Đăng nhập</Link></p>
      </div>
    </div>
  );
}

function Field({ label, type = 'text', value, onChange }) {
  return <label className="block text-sm font-medium text-slate-300">{label}<input type={type} value={value} onChange={onChange} className="mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/80 px-4 py-3 outline-none focus:border-indigo-500" /></label>;
}
