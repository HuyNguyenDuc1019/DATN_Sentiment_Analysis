export default function TransactionDetailRow({ label, value, mono, highlight }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-700 bg-slate-900/60 px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className={`text-right text-sm ${mono ? 'font-mono text-xs' : 'font-medium'} ${highlight ? 'text-emerald-400' : 'text-white'}`}>
        {value}
      </span>
    </div>
  );
}
