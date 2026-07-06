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
    <div className="mb-4 shrink-0 rounded-2xl border border-slate-700 bg-slate-800/50 p-3 backdrop-blur-md lg:p-4">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onModeChange('priority')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'priority'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            AI chưa chắc
          </button>

          <button
            type="button"
            onClick={() => onModeChange('all')}
            className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
              mode === 'all'
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-700 bg-slate-900/60 text-slate-300 hover:bg-slate-800'
            }`}
          >
            Duyệt toàn bộ
          </button>
        </div>

        <div className="flex flex-col gap-2 xl:items-end">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-700 bg-slate-950/30 px-3 py-2">
            <span className="text-xs font-semibold text-slate-300">Ngưỡng AI chưa chắc</span>
            <input
              type="number"
              min="30"
              max="95"
              step="5"
              value={confidenceThreshold}
              onChange={(event) => {
                const nextValue = Math.min(95, Math.max(30, Number(event.target.value) || 70));
                onConfidenceThresholdChange(nextValue);
              }}
              className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-2 py-1 text-xs font-semibold text-white outline-none focus:border-indigo-500"
              title="Các bình luận có độ chắc chắn thấp hơn ngưỡng này sẽ vào tab AI chưa chắc"
            />
            <span className="text-xs font-semibold text-slate-300">%</span>
          </div>

          <div className="text-xs leading-5 text-slate-400">
            {mode === 'priority'
              ? `AI chưa chắc: chỉ hiện các câu có độ chắc chắn dưới ${confidenceThreshold}%.`
              : `Trang ${page + 1}/${pageCount} • ${totalRows.toLocaleString('vi-VN')} bình luận • mỗi trang 100 dòng`}
          </div>
        </div>
      </div>
    </div>
  );
}
