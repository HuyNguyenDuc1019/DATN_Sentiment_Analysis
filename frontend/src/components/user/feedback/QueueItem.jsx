import {
  formatRelativeTime,
  getConfidencePercent,
  getConfidenceRatio,
} from '../../../utils/user/feedbackUtils';

export default function QueueItem({ data, active, checked, showCheckbox, onCheck, onClick }) {
  const confidenceValue = getConfidenceRatio(data.confidence);
  const confidence = getConfidencePercent(data.confidence);
  const isReliable = confidenceValue >= 0.7;
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
          <p className={`mb-3 line-clamp-2 text-sm leading-relaxed ${active ? 'text-slate-200' : 'text-slate-400'}`}>
            {data.content}
          </p>
          <div className="flex items-end justify-between gap-3">
            <span
              className={`rounded-md border px-2 py-0.5 text-[10px] font-semibold ${
                isReliable
                  ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
                  : 'border-rose-500/20 bg-rose-500/10 text-rose-400'
              }`}
            >
              {isReliable ? 'Độ chắc chắn cao' : 'Độ chắc chắn thấp'}: {confidence}%
            </span>
            <span className="shrink-0 text-[11px] text-slate-500">{time}</span>
          </div>
        </button>
      </div>
    </div>
  );
}
