<<<<<<< HEAD
import React, { useState } from 'react';
import { Crown, CheckCircle2, Loader2, X, CalendarClock } from 'lucide-react';
=======
import { CheckCircle2, Crown, Loader2, X } from 'lucide-react';
import { useState } from 'react';
>>>>>>> b7e1b98d5514ecdfdb90d0493aab4206f39819ce
import toast from 'react-hot-toast';

<<<<<<< HEAD
const API_BASE_URL =
  import.meta.env.VITE_FASTAPI_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PYTHON_API ||
  'http://localhost:8000';

const UpgradeModal = ({ isOpen, onClose, onUpgraded }) => {
=======
import { createVipPayment } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

const VIP_BENEFITS = [
  {
    title: 'Phân tích không giới hạn',
    description: 'không còn giới hạn 100 lượt mỗi ngày của gói Free.',
  },
  {
    title: 'Xử lý dữ liệu hàng loạt lớn',
    description: 'vượt giới hạn file 5MB và 50 bình luận mỗi lần của gói Free.',
  },
  {
    title: 'Phân tích Google Maps',
    description: 'thu thập và đánh giá phản hồi trực tiếp từ đường dẫn.',
  },
  {
    title: 'So sánh nhiều địa điểm',
    description: 'đối chiếu cảm xúc và hiệu quả giữa các quán.',
  },
  {
    title: 'Báo cáo chuyên sâu',
    description: 'mở khóa xuất PDF và trực quan hóa Đám mây từ khóa.',
  },
  {
    title: 'Cảnh báo và cấu hình nâng cao',
    description: 'theo dõi khủng hoảng, tùy chỉnh ngưỡng và từ điển phân tích.',
  },
];

export default function UpgradeModal({
  isOpen,
  onClose,
  userId,
}) {
>>>>>>> b7e1b98d5514ecdfdb90d0493aab4206f39819ce
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

<<<<<<< HEAD
  const handleClose = () => {
    if (isProcessing) return;
    onClose?.();
  };

  const handleMockPayment = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
=======
  const effectiveUserId = userId || user?.id;
>>>>>>> b7e1b98d5514ecdfdb90d0493aab4206f39819ce

  const handleCreateVnpayPayment = async () => {
    try {
<<<<<<< HEAD
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
=======
      if (!effectiveUserId) {
        toast.error('Bạn cần đăng nhập trước khi nâng cấp VIP.');
        return;
      }

      setIsProcessing(true);

      const response = await createVipPayment(effectiveUserId, 50000);

      const paymentUrl =
        response?.payment_url ||
        response?.data?.payment_url ||
        response?.paymentUrl ||
        response?.url;

      if (!paymentUrl) {
        throw new Error('Backend chưa trả về payment_url.');
      }

      toast.success('Đang chuyển sang cổng thanh toán VNPay...');
      window.location.href = paymentUrl;
    } catch (error) {
      console.error('Lỗi tạo thanh toán VNPay:', error);
      toast.error(error.message || 'Không thể tạo thanh toán VNPay.');
>>>>>>> b7e1b98d5514ecdfdb90d0493aab4206f39819ce
      setIsProcessing(false);
    }
  };

  return (
<<<<<<< HEAD
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-indigo-500/30 bg-slate-800 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={handleClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 z-10 rounded-full bg-slate-700/50 p-1 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
=======
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-2xl border border-slate-600/60 bg-[#1e293b] px-7 pb-7 pt-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.65)] sm:px-8">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-700/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
>>>>>>> b7e1b98d5514ecdfdb90d0493aab4206f39819ce
        >
          <X size={20} />
        </button>

<<<<<<< HEAD
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
=======
        <div className="flex items-center gap-3 pr-10">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-300 ring-1 ring-indigo-400/20">
            <Crown size={27} strokeWidth={1.8} />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-300">
              Almotion
            </p>
            <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight text-white">
              Gói Pro VIP
            </h2>
          </div>
        </div>

        <div className="mt-7 flex items-end gap-2">
          <span className="text-[2.65rem] font-black leading-none tracking-tight text-white">
            50.000đ
          </span>
          <span className="pb-1 text-sm text-slate-400">/ tháng</span>
        </div>

        <p className="mt-2 text-xs text-slate-500">
          Thời hạn sử dụng 30 ngày sau khi thanh toán thành công.
        </p>

        <div className="mt-7 space-y-4">
          {VIP_BENEFITS.map((benefit) => (
            <div key={benefit.title} className="flex items-start gap-3">
              <CheckCircle2
                size={19}
                strokeWidth={1.9}
                className="mt-0.5 shrink-0 text-emerald-400"
              />
              <p className="text-sm leading-6 text-slate-300">
                <strong className="font-bold text-slate-100">{benefit.title}</strong>{' '}
                {benefit.description}
              </p>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={handleCreateVnpayPayment}
          disabled={isProcessing}
          className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-950/40 transition hover:from-indigo-500 hover:to-violet-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isProcessing ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Đang chuyển sang VNPay...
            </>
          ) : (
            'Nâng cấp ngay'
>>>>>>> b7e1b98d5514ecdfdb90d0493aab4206f39819ce
          )}
        </button>
      </div>
    </div>
  );
<<<<<<< HEAD
};

export default UpgradeModal;
=======
}
>>>>>>> b7e1b98d5514ecdfdb90d0493aab4206f39819ce
