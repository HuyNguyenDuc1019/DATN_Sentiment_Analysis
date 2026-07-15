import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Crown,
  Home,
  Loader2,
  ReceiptText,
  RefreshCcw,
  XCircle,
} from 'lucide-react';
import confetti from 'canvas-confetti';

import { useAuth } from '../../contexts/AuthContext';
import { verifyVnpayPayment } from '../../services/paymentService';

export default function VnpayReturn() {
  const [searchParams] = useSearchParams();
  const { refreshUserProfile } = useAuth();

  const [isRefreshing, setIsRefreshing] = useState(true);
  const [verificationStatus, setVerificationStatus] = useState('checking');
  const [verificationError, setVerificationError] = useState('');

  const responseCode = searchParams.get('vnp_ResponseCode');
  const transactionStatus = searchParams.get('vnp_TransactionStatus');
  const orderId = searchParams.get('vnp_TxnRef');
  const amount = searchParams.get('vnp_Amount');
  const bankCode = searchParams.get('vnp_BankCode');
  const bankTranNo = searchParams.get('vnp_BankTranNo');
  const cardType = searchParams.get('vnp_CardType');
  const payDate = searchParams.get('vnp_PayDate');
  const transactionNo = searchParams.get('vnp_TransactionNo');

  const callbackQuery = searchParams.toString();
  const isChecking = verificationStatus === 'checking';
  const isSuccess = verificationStatus === 'success';

  const formattedAmount = useMemo(() => {
    const rawAmount = Number(amount || 0) / 100;

    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(rawAmount);
  }, [amount]);

  useEffect(() => {
    const run = async () => {
      try {
        const result = await verifyVnpayPayment(callbackQuery);

        if (result?.success) {
          setVerificationStatus('success');

          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.65 },
          });

          setTimeout(() => {
            confetti({
              particleCount: 80,
              spread: 100,
              origin: { y: 0.75 },
            });
          }, 350);

          if (typeof refreshUserProfile === 'function') {
            await refreshUserProfile();
          }
        } else {
          setVerificationStatus('failed');
          setVerificationError(result?.message || 'Giao dịch VNPay không thành công.');
        }
      } catch (error) {
        console.error('Không thể refresh profile sau thanh toán:', error);
        setVerificationStatus('failed');
        setVerificationError(error?.message || 'Không thể xác minh giao dịch VNPay.');
      } finally {
        setIsRefreshing(false);
      }
    };

    run();
  }, [callbackQuery, refreshUserProfile]);

  return (
    <div className="h-screen overflow-y-auto overscroll-y-contain bg-slate-950 px-4 py-8 text-white">
      <div className="mx-auto flex min-h-[85vh] max-w-5xl items-center justify-center">
        <div className="w-full overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/40">
          <div
            className={`relative overflow-hidden px-6 py-10 text-center md:px-10 ${
              isChecking
                ? 'bg-gradient-to-br from-indigo-500/20 via-slate-900 to-sky-500/20'
                : isSuccess
                ? 'bg-gradient-to-br from-emerald-500/20 via-slate-900 to-indigo-500/20'
                : 'bg-gradient-to-br from-rose-500/20 via-slate-900 to-slate-800'
            }`}
          >
            <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-indigo-500/20 blur-3xl" />
            <div className="absolute -bottom-24 left-10 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />

            <div
              className={`relative z-10 mx-auto flex h-24 w-24 items-center justify-center rounded-full ${
                isChecking
                  ? 'bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/30'
                  : isSuccess
                  ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-400/30'
                  : 'bg-rose-500/15 text-rose-300 ring-1 ring-rose-400/30'
              }`}
            >
              {isChecking ? (
                <Loader2 size={52} className="animate-spin" />
              ) : isSuccess ? (
                <CheckCircle2 size={52} />
              ) : (
                <XCircle size={52} />
              )}
            </div>

            <div className="relative z-10">
              <h1 className="mt-6 text-3xl font-extrabold md:text-4xl">
                {isChecking
                  ? 'Đang xác minh thanh toán...'
                  : isSuccess
                    ? 'Thanh toán thành công!'
                    : 'Thanh toán thất bại'}
              </h1>

              <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                {isChecking
                  ? 'Hệ thống đang xác minh chữ ký và cập nhật trạng thái giao dịch.'
                  : isSuccess
                  ? 'Tài khoản của bạn đã được nâng cấp VIP. Hệ thống sẽ đồng bộ huy hiệu VIP ngay sau khi nhận trạng thái từ backend.'
                  : verificationError || 'Giao dịch đã bị hủy, thất bại hoặc chưa được xác nhận bởi VNPay Sandbox.'}
              </p>

              {isSuccess && (
                <div className="mx-auto mt-6 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-5 py-2 text-sm font-bold text-amber-200">
                  <Crown size={18} />
                  VIP đã sẵn sàng
                </div>
              )}
            </div>
          </div>

          <div className="grid gap-6 px-6 py-6 md:grid-cols-[1.1fr_0.9fr] md:px-10">
            <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/10 text-indigo-300">
                  <ReceiptText size={22} />
                </div>

                <div>
                  <h2 className="text-lg font-bold text-white">
                    Chi tiết giao dịch
                  </h2>
                  <p className="text-xs text-slate-500">
                    Thông tin VNPay trả về sau thanh toán.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <InfoRow label="Mã đơn hàng" value={orderId || 'N/A'} />
                <InfoRow label="Số tiền" value={formattedAmount} />
                <InfoRow label="Ngân hàng" value={bankCode || 'N/A'} />
                <InfoRow label="Loại thẻ" value={cardType || 'N/A'} />
                <InfoRow label="Mã giao dịch VNPay" value={transactionNo || 'N/A'} />
                <InfoRow label="Mã giao dịch ngân hàng" value={bankTranNo || 'N/A'} />
                <InfoRow label="Thời gian thanh toán" value={formatVnpayDate(payDate)} />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                <h2 className="text-lg font-bold text-white">
                  Trạng thái xử lý
                </h2>

                <div className="mt-5 space-y-3">
                  <StatusRow
                    active
                    success
                    title="VNPay đã redirect về website"
                    desc="Frontend đã nhận được tham số thanh toán."
                  />

                  <StatusRow
                    active
                    success={isSuccess}
                    failed={!isChecking && !isSuccess}
                    loading={isChecking}
                    title={isChecking ? 'Đang xác minh với backend' : isSuccess ? 'Thanh toán hợp lệ' : 'Thanh toán không thành công'}
                    desc={isChecking ? 'Đang kiểm tra chữ ký, mã đơn và số tiền.' : `Mã phản hồi: ${responseCode || 'N/A'}`}
                  />

                  <StatusRow
                    active={isSuccess}
                    success={isSuccess && !isRefreshing}
                    loading={isSuccess && isRefreshing}
                    title="Cập nhật huy hiệu VIP"
                    desc={
                      isSuccess
                        ? isRefreshing
                          ? 'Đang đồng bộ lại thông tin tài khoản...'
                          : 'Đã gọi refresh profile.'
                        : 'Không thực hiện vì giao dịch thất bại.'
                    }
                  />
                </div>
              </div>

              {isRefreshing && isSuccess && (
                <div className="flex items-center justify-center gap-2 rounded-2xl border border-indigo-500/20 bg-indigo-500/10 px-4 py-3 text-sm text-indigo-200">
                  <Loader2 size={16} className="animate-spin" />
                  Đang cập nhật trạng thái VIP...
                </div>
              )}

              <div className="rounded-3xl border border-slate-800 bg-slate-950/50 p-5">
                <p className="text-sm font-semibold text-slate-200">
                  Mã VNPay
                </p>

                <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-2xl bg-slate-900 p-4">
                    <p className="text-xs text-slate-500">Response Code</p>
                    <p className="mt-1 font-bold text-slate-100">
                      {responseCode || 'N/A'}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-slate-900 p-4">
                    <p className="text-xs text-slate-500">Transaction Status</p>
                    <p className="mt-1 font-bold text-slate-100">
                      {transactionStatus || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-800 px-6 py-6 sm:flex-row sm:justify-center md:px-10">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-500"
            >
              <Home size={17} />
              Về Dashboard
            </Link>

            
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="max-w-[60%] truncate text-right text-sm font-semibold text-slate-100">
        {value}
      </span>
    </div>
  );
}

