import {
  CalendarDays,
  Check,
  Clock3,
  Copy,
  CreditCard,
  ReceiptText,
  User,
  X,
  XCircle,
} from 'lucide-react';

import DetailRow from './TransactionDetailRow';
import TransactionStatusBadge from './TransactionStatusBadge';

export default function TransactionDetailModal({
  transaction,
  onClose,
  onCopyTransactionId,
  onConfirmTransaction,
  onCancelTransaction,
  actionLoadingId,
  formatCurrency,
  formatDate,
}) {
  const isPending = transaction.status !== 'paid' && transaction.status !== 'cancelled';
  const isActionLoading = actionLoadingId === transaction.id;

  const title =
    transaction.status === 'paid'
      ? 'Thanh toán thành công'
      : transaction.status === 'cancelled'
        ? 'Giao dịch đã hủy'
        : 'Đang chờ xử lý';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-700/70 bg-slate-900 shadow-2xl shadow-black/40">
        <div className="relative overflow-hidden border-b border-slate-700/70 bg-gradient-to-br from-indigo-600/25 via-slate-900 to-emerald-500/10 px-6 py-5">
          <div className="absolute -right-16 -top-16 h-40 w-40 rounded-full bg-indigo-500/20 blur-3xl" />
          <div className="absolute -bottom-20 left-20 h-40 w-40 rounded-full bg-emerald-500/10 blur-3xl" />

          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-xl border border-slate-700/80 bg-slate-900/70 p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
          >
            <X size={18} />
          </button>

          <div className="relative z-10 flex flex-col gap-5 pr-12 md:flex-row md:items-center md:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-500/15 text-indigo-300 ring-1 ring-indigo-400/25">
                <ReceiptText size={28} />
              </div>

              <div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-indigo-200">
                  Hóa đơn VIP
                </p>

                <h2 className="mt-1 text-2xl font-bold text-white">
                  {title}
                </h2>

                <p className="mt-1 text-sm text-slate-400">
                  {transaction.plan_name || 'VIP 30 ngày'} · Almotion
                </p>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 px-5 py-3 text-left md:text-right">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-200">
                Tổng thanh toán
              </p>

              <p className="mt-1 text-3xl font-extrabold text-emerald-300">
                {formatCurrency(transaction.amount)}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Thông tin giao dịch
                    </p>

                    <p className="mt-1 text-xs text-slate-400">
                      Mã, trạng thái và thời gian xử lý thanh toán.
                    </p>
                  </div>

                  <TransactionStatusBadge status={transaction.status} />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/70 px-4 py-3">
                    <span className="text-sm text-slate-400">Mã giao dịch</span>

                    <button
                      type="button"
                      onClick={() => onCopyTransactionId(transaction.id)}
                      className="inline-flex max-w-[300px] items-center gap-2 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-1.5 text-right font-mono text-xs font-semibold text-indigo-200 transition hover:bg-indigo-500/20"
                      title="Copy mã giao dịch"
                    >
                      <span className="truncate">{transaction.id}</span>
                      <Copy size={14} className="shrink-0" />
                    </button>
                  </div>

                  <DetailRow label="Mã thanh toán" value={transaction.payment_code || 'N/A'} mono />
                  <DetailRow label="Số tiền" value={formatCurrency(transaction.amount)} />
                  <DetailRow label="Phương thức" value={transaction.payment_method || 'mock_qr'} />
                  <DetailRow label="Ngày tạo" value={formatDate(transaction.created_at)} />
                  <DetailRow label="Ngày thanh toán" value={formatDate(transaction.paid_at)} />
                  <DetailRow label="Ngày hết hạn VIP" value={formatDate(transaction.expires_at)} />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-300">
                    <User size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Thông tin người dùng
                    </p>

                    <p className="text-xs text-slate-400">
                      Tài khoản được nâng cấp VIP.
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <DetailRow label="Người dùng" value={transaction.fullName || 'N/A'} />
                  <DetailRow label="Email" value={transaction.email || 'N/A'} />
                  <DetailRow label="User ID" value={transaction.user_id || 'N/A'} mono />
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-300">
                    <Clock3 size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Timeline giao dịch
                    </p>

                    <p className="text-xs text-slate-400">
                      Tiến trình xử lý đơn VIP.
                    </p>
                  </div>
                </div>

                <div className="relative space-y-4 pl-5">
                  <div className="absolute left-[9px] top-2 h-[calc(100%-16px)] w-px bg-slate-700" />

                  <div className="relative">
                    <span className="absolute -left-5 top-1.5 h-3 w-3 rounded-full border-2 border-slate-800 bg-emerald-400" />
                    <p className="text-sm font-semibold text-emerald-300">
                      Tạo đơn thanh toán
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {formatDate(transaction.created_at)}
                    </p>
                  </div>

                  <div className="relative">
                    <span
                      className={`absolute -left-5 top-1.5 h-3 w-3 rounded-full border-2 border-slate-800 ${
                        transaction.status === 'cancelled'
                          ? 'bg-rose-400'
                          : transaction.status === 'paid'
                            ? 'bg-emerald-400'
                            : 'bg-amber-400'
                      }`}
                    />
                    <p
                      className={`text-sm font-semibold ${
                        transaction.status === 'cancelled'
                          ? 'text-rose-300'
                          : transaction.status === 'paid'
                            ? 'text-emerald-300'
                            : 'text-amber-300'
                      }`}
                    >
                      {transaction.status === 'cancelled'
                        ? 'Giao dịch đã hủy'
                        : transaction.status === 'paid'
                          ? 'Thanh toán thành công'
                          : 'Chờ xác nhận thanh toán'}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {transaction.status === 'paid'
                        ? formatDate(transaction.paid_at)
                        : transaction.status === 'cancelled'
                          ? 'Đơn đã được admin hủy'
                          : 'Đang chờ xử lý'}
                    </p>
                  </div>

                  <div className="relative">
                    <span
                      className={`absolute -left-5 top-1.5 h-3 w-3 rounded-full border-2 border-slate-800 ${
                        transaction.status === 'paid' ? 'bg-emerald-400' : 'bg-slate-600'
                      }`}
                    />
                    <p
                      className={`text-sm font-semibold ${
                        transaction.status === 'paid' ? 'text-emerald-300' : 'text-slate-500'
                      }`}
                    >
                      Kích hoạt VIP
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {transaction.status === 'paid'
                        ? `Hết hạn: ${formatDate(transaction.expires_at)}`
                        : 'Chưa kích hoạt'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-700/70 bg-slate-800/70 p-5">
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10 text-violet-300">
                    <CreditCard size={20} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-white">
                      Thao tác quản trị
                    </p>

                    <p className="text-xs text-slate-400">
                      Duyệt hoặc hủy giao dịch đang xử lý.
                    </p>
                  </div>
                </div>

                {isPending ? (
                  <div className="grid grid-cols-1 gap-3">
                    <button
                      type="button"
                      onClick={() => onConfirmTransaction(transaction)}
                      disabled={isActionLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Check size={17} />
                      Xác nhận thanh toán
                    </button>

                    <button
                      type="button"
                      onClick={() => onCancelTransaction(transaction)}
                      disabled={isActionLoading}
                      className="inline-flex items-center justify-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-300 transition hover:bg-rose-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <XCircle size={17} />
                      Hủy giao dịch
                    </button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
                    Giao dịch đã hoàn tất hoặc đã hủy, không còn thao tác cần xử lý.
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Đóng hóa đơn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}