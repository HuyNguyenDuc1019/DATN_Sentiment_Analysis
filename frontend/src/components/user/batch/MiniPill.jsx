export default function MiniPill({ label, value, tone = 'default' }) {
  const toneClass =
    tone === 'positive'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
      : tone === 'negative'
        ? 'border-rose-500/20 bg-rose-500/10 text-rose-300'
        : 'border-slate-700 bg-slate-950/30 text-slate-300';

  return (
    <div className={`rounded-xl border px-3 py-2 text-center ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{label}</p>
      <p className="mt-1 text-sm font-bold">{value}</p>
    </div>
  );
}
