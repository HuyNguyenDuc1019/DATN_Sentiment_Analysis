import { Crown } from 'lucide-react';

export default function BillingTab({ isVip, onUpgrade }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white">Gói & Thanh toán</h2>
        <p className="mt-2 text-sm text-slate-400">
          Trạng thái hiện tại: {isVip ? 'Tài khoản VIP' : 'Tài khoản Free'}.
        </p>
      </div>

      <div className="rounded-2xl border border-slate-700/50 bg-slate-800/50 p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300">
            <Crown className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Gói Pro VIP</h3>
            <p className="mt-1 text-sm text-slate-400">
              Mở khóa từ điển AI, cảnh báo khủng hoảng, lưu dữ liệu dài ngày và các tính năng nâng cao.
            </p>
            {!isVip && (
              <button
                type="button"
                onClick={onUpgrade}
                className="mt-4 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Nâng cấp ngay
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