function StatusRow({ active, success, failed, loading, title, desc }) {
  return (
    <div className="flex gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
      <div
        className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          loading
            ? 'bg-indigo-500/15 text-indigo-300'
            : success
              ? 'bg-emerald-500/15 text-emerald-300'
              : failed
                ? 'bg-rose-500/15 text-rose-300'
                : active
                  ? 'bg-amber-500/15 text-amber-300'
                  : 'bg-slate-700 text-slate-400'
        }`}
      >
        {loading ? (
          <Loader2 size={15} className="animate-spin" />
        ) : success ? (
          <CheckCircle2 size={15} />
        ) : failed ? (
          <XCircle size={15} />
        ) : (
          <span className="h-2 w-2 rounded-full bg-current" />
        )}
      </div>

      <div>
        <p className="text-sm font-bold text-slate-100">{title}</p>
        <p className="mt-1 text-xs leading-5 text-slate-500">{desc}</p>
      </div>
    </div>
  );
}

function formatVnpayDate(value) {
  if (!value || value.length < 14) return 'N/A';

  const year = value.slice(0, 4);
  const month = value.slice(4, 6);
  const day = value.slice(6, 8);
  const hour = value.slice(8, 10);
  const minute = value.slice(10, 12);
  const second = value.slice(12, 14);

  return `${hour}:${minute}:${second} ${day}/${month}/${year}`;
}
