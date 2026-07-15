import { ListChecks, SlidersHorizontal, Sparkles } from 'lucide-react';

export default function FeedbackToolbar({
  mode,
  page,
  pageRows,
  hasMore,
  confidenceThreshold,
  onModeChange,
  onConfidenceThresholdChange,
}) {
  return (
    <div className="mb-5 flex flex-col gap-4 rounded-2xl border border-slate-700/70 bg-slate-800/40 p-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex w-full rounded-xl bg-slate-950/40 p-1 lg:w-auto">
        <ModeButton icon={Sparkles} active={mode === 'priority'} onClick={() => onModeChange('priority')}>
          AI chưa chắc
        </ModeButton>
        <ModeButton icon={ListChecks} active={mode === 'all'} onClick={() => onModeChange('all')}>
          Duyệt hàng loạt
        </ModeButton>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
        {mode === 'priority' ? (
          <label className="flex items-center gap-2 rounded-xl border border-slate-700/70 bg-slate-950/30 px-3 py-2.5">
            <SlidersHorizontal className="h-4 w-4 text-indigo-400" />
            Hiển thị dự đoán dưới
            <select
              value={confidenceThreshold}
              onChange={(event) => onConfidenceThresholdChange(Number(event.target.value))}
              className="rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 font-semibold text-white outline-none focus:border-indigo-500"
            >
              {[30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95].map((value) => (
                <option key={value} value={value}>{value}%</option>
              ))}
            </select>
          </label>
        ) : (
          <span className="rounded-xl border border-slate-700/70 bg-slate-950/30 px-3 py-2.5">
            Trang {page + 1} · {pageRows} bình luận{hasMore ? ' · còn dữ liệu' : ' · trang cuối'}
          </span>
        )}
      </div>
    </div>
  );
}

function ModeButton({ icon: Icon, active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition lg:flex-none ${
        active ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 hover:text-white'
      }`}
    >
      <Icon className="h-4 w-4" />
      {children}
    </button>
  );
}
