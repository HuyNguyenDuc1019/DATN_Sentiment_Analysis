import { CheckCircle2, Crown, Loader2, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

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
  const [isProcessing, setIsProcessing] = useState(false);
  const { user } = useAuth();

  if (!isOpen) return null;

  const effectiveUserId = userId || user?.id;

  const handleCreateVnpayPayment = async () => {
    try {
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
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#020617]/80 p-4 backdrop-blur-md">
      <div className="relative max-h-[calc(100vh-2rem)] w-full max-w-[430px] overflow-y-auto rounded-2xl border border-slate-600/60 bg-[#1e293b] px-7 pb-7 pt-8 text-white shadow-[0_30px_90px_rgba(0,0,0,0.65)] sm:px-8">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          aria-label="Đóng"
          className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 transition hover:bg-slate-700/70 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={20} />
        </button>

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
          )}
        </button>
      </div>
    </div>
  );
}
