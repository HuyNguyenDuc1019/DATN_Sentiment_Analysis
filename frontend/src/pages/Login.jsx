import React, { useState } from 'react';
import { Sparkles, BarChart2 } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function LoginScreen() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await signIn(email.trim(), password);
    setLoading(false);
    if (error) {
      window.alert(error.message);
      return;
    }
    navigate('/dashboard');
  };

  return (
    <>
      {/* Khai báo Keyframes trực tiếp để không cần file CSS custom */}
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
          @keyframes float-reverse {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(12px); }
          }
        `}
      </style>

      <div className="min-h-screen w-full flex font-sans text-slate-200 bg-[#0f172a] overflow-hidden">
        
        {/* NỬA TRÁI: FORM ĐĂNG NHẬP */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
          <div className="w-full max-w-md">
            
            {/* Form Card */}
            <div className="bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl p-8 shadow-2xl">
              
              {/* Logo */}
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="w-6 h-6 text-indigo-400" fill="currentColor" />
                <span className="text-white text-xl font-bold tracking-wide">Almotion</span>
              </div>

              {/* Title */}
              <div className="mb-8">
                <h1 className="text-xl font-semibold text-white mb-2">Chào mừng trở lại</h1>
                <p className="text-sm text-slate-400">Đăng nhập vào tài khoản của bạn để tiếp tục</p>
              </div>

              {/* Form Fields */}
              <form className="space-y-5" onSubmit={handleLogin}>
                
                {/* Email */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Email doanh nghiệp
                  </label>
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com" 
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 px-4 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                {/* Password */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-slate-300">
                      Mật khẩu
                    </label>
                    <a href="#" className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                      Quên mật khẩu?
                    </a>
                  </div>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/80 border border-slate-700 rounded-lg py-3 px-4 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
                  />
                </div>

                {/* Remember Me */}
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

                {/* Submit Button */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-xl mt-4 transition-colors shadow-lg shadow-indigo-600/20"
                >
                  Đăng nhập
                </button>
              </form>

              {/* Sign Up Link */}
              <div className="mt-6 text-center">
                <p className="text-sm text-slate-400">
                  Chưa có tài khoản? <Link to="/register" className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors">Đăng ký ngay</Link>
                </p>
              </div>

            </div>
          </div>
        </div>


        {/* NỬA PHẢI: TRƯNG BÀY & ANIMATION (Ẩn trên mobile) */}
        <div className="hidden lg:flex w-1/2 relative flex-col justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#0f172a] p-16 overflow-hidden">
          
          {/* Abstract Background Elements */}
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/4"></div>
          
          {/* Decorative Circles (Mô phỏng sóng/wave như ảnh) */}
          <div className="absolute top-1/4 right-0 w-[600px] h-[600px] border border-white/5 rounded-full translate-x-1/2"></div>
          <div className="absolute bottom-1/4 right-0 w-[400px] h-[400px] border border-white/10 rounded-full translate-x-1/3"></div>

          {/* Text Content */}
          <div className="relative z-10 max-w-lg mb-16">
            <h2 className="text-4xl font-bold text-white leading-tight mb-4 drop-shadow-md">
              Khai phá sức mạnh dữ liệu cảm xúc
            </h2>
            <p className="text-indigo-200/80 text-sm leading-relaxed">
              Thấu hiểu khách hàng qua từng điểm chạm với công nghệ AI phân tích ngữ nghĩa độc quyền.
            </p>
          </div>

          {/* KHU VỰC HOẠT ẢNH LƠ LỬNG 
            Áp dụng style animation trực tiếp 
          */}
          <div className="relative z-10 w-full max-w-sm mx-auto">
            
            {/* Main Floating Card (Biểu đồ) */}
            <div 
              className="bg-slate-800/40 backdrop-blur-xl border border-slate-600/50 rounded-2xl p-6 shadow-2xl relative z-10"
              style={{ animation: 'float 6s ease-in-out infinite' }}
            >
              <div className="flex justify-between items-center mb-6">
                <span className="text-xs font-medium text-slate-300">Tổng quan cảm xúc</span>
                <BarChart2 className="w-4 h-4 text-slate-400" />
              </div>
              
              {/* Mockup Chart Bars */}
              <div className="flex items-end justify-between gap-3 h-24 mt-4">
                <div className="w-full bg-indigo-600/80 rounded-t-sm h-[40%]"></div>
                <div className="w-full bg-indigo-500 rounded-t-sm h-[60%]"></div>
                <div className="w-full bg-indigo-600/80 rounded-t-sm h-[30%]"></div>
                <div className="w-full bg-indigo-500 rounded-t-sm h-[80%]"></div>
                <div className="w-full bg-indigo-400 rounded-t-sm h-[100%] shadow-[0_0_15px_rgba(129,140,248,0.5)]"></div>
                <div className="w-full bg-indigo-600/80 rounded-t-sm h-[50%]"></div>
              </div>
            </div>

            {/* Floating Badge: Tích cực (Nằm đè góc phải dưới) */}
            <div 
              className="absolute -right-12 bottom-6 bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-full px-5 py-2.5 shadow-xl flex items-center gap-2 z-20"
              style={{ animation: 'float-delayed 5s ease-in-out infinite 1s' }} // Delay 1s để chuyển động lệch pha
            >
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></div>
              <span className="text-sm font-semibold text-emerald-400">Tích cực</span>
              <span className="text-sm font-medium text-slate-300 ml-1">78%</span>
            </div>

            {/* Floating Badge: Tiêu cực (Nằm đè góc trái dưới) */}
            <div 
              className="absolute left-8 -bottom-10 bg-slate-800/70 backdrop-blur-md border border-slate-600/50 rounded-full px-5 py-2.5 shadow-xl flex items-center gap-2 z-20"
              style={{ animation: 'float-reverse 7s ease-in-out infinite' }} // Reverse để chuyển động ngược chiều
            >
              <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.8)]"></div>
              <span className="text-sm font-semibold text-rose-400">Tiêu cực</span>
              <span className="text-sm font-medium text-slate-300 ml-1">12%</span>
            </div>

          </div>

        </div>

      </div>
    </>
  );
}
