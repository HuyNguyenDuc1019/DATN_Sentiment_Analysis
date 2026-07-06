import { AlertTriangle, Database, Trash2 } from 'lucide-react';

import DatasetList from './DatasetList';

export default function DataSettingsTab({
  isVip,
  retentionDays,
  setRetentionDays,
  feedbackConfidenceThreshold,
  setFeedbackConfidenceThreshold,
  datasets,
  isLoadingDatasets,
  deletingDatasetId,
  onRefreshDatasets,
  onOpenDeleteDataset,
  onOpenClearConfirm,
  isClearing,
}) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-white">Quản lý Dữ liệu</h2>
      </div>

      <div className="space-y-8">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Thời gian tự động xóa dữ liệu cũ
          </label>
          <select
            value={retentionDays}
            onChange={(event) => setRetentionDays(Number(event.target.value))}
            className="w-full max-w-sm bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl py-3 px-4 focus:outline-none cursor-pointer"
          >
            <option value={7}>7 ngày (Gói Free)</option>
            <option value={30} disabled={!isVip}>
              30 ngày (VIP)
            </option>
            <option value={90} disabled={!isVip}>
              90 ngày (VIP)
            </option>
            <option value={9999} disabled={!isVip}>
              Lưu trữ vĩnh viễn (VIP)
            </option>
          </select>

          {!isVip && (
            <p className="mt-2 text-xs text-slate-500">
              Gói Free chỉ được lưu dữ liệu tối đa 7 ngày. Nâng cấp VIP để chọn 30/90 ngày.
            </p>
          )}
        </div>

        <div className="pt-6 border-t border-slate-700/50">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Database size={16} className="text-indigo-400" /> Dữ liệu đã phân tích
              </h3>
              <p className="mt-1 text-xs text-slate-500">
                Xóa riêng từng file CSV hoặc từng quán/link đã phân tích.
              </p>
            </div>

            <button
              type="button"
              onClick={onRefreshDatasets}
              disabled={isLoadingDatasets}
              className="rounded-lg border border-slate-700 px-3 py-2 text-xs font-semibold text-slate-300 transition hover:bg-slate-800 disabled:opacity-60"
            >
              {isLoadingDatasets ? 'Đang tải...' : 'Làm mới'}
            </button>
          </div>

          <DatasetList
            datasets={datasets}
            isLoading={isLoadingDatasets}
            deletingDatasetId={deletingDatasetId}
            onDelete={onOpenDeleteDataset}
          />
        </div>

        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
          <div className="mb-4">
            <h3 className="text-base font-semibold text-white">Ngưỡng AI chưa chắc</h3>
            <p className="mt-1 text-sm text-slate-400">
              Các bình luận có độ chắc chắn thấp hơn ngưỡng này sẽ xuất hiện ở tab “AI chưa chắc” trong Trung tâm phản hồi.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <input
              type="range"
              min="30"
              max="95"
              step="5"
              value={Number(feedbackConfidenceThreshold)}
              onChange={(event) => setFeedbackConfidenceThreshold(Number(event.target.value))}
              className="w-full accent-indigo-600 sm:max-w-sm"
            />

            <div className="flex items-center gap-2">
              <input
                type="number"
                min="30"
                max="95"
                step="5"
                value={Number(feedbackConfidenceThreshold)}
                onChange={(event) =>
                  setFeedbackConfidenceThreshold(Math.min(95, Math.max(30, Number(event.target.value) || 70)))
                }
                className="w-20 rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-indigo-500"
              />
              <span className="text-sm font-semibold text-slate-300">%</span>
            </div>
          </div>

          <p className="mt-3 text-xs text-slate-500">
            Ví dụ: đặt 80% thì các bình luận dưới 80% sẽ được đưa vào nhóm AI chưa chắc.
          </p>
        </div>

        <div className="pt-6 border-t border-slate-700/50">
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2 mb-2">
            <AlertTriangle size={16} />
            Khu vực nguy hiểm
          </h3>
          <button
            type="button"
            onClick={onOpenClearConfirm}
            disabled={isClearing}
            className="flex items-center gap-2 px-5 py-2.5 bg-rose-500/10 text-rose-500 border border-rose-500/20 rounded-lg text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <Trash2 size={16} /> {isClearing ? 'Đang xóa...' : 'Xóa toàn bộ dữ liệu'}
          </button>
        </div>
      </div>
    </div>
  );
}
