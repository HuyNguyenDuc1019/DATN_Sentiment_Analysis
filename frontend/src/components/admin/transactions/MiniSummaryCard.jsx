export default function MiniSummaryCard({ label, value, tone = 'default' }) {
  const toneClass = {
    default: 'border-slate-700 bg-slate-800/50 text-white',
    success: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300',
    warning: 'border-amber-500/20 bg-amber-500/10 text-amber-300',
    danger: 'border-rose-500/20 bg-rose-500/10 text-rose-300',
    money: 'border-indigo-500/20 bg-indigo-500/10 text-indigo-200',
  }[tone];

  return (
    <div className={`admin-transactions-mini-card rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 truncate text-xl font-bold">{value}</p>
    </div>
  );
}
