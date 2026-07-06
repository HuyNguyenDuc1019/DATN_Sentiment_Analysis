import { Copy, Eye } from 'lucide-react';

import TransactionStatusBadge from './TransactionStatusBadge';
import {
  formatCurrency,
  formatDate,
} from '../../../utils/admin/transactionUtils';

export default function TransactionRow({
  transaction,
  onCopyTransactionId,
  onSelectTransaction,
}) {
  return (
    <tr className="hover:bg-slate-700/20 transition-colors">
      <td className="px-6 py-4">
        <button
          type="button"
          onClick={() => onCopyTransactionId(transaction.id)}
          className="inline-flex items-center gap-2 rounded-lg px-2 py-1 font-mono text-xs text-slate-400 transition-colors hover:bg-indigo-500/10 hover:text-indigo-300"
          title="Bấm để copy mã giao dịch đầy đủ"
        >
          {transaction.id.split('-')[0].toUpperCase()}...
          <Copy size={12} />
        </button>
      </td>

      <td className="px-6 py-4">
        <div className="font-medium text-white">{transaction.fullName}</div>
        <div className="text-xs text-slate-400">{transaction.email}</div>
      </td>

      <td className="px-6 py-4 font-semibold text-emerald-400">
        {formatCurrency(transaction.amount)}
      </td>

      <td className="px-6 py-4">
        <TransactionStatusBadge status={transaction.status} />
      </td>

      <td className="px-6 py-4 text-slate-400">
        {formatDate(transaction.created_at)}
      </td>

      <td className="px-6 py-4 text-right">
        <button
          type="button"
          onClick={() => onSelectTransaction(transaction)}
          className="inline-flex items-center justify-center w-8 h-8 rounded-lg border border-slate-700 bg-slate-900 text-slate-400 hover:text-white hover:border-indigo-500 hover:bg-indigo-500/10 transition-colors"
          title="Xem chi tiết"
        >
          <Eye size={16} />
        </button>
      </td>
    </tr>
  );
}
