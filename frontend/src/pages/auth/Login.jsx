import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  BarChart3,
  CheckCircle2,
  MessageSquareMore,
  ShieldCheck,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { useAuth } from '../../contexts/AuthContext';
import LoginFormCard from '../../components/auth/login/LoginFormCard';
import { normalizeEmail, validateLoginForm } from '../../utils/auth/authValidation';
import { getLoginError, loadUserRoleAfterLogin } from '../../services/auth/authService';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event) => {
    event.preventDefault();

    const normalizedEmail = normalizeEmail(email);
    const validationError = validateLoginForm({ email: normalizedEmail, password });

    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    const { data, error } = await signIn(normalizedEmail, password);
    setLoading(false);

    if (error) {
      toast.error(getLoginError(error));
      return;
    }

    const userId = data?.user?.id || data?.session?.user?.id;

    if (userId) {
      await loadUserRoleAfterLogin(userId);
    }

    navigate('/dashboard');
  };

  return (
    <div className="relative h-screen w-full overflow-y-auto bg-slate-950 font-sans text-slate-200">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-indigo-600/20 blur-[110px]" />
        <div className="absolute -bottom-48 right-0 h-[38rem] w-[38rem] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-[100px]" />
      </div>

      <div className="relative mx-auto grid min-h-screen max-w-[1480px] grid-cols-1 items-center gap-10 px-5 py-8 sm:px-8 lg:grid-cols-[0.88fr_1.12fr] lg:px-12 xl:gap-20 xl:px-20">
        <div className="flex justify-center lg:justify-end">
          <LoginFormCard
            email={email}
            password={password}
            loading={loading}
            onEmailChange={setEmail}
            onPasswordChange={setPassword}
            onSubmit={handleLogin}
          />
        </div>

        <div className="relative hidden min-h-[680px] overflow-hidden rounded-[2rem] border border-white/10 bg-gradient-to-br from-indigo-600 via-indigo-700 to-slate-950 p-10 shadow-2xl shadow-indigo-950/40 lg:flex lg:flex-col lg:justify-between xl:p-14">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
            <div className="absolute -right-8 top-8 h-56 w-56 rounded-full border border-white/10" />
            <div className="absolute bottom-0 left-0 h-72 w-72 rounded-full bg-cyan-400/10 blur-3xl" />
          </div>

          <div className="relative z-10">
            <div className="mb-10 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-indigo-50 backdrop-blur-xl">
              <Sparkles className="h-4 w-4 text-amber-300" />
              Nền tảng phân tích phản hồi thông minh
            </div>
            <h2 className="max-w-2xl text-4xl font-black leading-[1.12] tracking-tight text-white xl:text-5xl">
              Biến mọi phản hồi thành quyết định tốt hơn.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-indigo-100/80">
              Theo dõi cảm xúc khách hàng, phát hiện vấn đề nổi bật và nắm bắt cơ hội tăng trưởng trong một không gian làm việc duy nhất.
            </p>
          </div>

          <div className="relative z-10 mx-auto w-full max-w-xl">
            <div className="rounded-3xl border border-white/15 bg-slate-950/35 p-6 shadow-2xl backdrop-blur-xl xl:p-8">
              <div className="mb-7 flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-white">Tổng quan cảm xúc</p>
                  <p className="mt-1 text-xs text-indigo-200/70">Cập nhật theo thời gian thực</p>
                </div>
                <div className="rounded-xl bg-white/10 p-2.5 text-indigo-100">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <MetricCard icon={MessageSquareMore} value="2.4K" label="Phản hồi" />
                <MetricCard icon={TrendingUp} value="78%" label="Hài lòng" positive />
                <MetricCard icon={CheckCircle2} value="94%" label="Đã xử lý" />
              </div>

              <div className="mt-6 flex h-28 items-end gap-2 rounded-2xl border border-white/10 bg-slate-950/30 px-4 pb-4 pt-5">
                {[38, 55, 43, 72, 64, 88, 76, 96, 82, 100].map((height, index) => (
                  <div key={index} className="flex h-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-md bg-gradient-to-t from-cyan-400 to-indigo-300"
                      style={{ height: `${height}%`, opacity: 0.55 + index * 0.04 }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-2 text-sm text-indigo-100/75">
            <ShieldCheck className="h-4 w-4 text-emerald-300" />
            Dữ liệu được bảo vệ và đồng bộ an toàn
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, value, label, positive = false }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.07] p-4">
      <Icon className={`mb-4 h-5 w-5 ${positive ? 'text-emerald-300' : 'text-indigo-200'}`} />
      <p className="text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-xs text-indigo-100/60">{label}</p>
    </div>
  );
}
