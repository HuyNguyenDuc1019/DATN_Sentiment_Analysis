import { CreditCard } from 'lucide-react';

export default function TransactionHeader() {
  return (
    <div className="mb-8">
      <h1 className="text-2xl font-bold text-white flex items-center gap-3">
        <CreditCard className="text-indigo-400" />
        Quản lý Giao dịch
      </h1>
      <p className="text-slate-400 mt-2">Theo dõi lịch sử thanh toán nâng cấp VIP của hệ thống.</p>
    </div>
  );
}
