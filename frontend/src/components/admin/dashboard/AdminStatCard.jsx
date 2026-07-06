export default function AdminStatCard({ card }) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-700 bg-slate-800/50 p-6 backdrop-blur-md transition-colors hover:bg-slate-800">
      <div className="flex items-start justify-between">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {card.title}
        </h3>
        {card.icon}
      </div>

      <div className="mt-4 flex items-end justify-between">
        <div className="text-4xl font-bold text-white">{card.formatter(card.value)}</div>
      </div>
    </div>
  );
}
