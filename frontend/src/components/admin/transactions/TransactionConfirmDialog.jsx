import { useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Crown,
  Loader2,
  ReceiptText,
  X,
} from 'lucide-react';

export default function TransactionConfirmDialog({
  type,
  transaction,
  isLoading,
  formatCurrency,
  onClose,
  onConfirm,
}) {
  const isConfirm = type === 'confirm';
  const transactionCode = transaction.payment_code || transaction.id || 'Không xác định';

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && !isLoading) {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLoading, onClose]);

  return (
    <div
      className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-sm"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isLoading) onClose();
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="transaction-confirm-title"
        aria-describedby="transaction-confirm-description"
        className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 shadow-2xl shadow-black/50"
      >
        <div
          className={`relative border-b px-6 pb-5 pt-6 ${
            isConfirm
              ? 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/15 via-slate-900 to-slate-900'
              : 'border-rose-500/20 bg-gradient-to-br from-rose-500/15 via-slate-900 to-slate-900'
          }`}
        >
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Đóng hộp thoại"
            className="absolute right-4 top-4 rounded-xl border border-slate-700 bg-slate-900/70 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} />
          </button>

          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ring-1 ${
              isConfirm
                ? 'bg-emerald-500/15 text-emerald-300 ring-emerald-400/25'
                : 'bg-rose-500/15 text-rose-300 ring-rose-400/25'
            }`}
          >
            {isConfirm ? <CheckCircle2 size={25} /> : <AlertTriangle size={25} />}
          </div>

          <h2
            id="transaction-confirm-title"
            className="mt-4 pr-10 text-xl font-bold text-white"
          >
            {isConfirm ? 'Xác nhận thanh toán?' : 'Hủy giao dịch này?'}
          </h2>

          <p
            id="transaction-confirm-description"
            className="mt-2 text-sm leading-6 text-slate-400"
          >
            {isConfirm
              ? 'Giao dịch sẽ được đánh dấu thành công và tài khoản người dùng được kích hoạt VIP.'
              : 'Giao dịch sẽ chuyển sang trạng thái đã hủy và không thể tiếp tục thanh toán.'}
          </p>
        </div>

        <div className="space-y-4 p-6">
          <div className="rounded-2xl border border-slate-700/70 bg-slate-950/45 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-300">
                <ReceiptText size={20} />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Mã giao dịch
                </p>
                <p className="truncate font-mono text-sm font-semibold text-slate-200">
                  {transactionCode}
                </p>
              </div>
            </div>

            <div className="my-4 h-px bg-slate-800" />

            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">Số tiền</span>
              <span className="text-base font-bold text-white">
                {formatCurrency(transaction.amount)}
              </span>
            </div>

            {isConfirm && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
                <Crown size={15} />
                Kích hoạt {transaction.plan_name || 'VIP 30 ngày'}
              </div>
            )}
          </div>

          {!isConfirm && (
            <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4 text-sm leading-6 text-rose-200">
              <AlertTriangle className="mt-0.5 shrink-0" size={18} />
              Chỉ hủy khi giao dịch chưa được thanh toán hoặc thông tin giao dịch không hợp lệ.
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Quay lại
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={isLoading}
              className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white shadow-lg transition disabled:cursor-not-allowed disabled:opacity-60 ${
                isConfirm
                  ? 'bg-emerald-600 shadow-emerald-900/30 hover:bg-emerald-500'
                  : 'bg-rose-600 shadow-rose-900/30 hover:bg-rose-500'
              }`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={17} />
                  Đang xử lý
                </>
              ) : isConfirm ? (
                <>
                  <CheckCircle2 size={17} />
                  Xác nhận
                </>
              ) : (
                <>
                  <X size={17} />
                  Xác nhận hủy
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
