import { CheckCircle2, Download, Edit3, RefreshCw, Trash2, X, XCircle } from 'lucide-react';

export default function BulkActionBar({
  selectedCount,
  bulkAction,
  bulkReason,
  bulkNewLabel,
  isBulkSubmitting,
  isExportingSelected,
  onBulkActionChange,
  onBulkReasonChange,
  onBulkNewLabelChange,
  onSubmitBulkAction,
  onExportSelected,
  onClearSelection,
}) {
  return (
    <div className="flex flex-col gap-3 px-5 py-3 border-b border-slate-700/50 bg-indigo-500/10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-medium text-indigo-200">Đã chọn {selectedCount} phản hồi</div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSubmitBulkAction('approve')}
            disabled={isBulkSubmitting}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 text-xs font-medium text-emerald-400 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> Duyệt tất cả
          </button>

          <button
            onClick={() => onBulkActionChange(bulkAction === 'reject' ? '' : 'reject')}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              bulkAction === 'reject'
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }`}
          >
            <XCircle size={14} /> Từ chối tất cả
          </button>

          <button
            onClick={() => onBulkActionChange(bulkAction === 'edit_label' ? '' : 'edit_label')}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
              bulkAction === 'edit_label'
                ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20'
            }`}
          >
            <Edit3 size={14} /> Sửa nhãn hàng loạt
          </button>

          <button
            onClick={() => onSubmitBulkAction('delete')}
            disabled={isBulkSubmitting}
            className="flex items-center gap-1.5 rounded-lg bg-slate-700/50 border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-rose-500/10 hover:text-rose-400 hover:border-rose-500/30 transition-colors disabled:opacity-50"
          >
            <Trash2 size={14} /> Xóa hàng loạt
          </button>

          <button
            onClick={onExportSelected}
            disabled={isExportingSelected}
            className="flex items-center gap-1.5 rounded-lg bg-slate-700/50 border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            {isExportingSelected ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
            Xuất CSV đã chọn
          </button>

          <button
            onClick={onClearSelection}
            className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-400 hover:text-white transition-colors"
          >
            <X size={14} /> Bỏ chọn
          </button>
        </div>
      </div>

      {(bulkAction === 'reject' || bulkAction === 'edit_label') && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          {bulkAction === 'edit_label' && (
            <select
              value={bulkNewLabel}
              onChange={(event) => onBulkNewLabelChange(event.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-200 outline-none focus:border-indigo-500"
            >
              <option value="1">Tích cực (1)</option>
              <option value="0">Tiêu cực (0)</option>
            </select>
          )}

          <input
            value={bulkReason}
            onChange={(event) => onBulkReasonChange(event.target.value)}
            placeholder="Nhập lý do (bắt buộc)..."
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
          />

          <button
            onClick={() => onSubmitBulkAction(bulkAction)}
            disabled={isBulkSubmitting}
            className="flex items-center justify-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 text-xs font-medium text-white transition-colors disabled:opacity-60"
          >
            {isBulkSubmitting ? <RefreshCw size={14} className="animate-spin" /> : null}
            Xác nhận
          </button>
        </div>
      )}
    </div>
  );
}
