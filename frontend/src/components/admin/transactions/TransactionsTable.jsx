import { ArrowUpDown } from 'lucide-react';

import TransactionRow from './TransactionRow';

export default function TransactionsTable({
  isLoading,
  filteredData,
  paginatedData,
  onSort,
  getSortLabel,
  onCopyTransactionId,
  onSelectTransaction,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-300">
        <thead className="admin-transactions-thead text-xs uppercase bg-slate-900/50 text-slate-400">
          <tr>
            <th className="px-6 py-4 font-semibold">Mã giao dịch</th>
            <th className="px-6 py-4 font-semibold">Người dùng</th>
            <th className="px-6 py-4 font-semibold">
              <button
                type="button"
                onClick={() => onSort('amount')}
                className="inline-flex items-center gap-1 hover:text-white transition-colors"
              >
                Số tiền{getSortLabel('amount')}
                <ArrowUpDown size={13} />
              </button>
            </th>
            <th className="px-6 py-4 font-semibold">Trạng thái</th>
            <th className="px-6 py-4 font-semibold">
              <button
                type="button"
                onClick={() => onSort('created_at')}
                className="inline-flex items-center gap-1 hover:text-white transition-colors"
              >
                Ngày tạo{getSortLabel('created_at')}
                <ArrowUpDown size={13} />
              </button>
            </th>
            <th className="px-6 py-4 font-semibold text-right">Chi tiết</th>
          </tr>
        </thead>

        <tbody className="admin-transactions-tbody divide-y divide-slate-700/50">
          {isLoading ? (
            <tr>
              <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Đang tải dữ liệu...</td>
            </tr>
          ) : filteredData.length === 0 ? (
            <tr>
              <td colSpan="6" className="px-6 py-8 text-center text-slate-400">Không tìm thấy giao dịch nào.</td>
            </tr>
          ) : (
            paginatedData.map((transaction) => (
              <TransactionRow
                key={transaction.id}
                transaction={transaction}
                onCopyTransactionId={onCopyTransactionId}
                onSelectTransaction={onSelectTransaction}
              />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
