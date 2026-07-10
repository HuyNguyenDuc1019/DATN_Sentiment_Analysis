import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Crown,
  Loader2,
  QrCode,
  ShieldCheck,
  X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../../services/supabaseClient';

const API_BASE_URL =
  import.meta.env.VITE_FASTAPI_URL ||
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_PYTHON_API ||
  'http://localhost:8000';

const PLAN_AMOUNT = 99000;
const PLAN_DURATION_DAYS = 30;
const PLAN_NAME = 'VIP 30 ngày';

function formatMoney(value) {
  return Number(value || 0).toLocaleString('vi-VN') + 'đ';
}

const UpgradeModal = ({ isOpen, onClose, onUpgraded }) => {
  const [step, setStep] = useState('plan');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState(null);
  const [confirmResult, setConfirmResult] = useState(null);

  const bankInfo = paymentData?.bank_info;

  const fakeQrBlocks = useMemo(() => {
    const seed = String(paymentData?.payment_code || 'VIP000000');
    return Array.from({ length: 81 }, (_, index) => {
      const code = seed.charCodeAt(index % seed.length);
      return (code + index * 7) % 3 !== 0;
    });
  }, [paymentData?.payment_code]);

  if (!isOpen) return null;

  const resetAndClose = () => {
    if (isProcessing) return;

    setStep('plan');
    setPaymentData(null);
    setConfirmResult(null);
    onClose?.();
  };

  const copyText = async (value, message) => {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      toast.success(message || 'Đã sao chép.');
    } catch {
      toast.error('Không thể sao chép.');
    }
  };

  const createPayment = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError || !authData?.user) {
        throw new Error('Vui lòng đăng nhập trước khi nâng cấp VIP.');
      }

      const userId = authData.user.id;

      const res = await fetch(`${API_BASE_URL}/api/payment/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: userId,
          amount: PLAN_AMOUNT,
          plan_name: PLAN_NAME,
          duration_days: PLAN_DURATION_DAYS,
          payment_method: 'mock_bank_transfer',
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.detail ||
            data?.message ||
            data?.error ||
            'Không thể tạo giao dịch thanh toán.',
        );
      }

      setPaymentData({
        ...data,
        user_id: userId,
      });

      setStep('payment');
      toast.success('Đã tạo giao dịch chờ thanh toán.');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Có lỗi xảy ra khi tạo giao dịch.');
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmPayment = async () => {
    if (isProcessing) return;

    if (!paymentData?.transaction_id || !paymentData?.user_id) {
      toast.error('Thiếu thông tin giao dịch.');
      return;
    }

    setIsProcessing(true);

    try {
      const paymentPromise = new Promise((resolve) => setTimeout(resolve, 1800));

      await toast.promise(paymentPromise, {
        loading: 'Đang xác nhận thanh toán...',
        success: 'Thanh toán hợp lệ! Đang kích hoạt VIP...',
        error: 'Thanh toán thất bại.',
      });

      const res = await fetch(`${API_BASE_URL}/api/payment/confirm`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transaction_id: paymentData.transaction_id,
          user_id: paymentData.user_id,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || data?.success === false) {
        throw new Error(
          data?.detail ||
            data?.message ||
            data?.error ||
            'Không thể xác nhận thanh toán.',
        );
      }

      setConfirmResult(data);

      if (typeof onUpgraded === 'function') {
        await onUpgraded();
      }

      setStep('success');

      toast.success('🎉 VIP 30 ngày đã được kích hoạt.', {
        duration: 4000,
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Có lỗi xảy ra khi xác nhận thanh toán.');
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
              <h2 className="text-2xl font-bold text-white">Thanh toán VIP</h2>
              <p className="mt-1 text-sm text-slate-400">
                Tạo giao dịch, thanh toán mock và kích hoạt VIP 30 ngày.
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
              2. Thanh toán
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
                  {formatMoney(PLAN_AMOUNT)}
                </span>
                <span className="text-slate-400"> / 30 ngày</span>
              </div>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Gói Pro VIP mở khóa toàn bộ tính năng nâng cao trong vòng 30 ngày kể từ lúc xác nhận thanh toán.
              </p>
            </div>

            <ul className="mb-8 space-y-4 text-slate-300">
              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span>Phân tích dữ liệu không giới hạn.</span>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span>Xử lý file dữ liệu lớn lên đến 50MB.</span>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span>Mở khóa cảnh báo khủng hoảng, Word Cloud và so sánh quán ăn.</span>
              </li>

              <li className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
                <span>Lưu lịch sử giao dịch để Admin quản lý.</span>
              </li>
            </ul>

            <button
              type="button"
              onClick={createPayment}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-indigo-600/30 transition-all hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang tạo giao dịch...
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5" />
                  Tạo giao dịch VIP
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
                <h3 className="font-bold">QR thanh toán giả lập</h3>
              </div>

              <div className="mx-auto grid h-44 w-44 grid-cols-9 gap-1 rounded-xl border border-slate-600 bg-white p-3">
                {fakeQrBlocks.map((active, index) => (
                  <div
                    key={index}
                    className={active ? 'rounded-sm bg-slate-900' : 'rounded-sm bg-white'}
                  />
                ))}
              </div>

              <p className="mt-4 text-center text-xs text-slate-500">
                QR giả lập cho demo đồ án, không kết nối cổng thanh toán thật.
              </p>
            </div>

            <div className="mb-5 space-y-3 rounded-2xl border border-slate-700 bg-slate-900/50 p-5 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Ngân hàng</span>
                <span className="font-semibold text-white">{bankInfo?.bank_name || 'MB Bank'}</span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Chủ tài khoản</span>
                <span className="font-semibold text-white">
                  {bankInfo?.account_name || 'ALMOTION SYSTEM'}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Số tài khoản</span>
                <button
                  type="button"
                  onClick={() => copyText(bankInfo?.account_number, 'Đã sao chép số tài khoản.')}
                  className="inline-flex items-center gap-2 font-semibold text-white hover:text-indigo-300"
                >
                  {bankInfo?.account_number || '0123456789'}
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Số tiền</span>
                <span className="font-semibold text-white">
                  {formatMoney(paymentData?.amount || PLAN_AMOUNT)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-400">Nội dung</span>
                <button
                  type="button"
                  onClick={() => copyText(paymentData?.payment_code, 'Đã sao chép mã thanh toán.')}
                  className="inline-flex items-center gap-2 font-semibold text-amber-300 hover:text-amber-200"
                >
                  {paymentData?.payment_code}
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={confirmPayment}
              disabled={isProcessing}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 font-semibold text-white shadow-lg shadow-emerald-600/30 transition-all hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Đang xác nhận...
                </>
              ) : (
                <>
                  <ShieldCheck className="h-5 w-5" />
                  Tôi đã thanh toán
                </>
              )}
            </button>
          </div>
        )}

        {step === 'success' && (
          <div className="relative z-10 text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full border border-emerald-400/30 bg-emerald-500/10 text-emerald-300">
              <CheckCircle2 className="h-10 w-10" />
            </div>

            <h3 className="text-2xl font-bold text-white">Kích hoạt VIP thành công</h3>

            <p className="mt-3 text-sm leading-6 text-slate-400">
              Tài khoản của bạn đã được nâng cấp lên VIP trong 30 ngày.
            </p>

            {confirmResult?.vip_expires_at && (
              <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100">
                Hạn VIP đến:{' '}
                <strong>
                  {new Date(confirmResult.vip_expires_at).toLocaleDateString('vi-VN')}
                </strong>
              </div>
            )}

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