import MiniSummaryCard from './MiniSummaryCard';

export default function TransactionSummaryCards({ summary, formatCurrency }) {
  return (
    <div className="admin-transactions-summary mb-4 grid grid-cols-1 gap-3 md:grid-cols-5">
      <MiniSummaryCard label="Tổng giao dịch" value={summary.total} />
      <MiniSummaryCard label="Giao dịch thành công" value={summary.paid} tone="success" />
      <MiniSummaryCard label="Đang xử lý" value={summary.pending} tone="warning" />
      <MiniSummaryCard label="Đã hủy" value={summary.cancelled} tone="danger" />
      <MiniSummaryCard label="Doanh thu lọc" value={formatCurrency(summary.revenue)} tone="money" />
    </div>
  );
}
