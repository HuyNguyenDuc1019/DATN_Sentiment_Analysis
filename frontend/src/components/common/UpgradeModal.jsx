import React, { useState } from 'react';
import { Crown, CheckCircle2, Loader2, X, CalendarClock } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

const API_BASE_URL =
  import.meta.env.VITE_FASTAPI_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PYTHON_API ||
  'http://localhost:8000';

const UpgradeModal = ({ isOpen, onClose, onUpgraded }) => {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isProcessing) return;
    onClose?.();
  };

  const handleMockPayment = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const paymentPromise = new Promise((resolve) => setTimeout(resolve, 2000));

      await toast.promise(paymentPromise, {
        loading: 'Đang kết nối cổng thanh toán...',
        success: 'Thanh toán thành công! Đang nâng cấp tài khoản...',
        error: 'Thanh toán thất bại.',
      });

      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        throw new Error('Vui lòng đăng nhập trước khi nâng cấp VIP.');
      }

      const userId = authData.user.id;

      const res = await fetch(`${API_BASE_URL}/api/user/upgrade`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          amount: 99000,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.detail ||
            data?.message ||
            data?.error ||
            'Lỗi từ máy chủ Backend.',
        );
      }

      if (typeof onUpgraded === 'function') {
        await onUpgraded();
      }

      toast.success('🎉 Chúc mừng! Bạn đã trở thành thành viên VIP trong 30 ngày.', {
        duration: 4000,
      });

      onClose?.();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Có lỗi xảy ra trong quá trình nâng cấp.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-800 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 z-10 rounded-full bg-slate-700/50 p-1 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-indigo-500/20 p-3 text-indigo-400">
            <Crown size={28} />
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white">Gói Pro VIP</h2>
            <p className="mt-1 text-sm text-slate-400">
              Mở khóa toàn bộ tính năng trong 30 ngày.
            </p>
          </div>
        </div>

        <div className="relative z-10 mb-6 rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-5">
          <div>
            <span className="text-4xl font-extrabold text-white">99.000đ</span>
            <span className="text-slate-400"> / 30 ngày</span>
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/20 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
            <CalendarClock className="h-4 w-4" />
            <span>
              VIP bắt đầu ngay sau khi nâng cấp và hết hạn sau <strong>30 ngày</strong>.
            </span>
          </div>
        </div>

        <ul className="relative z-10 mb-8 space-y-4 text-slate-300">
          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <span>
              Thời hạn VIP <strong>30 ngày</strong> kể từ lúc nâng cấp.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <span>
              Phân tích dữ liệu <strong>không giới hạn</strong>.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <span>
              Xử lý file dữ liệu lớn lên đến <strong>50MB</strong>.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <span>
              Mở khóa tính năng <strong>Xuất báo cáo</strong> Export CSV.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <span>
              Sử dụng <strong>Từ điển Khía cạnh tùy chỉnh</strong> để bóc tách dữ liệu chuyên sâu.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <span>
              Mở khóa hệ thống <strong>Cảnh báo khủng hoảng</strong> tức thời.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <span>
              Trực quan hóa dữ liệu với biểu đồ <strong>Đám mây từ khóa</strong>.
            </span>
          </li>

          <li className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
            <span>
              Mở khóa tính năng <strong>So sánh quán ăn</strong> để đối chiếu mức độ hài lòng,
              điểm rủi ro và từ khóa nổi bật giữa nhiều quán.
            </span>
          </li>
        </ul>

        <button
          type="button"
          onClick={handleMockPayment}
          disabled={isProcessing}
          className="relative z-10 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all duration-200 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isProcessing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              Đang nâng cấp...
            </>
          ) : (
            <>
              <Crown className="h-5 w-5" />
              Nâng cấp VIP 30 ngày
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default UpgradeModal;