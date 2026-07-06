import { CheckCircle2, Clock, XCircle } from 'lucide-react';

export default function TransactionStatusBadge({ status }) {
  switch (status) {
    case 'paid':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <CheckCircle2 size={12} /> Thành công
        </span>
      );
    case 'cancelled':
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <XCircle size={12} /> Đã hủy
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-full font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <Clock size={12} /> Đang xử lý
        </span>
      );
  }
}
