import { Check, Copy, Eye, Loader2, XCircle } from 'lucide-react';

import { formatCurrency, formatDate } from '../../../utils/admin/transactionUtils';
import TransactionStatusBadge from './TransactionStatusBadge';

const shortId = (value) => {
  if (!value) return 'N/A';
  return `${String(value).slice(0, 8)}...`;
};

export default function TransactionRow({
  transaction,
  onCopyTransactionId,
  onSelectTransaction,
  onConfirmTransaction,
  onCancelTransaction,
  actionLoadingId,
}) {
  const isPending = transaction.status !== 'paid' && transaction.status !== 'cancelled';
  const isActionLoading = actionLoadingId === transaction.id;

  return (
    <tr className="hover:bg-slate-700/30 transition-colors">
      <td className="px-6 py-4">
        <button
          type="button"
          onClick={() => onCopyTransactionId(transaction.id)}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/15 px-2.5 py-1.5 font-mono text-xs font-semibold text-indigo-200 hover:bg-indigo-500/25"
          title={transaction.id}
        >
          {shortId(transaction.id)}
          <Copy size={13} />
        </button>
      </td>

      <td className="px-6 py-4">
        <div className="font-semibold text-slate-100">
          {transaction.fullName || 'N/A'}
        </div>

        <div className="text-xs text-slate-400">
          {transaction.email || 'N/A'}
        </div>
      </td>

      <td className="px-6 py-4 font-semibold text-emerald-300">
        {formatCurrency(transaction.amount)}
      </td>

      <td className="px-6 py-4">
        <TransactionStatusBadge status={transaction.status} />
      </td>

      <td className="px-6 py-4 text-slate-400">
        {formatDate(transaction.created_at)}
      </td>

      <td className="px-6 py-4">
        <div className="flex justify-end gap-2">
          {isPending && (
            <>
              <button
                type="button"
                onClick={() => onConfirmTransaction(transaction)}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-50"
                title="Xác nhận giao dịch"
              >
                {isActionLoading ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Check size={14} />
                )}
                Duyệt
              </button>

              <button
                type="button"
                onClick={() => onCancelTransaction(transaction)}
                disabled={isActionLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-rose-500/30 bg-rose-500/10 px-2.5 py-1.5 text-xs font-semibold text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                title="Hủy giao dịch"
              >
                <XCircle size={14} />
                Hủy
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onSelectTransaction(transaction)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 hover:text-white"
            title="Xem chi tiết"
          >
            <Eye size={14} />
            Chi tiết
          </button>
        </div>
      </td>
    </tr>
  );
}