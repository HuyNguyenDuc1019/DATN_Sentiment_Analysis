import React from 'react';
import {
  CheckCircle2,
  CreditCard,
  Crown,
  Loader2,
  ShieldCheck,
  Sparkles,
  Zap,
} from 'lucide-react';

export default function VipPlanCard({ isProcessing, onUpgrade }) {
  const benefits = [
    'Phân tích dữ liệu nâng cao',
    'So sánh nhiều địa điểm cùng lúc',
    'Tăng giới hạn upload và xử lý file',
    'Ưu tiên trải nghiệm các tính năng mới',
  ];

  return (
    <div className="w-full max-w-5xl">
      <div className="grid overflow-hidden rounded-3xl border border-indigo-200 bg-white shadow-2xl shadow-indigo-100 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-violet-600 to-sky-500 p-8 text-white lg:p-10">
          <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-white/20 blur-3xl" />
          <div className="absolute -bottom-20 left-10 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl" />

          <div className="relative z-10">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 text-sm font-semibold ring-1 ring-white/20">
              <Crown size={18} />
              Almotion VIP
            </div>

            <h1 className="mt-6 text-4xl font-extrabold leading-tight">
              Nâng cấp VIP qua VNPay Sandbox
            </h1>

            <p className="mt-4 max-w-xl text-sm leading-6 text-indigo-50">
              Trải nghiệm luồng thanh toán giống hệ thống thật: chọn ngân hàng,
              nhập thông tin thẻ test, xác thực OTP và quay lại website để nhận
              trạng thái thanh toán.
            </p>

            <div className="mt-8 rounded-3xl bg-white/15 p-5 ring-1 ring-white/20">
              <p className="text-sm font-medium text-indigo-50">
                Gói VIP 30 ngày
              </p>

              <div className="mt-2 flex items-end gap-2">
                <span className="text-5xl font-extrabold">50.000 đ</span>
                <span className="pb-2 text-sm text-indigo-100">/ tháng</span>
              </div>

              <p className="mt-3 text-xs text-indigo-100">
                Thanh toán thử nghiệm, không mất tiền thật.
              </p>
            </div>
          </div>
        </div>

        <div className="p-8 lg:p-10">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Sparkles size={24} />
            </div>

            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                Quyền lợi VIP
              </h2>
              <p className="text-sm text-slate-500">
                Mở khóa các chức năng nâng cao.
              </p>
            </div>
          </div>

          <div className="mt-7 space-y-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 shrink-0 text-emerald-500" size={20} />
                <span className="text-sm font-medium text-slate-700">
                  {benefit}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <Zap className="text-amber-500" size={22} />
              <p className="mt-2 text-sm font-bold text-slate-900">
                Kích hoạt nhanh
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Backend tự cập nhật VIP.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <ShieldCheck className="text-emerald-500" size={22} />
              <p className="mt-2 text-sm font-bold text-slate-900">
                VNPay Sandbox
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Dùng thẻ test an toàn.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onUpgrade}
            disabled={isProcessing}
            className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Đang chuyển sang VNPay...
              </>
            ) : (
              <>
                <CreditCard size={18} />
                Nâng cấp VIP qua VNPay
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-slate-400">
            Test VNPay: chọn NCB, dùng thẻ sandbox và OTP 123456.
          </p>
        </div>
      </div>
    </div>
  );
}