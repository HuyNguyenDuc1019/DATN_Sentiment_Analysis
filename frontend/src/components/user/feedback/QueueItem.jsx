import {
  formatRelativeTime,
  getConfidencePercent,
  getConfidenceRatio,
  normalizeLabelToNumber,
} from '../../../utils/user/feedbackUtils';

export default function QueueItem({ data, active, checked, showCheckbox, onCheck, onClick }) {
  const confidenceValue = getConfidenceRatio(data.confidence);
  const confidence = getConfidencePercent(data.confidence);
  const isReliable = confidenceValue >= 0.7;
  const positive = normalizeLabelToNumber(data.ai_label) === 1;
  const time = formatRelativeTime(data.created_at);

  return (
    <div
      className={`w-full rounded-xl border p-4 transition-all ${
        active
          ? 'border-indigo-500/50 bg-indigo-900/20 shadow-sm shadow-indigo-500/10'
          : 'border-slate-700 bg-transparent hover:bg-slate-700/30'
      }`}
    >
      <div className="flex gap-3">
        {showCheckbox && (
          <input
            title="Tick để xử lý hàng loạt"
            type="checkbox"
            checked={checked}
            onChange={onCheck}
            onClick={(event) => event.stopPropagation()}
            className="mt-1 h-4 w-4 shrink-0 accent-indigo-600"
          />
        )}

        <button onClick={onClick} className="min-w-0 flex-1 text-left">
          <p className={`mb-3 line-clamp-2 text-sm leading-relaxed ${active ? 'text-white' : 'text-slate-400'}`}>
            {data.content}
          </p>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-md px-2 py-1 text-[10px] font-semibold ${positive ? 'bg-emerald-500/10 text-emerald-300' : 'bg-rose-500/10 text-rose-300'}`}>
                AI: {positive ? 'Hài lòng' : 'Chưa hài lòng'}
              </span>
              <span className={`inline-flex items-center gap-1 text-[10px] font-semibold ${isReliable ? 'text-emerald-400' : 'text-amber-300'}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${isReliable ? 'bg-emerald-400' : 'bg-amber-300'}`} />
                {confidence}%
              </span>
            </div>
            <span className="shrink-0 text-[11px] text-slate-500">{time}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
