import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { HiOutlineEye, HiOutlineEyeSlash, HiOutlineLockClosed, HiOutlineEnvelope } from 'react-icons/hi2';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
// ============== LOGIC MỚI: IMPORT KẾT NỐI SUPABASE ==============
import { supabase } from '../services/supabaseClient'; 
// ===============================================================

const Login = () => {
  const { login } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname ?? '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailError = touched.email && !email.includes('@') ? 'Email không hợp lệ' : null;
  const passwordError = touched.password && password.length > 0 && password.length < 6
    ? 'Mật khẩu phải có ít nhất 6 ký tự'
    : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (emailError || passwordError || !email || !password) return;

    setLoading(true);
    setError(null);
    try {
      // ============== LOGIC MỚI: ĐĂNG NHẬP THẲNG LÊN SUPABASE ==============
      const { data: supabaseData, error: supabaseError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      // Nếu Supabase trả về lỗi (Ví dụ: sai tài khoản/mật khẩu trên hệ thống)
      if (supabaseError) {
        throw new Error(supabaseError.message);
      }
      // ====================================================================

      // Giữ nguyên logic cũ: Lưu trạng thái auth vào context hiện tại của bạn và chuyển trang
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đăng nhập thất bại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[480px] h-[480px] rounded-full bg-primary-100 dark:bg-primary-900/20 blur-3xl opacity-60" />
        <div className="absolute -bottom-40 -left-40 w-[480px] h-[480px] rounded-full bg-primary-50 dark:bg-slate-800/40 blur-3xl opacity-60" />
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggle}
        className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-primary hover:bg-primary-50 dark:hover:bg-slate-800 transition-colors"
        aria-label="Chuyển giao diện"
      >
        {theme === 'light' ? (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M17.657 17.657l-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 100 8 4 4 0 000-8z" />
          </svg>
        )}
      </button>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="relative w-full max-w-md bg-card dark:bg-slate-900 rounded-2xl shadow-card p-8 border border-border dark:border-slate-700/60"
      >
        {/* Logo + heading */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600 mb-5 shadow-glow">
            <svg className="w-7 h-7 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h1 className="font-display text-2xl font-bold text-ink dark:text-white tracking-tight">
            Sentiment Dashboard
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            Đăng nhập để tiếp tục
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-5 flex items-start gap-3 p-3.5 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/40"
          >
            <svg className="w-5 h-5 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <HiOutlineEnvelope className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, email: true }))}
                placeholder="you@example.com"
                className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-sm border outline-none transition-all
                  bg-white dark:bg-slate-800 text-ink dark:text-white placeholder-slate-400
                  focus:ring-2 focus:ring-primary/30 focus:border-primary
                  ${emailError
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
                    : 'border-border dark:border-slate-700'
                  }`}
              />
            </div>
            {emailError && (
              <p className="mt-1.5 text-xs text-red-500">{emailError}</p>
            )}
          </div>

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="password">
                Mật khẩu
              </label>
              <button
                type="button"
                className="text-xs text-primary-600 hover:text-primary-700 dark:text-primary-400 font-medium"
                onClick={() => alert('Tính năng đặt lại mật khẩu sẽ sớm có!')}
              >
                Quên mật khẩu?
              </button>
            </div>
            <div className="relative">
              <HiOutlineLockClosed className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, password: true }))}
                placeholder="••••••••"
                className={`w-full pl-10 pr-11 py-2.5 rounded-xl text-sm border outline-none transition-all
                  bg-white dark:bg-slate-800 text-ink dark:text-white placeholder-slate-400
                  focus:ring-2 focus:ring-primary/30 focus:border-primary
                  ${passwordError
                    ? 'border-red-400 dark:border-red-500 focus:ring-red-200 dark:focus:ring-red-900/30'
                    : 'border-border dark:border-slate-700'
                  }`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
              >
                {showPassword ? <HiOutlineEyeSlash className="w-4.5 h-4.5" /> : <HiOutlineEye className="w-4.5 h-4.5" />}
              </button>
            </div>
            {passwordError && (
              <p className="mt-1.5 text-xs text-red-500">{passwordError}</p>
            )}
          </div>

          {/* Remember me */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              className="w-4 h-4 rounded border-border dark:border-slate-600 text-primary-600 focus:ring-primary/30 accent-primary-600"
            />
            <span className="text-sm text-slate-600 dark:text-slate-400">Ghi nhớ đăng nhập</span>
          </label>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700
              transition-all shadow-sm hover:shadow-glow disabled:opacity-60 disabled:cursor-not-allowed
              focus:outline-none focus:ring-2 focus:ring-primary/40 mt-1"
          >
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor"
                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                </svg>
                Đang đăng nhập...
              </span>
            ) : (
              'Đăng nhập'
            )}
          </button>
        </form>

        {/* Divider + hint */}
        <div className="mt-6 pt-5 border-t border-border dark:border-slate-700/60 text-center">
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Dùng thử: nhập bất kỳ email hợp lệ &amp; mật khẩu ≥ 6 ký tự
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;