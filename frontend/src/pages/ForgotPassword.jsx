import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Mail, Sparkles } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import toast from 'react-hot-toast';

const getErrorMessage = (error) => {
  const message = error?.message || error?.error_description || '';

  if (message.toLowerCase().includes('rate limit')) {
    return 'Bạn yêu cầu quá nhanh. Vui lòng chờ một lát rồi thử lại.';
  }

  return message || 'Không thể gửi liên kết đặt lại mật khẩu. Vui lòng thử lại.';
};

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      toast.error('Vui lòng nhập email để nhận liên kết đặt lại mật khẩu.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
      toast.success('Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra hộp thư email.');
    } catch (error) {
      console.error('Reset password email failed:', error);
      toast.error(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>
        {`
          @keyframes float {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-15px); }
          }
          @keyframes float-delayed {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-10px); }
          }
        `}
      </style>

      <div className="min-h-screen w-full flex font-sans text-slate-200 bg-[#0f172a] overflow-hidden">
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-md">
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl">
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
                <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
              </div>

              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-5">
                <Mail className="w-6 h-6" />
              </div>

              <div className="mb-8">
                <h1 className="text-xl font-semibold text-white mb-2">Quên mật khẩu</h1>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Nhập email tài khoản của bạn. Hệ thống sẽ gửi một liên kết để tạo mật khẩu mới.
                </p>
              </div>

              <form className="space-y-5" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email doanh nghiệp
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      setSent(false);
                    }}
                    placeholder="name@company.com"
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 px-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                    autoComplete="email"
                  />
                </div>

                {sent && (
                  <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300 leading-relaxed">
                    Link đặt lại mật khẩu đã được gửi. Hãy kiểm tra hộp thư đến hoặc thư rác.
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl mt-4 transition-colors shadow-lg shadow-indigo-600/20 disabled:opacity-60"
                >
                  {loading ? 'Đang gửi liên kết...' : 'Gửi liên kết đặt lại mật khẩu'}
                </button>
              </form>

              <Link to="/" className="mt-6 flex items-center justify-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 font-medium transition-colors">
                <ArrowLeft className="w-4 h-4" />
                Quay lại đăng nhập
              </Link>
            </div>
          </div>
        </div>

        <div className="hidden lg:flex w-1/2 relative flex-col justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a] p-16 overflow-hidden">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4" />
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] border border-white/5 rounded-full translate-x-1/2" />
          <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] border border-white/10 rounded-full translate-x-1/3" />

          <div className="relative z-10 max-w-lg mb-16">
            <h2 className="text-4xl font-bold text-white leading-tight mb-4 drop-shadow-md">
              Khôi phục quyền truy cập tài khoản
            </h2>
            <p className="text-indigo-200/80 text-sm leading-relaxed">
              Bảo vệ dữ liệu phân tích của bạn bằng quy trình đặt lại mật khẩu qua email xác thực.
            </p>
          </div>

          <div className="relative z-10 w-full max-w-sm mx-auto">
            <div className="bg-slate-800/40 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-6 shadow-2xl relative z-10" style={{ animation: 'float 6s ease-in-out infinite' }}>
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">Email khôi phục</div>
                  <div className="text-xs text-slate-400">Liên kết bảo mật một lần</div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-3 rounded-full bg-indigo-400/30 w-4/5" />
                <div className="h-3 rounded-full bg-indigo-400/20 w-2/3" />
                <div className="h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/20 mt-5" />
              </div>
            </div>
            <div className="absolute -right-10 bottom-8 bg-slate-800/70 backdrop-blur-md border border-emerald-400/30 rounded-full px-5 py-2.5 shadow-xl flex items-center gap-2 z-20" style={{ animation: 'float-delayed 5s ease-in-out infinite 1s' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              <span className="text-sm font-semibold text-emerald-400">Bảo mật</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
