import { AlertTriangle, Loader2 } from 'lucide-react';

export default function BanConfirmModal({
  pendingBanUser,
  banReason,
  processingId,
  onBanReasonChange,
  onCancel,
  onConfirm,
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-rose-500/30 bg-slate-900 shadow-2xl">
        <div className="flex items-start gap-3 border-b border-slate-700 px-6 py-5">
          <div className="mt-0.5 rounded-xl bg-rose-500/10 p-2 text-rose-300">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Xác nhận khóa tài khoản</h2>
            <p className="mt-1 text-sm text-slate-400">
              Tài khoản: <span className="text-slate-200">{pendingBanUser.email || pendingBanUser.full_name || pendingBanUser.id}</span>
            </p>
          </div>
        </div>

        <div className="p-6">
          <label className="mb-2 block text-sm font-medium text-slate-300">
            Lý do khóa tài khoản
          </label>
          <textarea
            value={banReason}
            onChange={(event) => onBanReasonChange(event.target.value)}
            rows={4}
            placeholder="Ví dụ: Spam, vi phạm chính sách, dữ liệu bất thường..."
            className="w-full resize-none rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-sm text-slate-200 placeholder-slate-500 focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-700 px-6 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-slate-700"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={processingId === pendingBanUser.id}
            className="rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60"
          >
            {processingId === pendingBanUser.id ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 size={16} className="animate-spin" />
                Đang khóa...
              </span>
            ) : (
              'Xác nhận khóa'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
