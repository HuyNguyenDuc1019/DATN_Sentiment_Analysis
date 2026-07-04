import React, { useState } from 'react';
import { Crown, CheckCircle2, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const UpgradeVIP = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { refreshUserProfile } = useAuth();

  const handleMockPayment = async () => {
    setIsProcessing(true);
    
    // 1. Giả lập thời gian load của cổng thanh toán ngân hàng (2 giây)
    const paymentPromise = new Promise(resolve => setTimeout(resolve, 2000));
    
    toast.promise(paymentPromise, {
      loading: 'Đang kết nối cổng thanh toán...',
      success: 'Thanh toán thành công! Đang nâng cấp tài khoản...',
      error: 'Thanh toán thất bại.',
    });

    await paymentPromise;

    try {
      // 2. Lấy ID chuẩn xác từ Supabase
      const { data: authData, error: authError } = await supabase.auth.getUser();
      if (authError || !authData?.user) throw new Error("Chưa đăng nhập!");
      
      const userId = authData.user.id;

      // 3. Gọi API Backend vừa tạo ở Bước 2
      const res = await fetch('http://localhost:8000/api/user/upgrade', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, amount: 99000 })
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => null);
        throw new Error(errorData?.detail || "Lỗi từ máy chủ Backend");
      }

      if (typeof refreshUserProfile === 'function') {
        await refreshUserProfile();
      }

      toast.success('🎉 Chúc mừng! Bạn đã trở thành thành viên VIP.', { duration: 4000 });
      
      // Load lại trang sau 1.5s để cập nhật toàn bộ quyền lợi (Badge VIP, mở khóa tính năng)
      setTimeout(() => window.location.reload(), 1500);

    } catch (error) {
      console.error(error);
      toast.error(error.message || "Có lỗi xảy ra trong quá trình nâng cấp.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full bg-slate-800 rounded-2xl border border-indigo-500/30 p-8 shadow-2xl relative overflow-hidden">
        {/* Hiệu ứng ánh sáng nền */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-indigo-500/20 blur-3xl"></div>
        
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-indigo-500/20 rounded-xl text-indigo-400">
            <Crown size={28} />
          </div>
          <h2 className="text-2xl font-bold text-white">Gói Pro VIP</h2>
        </div>
        
        <div className="mb-6">
          <span className="text-4xl font-extrabold text-white">99.000đ</span>
          <span className="text-slate-400"> / tháng</span>
        </div>

        <ul className="space-y-4 mb-8 text-slate-300">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Phân tích dữ liệu <strong>không giới hạn</strong>.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Upload file Excel/CSV cực lớn (lên đến 50MB).</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Lưu trữ lịch sử phân tích vĩnh viễn.</span>
          </li>
          <li className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <span>Sử dụng <strong>Từ điển Khía cạnh tùy chỉnh</strong> của riêng bạn.</span>
          </li>
        </ul>

        <button 
          onClick={handleMockPayment}
          disabled={isProcessing}
          className="w-full py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold transition-all duration-200 flex justify-center items-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg shadow-indigo-600/30"
        >
          {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Nâng cấp ngay'}
        </button>
      </div>
    </div>
  );
};

export default UpgradeVIP;
