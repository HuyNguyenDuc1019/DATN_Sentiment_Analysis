export default function ConfidenceDisplay({ item }) {
  const value = item.ai_confidence;

  if (value === null || value === undefined) {
    return <span className="text-xs text-slate-500">—</span>;
  }

  const pct = Math.round(value <= 1 ? value * 100 : value);
  const colorClass = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
  const textClass = pct >= 80 ? 'text-emerald-400' : pct >= 50 ? 'text-amber-400' : 'text-rose-400';

  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-1.5 rounded-full bg-slate-700 overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-medium ${textClass}`}>{pct}%</span>
    </div>
  );
}
