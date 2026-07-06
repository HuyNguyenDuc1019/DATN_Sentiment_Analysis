import { Trash2 } from 'lucide-react';

export default function DatasetDeleteModal({ dataset, deletingDatasetId, onCancel, onConfirm }) {
  if (!dataset) return null;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-rose-500/30 bg-slate-900 shadow-2xl shadow-rose-950/40">
        <div className="relative p-6">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-rose-500 via-red-500 to-orange-400" />

          <div className="mb-5 flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-500/15 ring-1 ring-rose-500/25">
              <Trash2 className="h-6 w-6 text-rose-400" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white">Xóa dữ liệu đã chọn?</h3>
              <p className="mt-1 text-sm leading-6 text-slate-400">
                Dữ liệu <span className="font-semibold text-slate-200">"{dataset.dataset_name || dataset.source_url || 'đã chọn'}"</span> sẽ bị xóa khỏi hệ thống.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 p-4">
            <p className="text-sm font-medium text-rose-200">
              Thao tác này chỉ xóa dữ liệu thuộc file/quán này, không ảnh hưởng các dữ liệu khác.
            </p>
          </div>

          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={Boolean(deletingDatasetId)}
              className="rounded-xl border border-slate-700 bg-slate-800 px-5 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={onConfirm}
              disabled={Boolean(deletingDatasetId)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-rose-950/30 transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Trash2 className="h-4 w-4" />
              {deletingDatasetId ? 'Đang xóa...' : 'Xóa dữ liệu này'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
