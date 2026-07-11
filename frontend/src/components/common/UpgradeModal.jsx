import { CreditCard, Loader2, ShieldCheck, X } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';

import { createVipPayment } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

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
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 px-7 py-8 text-white">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
            <CreditCard size={28} />
          </div>

          <h2 className="mt-5 text-3xl font-extrabold">
            Nâng cấp VIP
          </h2>

          <p className="mt-2 text-sm leading-6 text-indigo-50">
            Hệ thống sẽ chuyển bạn sang cổng thanh toán VNPay Sandbox để chọn ngân hàng,
            nhập thẻ test và xác thực OTP.
          </p>
        </div>

        <div className="p-7">
          <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5">
            <p className="text-sm font-semibold text-indigo-700">
              Gói VIP 30 ngày
            </p>

            <div className="mt-2 flex items-end gap-2">
              <span className="text-4xl font-extrabold text-slate-900">
                50.000 đ
              </span>
              <span className="pb-1 text-sm text-slate-500">
                / tháng
              </span>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              Đây là môi trường VNPay Sandbox, không mất tiền thật.
            </p>
          </div>

          <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <div className="flex gap-3">
              <ShieldCheck className="shrink-0 text-emerald-600" size={22} />
              <div>
                <p className="text-sm font-bold text-slate-800">
                  Thông tin test VNPay
                </p>
                <p className="mt-1 text-xs leading-5 text-slate-600">
                  Chọn ngân hàng NCB, số thẻ 9704198526191432198,
                  tên NGUYEN VAN A, ngày phát hành 07/15, OTP 123456.
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCreateVnpayPayment}
            disabled={isProcessing}
            className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang chuyển sang VNPay...
              </>
            ) : (
              <>
                <CreditCard size={18} />
                Thanh toán qua VNPay
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}