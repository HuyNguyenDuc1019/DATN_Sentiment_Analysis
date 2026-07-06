export default function KeywordBlock({ title, items, tone }) {
  const toneClass = tone === 'emerald'
    ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
    : 'border-rose-500/20 bg-rose-500/10 text-rose-300';

  return (
    <div className="mt-5">
      <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.length ? (
          items.map((item, index) => (
            <span key={`${item}-${index}`} className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${toneClass}`}>
              {item}
            </span>
          ))
        ) : (
          <span className="text-xs text-slate-500">Chưa có dữ liệu.</span>
        )}
      </div>
    </div>
  );
}
