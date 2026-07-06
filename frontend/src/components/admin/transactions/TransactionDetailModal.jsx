import { Copy, ReceiptText, X } from 'lucide-react';

import DetailRow from './TransactionDetailRow';
import TransactionStatusBadge from './TransactionStatusBadge';

export default function TransactionDetailModal({
  transaction,
  onClose,
  onCopyTransactionId,
  formatCurrency,
  formatDate,
}) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-700 bg-slate-800 shadow-2xl shadow-black/40">
        <div className="relative border-b border-slate-700 bg-gradient-to-br from-indigo-600/25 via-slate-900 to-emerald-500/15 p-6">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-2 text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>

          <div className="flex items-start gap-4 pr-10">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30">
              <ReceiptText size={24} />
            </div>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider text-emerald-300">Hóa đơn VIP</p>
              <h2 className="mt-1 text-2xl font-bold text-white">Thanh toán thành công</h2>
              <p className="mt-2 text-4xl font-extrabold text-emerald-300">
                {formatCurrency(transaction.amount)}
              </p>
              <p className="mt-1 text-sm text-slate-400">Gói Pro VIP · Almotion</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm text-slate-300">Trạng thái giao dịch</span>
              <TransactionStatusBadge status={transaction.status} />
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
              <span className="text-sm text-slate-400">Mã giao dịch</span>
              <button
                type="button"
                onClick={() => onCopyTransactionId(transaction.id)}
                className="inline-flex max-w-[280px] items-center gap-2 rounded-lg border border-slate-700 px-2.5 py-1.5 text-right font-mono text-xs text-slate-200 transition-colors hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-white"
                title="Copy mã giao dịch"
              >
                <span className="truncate">{transaction.id}</span>
                <Copy size={14} className="shrink-0" />
              </button>
            </div>

            <DetailRow label="Người dùng" value={transaction.fullName} />
            <DetailRow label="Email" value={transaction.email} />
            <DetailRow label="Ngày thanh toán" value={formatDate(transaction.created_at)} />
            <DetailRow label="User ID" value={transaction.user_id || 'N/A'} mono />
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
            >
              Đóng hóa đơn
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
