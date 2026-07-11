import React, { useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Crown,
  Loader2,
  PartyPopper,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  createVipPayment,
  confirmVipMockPayment,
} from '../../services/api';

import { useAuth } from '../../contexts/AuthContext';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN') + 'đ';
}

function unwrapPaymentPayload(response) {
  return response?.data && typeof response.data === 'object'
    ? response.data
    : response;
}

function normalizeQrImage(value) {
  if (!value) return '';

  const text = String(value);

  if (text.startsWith('data:image')) {
    return text;
  }

  return `data:image/png;base64,${text}`;
}

const UpgradeModal = ({ isOpen, onClose, userId, onUpgraded }) => {
  const { user, refreshUserProfile } = useAuth();

  const effectiveUserId = userId || user?.id;

  const [step, setStep] = useState('plan');
  const [isProcessing, setIsProcessing] = useState(false);

  const [paymentCode, setPaymentCode] = useState('');
  const [qrImage, setQrImage] = useState('');
  const [amount, setAmount] = useState(0);

  if (!isOpen) return null;

  const resetAndClose = () => {
    if (isProcessing) return;

    setStep('plan');
    setPaymentCode('');
    setQrImage('');
    setAmount(0);

    onClose?.();
  };

  const copyText = async (value, message) => {
    if (!value) {
      toast.error('Không có nội dung để sao chép.');
      return;
    }

    try {
      await navigator.clipboard.writeText(String(value));
      toast.success(message || 'Đã sao chép.');
    } catch {
      toast.error('Không thể sao chép.');
    }
  };

  const refreshVipStateInBackground = () => {
    Promise.resolve()
      .then(async () => {
        if (typeof onUpgraded === 'function') {
          await onUpgraded();
          return;
        }

        if (typeof refreshUserProfile === 'function') {
          await refreshUserProfile();
        }
      })
      .catch((error) => {
        console.error('Không thể refresh profile sau khi nâng VIP:', error);
      });
  };

  const handleCreatePayment = async () => {
    if (isProcessing) return;

    if (!effectiveUserId) {
      toast.error('Vui lòng đăng nhập trước khi nâng cấp VIP.');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await createVipPayment(effectiveUserId);
      const data = unwrapPaymentPayload(response);

      console.log('Payment create response:', response);

      const nextPaymentCode =
        data?.payment_code ||
        data?.paymentCode ||
        response?.payment_code ||
        response?.paymentCode ||
        '';

      const nextQrImage = normalizeQrImage(
        data?.qr_image ||
          data?.qrImage ||
          data?.qr_code ||
          data?.qrCode ||
          response?.qr_image ||
          response?.qrImage ||
          response?.qr_code ||
          response?.qrCode ||
          '',
      );

      const nextAmount =
        data?.amount ||
        response?.amount ||
        99000;

      if (!nextPaymentCode) {
        throw new Error(
          data?.message ||
            response?.message ||
            'Backend đã tạo giao dịch nhưng chưa trả về payment_code.',
        );
      }

      setPaymentCode(nextPaymentCode);
      setQrImage(nextQrImage);
      setAmount(Number(nextAmount || 0));

      setStep('payment');

      toast.success(
        data?.message ||
          response?.message ||
          'Đã tạo đơn hàng pending thành công.',
      );
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Có lỗi xảy ra khi tạo đơn thanh toán.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMockWebhook = async () => {
    if (isProcessing) return;

    if (!paymentCode) {
      toast.error('Thiếu mã thanh toán.');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await confirmVipMockPayment(paymentCode);
      const data = unwrapPaymentPayload(response);

      console.log('Mock webhook response:', response);

      const isSuccess =
        response?.success === true ||
        data?.success === true ||
        response?.status === 'success' ||
        data?.status === 'success' ||
        Boolean(response?.message || data?.message);

      if (!isSuccess) {
        throw new Error(
          data?.message ||
            response?.message ||
            'Thanh toán mô phỏng thất bại.',
        );
      }

      setStep('success');

      toast.success(
        data?.message ||
          response?.message ||
          'Thanh toán thành công, tài khoản đã lên VIP!',
        {
          duration: 4000,
        },
      );

      refreshVipStateInBackground();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Có lỗi xảy ra khi thanh toán.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-indigo-500/30 bg-slate-800 p-8 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <button
          type="button"
          onClick={resetAndClose}
          disabled={isProcessing}
          className="absolute right-4 top-4 z-10 rounded-full bg-slate-700/50 p-1 text-slate-400 transition-colors hover:bg-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          <X size={20} />
        </button>

        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-32 w-32 rounded-full bg-indigo-500/20 blur-3xl" />

        <div className="relative z-10 mb-6">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-500/20 p-3 text-indigo-400">
              <Crown size={28} />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-white">
                Thanh toán VIP
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Quét QR và kích hoạt VIP cho demo báo cáo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-semibold">
            <div
              className={`rounded-xl border px-3 py-2 text-center ${
                step === 'plan'
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-700 bg-slate-900/40 text-slate-400'
              }`}
            >
              1. Chọn gói
            </div>

            <div
              className={`rounded-xl border px-3 py-2 text-center ${
                step === 'payment'
                  ? 'border-indigo-400 bg-indigo-500/20 text-indigo-200'
                  : 'border-slate-700 bg-slate-900/40 text-slate-400'
              }`}
            >
              2. Quét QR
            </div>

            <div
              className={`rounded-xl border px-3 py-2 text-center ${
                step === 'success'
                  ? 'border-emerald-400 bg-emerald-500/20 text-emerald-200'
                  : 'border-slate-700 bg-slate-900/40 text-slate-400'
              }`}
            >
              3. Hoàn tất
            </div>
          </div>
        </div>

        {step === 'plan' && (
          <div className="relative z-10">
            <div className="mb-6 rounded-2xl border border-indigo-500/20 bg-slate-900/40 p-5">
              <div>
                <span className="text-4xl font-extrabold text-white">
                  99.000đ
                </span>

                <span className="text-slate-400"> / gói VIP</span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Gói VIP mở khóa các tính năng nâng cao.
              </p>
            </div>

            <ul className="mb-8 space-y-4 text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span>Mở khóa phân tích Google Maps.</span>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span>Mở khóa Dashboard nâng cao và cảnh báo.</span>
              </li>

              
            </ul>

            <button
              type="button"
              onClick={handleCreatePayment}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang tạo mã QR...
                </>
              ) : (
                <>
                  <QrCode className="h-5 w-5" />
                  Nâng cấp VIP
                </>
              )}
            </button>
          </div>
        )}

        {step === 'payment' && (
          <div className="relative z-10">
            <button
              type="button"
              onClick={() => setStep('plan')}
              disabled={isProcessing}
              className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-400 hover:text-white disabled:opacity-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Quay lại chọn gói
            </button>

            <div className="mb-5 rounded-2xl border border-slate-700 bg-slate-900/50 p-5">
              <div className="mb-4 flex items-center gap-2 text-indigo-200">
                <QrCode className="h-5 w-5" />
                <h3 className="font-bold">Mã QR thanh toán</h3>
              </div>

              <div className="mx-auto flex min-h-64 w-full max-w-xs items-center justify-center rounded-2xl border border-slate-600 bg-white p-4">
                {qrImage ? (
                  <img
                    src={qrImage}
                    alt="QR thanh toán VIP"
                    className="h-60 w-60 object-contain"
                  />
                ) : (
                  <div className="text-center text-sm text-slate-500">
                    Backend chưa trả về qr_image hoặc qr_code.
                  </div>
                )}
              </div>

              
            </div>

            <div className="mb-5 space-y-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Mã thanh toán</span>

                <button
                  type="button"
                  onClick={() => copyText(paymentCode, 'Đã sao chép mã thanh toán.')}
                  className="inline-flex items-center gap-2 font-semibold text-amber-300 hover:text-amber-200"
                >
                  {paymentCode || 'Không có'}
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Số tiền</span>

                <span className="font-semibold text-white">
                  {formatMoney(amount)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleMockWebhook}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang thực hiện thanh toán...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Xác nhận thanh toán
                </>
              )}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
              <PartyPopper className="h-10 w-10" />
            </div>

            <h3 className="text-2xl font-bold text-white">
              Nâng cấp VIP thành công!
            </h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Tài khoản của bạn đã được cập nhật quyền VIP. Giao diện sẽ nhận quyền mới ngay mà không cần F5.
            </p>

            <button
              type="button"
              onClick={resetAndClose}
              className="mt-7 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500"
            >
              Hoàn tất
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UpgradeModal;