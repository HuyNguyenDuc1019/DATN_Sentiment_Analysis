import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  HiOutlineEye, HiOutlineEyeSlash,
  HiOutlineLockClosed, HiOutlineEnvelope, HiOutlineUser
} from 'react-icons/hi2';
import { useTheme } from '@/contexts/ThemeContext';
// 🚀 THÊM DUY NHẤT DÒNG NÀY: Import client Supabase để kết nối API
import { supabase } from '@/services/supabaseClient';

const Register = () => {
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [touched, setTouched] = useState({});

  const validate = {
    name: form.name.trim().length < 2 ? 'Họ tên phải có ít nhất 2 ký tự' : null,
    email: !form.email.includes('@') ? 'Email không hợp lệ' : null,
    password: form.password.length < 6 ? 'Mật khẩu phải có ít nhất 6 ký tự' : null,
    confirm: form.confirm !== form.password ? 'Mật khẩu xác nhận không khớp' : null,
  };

  const handleChange = (field) => (e) =>
    setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleBlur = (field) =>
    setTouched((p) => ({ ...p, [field]: true }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ name: true, email: true, password: true, confirm: true });
    if (Object.values(validate).some(Boolean)) return;

    setLoading(true);
    setError(null);
    try {
      // 🚀 THAY THẾ ĐOẠN GIẢ LẬP: Gọi API Đăng ký thật kết nối thẳng tới Supabase Auth
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          data: {
            full_name: form.name.trim(),
            role: 'user'
          }
        }
      });

      if (signUpError) throw signUpError;

      setSuccess(true);
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message || 'Đăng ký thất bại, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  const inputClass = (field) =>
    `w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-all
    bg-white dark:bg-slate-800 text-ink dark:text-white placeholder-slate-400
    focus:ring-2 focus:ring-primary/30 focus:border-primary
    ${touched[field] && validate[field]
      ? 'border-red-400 dark:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
      : 'border-border dark:border-slate-700'}`;

  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-primary-100 dark:bg-primary-900/20 blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-primary-50 dark:bg-slate-800/40 blur-3xl opacity-60" />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
      >
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        )}
      </button>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-card dark:bg-slate-900 rounded-2xl shadow-card p-8 border border-border dark:border-slate-700/60"
      >
        {/* Header */}
        <div className="text-center mb-7">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-4 shadow-glow">
            <svg className="w-7 h-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink dark:text-white tracking-tight">
            Tạo tài khoản
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Đăng ký để sử dụng Sentiment Dashboard
          </p>
        </div>

        {/* Success banner */}
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-center gap-3 p-3.5 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/40"
          >
            <svg className="w-5 h-5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-green-600 dark:text-green-400">
              Đăng ký thành công! Đang chuyển về trang đăng nhập...
            </p>
          </motion.div>
        )}

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40"
          >
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Họ tên */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Họ và tên
            </label>
            <div className="relative">
              <HiOutlineUser className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={form.name}
                onChange={handleChange('name')}
                onBlur={() => handleBlur('name')}
                placeholder="Nguyễn Văn A"
                className={inputClass('name')}
              />
            </div>
            {touched.name && validate.name && (
              <p className="mt-1.5 text-xs text-red-500">{validate.name}</p>
            )}
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <HiOutlineEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="email"
                value={form.email}
                onChange={handleChange('email')}
                onBlur={() => handleBlur('email')}
                placeholder="you@example.com"
                className={inputClass('email')}
              />
            </div>
            {touched.email && validate.email && (
              <p className="mt-1.5 text-xs text-red-500">{validate.email}</p>
            )}
          </div>

          {/* Mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange('password')}
                onBlur={() => handleBlur('password')}
                placeholder="••••••••"
                className={`${inputClass('password')} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPassword ? <HiOutlineEyeSlash className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
              </button>
            </div>
            {touched.password && validate.password && (
              <p className="mt-1.5 text-xs text-red-500">{validate.password}</p>
            )}
          </div>

          {/* Xác nhận mật khẩu */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">
              Xác nhận mật khẩu
            </label>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type={showConfirm ? 'text' : 'password'}
                value={form.confirm}
                onChange={handleChange('confirm')}
                onBlur={() => handleBlur('confirm')}
                placeholder="••••••••"
                className={`${inputClass('confirm')} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showConfirm ? <HiOutlineEyeSlash className="w-4 h-4" /> : <HiOutlineEye className="w-4 h-4" />}
              </button>
            </div>
            {touched.confirm && validate.confirm && (
              <p className="mt-1.5 text-xs text-red-500">{validate.confirm}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || success}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700
              transition-all shadow-sm hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-primary/40 mt-1"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Đang đăng ký...
              </span>
            ) : 'Đăng ký'}
          </button>
        </form>

        {/* Link về login */}
        <div className="mt-6 pt-5 border-t border-border dark:border-slate-700/60 text-center">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Đã có tài khoản?{' '}
            <Link
              to="/login"
              className="text-primary-600 hover:text-primary-700 dark:text-primary-400 font-semibold"
            >
              Đăng nhập
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;