export default function ReviewItem({ content, date, sentiment, confidence }) {
  const isPositive = sentiment === 'positive';

  return (
    <div
      className={`flex justify-between items-start gap-6 p-4 bg-slate-900/50 rounded-xl border border-slate-700/50 border-l-4 ${
        isPositive ? 'border-l-emerald-500' : 'border-l-rose-500'
      }`}
    >
      <div className="flex-1">
        <p className="text-slate-300 text-sm leading-relaxed mb-2">{content}</p>
        <span className="text-xs text-slate-500">{date}</span>
      </div>

      <div className="w-36 flex flex-col items-end flex-shrink-0">
        <span
          className={`px-3 py-1 text-xs font-semibold rounded-md mb-3 ${
            isPositive
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
          }`}
        >
          {isPositive ? 'Khách hài lòng' : 'Khách chưa hài lòng'}
        </span>

        <div className="w-full flex flex-col gap-1.5">
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>Độ chắc chắn</span>
            <span>{confidence}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{ width: `${confidence}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
