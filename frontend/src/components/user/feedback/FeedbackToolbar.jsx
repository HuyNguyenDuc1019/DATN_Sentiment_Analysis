import { ListFilter } from 'lucide-react';

export default function FeedbackToolbar({
  mode,
  page,
  pageCount,
  totalRows,
  confidenceThreshold,
  onModeChange,
  onConfidenceThresholdChange,
}) {
  return (
    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex rounded-xl bg-slate-950/40 p-1">
        <ModeButton active={mode === 'priority'} onClick={() => onModeChange('priority')}>
          Cần kiểm tra
        </ModeButton>
        <ModeButton active={mode === 'all'} onClick={() => onModeChange('all')}>
          Tất cả bình luận
        </ModeButton>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {mode === 'priority' ? (
          <label className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/30 px-3 py-2">
            <ListFilter className="h-4 w-4" />
            Độ chắc chắn dưới
            <input
              type="number"
              min="30"
              max="95"
              step="5"
              value={confidenceThreshold}
              onChange={(event) => onConfidenceThresholdChange(
                Math.min(95, Math.max(30, Number(event.target.value) || 70)),
              )}
              className="w-14 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-semibold text-white outline-none focus:border-indigo-500"
            />
            %
          </label>
        ) : (
          <span>Trang {page + 1}/{pageCount} · {totalRows.toLocaleString('vi-VN')} bình luận</span>
        )}
      </div>
    </div>
  );
}

function ModeButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-4 py-2 text-sm font-semibold transition ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  );
}
